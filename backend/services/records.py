import re
from datetime import UTC, date, datetime
from urllib.parse import urlsplit

from sqlalchemy import delete, func, insert, select, update

from backend.db import (
    OPEN,
    STAGES,
    TABLES,
    Problem,
    activities,
    contacts,
    deals,
    detached,
    events,
    now,
    organizations,
    uid,
)

FIELDS = {
    "organizations": ("name", "website", "industry", "notes"),
    "contacts": ("name", "status", "job_title", "organization_id", "email", "phone"),
    "deals": (
        "name",
        "stage",
        "value_cents",
        "probability",
        "expected_date",
        "actual_date",
        "organization_id",
        "contact_id",
    ),
    "activities": (
        "type",
        "description",
        "occurred_at",
        "follow_up",
        "done",
        "contact_id",
        "deal_id",
    ),
}


def table_for(kind):
    if kind not in TABLES:
        raise Problem("Unknown record type.", 404)
    return TABLES[kind]


def find(conn, table, record_id):
    result = conn.execute(select(table).where(table.c.id == record_id)).mappings().first()
    return dict(result) if result else None


def get(conn, kind, record_id, trashed=False, stale_action=False):
    row = find(conn, table_for(kind), record_id)
    if row is None:
        raise Problem("This record is unavailable. Refresh the list.", 404)
    if bool(row["deleted_at"]) != trashed:
        if stale_action:
            raise Problem("This action no longer applies. Refresh the list.", 409)
        raise Problem("This record is unavailable. Refresh the list.", 404)
    return row


def require_link(conn, table, fields, key):
    if fields.get(key):
        linked = find(conn, table, fields[key])
        if not linked or linked["deleted_at"]:
            raise Problem("Choose an active linked record.", 409, key)


def choice(fields, key, allowed):
    if fields.get(key) not in allowed:
        raise Problem("Select a valid option.", field=key)


def calendar(fields, key):
    value = fields.get(key)
    if value is not None:
        try:
            if date.fromisoformat(value).isoformat() != value:
                raise ValueError
        except (ValueError, TypeError):
            raise Problem("Enter a date in YYYY-MM-DD format.", field=key)


def integer(fields, key, maximum):
    value = fields.get(key)
    if type(value) is not int or not 0 <= value <= maximum:
        raise Problem(f"Enter a whole number from 0 to {maximum}.", field=key)


def append_position(conn, stage):
    last = conn.scalar(
        select(func.max(deals.c.position)).where(
            deals.c.deleted_at.is_(None), deals.c.stage == stage
        )
    )
    return (last if last is not None else -1) + 1


def deal_fields(conn, fields, old, today):
    stage = fields.get("stage")
    choice(fields, "stage", STAGES)
    changed = old and old["stage"] != stage
    if changed or (not old and fields.get("probability") is None):
        fields["probability"] = STAGES[stage]
    integer(fields, "value_cents", 9007199254740991)
    integer(fields, "probability", 100)
    if changed:
        if (stage not in OPEN or old["stage"] not in OPEN) and not fields.get("expected_date"):
            fields["expected_date"] = old["expected_date"]
        if stage not in OPEN and old["stage"] not in OPEN and not fields.get("actual_date"):
            fields["actual_date"] = old["actual_date"]
    calendar(fields, "expected_date")
    if stage in OPEN:
        fields["actual_date"] = None
        if not fields.get("expected_date"):
            raise Problem("Enter the expected close date.", field="expected_date")
    else:
        if not old or changed:
            fields["actual_date"] = fields.get("actual_date") or today.isoformat()
        calendar(fields, "actual_date")
        if not fields.get("actual_date"):
            raise Problem("Enter the actual close date.", field="actual_date")
    if not fields.get("organization_id") and not fields.get("contact_id"):
        raise Problem("Choose an organization or main contact.", field="organization_id")
    require_link(conn, contacts, fields, "contact_id")
    if not old or changed:
        fields["position"] = append_position(conn, stage)
    if not old:
        fields["initial_stage"] = stage


def save(conn, kind, supplied, record_id=None, new_id=None, today=None):
    table = table_for(kind)
    old = get(conn, kind, record_id) if record_id else {}
    fields = {k: old[k] for k in FIELDS[kind] if k in old}
    if set(supplied) - set(FIELDS[kind]):
        raise Problem("Unknown field in record.")
    for key, value in supplied.items():
        if key not in ("value_cents", "probability", "done") and value is not None:
            if not isinstance(value, str):
                raise Problem("Enter text.", field=key)
            value = value.strip() or None
        fields[key] = value
    name = "description" if kind == "activities" else "name"
    if not fields.get(name):
        raise Problem("Enter a " + name + ".", field=name)
    require_link(conn, organizations, fields, "organization_id")
    if kind == "organizations" and fields.get("website"):
        try:
            url = urlsplit(fields["website"])
            valid = url.scheme in ("https", "http") and bool(url.hostname)
        except ValueError:
            valid = False
        if not valid:
            raise Problem("Enter an HTTP or HTTPS website.", field="website")
    if kind == "contacts":
        choice(fields, "status", ("Lead", "Qualified", "Customer"))
        if fields.get("email") and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", fields["email"]):
            raise Problem("Enter a valid email address.", field="email")
    if kind == "deals":
        deal_fields(conn, fields, old, today or date.today())
    if kind == "activities":
        choice(fields, "type", ("Note", "Call", "Email"))
        if bool(fields.get("deal_id")) == bool(fields.get("contact_id")):
            raise Problem("Select one activity owner.")
        for key, owner in (("deal_id", deals), ("contact_id", contacts)):
            if old and fields.get(key) != old[key]:
                raise Problem("The activity owner cannot change.", field=key)
            require_link(conn, owner, fields, key)
        try:
            stamp = datetime.fromisoformat(fields["occurred_at"])
            if stamp.tzinfo is None:
                raise ValueError
            fields["occurred_at"] = stamp.astimezone(UTC).isoformat()
        except (KeyError, ValueError, TypeError):
            raise Problem("Enter the time of occurrence with its time zone.", field="occurred_at")
        calendar(fields, "follow_up")
        if "done" in fields and type(fields["done"]) is not bool:
            raise Problem("Select a completion state.", field="done")
        if not old or not fields.get("follow_up"):
            fields["done"] = False
    if old:
        if kind in ("contacts", "deals") and "organization_id" in supplied:
            key = detached.c.contact_id if kind == "contacts" else detached.c.deal_id
            conn.execute(delete(detached).where(key == record_id))
        conn.execute(
            update(table).where(table.c.id == record_id).values(**fields, updated_at=now())
        )
        if kind == "deals" and old["stage"] != fields["stage"]:
            conn.execute(
                insert(events).values(
                    deal_id=record_id, previous=old["stage"], stage=fields["stage"]
                )
            )
    else:
        record_id = new_id or uid()
        if any(find(conn, t, record_id) for t in TABLES.values()):
            raise Problem("This ID is already in use.", 409, "id")
        conn.execute(insert(table).values(id=record_id, **fields))
    return get(conn, kind, record_id)


