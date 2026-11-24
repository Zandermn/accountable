import os
import sqlite3
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from sqlalchemy import (
    URL,
    Boolean,
    CheckConstraint,
    Column,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Table,
    create_engine,
    event,
    insert,
    select,
    update,
)
from sqlalchemy.schema import CreateTable

schema = MetaData()
STAGES = {
    "New": 10,
    "Qualified": 25,
    "Proposal": 50,
    "Negotiation": 75,
    "Won": 100,
    "Lost": 0,
}
OPEN = tuple(STAGES)[:4]


def now():
    return datetime.now(UTC).isoformat()


def uid():
    return str(uuid4())


def common():
    return [
        Column("id", String, primary_key=True, default=uid),
        Column("created_at", String, nullable=False, default=now),
        Column("updated_at", String, nullable=False, default=now),
        Column("deleted_at", String),
        Column("deletion", String),
    ]


def link(name, table):
    return Column(name, String, ForeignKey(table + ".id"))


state = Table(
    "state",
    schema,
    Column("id", Integer, primary_key=True),
    Column("schema_version", Integer),
    Column("dataset", Integer),
    Column("revision", Integer),
)
organizations = Table(
    "organizations",
    schema,
    *common(),
    Column("name", String, nullable=False),
    Column("website", String),
    Column("industry", String),
    Column("notes", String),
)
contacts = Table(
    "contacts",
    schema,
    *common(),
    Column("name", String, nullable=False),
    Column("status", String, nullable=False),
    Column("email", String),
    Column("phone", String),
    Column("job_title", String),
    link("organization_id", "organizations"),
)
deals = Table(
    "deals",
    schema,
    *common(),
    Column("name", String, nullable=False),
    Column("stage", String, nullable=False),
    Column("initial_stage", String, nullable=False),
    Column("value_cents", Integer, nullable=False),
    Column("probability", Integer, nullable=False),
    Column("expected_date", String),
    Column("actual_date", String),
    Column("position", Integer, nullable=False),
    link("organization_id", "organizations"),
    link("contact_id", "contacts"),
    CheckConstraint("value_cents >= 0 AND probability BETWEEN 0 AND 100"),
    CheckConstraint("organization_id IS NOT NULL OR contact_id IS NOT NULL"),
)
activities = Table(
    "activities",
    schema,
    *common(),
    link("deal_id", "deals"),
    link("contact_id", "contacts"),
    Column("type", String, nullable=False),
    Column("description", String, nullable=False),
    Column("occurred_at", String, nullable=False),
    Column("follow_up", String),
    Column("done", Boolean, nullable=False, default=False),
    CheckConstraint("(deal_id IS NULL) != (contact_id IS NULL)"),
)
events = Table(
    "events",
    schema,
    Column("id", String, primary_key=True, default=uid),
    link("deal_id", "deals"),
    Column("previous", String, nullable=False),
    Column("stage", String, nullable=False),
    Column("occurred_at", String, nullable=False, default=now),
)
detached = Table(
    "detached",
    schema,
    Column("id", String, primary_key=True, default=uid),
    link("organization_id", "organizations"),
    Column("operation", String, nullable=False),
    link("contact_id", "contacts"),
    link("deal_id", "deals"),
)
tickets = Table(
    "backup_confirmations",
    schema,
    Column("id", String, primary_key=True),
    Column("backup", String),
)
TABLES = {t.name: t for t in (organizations, contacts, deals, activities)}


class Problem(Exception):
    def __init__(self, message, status=422, field=None, **extra):
        super().__init__(message)
        self.status = status
        self.detail = {"message": message, "field": field, **extra}


class Store:
    data_tables = (organizations, contacts, deals, activities, events, detached)

    def __init__(self, path=None, seed=True):
        self.path = Path(
            path or os.environ.get("ACCOUNTABLE_DB", "data/accountable.db")
        )
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.backups = Path(
            os.environ.get("ACCOUNTABLE_BACKUPS", self.path.parent / "backups")
        )
        self.engine = create_engine(
            URL.create("sqlite", database=str(self.path)),
            connect_args={"timeout": 15, "autocommit": False},
        )

        @event.listens_for(self.engine, "connect")
        def foreign_keys(connection, _):
            connection.setconfig(sqlite3.SQLITE_DBCONFIG_ENABLE_FKEY, True)

        with self.engine.begin() as conn:
            conn.execute(CreateTable(state, if_not_exists=True))
            conn.execute(update(state).values(id=state.c.id))
            version = conn.scalar(select(state.c.schema_version))
            if version is None:
                schema.create_all(conn)
                conn.execute(
                    insert(state).values(id=1, schema_version=1, dataset=1, revision=0)
                )
                if seed:
                    from backend.seed import sample

                    sample(conn)
            elif version != 1:
                raise Problem("Unsupported database version.")

    def read(self):
        return self.engine.begin()

    @contextmanager
    def write(self, dataset=None, revision=None, advance=True):
        with self.engine.begin() as conn:
            # First statement takes the write lock, including for backup and replacement.
            conn.execute(update(state).values(revision=state.c.revision))
            current = conn.execute(select(state)).mappings().one()
            if dataset is not None and current["dataset"] != dataset:
                raise Problem("The dataset was replaced. Reload this view.", 409)
            if revision is not None and current["revision"] != revision:
                raise Problem("The data changed. Review the latest version.", 409)
            yield conn
            if advance:
                conn.execute(update(state).values(revision=state.c.revision + 1))
