from datetime import date

from sqlalchemy import delete, select, update

from backend.db import Store, organizations


def test_version_uses_local_date_on_local_and_hosted_app_hosts(api):
    for host in ("localhost:5173", "127.0.0.1:8000", "accountable.onrender.com"):
        response = api.get("/api/version", headers={"Host": host})
        assert (
            response.is_success and response.json()["today"] == date.today().isoformat()
        )


def test_first_run_seeds_once_and_preserves_edits_and_empty_state(tmp_path):
    path = tmp_path / "sales.db"
    store = Store(path)
    with store.write() as conn:
        first = conn.scalar(select(organizations.c.id))
        assert first
        conn.execute(
            update(organizations)
            .where(organizations.c.id == first)
            .values(name="Retained")
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


def test_seeded_creator_label_survives_an_edit(tmp_path):
    from fastapi.testclient import TestClient

    from backend.tests.local_app import create_test_app

    with TestClient(create_test_app(tmp_path / "seeded.db")) as api:
        api.headers.update({"Authorization": "Bearer blair-token", "X-Dataset": "1"})
        url = "/api/records/organizations/org-0"
        assert api.get(url).json()["added_by"] == "Sample data"
        edited = api.patch(url, json={"industry": "Logistics"}).json()
        assert (edited["added_by"], edited["updated_by"]) == ("Sample data", "blair")
        activities = api.get("/api/dashboard").json()["recent"]
        assert activities and all(
            row["added_by"] == "Sample data" for row in activities
        )


def test_parallel_startup_initializes_one_sample_dataset(tmp_path):
    from concurrent.futures import ThreadPoolExecutor

    path = tmp_path / "shared.db"

    def open_store(_):
        store = Store(path)
        try:
            with store.read() as conn:
                return sorted(conn.scalars(select(organizations.c.id)))
        finally:
            store.engine.dispose()

    with ThreadPoolExecutor(max_workers=2) as pool:
        first, second = pool.map(open_store, range(2))
    assert first == second == ["org-0", "org-1", "org-2", "org-3"]


def test_version_two_database_preserves_records_without_seeding(tmp_path):
    from sqlalchemy import Column, Integer, MetaData, String, Table, insert

    from backend.db import state

    path = tmp_path / "existing.db"
    legacy = MetaData()
    version = state.to_metadata(legacy)
    organization = Table(
        "organizations",
        legacy,
        Column("id", String, primary_key=True),
        Column("name", String),
        Column("created_at", String),
        Column("updated_at", String),
        Column("deleted_at", String),
        Column("deletion", String),
        Column("website", String),
        Column("industry", String),
        Column("notes", String),
    )
    for name in ("activities", "contacts", "deals", "events"):
        Table(name, legacy, Column("id", Integer, primary_key=True))
    from sqlalchemy import create_engine

    from backend.db import database_url

    engine = create_engine(database_url(path))
    with engine.begin() as conn:
        legacy.create_all(conn)
        conn.execute(
            insert(version).values(id=1, schema_version=2, dataset=1, revision=0)
        )
        conn.execute(insert(organization).values(id="known", name="Existing customer"))
    engine.dispose()

    store = Store(path)
    with store.read() as conn:
        rows = conn.execute(select(organizations)).mappings().all()
        assert [(row["name"], row["added_by"]) for row in rows] == [
            ("Existing customer", "Sample data")
        ]
        assert conn.scalar(select(state.c.schema_version)) == 3
    store.engine.dispose()


def test_serves_built_assets_and_deep_links_with_separate_readiness_and_api(tmp_path):
    from fastapi.testclient import TestClient

    from backend.tests.local_app import create_test_app

    frontend = tmp_path / "dist"
    assets = frontend / "assets"
    assets.mkdir(parents=True)
    (frontend / "index.html").write_text("<title>Accountable</title>")
    (assets / "main.js").write_text("export {};")
    config = {"url": "https://auth.example.test", "publishableKey": "public-key"}

    with TestClient(
        create_test_app(tmp_path / "built.db", frontend=frontend, auth_config=config)
    ) as api:
        assert api.get("/health").json() == {"status": "ok"}
        assert api.get("/auth-config").json() == config
        assert api.get("/deals/deal-0").text == "<title>Accountable</title>"
        assert api.get("/assets/main.js").text == "export {};"
        assert api.get("/assets/missing.js").status_code == 404
        assert api.get("/api/version").status_code == 401
        result = api.get("/api/unknown", headers={"Authorization": "Bearer alex-token"})
        assert result.status_code == 404
        assert result.json()["message"] == "Unknown API route."
