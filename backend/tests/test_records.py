import pytest
from conftest import add, deal, remove


def test_linked_search_status_and_typed_sort(api):
    org = add(api, "organizations", name="Harbor")
    first = add(api, "contacts", name="Morgan", status="Lead", organization_id=org["id"])
    add(api, "contacts", name="Bela", status="Customer", organization_id=org["id"])
    assert [r["id"] for r in api.get("/api/records/contacts?search=HARb&status=Lead").json()] == [
        first["id"]
    ]
    rows = [deal(api, value_cents=v, organization_id=org["id"]) for v in (200, 30, 30)]
    result = api.get("/api/records/deals?sort=value_cents&search=Harbor").json()
    assert [r["id"] for r in result] == sorted([rows[1]["id"], rows[2]["id"]]) + [rows[0]["id"]]


def test_three_link_combinations_and_unavailable_links(api):
    org = add(api, "organizations", name="One")
    contact = add(api, "contacts", name="Eli", status="Lead")
    for links in (
        {"organization_id": org["id"]},
        {"contact_id": contact["id"]},
        {"contact_id": contact["id"], "organization_id": org["id"]},
    ):
        deal(api, **links)
    for links in ({}, {"contact_id": "missing"}):
        assert api.post(
            "/api/records/deals", json={"name": "Bad", "value_cents": 0, "stage": "Won", **links}
        ).status_code in (409, 422)
    other = add(api, "organizations", name="Retired")
    assert remove(api, "organizations", other).is_success
    assert (
        api.post(
            "/api/records/deals",
            json={"name": "Bad", "value_cents": 0, "stage": "Won", "organization_id": other["id"]},
        ).status_code
        == 409
    )


@pytest.mark.parametrize("stage", ["Won", "Lost"])
def test_stale_preview_returns_all_current_blockers_without_detaching(api, stage):
    org = add(api, "organizations", name="Buyer")
    contact = add(api, "contacts", name="Lin", status="Lead", organization_id=org["id"])
    url = "/api/records/organizations/" + org["id"]
    preview = api.get(url + "/delete-preview").json()
    blockers = [deal(api, str(i), stage=stage, organization_id=org["id"]) for i in range(2)]
    response = api.request("DELETE", url, json={"revision": preview["revision"]})
    assert response.status_code == 409
    assert {r["id"] for r in response.json()["preview"]["blockers"]} == {r["id"] for r in blockers}
    assert api.get("/api/records/contacts/" + contact["id"]).json()["organization_id"] == org["id"]


def test_deal_sorts_use_stage_order_calendar_dates_and_id_ties(api):
    org = add(api, "organizations", name="Sort buyer")
    first = deal(api, "Z", stage="Proposal", expected_date="2027-03-01", organization_id=org["id"])
    second = deal(
        api, "A", stage="Negotiation", expected_date="2026-12-01", organization_id=org["id"]
    )
    third = deal(api, "M", stage="Proposal", expected_date="2027-03-01", organization_id=org["id"])
    tied = sorted([first["id"], third["id"]])
    for query, wanted in [
        ("sort=stage", tied + [second["id"]]),
        ("sort=close_date", [second["id"]] + tied),
    ]:
        assert [r["id"] for r in api.get("/api/records/deals?" + query).json()] == wanted
