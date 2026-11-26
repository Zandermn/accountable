from contextlib import asynccontextmanager
from datetime import date
from pathlib import Path
from time import time

import httpx
from fastapi import APIRouter, FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy import select

from backend.api.preferences import router as preference_routes
from backend.api.records import router as record_routes
from backend.api.sales import router as sales_routes
from backend.api.search import router as search_routes
from backend.api.workbooks import router as workbook_routes
from backend.auth import SupabaseAuth, authenticate
from backend.db import Problem, Store, state
from backend.settings import Settings

FRONTEND = Path(__file__).resolve().parents[1] / "frontend" / "dist"


def create_app(
    database=None, seed=True, *, verify_token=None, auth_config=None, frontend=FRONTEND
):
    @asynccontextmanager
    async def lifespan(app):
        settings = Settings.from_environment() if database is None else None
        async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as http:
            if settings:
                app.state.auth_config = {
                    "url": settings.supabase_url,
                    "publishableKey": settings.publishable_key,
                }
                app.state.verify_token = SupabaseAuth(
                    http, settings.supabase_url, settings.publishable_key
                )
            else:
                app.state.auth_config = auth_config or {}
                app.state.verify_token = verify_token
            store = Store(settings.database if settings else database, seed)
            app.state.store = store
            try:
                yield
            finally:
                store.engine.dispose()

    app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
    application = APIRouter()
    application.include_router(record_routes)
    application.include_router(sales_routes)
    application.include_router(search_routes)
    application.include_router(workbook_routes)
    application.include_router(preference_routes)

    def problem_response(error):
        headers = {"WWW-Authenticate": "Bearer"} if error.status == 401 else None
        return JSONResponse(error.detail, status_code=error.status, headers=headers)

    @app.exception_handler(Problem)
    async def handle_problem(request, error):
        return problem_response(error)

    @app.middleware("http")
    async def protect_api(request, call_next):
        if request.url.path.split("/", 2)[1] != "api":
            return await call_next(request)
        try:
            await authenticate(request)
        except Problem as error:
            response = problem_response(error)
        else:
            response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.get("/auth-config")
    def public_auth_config(request: Request):
        return JSONResponse(
            request.app.state.auth_config, headers={"Cache-Control": "no-store"}
        )

    @application.get("/api/version")
    def version(request: Request):
        with request.app.state.store.read() as conn:
            return dict(
                conn.execute(select(state)).mappings().one(),
                today=date.today().isoformat(),
                minute=int(time() // 60),
            )

    app.include_router(application)

    @app.get("/{path:path}", include_in_schema=False)
    def static(path: str):
        if path.split("/", 1)[0] == "api":
            raise Problem("Unknown API route.", 404)
        root = frontend.resolve()
        candidate = (root / path).resolve()
        if not candidate.is_relative_to(root):
            raise Problem("Page unavailable.", 404)
        if candidate.is_file():
            return FileResponse(candidate)
        index = root / "index.html"
        if index.is_file() and not path.startswith(("assets/", "fonts/")):
            return FileResponse(index, headers={"Cache-Control": "no-cache"})
        raise Problem("Page unavailable.", 404)

    return app


app = create_app()
