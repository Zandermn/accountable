from datetime import date

from sqlalchemy import delete, select, update

from backend.db import Store, organizations


def test_version_uses_local_date_and_accepts_only_local_app_hosts(api):
    for host in ("localhost:5173", "127.0.0.1:8000"):
        response = api.get("/api/version", headers={"Host": host})
        assert response.is_success and response.json()["today"] == date.today().isoformat()
    assert api.get("/api/version", headers={"Host": "example.invalid"}).status_code == 400


def test_first_run_seeds_once_and_preserves_edits_and_empty_state(tmp_path):
    path = tmp_path / "sales.db"
    store = Store(path)
    with store.write() as conn:
        first = conn.scalar(select(organizations.c.id))
        assert first
        conn.execute(
            update(organizations).where(organizations.c.id == first).values(name="Retained")
        )
    store = Store(path)
    with store.write() as conn:
        assert (
            conn.scalar(select(organizations.c.name).where(organizations.c.id == first))
            == "Retained"
        )
        for table in reversed(store.data_tables):
            conn.execute(delete(table))
    with Store(path).read() as conn:
        assert conn.scalar(select(organizations.c.id)) is None
