from collections import Counter
from datetime import date

from sqlalchemy import select, update

from backend.db import OPEN, STAGES, Problem, activities, contacts, deals, events, state
from backend.services.records import get, listing, save


def totals(cards):
    return {
        "count": len(cards),
        "value": sum(c["value_cents"] for c in cards),
        "expected": (sum(c["value_cents"] * c["probability"] for c in cards) + 50) // 100,
    }


def board(conn):
    cards = listing(conn, "deals")
    notes = Counter(
        conn.scalars(
            select(activities.c.deal_id).where(
                activities.c.deleted_at.is_(None), activities.c.type == "Note"
            )
        )
    )
    columns = {}
    for stage in STAGES:
        lane = sorted(
            (dict(r, note_count=notes[r["id"]]) for r in cards if r["stage"] == stage),
            key=lambda r: (r["position"], r["id"]),
        )
        columns[stage] = {"cards": lane, "totals": totals(lane)}
    return {
        "revision": conn.scalar(select(state.c.revision)),
        "columns": columns,
        "totals": totals([r for r in cards if r["stage"] in OPEN]),
    }


def move(conn, body):
    deal = get(conn, "deals", body.get("id"))
    stage = body.get("stage")
    if stage not in STAGES:
        raise Problem("Choose a pipeline stage.", field="stage")
    changes = {"stage": stage}
    if "expected_date" in body:
        changes["expected_date"] = body["expected_date"]
    save(conn, "deals", changes, deal["id"])
    for lane in {stage, deal["stage"]}:
        ids = list(
            conn.scalars(
                select(deals.c.id)
                .where(
                    deals.c.stage == lane, deals.c.deleted_at.is_(None), deals.c.id != deal["id"]
                )
                .order_by(deals.c.position, deals.c.id)
            )
        )
        if lane == stage:
            before = body.get("before")
            if before is not None and before not in ids:
                raise Problem("The selected position changed. Choose it again.", 409)
            ids.insert(ids.index(before) if before else len(ids), deal["id"])
        for position, record_id in enumerate(ids):
            conn.execute(update(deals).where(deals.c.id == record_id).values(position=position))
    result = board(conn)
    result["revision"] += 1
    return result


def dashboard(conn, today=None):
    today = today or date.today()
    cards = listing(conn, "deals", today=today)
    months = {}
    for offset in range(-5, 1):
        y, m = divmod(today.year * 12 + today.month - 1 + offset, 12)
        month = f"{y:04d}-{m + 1:02d}"
        months[month] = {"month": month, "wins": 0, "revenue": 0}
    funnel = dict.fromkeys(STAGES, 0)
    owners = {r["id"]: r["name"] for r in cards}
    owners.update(
        dict(
            conn.execute(
                select(contacts.c.id, contacts.c.name).where(contacts.c.deleted_at.is_(None))
            ).all()
        )
    )
    reached = {r["id"]: {r["initial_stage"]} for r in cards}
    history = []
    for event in conn.execute(select(events)).mappings():
        record_id = event["deal_id"]
        if record_id in reached:
            reached[record_id].add(event["stage"])
            history.append(
                dict(
                    event,
                    owner=owners[record_id],
                    owner_id=record_id,
                    kind="deals",
                    type="Stage",
                    description=f"Moved from {event['previous']} to {event['stage']}",
                )
            )
    for card in cards:
        if card["stage"] == "Won" and card["actual_date"][:7] in months:
            bucket = months[card["actual_date"][:7]]
            bucket["wins"] += 1
            bucket["revenue"] += card["value_cents"]
        for stage in reached[card["id"]]:
            funnel[stage] += card["value_cents"]
    followups = []
    for activity in conn.execute(
        select(activities).where(activities.c.deleted_at.is_(None))
    ).mappings():
        owner = activity["deal_id"] or activity["contact_id"]
        if owner not in owners:
            continue
        row = dict(
            activity,
            kind="deals" if activity["deal_id"] else "contacts",
            owner_id=owner,
            owner=owners[owner],
        )
        history.append(row)
        due = row["follow_up"]
        if due and not row["done"]:
            row["due"] = (
                "Overdue"
                if due < today.isoformat()
                else "Today"
                if due == today.isoformat()
                else "Upcoming"
            )
            followups.append(row)
    return {
        "months": list(months.values()),
        "funnel": funnel,
        "totals": totals([r for r in cards if r["stage"] in OPEN]),
        "recent": sorted(history, key=lambda r: (r["occurred_at"], r["id"]), reverse=True)[:10],
        "followups": sorted(followups, key=lambda r: (r["follow_up"], r["id"])),
    }
