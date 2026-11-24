from conftest import add, deal, remove


def restore(api, kind, row, **choices):
    entry = next(r for r in api.get("/api/trash").json() if r["id"] == row["id"])
    return api.post(
        f"/api/trash/{kind}/{row['id']}",
        json={"deletion": entry["deletion"], **choices},
    )


def test_repeated_delete_and_restore_are_conflicts(api):
    org = add(api, "organizations", name="Client")
    url = "/api/records/organizations/" + org["id"]
    preview = api.get(url + "/delete-preview").json()
    body = {"revision": preview["revision"]}
    assert api.request("DELETE", url, json=body).is_success
    assert api.request("DELETE", url, json=body).status_code == 409

    entry = api.get("/api/trash").json()[0]
    restore_body = {"deletion": entry["deletion"]}
    restore_url = "/api/trash/organizations/" + org["id"]
    assert api.post(restore_url, json=restore_body).is_success
    assert api.post(restore_url, json=restore_body).status_code == 409
    assert api.get(url).is_success


def test_old_restore_cannot_reverse_a_new_deletion(api):
    org = add(api, "organizations", name="Client")
    assert remove(api, "organizations", org).is_success
    first = api.get("/api/trash").json()[0]
    assert restore(api, "organizations", org).is_success
    assert remove(api, "organizations", org).is_success
    for body in [{"deletion": first["deletion"]}, {}]:
        response = api.post("/api/trash/organizations/" + org["id"], json=body)
        assert response.status_code == 409
    assert restore(api, "organizations", org).is_success


def test_detachment_preserves_later_changes_and_contact_choice(api):
    org = add(api, "organizations", name="Original")
    other = add(api, "organizations", name="Other")
    people = [
        add(
            api,
            "contacts",
            name=f"Person {i}",
            status="Lead",
            organization_id=org["id"],
        )
        for i in range(3)
    ]
    sale = deal(api, contact_id=people[2]["id"], organization_id=org["id"])
    assert remove(api, "organizations", org).is_success
    for new in (other["id"], None):
        assert api.patch(
            "/api/records/contacts/" + people[0]["id"], json={"organization_id": new}
        ).is_success
    assert remove(api, "contacts", people[1]).is_success
    assert restore(
        api, "contacts", people[1], organization_choice="individual"
    ).is_success
    assert restore(api, "organizations", org).is_success
    rows = {r["id"]: r for r in api.get("/api/records/contacts").json()}
    assert [rows[p["id"]]["organization_id"] for p in people] == [None, None, org["id"]]
    assert (
        api.get("/api/records/deals/" + sale["id"]).json()["organization_id"]
        == org["id"]
    )


def test_explicit_blank_links_survive_organization_restore(api):
    org = add(api, "organizations", name="Original")
    person = add(
        api, "contacts", name="Buyer", status="Lead", organization_id=org["id"]
    )
    sale = deal(api, organization_id=org["id"], contact_id=person["id"])
    assert remove(api, "organizations", org).is_success
    for kind, row in (("contacts", person), ("deals", sale)):
        response = api.patch(
            f"/api/records/{kind}/" + row["id"], json={"organization_id": None}
        )
        assert response.is_success
    assert restore(api, "organizations", org).is_success
    for kind, row in (("contacts", person), ("deals", sale)):
        assert (
            api.get(f"/api/records/{kind}/" + row["id"]).json()["organization_id"]
            is None
        )


def test_cascade_restores_only_own_deletion_and_preserves_completion(api):
    who = add(api, "contacts", name="Buyer", status="Qualified")
    notes = [
        add(
            api,
            "activities",
            contact_id=who["id"],
            type="Call",
            description=f"Call {i}",
            occurred_at="2026-03-01T15:00:00Z",
            follow_up="2026-03-03",
        )
        for i in range(2)
    ]
    api.patch(
        "/api/records/activities/" + notes[0]["id"], json={"done": True}
    ).raise_for_status()
    assert remove(api, "activities", notes[1]).is_success
    assert remove(api, "contacts", who).is_success
    assert restore(api, "activities", notes[1]).status_code == 409
    assert restore(api, "contacts", who).is_success
    timeline = api.get("/api/records/contacts/" + who["id"]).json()["timeline"]
    assert [(r["id"], r["done"]) for r in timeline] == [(notes[0]["id"], True)]
    assert [r["id"] for r in api.get("/api/trash").json()] == [notes[1]["id"]]


def test_restore_deal_requires_surviving_or_replacement_link(api):
    org = add(api, "organizations", name="Past")
    sale = deal(api, organization_id=org["id"])
    assert remove(api, "deals", sale).is_success
    assert remove(api, "organizations", org).is_success
    assert restore(api, "deals", sale).status_code == 409
    person = add(api, "contacts", name="New buyer", status="Lead")
    result = restore(api, "deals", sale, contact_id=person["id"])
    assert result.is_success and result.json()["organization_id"] is None
