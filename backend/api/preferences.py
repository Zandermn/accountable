from typing import Literal

from fastapi import APIRouter, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.dialects.sqlite import insert

from backend.db import app_preferences

router = APIRouter(prefix="/api/preferences")


class ThemePreference(BaseModel):
    theme: Literal["light", "dark"]


@router.get("/theme")
def read_theme(request: Request) -> ThemePreference:
    with request.app.state.store.read() as conn:
        theme = conn.scalar(select(app_preferences.c.theme))
    return ThemePreference(theme=theme or "light")


@router.put("/theme")
def save_theme(request: Request, preference: ThemePreference) -> ThemePreference:
    with request.app.state.store.write(advance=False) as conn:
        conn.execute(
            insert(app_preferences)
            .values(id=1, theme=preference.theme)
            .on_conflict_do_update(
                index_elements=["id"], set_={"theme": preference.theme}
            )
        )
    return preference
