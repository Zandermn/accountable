from conftest import add
from fastapi.testclient import TestClient
from sqlalchemy import update

from backend.db import app_preferences, state
from backend.main import create_app
from backend.services import backups

PATH = "/api/preferences/theme"


def test_default_save_validate_and_reopen(api):
    assert api.get(PATH).json() == {"theme": "light"}
    version = api.get("/api/version").json()
    for theme in ("dark", "light", "dark"):
        assert api.put(PATH, json={"theme": theme}).json() == {"theme": theme}
        assert api.get(PATH).json() == {"theme": theme}
    assert api.put(PATH, json={"theme": "system"}).status_code == 422
    assert api.get("/api/version").json() == version
    with TestClient(
        create_app(api.app.state.store.path), base_url="http://127.0.0.1"
    ) as reopened:
        assert reopened.get(PATH).json() == {"theme": "dark"}


def test_migrates_existing_database(api):
    record = add(api, "organizations", name="Existing customer")
    store = api.app.state.store
    before = api.get("/api/version").json()
    with store.write(advance=False) as conn:
        app_preferences.drop(conn)
        conn.execute(update(state).values(schema_version=1))

    with TestClient(create_app(store.path), base_url="http://127.0.0.1") as reopened:
        version = reopened.get("/api/version").json()
        assert version["schema_version"] == 2
        assert version["dataset"] == before["dataset"]
        assert version["revision"] == before["revision"]
        assert (
            reopened.get("/api/records/organizations/" + record["id"]).json()["name"]
            == record["name"]
        )
        assert reopened.get(PATH).json() == {"theme": "light"}


def test_sales_backup_load_and_reset_preserve_theme(api):
    store = api.app.state.store
    saved = backups.save_backup(store)
    api.put(PATH, json={"theme": "dark"}).raise_for_status()
    backups.replace(store, saved["id"])
    assert api.get(PATH).json() == {"theme": "dark"}
    backups.replace(store)
    assert api.get(PATH).json() == {"theme": "dark"}
