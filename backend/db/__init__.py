import sqlite3
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from sqlalchemy import (
    URL,
    BigInteger,
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
    make_url,
    select,
    update,
)

POSTGRES_SCHEMA = "accountable"
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


def attribution():
    return [
        Column("created_by", String),
        Column("updated_by", String),
        Column("added_by", String, server_default="Sample data"),
    ]


def common():
    return [
        Column("id", String, primary_key=True, default=uid),
        Column("created_at", String, nullable=False, default=now),
        Column("updated_at", String, nullable=False, default=now),
        Column("deleted_at", String),
        Column("deletion", String),
        *attribution(),
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
    Column("value_cents", BigInteger, nullable=False),
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
    Column("follow_up_zone", String),
    Column("done", Boolean, nullable=False, default=False),
    CheckConstraint("(deal_id IS NULL) != (contact_id IS NULL)"),
)
events = Table(
    "events",
    schema,
    Column("id", String, primary_key=True, default=uid),
    link("deal_id", "deals"),
    *attribution(),
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
TABLES = {t.name: t for t in (organizations, contacts, deals, activities)}
account_preferences = Table(
    "account_preferences",
    schema,
    Column("account_id", String, primary_key=True),
    Column("theme", String, nullable=False),
    Column("version", Integer, nullable=False),
    CheckConstraint("theme IN ('light', 'dark', 'system')"),
)


def database_url(database):
    if isinstance(database, Path):
        return URL.create("sqlite", database=str(database))
    url = make_url(database)
    if url.drivername in ("postgres", "postgresql"):
        return url.set(drivername="postgresql+psycopg")
    return url


class Problem(Exception):
    def __init__(self, message, status=422, field=None, **extra):
        super().__init__(message)
        self.status = status
        self.detail = {"message": message, "field": field, **extra}


class Store:
    data_tables = (organizations, contacts, deals, activities, events, detached)

    def __init__(self, database, seed=True):
        from backend.db.migrations import migrate

        self.path = database
        url = database_url(database)
        options = {
            "pool_pre_ping": True,
            "connect_args": {"connect_timeout": 10},
            "execution_options": {"schema_translate_map": {None: POSTGRES_SCHEMA}},
        }
        if url.get_backend_name() == "sqlite":
            options = {"connect_args": {"timeout": 15, "autocommit": False}}
        self.engine = create_engine(url, **options)
        if self.engine.dialect.name == "sqlite":
            event.listen(self.engine, "connect", self.enable_foreign_keys)
        try:
            with self.engine.begin() as conn:
                migrate(conn, seed)
        except Exception:
            self.engine.dispose()
            raise

    @staticmethod
    def enable_foreign_keys(connection, _):
        connection.setconfig(sqlite3.SQLITE_DBCONFIG_ENABLE_FKEY, True)

    @contextmanager
    def read(self):
        with self.engine.connect() as conn:
            if conn.dialect.name == "postgresql":
                conn = conn.execution_options(isolation_level="REPEATABLE READ")
            with conn.begin():
                yield conn

    @contextmanager
    def write(self, dataset=None, revision=None, advance=True):
        with self.engine.begin() as conn:
            # First statement takes the write lock, so revision checks and writes use one snapshot.
            conn.execute(update(state).values(revision=state.c.revision))
            current = conn.execute(select(state)).mappings().one()
            if dataset is not None and current["dataset"] != dataset:
                raise Problem("The dataset was replaced. Reload this view.", 409)
            if revision is not None and current["revision"] != revision:
                raise Problem("The data changed. Review the latest version.", 409)
            yield conn
            if advance:
                conn.execute(update(state).values(revision=state.c.revision + 1))
