from fastapi import APIRouter, Request

from backend.services import search

router = APIRouter(prefix="/api")


@router.get("/search")
def find_records(request: Request, q: str = ""):
    with request.app.state.store.read() as conn:
        return search.search(conn, q)