def listing(conn, kind, search="", sort="name", direction="asc", status=None, today=None):
    table = table_for(kind)
    stmt = select(table).where(table.c.deleted_at.is_(None))
    if kind == "organizations":
        for linked in (contacts, deals):
            count = (
                select(func.count())
                .select_from(linked)
                .where(linked.c.organization_id == organizations.c.id, linked.c.deleted_at.is_(None))
                .scalar_subquery()
            )
            stmt = stmt.add_columns(count.label(linked.name + "_count"))
    if kind in ("deals", "contacts"):
        stmt = stmt.outerjoin(
            organizations, organizations.c.id == table.c.organization_id
        ).add_columns(organizations.c.name.label("organization"))
    if kind == "deals":
        stmt = stmt.outerjoin(contacts, contacts.c.id == deals.c.contact_id).add_columns(
            contacts.c.name.label("contact")
        )
    if kind == "contacts" and status:
        stmt = stmt.where(contacts.c.status == status)
    rows = [dict(r) for r in conn.execute(stmt).mappings()]
    for row in rows:
        if kind == "deals":
            opened = row["stage"] in OPEN
            row["close_date"] = row["expected_date"] if opened else row["actual_date"]
            row["late"] = opened and row["expected_date"] < (today or date.today()).isoformat()
    visible = {
        "organizations": ("name", "industry", "website", "contacts_count", "deals_count"),
        "contacts": ("name", "status", "organization", "email", "phone"),
        "deals": (
            "name",
            "stage",
            "value_cents",
            "probability",
            "close_date",
            "organization",
            "contact",
        ),
        "activities": ("type", "description", "occurred_at", "follow_up"),
    }
    if search:
        term = search.strip().casefold()

        def matches(row):
            values = [str(row[k]) for k in visible[kind] if row.get(k) is not None]
            if kind == "deals":
                close = date.fromisoformat(row["close_date"])
                values.extend(
                    [
                        f"{close:%b} {close.day}",
                        f"US${row['value_cents'] / 100:,.2f}",
                        f"{row['probability']}%",
                        "Late" if row["late"] else "",
                    ]
                )
            return any(term in value.casefold() for value in values)

        rows = [row for row in rows if matches(row)]
    if sort not in visible[kind]:
        sort = visible[kind][0]

    def sort_key(row):
        value = row.get(sort)
        if sort == "stage":
            return list(STAGES).index(value)
        return value.casefold() if isinstance(value, str) else value

    rows.sort(key=lambda r: r["id"])
    rows.sort(key=lambda r: (r.get(sort) is not None, sort_key(r)), reverse=direction == "desc")
    return rows


def timeline(conn, kind, record_id):
    key = activities.c.deal_id if kind == "deals" else activities.c.contact_id
    rows = [
        dict(r)
        for r in conn.execute(
            select(activities).where(key == record_id, activities.c.deleted_at.is_(None))
        ).mappings()
    ]
    if kind == "deals":
        for r in conn.execute(select(events).where(events.c.deal_id == record_id)).mappings():
            rows.append(
                dict(r, type="Stage", description=f"Moved from {r['previous']} to {r['stage']}")
            )
    return sorted(rows, key=lambda r: (r["occurred_at"], r["id"]), reverse=True)


def detail(conn, kind, record_id):
    row = get(conn, kind, record_id)
    related = []
    for key, target in (
        ("organization_id", organizations),
        ("contact_id", contacts),
        ("deal_id", deals),
    ):
        if row.get(key):
            other = find(conn, target, row[key])
            related.append({"kind": target.name, "id": other["id"], "name": other["name"]})
    if kind in ("organizations", "contacts"):
        for table in [contacts, deals] if kind == "organizations" else [deals]:
            key = table.c.organization_id if kind == "organizations" else table.c.contact_id
            related.extend(
                dict(r, kind=table.name)
                for r in conn.execute(
                    select(table.c.id, table.c.name)
                    .where(key == record_id, table.c.deleted_at.is_(None))
                    .order_by(table.c.name)
                ).mappings()
            )
    return dict(
        row,
        related=related,
        timeline=timeline(conn, kind, record_id) if kind in ("deals", "contacts") else [],
    )
