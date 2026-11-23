from urllib.parse import unquote

from fastapi import APIRouter, Header, Request

from backend.services import records, trash

router = APIRouter(prefix="/api")


def path_id(value):
    return unquote(value[1:]) if value.startswith("~") else value


@router.get("/records/{kind}")
def listing(
    request: Request,
    kind: str,
    search: str = "",
    sort: str = "name",
    direction: str = "asc",
    status: str | None = None,
):
    with request.app.state.store.read() as conn:
        return records.listing(conn, kind, search, sort, direction, status)


@router.get("/records/{kind}/{record_id}")
def detail(request: Request, kind: str, record_id: str):
    with request.app.state.store.read() as conn:
        return records.detail(conn, kind, path_id(record_id))


@router.post("/records/{kind}")
def create(request: Request, kind: str, body: dict, x_dataset: int = Header()):
    with request.app.state.store.write(x_dataset) as conn:
        return records.save(conn, kind, body)


@router.patch("/records/{kind}/{record_id}")
def edit(request: Request, kind: str, record_id: str, body: dict, x_dataset: int = Header()):
    with request.app.state.store.write(x_dataset) as conn:
        return records.save(conn, kind, body, path_id(record_id))


@router.get("/records/{kind}/{record_id}/delete-preview")
def preview(request: Request, kind: str, record_id: str):
    with request.app.state.store.read() as conn:
        return trash.preview(conn, kind, path_id(record_id))


@router.delete("/records/{kind}/{record_id}")
def discard(request: Request, kind: str, record_id: str, body: dict, x_dataset: int = Header()):
    with request.app.state.store.write(x_dataset) as conn:
        return trash.discard(conn, kind, path_id(record_id), body.get("revision"))


@router.get("/trash")
def trash_list(request: Request, kind: str = "", direction: str = "desc"):
    with request.app.state.store.read() as conn:
        return trash.trash_list(conn, kind, direction)


@router.post("/trash/{kind}/{record_id}")
def restore(request: Request, kind: str, record_id: str, body: dict, x_dataset: int = Header()):
    with request.app.state.store.write(x_dataset) as conn:
        return trash.restore(conn, kind, path_id(record_id), body)
