from fastapi import APIRouter, Header, Request

from backend.db import Problem
from backend.services import sales

router = APIRouter(prefix="/api")


@router.get("/pipeline")
def pipeline(request: Request):
    with request.app.state.store.read() as conn:
        return sales.board(conn)


@router.post("/pipeline/move")
def move(request: Request, body: dict, x_dataset: int = Header()):
    if type(body.get("revision")) is not int:
        raise Problem("Refresh the board before moving a card.", 409)
    with request.app.state.store.write(x_dataset, body["revision"]) as conn:
        return sales.move(conn, body, request.state.actor)


@router.get("/dashboard")
def dashboard(request: Request):
    with request.app.state.store.read() as conn:
        return sales.dashboard(conn)
