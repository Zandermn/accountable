from datetime import UTC, date, datetime, timedelta

from sqlalchemy import insert

from backend.db import STAGES, activities, contacts, deals, events, organizations


def sample(conn):
    today = date.today()
    owners = [
        ("Harbor Works", "Manufacturing", "Maya Chen", "Customer"),
        ("Juniper Studio", "Design", "Alex Rivera", "Qualified"),
        ("Fieldstone Foods", "Food services", "Sam Patel", "Lead"),
        ("Northline Health", "Healthcare", "Jo Morgan", "Qualified"),
    ]
    for i, (company, industry, person, status) in enumerate(owners):
        domain = company.lower().replace(" ", "") + ".example"
        conn.execute(
            insert(organizations).values(
                id=f"org-{i}",
                name=company,
                industry=industry,
                website="https://" + domain,
                notes=[
                    "Purchasing for two workshops.",
                    "Design team opening a second studio.",
                    "Regional supplier with seasonal orders.",
                    "Purchasing for a group of local clinics.",
                ][i],
            )
        )
        conn.execute(
            insert(contacts).values(
                id=f"person-{i}",
                name=person,
                status=status,
                organization_id=f"org-{i}",
                email=person.split()[0].lower() + "@" + domain,
                phone=f"+1 202 555 010{i}",
                job_title=[
                    "Purchasing manager",
                    "Studio director",
                    "Operations lead",
                    "Clinic manager",
                ][i],
            )
        )
    names = [
        "Workshop expansion",
        "Studio rollout",
        "Annual supply agreement",
        "Clinic renewal",
        "Service contract",
        "Pilot program",
        "Equipment upgrade",
        "Regional launch",
        "Training package",
    ]
    for i, name in enumerate(names):
        stage = list(STAGES)[i % 6] if i < 6 else ["Won", "Proposal", "Won"][i - 6]
        closed = stage in ("Won", "Lost")
        close = today + timedelta(days=-2 if i == 2 else 8 + i * 5)
        conn.execute(
            insert(deals).values(
                id=f"deal-{i}",
                name=name,
                stage=stage,
                initial_stage="Qualified" if closed else stage,
                probability=STAGES[stage],
                value_cents=(i + 2) * 185000,
                position=i,
                expected_date=close.isoformat(),
                actual_date=(today - timedelta(days=(i - 4) * 22)).isoformat()
                if closed
                else None,
                organization_id=f"org-{i % 4}",
                contact_id=f"person-{i % 4}",
            )
        )
        if closed:
            conn.execute(
                insert(events).values(
                    deal_id=f"deal-{i}",
                    previous="Qualified",
                    stage=stage,
                    occurred_at=datetime.combine(
                        today - timedelta(days=(i - 4) * 22), datetime.min.time()
                    )
                    .astimezone(UTC)
                    .isoformat(),
                )
            )
    for i, (kind, description, days) in enumerate(
        [
            ("Call", "Confirm delivery dates with Maya", -2),
            ("Email", "Send the revised studio proposal", 0),
            ("Note", "Review the purchasing forecast", 3),
            ("Call", "Schedule the clinic walkthrough", 6),
        ]
    ):
        owner = (
            {"contact_id": f"person-{i}"} if i % 2 == 0 else {"deal_id": f"deal-{i}"}
        )
        conn.execute(
            insert(activities).values(
                **owner,
                type=kind,
                description=description,
                occurred_at=(datetime.now(UTC) - timedelta(days=i + 1)).isoformat(),
                follow_up=(today + timedelta(days=days)).isoformat(),
            )
        )
    for i, note in [
        (0, "Maya wants installation between production shifts."),
        (4, "The signed service agreement covers both workshops."),
    ]:
        conn.execute(
            insert(activities).values(
                deal_id=f"deal-{i}",
                type="Note",
                description=note,
                occurred_at=(datetime.now(UTC) - timedelta(days=5 + i)).isoformat(),
            )
        )
