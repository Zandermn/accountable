from sqlalchemy import delete, insert, select, update

from backend.db import (
    TABLES,
    Problem,
    activities,
    contacts,
    deals,
    detached,
    now,
    organizations,
    state,
    uid,
)
from backend.services.records import append_position, find, get, require_link, table_for


def linked(conn, table, field, record_id):
    return [
        dict(r)
        for r in conn.execute(
            select(table)
            .where(table.c[field] == record_id, table.c.deleted_at.is_(None))
            .order_by(table.c.id)
        ).mappings()
    ]


def preview(conn, kind, record_id):
    row = get(conn, kind, record_id, stale_action=True)
    blockers, clear, cascade = [], [], []
    if kind == "organizations":
        clear = [
            dict(r, kind="contacts")
            for r in linked(conn, contacts, "organization_id", record_id)
        ]
        for deal in linked(conn, deals, "organization_id", record_id):
            (clear if deal["contact_id"] else blockers).append(dict(deal, kind="deals"))
    if kind == "contacts":
        blockers = linked(conn, deals, "contact_id", record_id)
    if kind in ("deals", "contacts"):
        cascade = linked(
            conn, activities, "deal_id" if kind == "deals" else "contact_id", record_id
        )
    return {
        "name": row.get("name") or row.get("description"),
        "blockers": blockers,
        "clear": clear,
        "cascade": cascade,
        "revision": conn.scalar(select(state.c.revision)),
    }


def discard(conn, kind, record_id, revision):
    impact = preview(conn, kind, record_id)
    if impact["blockers"] or impact["revision"] != revision:
        raise Problem("Review the current deletion impact.", 409, preview=impact)
    operation, stamp = uid(), now()
    for row in impact["clear"]:
        table = TABLES[row["kind"]]
        conn.execute(
            update(table)
            .where(table.c.id == row["id"])
            .values(organization_id=None, updated_at=stamp)
        )
        key = "contact_id" if table is contacts else "deal_id"
        conn.execute(
            insert(detached).values(
                organization_id=record_id, operation=operation, **{key: row["id"]}
            )
        )
    ids = [r["id"] for r in impact["cascade"]]
    conn.execute(
        update(activities)
        .where(activities.c.id.in_(ids))
        .values(deleted_at=stamp, deletion=operation)
    )
    table = table_for(kind)
    conn.execute(
        update(table)
        .where(table.c.id == record_id)
        .values(deleted_at=stamp, deletion=operation)
    )
    return {"ok": True}


def recovery(conn, kind, row):
    result = {}
    for key, table in (
        ("organization_id", organizations),
        ("contact_id", contacts),
        ("deal_id", deals),
    ):
        record_id = row.get(key)
        if key == "organization_id" and not record_id and kind in ("contacts", "deals"):
            foreign = (
                detached.c.contact_id if kind == "contacts" else detached.c.deal_id
            )
            record_id = conn.scalar(
                select(detached.c.organization_id).where(foreign == row["id"])
            )
        if record_id:
            target = find(conn, table, record_id)
            result[key] = {
                "name": target["name"],
                "id": record_id,
                "active": not target["deleted_at"],
                "kind": table.name,
            }
    return result


def trash_list(conn, kind=None, direction="desc"):
    rows = []
    for name, table in TABLES.items():
        if kind and kind != name:
            continue
        for row in conn.execute(
            select(table).where(table.c.deleted_at.is_not(None))
        ).mappings():
            rows.append(dict(row, kind=name, former=recovery(conn, name, row)))
    return sorted(
        rows, key=lambda r: (r["deleted_at"], r["id"]), reverse=direction == "desc"
    )


def restore(conn, kind, record_id, choices):
    row = get(conn, kind, record_id, trashed=True, stale_action=True)
    operation = row["deletion"]
    if choices.get("deletion") != operation:
        raise Problem(
            "This Trash entry changed. Close this dialog and select Restore again.", 409
        )
    table = table_for(kind)
    values = {"deleted_at": None, "deletion": None, "updated_at": now()}
    former = recovery(conn, kind, row)
    if kind == "organizations":
        for link in conn.execute(
            select(detached).where(detached.c.operation == operation)
        ).mappings():
            target, target_id = (
                (contacts, link["contact_id"])
                if link["contact_id"]
                else (deals, link["deal_id"])
            )
            conn.execute(
                update(target)
                .where(
                    target.c.id == target_id,
                    target.c.organization_id.is_(None),
                    target.c.deleted_at.is_(None),
                )
                .values(organization_id=record_id, updated_at=now())
            )
            # Keep pending history for a trashed child until the salesperson makes a choice.
            if not find(conn, target, target_id)["deleted_at"]:
                conn.execute(delete(detached).where(detached.c.id == link["id"]))
    elif kind == "contacts":
        previous = former.get("organization_id")
        if previous:
            if choices.get("organization_choice") not in ("previous", "individual"):
                raise Problem("Choose how to restore the contact.", 409, former=former)
            values["organization_id"] = (
                previous["id"] if choices["organization_choice"] == "previous" else None
            )
            require_link(conn, organizations, values, "organization_id")
        conn.execute(delete(detached).where(detached.c.contact_id == record_id))
    elif kind == "deals":
        for key, owner in (
            ("organization_id", organizations),
            ("contact_id", contacts),
        ):
            previous = former.get(key)
            values[key] = choices.get(
                key, previous["id"] if previous and previous["active"] else None
            )
            require_link(conn, owner, values, key)
        if not values["organization_id"] and not values["contact_id"]:
            raise Problem(
                "Restore or select an organization or main contact first.",
                409,
                former=former,
            )
        values["position"] = append_position(conn, row["stage"])
        if values["organization_id"] or "organization_id" in choices:
            conn.execute(delete(detached).where(detached.c.deal_id == record_id))
    else:
        owner = next(iter(former.values()))
        if not owner["active"]:
            raise Problem("Restore " + owner["name"] + " first.", 409, former=former)
    conn.execute(update(table).where(table.c.id == record_id).values(**values))
    if kind in ("contacts", "deals"):
        key = activities.c.contact_id if kind == "contacts" else activities.c.deal_id
        conn.execute(
            update(activities)
            .where(key == record_id, activities.c.deletion == operation)
            .values(deleted_at=None, deletion=None)
        )
    return get(conn, kind, record_id)
