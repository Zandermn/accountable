from sqlalchemy import Column, String, func, insert, inspect, select, update
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.schema import (
    CreateColumn,
    CreateSchema,
    CreateTable,
    ExecutableDDLElement,
)

from backend.db import (
    POSTGRES_SCHEMA,
    TABLES,
    account_preferences,
    events,
    schema,
    state,
)


class AddColumn(ExecutableDDLElement):
    def __init__(self, table, column):
        self.table = table
        self.column = column


@compiles(AddColumn)
def compile_add_column(element, compiler, **kwargs):
    table = compiler.preparer.format_table(element.table)
    column = compiler.process(CreateColumn(element.column), **kwargs)
    return f"ALTER TABLE {table} ADD COLUMN {column}"


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
        for table in (*TABLES.values(), events):
            columns = {
                column["name"]
                for column in inspect(conn).get_columns(table.name, schema=namespace)
            }
            for key in ("created_by", "updated_by", "added_by", "follow_up_zone"):
                if key in table.c and key not in columns:
                    original = table.c[key]
                    conn.execute(
                        AddColumn(
                            table,
                            Column(
                                key,
                                String,
                                server_default="Sample data"
                                if original.server_default is not None
                                else None,
                            ),
                        )
                    )
        account_preferences.create(conn, checkfirst=True)
        conn.execute(update(state).values(schema_version=3))
    elif version != 3:
        raise RuntimeError("Unsupported database schema version.")
