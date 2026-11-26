from typing import Annotated, Literal

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field
from sqlalchemy import insert, select, update

from backend.db import Problem, account_preferences

router = APIRouter(prefix="/api/preferences")


class ThemePreference(BaseModel):
    theme: Literal["light", "dark", "system"]
    version: Annotated[int, Field(strict=True, ge=0)]


def preference_for(conn, account_id):
    row = (
        conn.execute(
            select(account_preferences.c.theme, account_preferences.c.version).where(
                account_preferences.c.account_id == account_id
            )
        )
        .mappings()
        .first()
    )
    return ThemePreference(**row) if row else ThemePreference(theme="system", version=0)


@router.get("/theme")
def read_theme(request: Request) -> ThemePreference:
    with request.app.state.store.read() as conn:
        return preference_for(conn, request.state.actor.id)


@router.put("/theme")
def save_theme(request: Request, preference: ThemePreference) -> ThemePreference:
    account_id = request.state.actor.id
    with request.app.state.store.write(advance=False) as conn:
        current = preference_for(conn, account_id)
        if preference.version != current.version:
            raise Problem(
                "The saved theme changed. Try again.",
                409,
                preference=current.model_dump(),
            )
        saved = ThemePreference(theme=preference.theme, version=current.version + 1)
        statement = (
            update(account_preferences).where(
                account_preferences.c.account_id == account_id
            )
            if current.version
            else insert(account_preferences).values(account_id=account_id)
        )
        conn.execute(statement.values(**saved.model_dump()))
    return saved
