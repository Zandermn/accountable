from conftest import add, deal, remove


def test_search_matches_names_by_casefolded_substring_across_types(api):
    org = add(api, "organizations", name="Straße Works")
    contact = add(api, "contacts", name="Strasse Jones", status="Lead")
    sale = deal(api, name="North STRASSE renewal", organization_id=org["id"])

    result = api.get("/api/search", params={"q": "  sTrAsSe "}).json()
    assert {(r["kind"], r["id"], r["name"]) for r in result} == {
        ("organizations", org["id"], "Straße Works"),
        ("contacts", contact["id"], "Strasse Jones"),
        ("deals", sale["id"], "North STRASSE renewal"),
    }


def test_search_treats_wildcards_as_text_and_ignores_trash(api):
    live = add(api, "organizations", name="20%_ active")
    discarded = add(api, "organizations", name="20%_ discarded")
    add(api, "organizations", name="20xZ filler")
    remove(api, "organizations", discarded).raise_for_status()

    result = api.get("/api/search", params={"q": "%_"}).json()
    assert [row["id"] for row in result] == [live["id"]]
    assert api.get("/api/search", params={"q": "  "}).json() == []
    assert api.get("/api/search").json() == []
