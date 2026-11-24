from datetime import date

from conftest import add, deal

from backend.services import sales


def test_clearing_manual_probability_rejects_the_edit(api):
    org = add(api, "organizations", name="Client")
    sale = deal(api, organization_id=org["id"], probability=42)
    url = "/api/records/deals/" + sale["id"]
    response = api.patch(url, json={"probability": None})
    assert response.status_code == 422 and response.json()["field"] == "probability"
    assert api.get(url).json()["probability"] == 42


def test_move_placement_and_stale_event_idempotency(api):
    org = add(api, "organizations", name="Buyers")
    a, b, c = [deal(api, n, organization_id=org["id"], probability=37) for n in "ABC"]

    def move(row, stage, before=None, **extra):
        rev = api.get("/api/pipeline").json()["revision"]
        return api.post(
            "/api/pipeline/move",
            json={
                "id": row["id"],
                "stage": stage,
                "before": before,
                "revision": rev,
                **extra,
            },
        )

    def order(stage):
        return [
            r["name"]
            for r in api.get("/api/pipeline").json()["columns"][stage]["cards"]
        ]

    assert move(c, "New", a["id"]).is_success and order("New") == ["C", "A", "B"]
    assert move(c, "New", b["id"]).is_success and order("New") == ["A", "C", "B"]
    assert move(a, "New").is_success and order("New") == ["C", "B", "A"]
    saved = api.get("/api/records/deals/" + c["id"]).json()
    assert saved["probability"] == 37 and saved["timeline"] == []
    rev = api.get("/api/pipeline").json()["revision"]
    assert move(c, "Proposal").is_success and order("Proposal") == ["C"]
    assert move(c, "Lost", revision=rev).status_code == 409 and order("New") == [
        "B",
        "A",
    ]
    saved = api.get("/api/records/deals/" + c["id"]).json()
    assert (
        saved["stage"] == "Proposal"
        and saved["probability"] == 50
        and len(saved["timeline"]) == 1
    )


def test_close_switch_and_reopen_with_and_without_expected_date(api):
    org = add(api, "organizations", name="Client")
    row = deal(api, organization_id=org["id"])
    url = "/api/records/deals/" + row["id"]
    closed = api.patch(url, json={"stage": "Won", "probability": 42}).json()
    assert (
        closed["actual_date"] == date.today().isoformat()
        and closed["expected_date"] == row["expected_date"]
    )
    api.patch(url, json={"actual_date": "2025-12-31"}).raise_for_status()
    assert api.patch(url, json={"stage": "Lost"}).json()["actual_date"] == "2025-12-31"
    reopened = api.patch(url, json={"stage": "New"}).json()
    assert (
        reopened["actual_date"] is None
        and reopened["expected_date"] == row["expected_date"]
    )
    closed = deal(api, stage="Won", expected_date=None, organization_id=org["id"])
    url = "/api/records/deals/" + closed["id"]
    assert api.patch(url, json={"stage": "New"}).status_code == 422
    assert api.patch(
        url, json={"stage": "New", "expected_date": "2026-12-01"}
    ).is_success


def test_known_totals_calendar_buckets_funnel_and_followups(api):
    org = add(api, "organizations", name="Buyer")
    a = deal(api, stage="Qualified", probability=25, organization_id=org["id"])
    deal(api, stage="Proposal", value_cents=20000, organization_id=org["id"])
    deal(
        api,
        stage="Won",
        value_cents=5000,
        actual_date="2026-01-31",
        organization_id=org["id"],
    )
    for stage in ["Proposal", "Qualified"]:
        api.patch(
            "/api/records/deals/" + a["id"], json={"stage": stage}
        ).raise_for_status()
    for due in ("2026-02-27", "2026-02-28", "2026-03-01"):
        add(
            api,
            "activities",
            deal_id=a["id"],
            type="Note",
            description=due,
            occurred_at="2026-02-10T12:00:00Z",
            follow_up=due,
        )
    with api.app.state.store.read() as conn:
        report = sales.dashboard(conn, date(2026, 2, 28))
    assert report["totals"] == {"count": 2, "value": 30000, "expected": 12500}
    assert [(m["month"], m["wins"], m["revenue"]) for m in report["months"]] == [
        ("2025-09", 0, 0),
        ("2025-10", 0, 0),
        ("2025-11", 0, 0),
        ("2025-12", 0, 0),
        ("2026-01", 1, 5000),
        ("2026-02", 0, 0),
    ]
    assert report["funnel"] == {
        "New": 0,
        "Qualified": 10000,
        "Proposal": 30000,
        "Negotiation": 0,
        "Won": 5000,
        "Lost": 0,
    }
    assert [r["due"] for r in report["followups"]] == ["Overdue", "Today", "Upcoming"]


def test_expected_revenue_rounds_after_summing_fractional_cents(api):
    owner = add(api, "organizations", name="Fractional cents")
    for name in ("A", "B"):
        deal(api, name=name, value_cents=1, probability=25, organization_id=owner["id"])
    assert api.get("/api/dashboard").json()["totals"]["expected"] == 1
    assert api.get("/api/pipeline").json()["totals"]["expected"] == 1
