import os
import time
from pathlib import Path

from fastapi import Response

from backend.auth import Actor
from backend.main import create_app

ACCOUNTS = {
    "alex-token": Actor("alex", "alex@example.test", "Alex Morgan"),
    "blair-token": Actor("blair", "blair@example.test"),
}
PASSWORD = "local-test-password"


async def verify_token(token):
    return ACCOUNTS.get(token)


def create_test_app(database, seed=True, **options):
    return create_app(database, seed=seed, verify_token=verify_token, **options)


def browser_app():
    app = create_test_app(
        Path(os.environ["ACCOUNTABLE_TEST_DB"]),
        auth_config={
            "url": "http://127.0.0.1:" + os.environ["ACCOUNTABLE_PORT"],
            "publishableKey": "local-test-key",
        },
    )

    @app.post("/auth/v1/token")
    def token(body: dict, response: Response, grant_type: str):
        for access_token, actor in ACCOUNTS.items():
            valid = (
                grant_type == "password"
                and body.get("email") == actor.email
                and body.get("password") == PASSWORD
            ) or (
                grant_type == "refresh_token"
                and body.get("refresh_token") == access_token + "-refresh"
            )
            if valid:
                return {
                    "access_token": access_token,
                    "refresh_token": access_token + "-refresh",
                    "token_type": "bearer",
                    "expires_in": 3600,
                    "expires_at": int(time.time()) + 3600,
                    "user": {
                        "id": actor.id,
                        "email": actor.email,
                        "user_metadata": {"display_name": actor.display_name},
                    },
                }
        response.status_code = 400
        return {"message": "Invalid email or password."}

    @app.post("/auth/v1/logout", status_code=204)
    def logout():
        return Response(status_code=204)

    return app
