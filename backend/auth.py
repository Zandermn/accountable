from asyncio import timeout
from dataclasses import dataclass

import httpx
from fastapi import Request

from backend.db import Problem


@dataclass(frozen=True)
class Actor:
    id: str
    email: str
    display_name: str = ""

    @property
    def label(self):
        return self.display_name or self.email

    def changes(self, *, creating=False):
        values = {"updated_by": self.id}
        if creating:
            values.update(created_by=self.id, added_by=self.label)
        return values


class SupabaseAuth:
    def __init__(self, client: httpx.AsyncClient, url: str, publishable_key: str):
        self.client = client
        self.url = url.rstrip("/") + "/auth/v1/user"
        self.publishable_key = publishable_key

    async def __call__(self, token: str) -> Actor | None:
        try:
            async with timeout(5):
                response = await self.client.get(
                    self.url,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "apikey": self.publishable_key,
                    },
                )
            if response.status_code in (400, 401, 403, 404):
                return None
            response.raise_for_status()
            user = response.json()
            if not isinstance(user, dict):
                raise TypeError
            user_id, email = user.get("id"), user.get("email")
            if (
                not isinstance(user_id, str)
                or not user_id
                or not isinstance(email, str)
                or not email
            ):
                raise ValueError
            metadata = user.get("user_metadata")
            name = (
                (
                    metadata.get("display_name")
                    or metadata.get("full_name")
                    or metadata.get("name")
                )
                if isinstance(metadata, dict)
                else None
            )
            return Actor(user_id, email, name.strip() if isinstance(name, str) else "")
        except (httpx.HTTPError, TimeoutError, TypeError, ValueError) as exc:
            raise Problem("Could not check your sign-in. Try again.", 503) from exc


async def authenticate(request: Request):
    scheme, _, token = request.headers.get("Authorization", "").partition(" ")
    actor = None
    if scheme.lower() == "bearer" and token and not any(c.isspace() for c in token):
        verifier = request.app.state.verify_token
        if verifier is not None:
            actor = await verifier(token)
    if actor is None:
        raise Problem("Sign in to continue.", 401)
    request.state.actor = actor
