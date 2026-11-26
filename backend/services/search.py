from sqlalchemy import literal, select, union_all

from backend.db import contacts, deals, organizations


def search(conn, query):
    term = query.strip().casefold()
    if not term:
        return []

    names = union_all(
        *(
            select(table.c.id, table.c.name, literal(table.name).label("kind")).where(
                table.c.deleted_at.is_(None)
            )
            for table in (organizations, contacts, deals)
        )
    )
    # Use one Unicode comparison for both database engines.
    matches = [
        dict(row)
        for row in conn.execute(names).mappings()
        if term in row["name"].casefold()
    ]
    return sorted(
        matches, key=lambda row: (row["name"].casefold(), row["kind"], row["id"])
    )
