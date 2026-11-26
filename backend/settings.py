import os
from dataclasses import dataclass
from urllib.parse import urlsplit

from backend.db import database_url


@dataclass(frozen=True)
class Settings:
    database: str
    supabase_url: str
    publishable_key: str

    @classmethod
    def from_environment(cls):
        names = ("DATABASE_URL", "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY")
        values = {name: os.environ.get(name, "").strip() for name in names}
        missing = [name for name, value in values.items() if not value]
        if missing:
            raise RuntimeError(
                "Set " + ", ".join(missing) + " before starting Accountable."
            )
        if database_url(values["DATABASE_URL"]).get_backend_name() != "postgresql":
            raise RuntimeError("DATABASE_URL must point to PostgreSQL.")
        auth_url = urlsplit(values["SUPABASE_URL"])
        if (
            auth_url.scheme != "https"
            or not auth_url.hostname
            or auth_url.username
            or auth_url.password
            or auth_url.path not in ("", "/")
            or auth_url.query
            or auth_url.fragment
        ):
            raise RuntimeError("SUPABASE_URL must be an HTTPS URL.")
        if not values["SUPABASE_PUBLISHABLE_KEY"].startswith("sb_publishable_"):
            raise RuntimeError(
                "SUPABASE_PUBLISHABLE_KEY must be a Supabase publishable key."
            )
        return cls(*values.values())
