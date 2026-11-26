from datetime import UTC, datetime

import pytest
from conftest import add, deal, remove


@pytest.mark.parametrize("headers", [{}, {"Authorization": "Bearer invalid"}])
def test_version_requires_a_valid_token(api, headers):
    api.headers.pop("Authorization", None)
    assert api.get("/api/version", headers=headers).status_code == 401


def test_two_users_share_records_and_preserve_creator(api):
    organization = add(
        api, "organizations", name="Shared", created_by="forged", updated_by="forged"
    )
    assert organization["created_by"] == "alex"
    assert organization["added_by"] == "Alex Morgan"
    url = f"/api/records/organizations/{organization['id']}"
    api.headers["Authorization"] = "Bearer blair-token"
    assert api.get(url).json()["name"] == "Shared"
    updated = api.patch(url, json={"name": "Shared update"}).json()
    assert updated["created_by"] == "alex"
    assert updated["updated_by"] == "blair"
    assert updated["added_by"] == "Alex Morgan"
    assert (
        add(api, "organizations", name="Fallback")["added_by"] == "blair@example.test"
    )


@pytest.mark.parametrize(
    "instant, expected",
    [
        (datetime(2027, 1, 2, 5, tzinfo=UTC), ["Overdue", "Due today"]),
        (datetime(2027, 7, 2, 4, tzinfo=UTC), ["Overdue", "Due today"]),
    ],
)
def test_follow_up_status_uses_the_saved_zone(api, monkeypatch, instant, expected):
    from backend.services import sales

    class Clock(datetime):
        @classmethod
        def now(cls, tz=None):
            return instant.astimezone(tz)

    monkeypatch.setattr(sales, "datetime", Clock)
    owner = add(api, "contacts", name="Owner", status="Lead")
    for zone in ("America/New_York", "America/Los_Angeles"):
        add(
            api,
            "activities",
            contact_id=owner["id"],
            description=zone,
            type="Call",
            occurred_at=instant.isoformat(),
            follow_up=instant.date().replace(day=1).isoformat(),
            follow_up_zone=zone,
        )
    rows = api.get("/api/dashboard").json()["followups"]
    by_zone = {row["follow_up_zone"]: row["due"] for row in rows}
    assert by_zone == dict(zip(("America/New_York", "America/Los_Angeles"), expected))


def test_stage_move_and_completion_record_the_verified_editor(api):
    org = add(api, "organizations", name="Buyer")
    sale = deal(api, organization_id=org["id"])
    task = add(
        api,
        "activities",
        deal_id=sale["id"],
        type="Note",
        description="Call buyer",
        occurred_at="2027-01-01T12:00:00Z",
        follow_up="2027-01-02",
    )
    assert task["follow_up_zone"] == "America/New_York"

    api.headers["Authorization"] = "Bearer blair-token"
    board = api.get("/api/pipeline").json()
    api.post(
        "/api/pipeline/move",
        json={
            "id": sale["id"],
            "revision": board["revision"],
            "stage": "Qualified",
        },
    ).raise_for_status()
    completed = api.patch(
        "/api/records/activities/" + task["id"], json={"done": True}
    ).json()
    assert (completed["created_by"], completed["updated_by"], completed["done"]) == (
        "alex",
        "blair",
        True,
    )
    moved = api.get("/api/records/deals/" + sale["id"]).json()
    assert (moved["created_by"], moved["updated_by"]) == ("alex", "blair")
    assert (
        next(row for row in moved["timeline"] if row["type"] == "Stage")["added_by"]
        == "blair@example.test"
    )


def test_trash_cascades_attribute_the_editor_and_keep_original_creators(api):
    org = add(api, "organizations", name="Buyer")
    contact = add(
        api, "contacts", name="Owner", status="Lead", organization_id=org["id"]
    )
    note = add(
        api,
        "activities",
        contact_id=contact["id"],
        type="Note",
        description="Call buyer",
        occurred_at="2027-01-01T12:00:00Z",
    )
    api.headers["Authorization"] = "Bearer blair-token"
    remove(api, "organizations", org).raise_for_status()
    url = "/api/records/contacts/" + contact["id"]
    detached = api.get(url).json()
    assert (detached["organization_id"], detached["updated_by"]) == (None, "blair")
    org_entry = api.get("/api/trash?kind=organizations").json()[0]
    api.post(
        "/api/trash/organizations/" + org["id"],
        json={"deletion": org_entry["deletion"]},
    ).raise_for_status()
    assert api.get(url).json()["organization_id"] == org["id"]

    remove(api, "contacts", contact).raise_for_status()
    entry = api.get("/api/trash?kind=activities").json()[0]
    assert (entry["id"], entry["added_by"], entry["updated_by"]) == (
        note["id"],
        "Alex Morgan",
        "blair",
    )
    api.headers["Authorization"] = "Bearer alex-token"
    api.post(
        "/api/trash/contacts/" + contact["id"],
        json={
            "deletion": entry["deletion"],
            "organization_choice": "previous",
        },
    ).raise_for_status()
    restored = api.get(url).json()["timeline"][0]
    assert (restored["added_by"], restored["updated_by"]) == ("Alex Morgan", "alex")


@pytest.mark.parametrize(
    "status, profile, expected",
    [
        (
            200,
            {
                "id": "verified",
                "email": "user@example.test",
                "user_metadata": {"display_name": "Verified User"},
            },
            200,
        ),
        (401, {"message": "Expired token"}, 401),
        (503, {"message": "Provider unavailable"}, 503),
        (200, {"id": "verified"}, 503),
    ],
)
def test_bearer_is_verified_with_supabase_user_endpoint(
    tmp_path, status, profile, expected
):
    import asyncio

    import httpx
    from fastapi.testclient import TestClient

    from backend.auth import SupabaseAuth
    from backend.main import create_app

    def provider(request):
        assert request.url == "https://auth.example.test/auth/v1/user"
        assert request.headers["Authorization"] == "Bearer access"
        assert request.headers["apikey"] == "public-test-key"
        return httpx.Response(status, json=profile)

    http = httpx.AsyncClient(transport=httpx.MockTransport(provider))
    verifier = SupabaseAuth(http, "https://auth.example.test/", "public-test-key")
    try:
        with TestClient(
            create_app(tmp_path / "auth.db", seed=False, verify_token=verifier)
        ) as client:
            response = client.post(
                "/api/records/organizations",
                headers={"Authorization": "Bearer access", "X-Dataset": "1"},
                json={"name": "Example"},
            )
            assert response.status_code == expected
            if expected == 200:
                assert response.json()["created_by"] == "verified"
                assert response.json()["added_by"] == "Verified User"
    finally:
        asyncio.run(http.aclose())
