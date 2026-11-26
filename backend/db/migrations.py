from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import Column, String, func, insert, inspect, select, update
from sqlalchemy.schema import CreateSchema, CreateTable

from backend.db import (
    POSTGRES_SCHEMA,
    TABLES,
    account_preferences,
    events,
    schema,
    state,
)


def migrate(conn, seed):
    namespace = None
    if conn.dialect.name == "postgresql":
        conn.execute(select(func.pg_advisory_xact_lock(726188389)))
        namespace = POSTGRES_SCHEMA
        conn.execute(CreateSchema(namespace, if_not_exists=True))
    conn.execute(CreateTable(state, if_not_exists=True))
    conn.execute(update(state).values(id=state.c.id))
    version = conn.scalar(select(state.c.schema_version))
    if version is None:
        schema.create_all(conn)
        conn.execute(
            insert(state).values(id=1, schema_version=3, dataset=1, revision=0)
        )
        if seed:
            from backend.seed import sample

            sample(conn)
    elif version in (1, 2):
        operations = Operations(MigrationContext.configure(conn))
        for table in (*TABLES.values(), events):
            columns = {
                column["name"]
                for column in inspect(conn).get_columns(table.name, schema=namespace)
            }
            for key in ("created_by", "updated_by", "added_by", "follow_up_zone"):
                if key in table.c and key not in columns:
                    original = table.c[key]
                    operations.add_column(
                        table.name,
                        Column(
                            key,
                            String,
                            server_default="Sample data"
                            if original.server_default is not None
                            else None,
                        ),
                        schema=namespace,
                    )
        account_preferences.create(conn, checkfirst=True)
        conn.execute(update(state).values(schema_version=3))
    elif version != 3:
        raise RuntimeError("Unsupported database schema version.")
