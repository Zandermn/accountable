import pytest
from fastapi.testclient import TestClient

from backend.main import create_app


@pytest.fixture
def api(tmp_path, monkeypatch):
    monkeypatch.setenv("ACCOUNTABLE_BACKUPS", str(tmp_path / "backups"))
    with TestClient(create_app(tmp_path / "test.db", seed=False), base_url="http://127.0.0.1") as client:
        client.headers.update({"X-Dataset": "1"})
        yield client


def add(api, kind, **fields):
    response = api.post("/api/records/" + kind, json=fields)
    assert response.is_success, response.text
    return response.json()


def deal(api, name="Renewal", **fields):
    return add(
        api,
        "deals",
        **(
            {"name": name, "stage": "New", "expected_date": "2027-01-15", "value_cents": 10000}
            | fields
        ),
    )


def remove(api, kind, row):
    url = f"/api/records/{kind}/{row['id']}"
    preview = api.get(url + "/delete-preview").json()
    return api.request("DELETE", url, json={"revision": preview["revision"]})
