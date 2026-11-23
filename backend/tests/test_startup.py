from sqlalchemy import delete, select, update

from backend.db import Store, organizations


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
