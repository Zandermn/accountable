import json
from concurrent.futures import ThreadPoolExecutor, TimeoutError
from threading import Event

import pytest
from conftest import add, deal, remove
from sqlalchemy import select

from backend.db import Problem, state
from backend.services import backups


def snapshot(store):
    with store.read() as conn:
        return backups.snapshot(conn), dict(
            conn.execute(select(state)).mappings().one()
        )


def prepare(api):
    org = add(api, "organizations", name="Archive")
    who = add(
        api, "contacts", name="Buyer", status="Qualified", organization_id=org["id"]
    )
    sale = deal(api, organization_id=org["id"], contact_id=who["id"])
    api.patch(
        "/api/records/deals/" + sale["id"], json={"stage": "Proposal"}
    ).raise_for_status()
    activity = add(
        api,
        "activities",
        type="Call",
        description="Quote",
        occurred_at="2026-11-01T13:00:00Z",
        contact_id=who["id"],
        follow_up="2026-11-04",
    )
    api.patch(
        "/api/records/activities/" + activity["id"], json={"done": True}
    ).raise_for_status()
    assert remove(api, "activities", activity).is_success
    assert remove(api, "organizations", org).is_success
    return sale


def test_roundtrip_and_old_dataset_write(api):
    store = api.app.state.store
    row = prepare(api)
    original, version = snapshot(store)
    saved = backups.save_backup(store)
    api.patch(
        "/api/records/deals/" + row["id"], json={"name": "Later"}
    ).raise_for_status()
    before, _ = snapshot(store)
    auto = backups.replace(store, saved["id"])
    assert backups.read_backup(store, auto["id"]) == before
    result, updated = snapshot(store)
    assert result == original and updated["dataset"] == version["dataset"] + 1
    assert (
        api.patch("/api/records/deals/" + row["id"], json={"name": "Stale"}).status_code
        == 409
    )
    assert api.get("/api/records/deals/" + row["id"]).json()["name"] == row["name"]
    auto = backups.replace(store)
    assert backups.read_backup(store, auto["id"]) == original
    assert (
        api.get("/api/trash").json() == []
        and len(api.get("/api/records/deals").json()) >= 6
    )


@pytest.mark.parametrize("mode", ["load", "reset"])
@pytest.mark.parametrize("point", ["publication", "replacement"])
def test_failure_preserves_state_and_published_backup(api, monkeypatch, mode, point):
    store = api.app.state.store
    prepare(api)
    saved = backups.save_backup(store)
    before = snapshot(store)

    def fail(*args):
        raise OSError("disk unavailable")

    if point == "publication":
        monkeypatch.setattr(backups.os, "replace", fail)
    else:
        clear = backups.clear_data

        def fail_after_clear(conn):
            clear(conn)
            raise OSError("replacement interrupted")

        monkeypatch.setattr(backups, "clear_data", fail_after_clear)
    with pytest.raises((Problem, OSError)):
        backups.replace(store, saved["id"] if mode == "load" else None)
    assert snapshot(store) == before
    assert len(backups.list_backups(store)) == (1 if point == "publication" else 2)
    assert len(list(store.backups.iterdir())) == len(backups.list_backups(store))


@pytest.mark.parametrize("mode", ["load", "reset"])
def test_writer_lock_covers_snapshot_and_replacement(api, monkeypatch, mode):
    store = api.app.state.store
    saved = backups.save_backup(store)
    published, release, started = Event(), Event(), Event()
    publish = backups.publish

    def hold(*args):
        result = publish(*args)
        published.set()
        assert release.wait(5)
        return result

    monkeypatch.setattr(backups, "publish", hold)

    def writer():
        started.set()
        with store.write(dataset=1):
            pytest.fail("A stale writer entered the locked transaction")

    with ThreadPoolExecutor(2) as pool:
        first = pool.submit(
            backups.replace, store, saved["id"] if mode == "load" else None
        )
        assert published.wait(5)
        second = pool.submit(writer)
        assert started.wait(5)
        with pytest.raises(TimeoutError):
            second.result(0.15)
        release.set()
        first.result(5)
        with pytest.raises(Problem, match="dataset was replaced"):
            second.result(5)


def test_corrupt_or_unrecognized_backup_cannot_replace_data(api):
    store = api.app.state.store
    saved = backups.save_backup(store)
    before = snapshot(store)
    path = store.backups / (saved["id"] + ".json")
    obj = json.loads(path.read_text())
    obj["data"]["deals"] = [{"name": "Broken"}]
    path.write_text(json.dumps(obj))
    with pytest.raises(Problem):
        backups.replace(store, saved["id"])
    with pytest.raises(Problem):
        backups.replace(store, "../outside")
    assert snapshot(store) == before


def test_deletion_requires_matching_uncancelled_confirmations(api):
    store = api.app.state.store
    a, b = [backups.save_backup(store)["id"] for _ in range(2)]

    def final(identifier, token):
        return api.request(
            "DELETE", "/api/backups/" + identifier, json={"token": token}
        )

    assert final(a, "missing").status_code == 409
    token = api.post("/api/backups/" + a + "/confirm").json()["token"]
    assert final(b, token).status_code == 409
    api.post("/api/backups/" + a + "/cancel", json={"token": token}).raise_for_status()
    assert final(a, token).status_code == 409
    token = api.post("/api/backups/" + a + "/confirm").json()["token"]
    assert final(a, token).is_success
    assert [r["id"] for r in api.get("/api/backups").json()] == [b]


def test_snapshot_rejects_missing_reference_even_with_valid_checksum(api):
    store = api.app.state.store
    prepare(api)
    saved = backups.save_backup(store)
    before = snapshot(store)
    path = store.backups / (saved["id"] + ".json")
    doc = json.loads(path.read_text())
    doc["data"]["deals"][0]["contact_id"] = "nonexistent"
    doc["checksum"] = backups.digest(doc["data"])
    path.write_text(json.dumps(doc))
    with pytest.raises(Problem):
        backups.replace(store, saved["id"])
    assert snapshot(store) == before
