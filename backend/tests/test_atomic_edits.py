from conftest import add
from test_workbook import send, workbook

from backend.db import Problem
from backend.services import workbooks


def test_new_activity_changes_contact_delete_impact(api):
    person = add(api, "contacts", name="Customer", status="Lead")
    url = "/api/records/contacts/" + person["id"]
    preview = api.get(url + "/delete-preview").json()
    activity = add(
        api,
        "activities",
        type="Note",
        contact_id=person["id"],
        description="New note",
        occurred_at="2026-10-01T00:00:00Z",
    )
    response = api.request("DELETE", url, json={"revision": preview["revision"]})
    assert (
        response.status_code == 409
        and response.json()["preview"]["cascade"][0]["id"] == activity["id"]
    )
    assert api.get("/api/trash").json() == []


def test_later_apply_failure_rolls_back_earlier_rows(api, monkeypatch):
    data = workbook({"Organizations": [["first", "First"], ["second", "Second"]]})
    token = send(api, data).json()["token"]
    original = workbooks.save

    def fail_second(conn, kind, fields, *args, **kwargs):
        if fields["name"] == "Second":
            raise Problem("The row can no longer be saved.", 409, "name")
        return original(conn, kind, fields, *args, **kwargs)

    monkeypatch.setattr(workbooks, "save", fail_second)
    version = api.get("/api/version").json()
    response = send(api, data, token)
    assert response.status_code == 409 and response.json()["row"] == 3
    assert (
        api.get("/api/records/organizations").json() == []
        and api.get("/api/version").json() == version
    )
