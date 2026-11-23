from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select

from backend.api.backups import router as backup_routes
from backend.api.records import router as record_routes
from backend.api.sales import router as sales_routes
from backend.api.workbooks import router as workbook_routes
from backend.db import Problem, Store, state


def create_app(database=None, seed=True):
    @asynccontextmanager
    async def lifespan(app):
        app.state.store = Store(database, seed)
        yield
        app.state.store.engine.dispose()

    app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None)
    app.include_router(record_routes)
    app.include_router(sales_routes)
    app.include_router(workbook_routes)
    app.include_router(backup_routes)

    @app.exception_handler(Problem)
    async def handle_problem(request, error):
        return JSONResponse(error.detail, status_code=error.status)

    @app.get("/api/version")
    def version(request: Request):
        with request.app.state.store.read() as conn:
            return dict(conn.execute(select(state)).mappings().one())

    return app


app = create_app()
