from fastapi import APIRouter, Header, Request

from backend.services import backups

router = APIRouter(prefix="/api/backups")


@router.get("")
def listing(request: Request):
    return backups.list_backups(request.app.state.store)


@router.post("/{identifier}/confirm")
def confirm(request: Request, identifier: str, x_dataset: int = Header()):
    store = request.app.state.store
    with store.write(x_dataset, advance=False) as conn:
        return backups.confirm(store, conn, identifier)


@router.post("/{identifier}/cancel")
def cancel(request: Request, identifier: str, body: dict, x_dataset: int = Header()):
    store = request.app.state.store
    with store.write(x_dataset, advance=False) as conn:
        return backups.finish(store, conn, identifier, body.get("token"), cancel=True)


@router.delete("/{identifier}")
def discard(request: Request, identifier: str, body: dict, x_dataset: int = Header()):
    store = request.app.state.store
    with store.write(x_dataset, advance=False) as conn:
        return backups.finish(store, conn, identifier, body.get("token"))
