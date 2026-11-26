from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

from backend.tests.local_app import create_test_app

PATH = "/api/preferences/theme"


def test_preference_defaults_to_system_and_persists_only_for_its_account(api):
    assert api.get(PATH).json() == {"theme": "system", "version": 0}
    saved = api.put(PATH, json={"theme": "dark", "version": 0, "account_id": "blair"})
    assert saved.json() == {"theme": "dark", "version": 1}

    with TestClient(create_test_app(api.app.state.store.path)) as reopened:
        assert (
            reopened.get(PATH, headers={"Authorization": "Bearer alex-token"}).json()
            == saved.json()
        )
        assert reopened.get(
            PATH, headers={"Authorization": "Bearer blair-token"}
        ).json() == {
            "theme": "system",
            "version": 0,
        }
        response = reopened.put(
            PATH,
            headers={"Authorization": "Bearer blair-token"},
            json={
                "theme": "light",
                "version": 0,
            },
        )
        assert response.json() == {"theme": "light", "version": 1}
    assert api.put(PATH, json={"theme": "system", "version": 1}).json() == {
        "theme": "system",
        "version": 2,
    }


@pytest.mark.parametrize(
    "payload",
    [
        {"theme": "blue", "version": 0},
        {"theme": "dark", "version": -1},
        {"theme": "dark"},
        {"theme": "dark", "version": True},
    ],
)
def test_rejects_invalid_preferences(api, payload):
    assert api.put(PATH, json=payload).status_code == 422
    assert api.get(PATH).json() == {"theme": "system", "version": 0}


def test_conflicting_and_delayed_saves_cannot_overwrite_a_saved_version(api):
    def save(theme):
        return api.put(PATH, json={"theme": theme, "version": 0})

    with ThreadPoolExecutor(max_workers=2) as pool:
        first, second = pool.map(save, ["dark", "light"])
    assert sorted(r.status_code for r in (first, second)) == [200, 409]
    winner = next(r.json() for r in (first, second) if r.is_success)
    delayed = save("system")
    assert delayed.status_code == 409
    assert delayed.json()["preference"] == winner
    assert api.get(PATH).json() == winner
