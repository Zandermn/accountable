from typing import Annotated

from fastapi import APIRouter, File, Form, Header, Request, Response, UploadFile

from backend.db import Problem
from backend.services.workbooks import exchange, export

router = APIRouter(prefix="/api/workbook")
MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@router.get("/{mode}")
def download(request: Request, mode: str):
    if mode not in ("template", "export"):
        raise Problem("Unknown workbook.", 404)
    with request.app.state.store.read() as conn:
        return Response(
            export(conn, mode == "template"),
            media_type=MIME,
            headers={
                "Content-Disposition": f'attachment; filename="accountable-{mode}.xlsx"'
            },
        )


@router.post("/{mode}")
def upload(
    request: Request,
    mode: str,
    file: Annotated[UploadFile, File()],
    token: str | None = Form(None),
    x_dataset: int = Header(),
):
    if mode not in ("preview", "apply") or (mode == "apply" and not token):
        raise Problem("Preview the workbook before applying it.", 409)
    data = file.file.read(16 * 1024 * 1024 + 1)
    if len(data) > 16 * 1024 * 1024:
        raise Problem("Select a workbook smaller than 16 MB.")
    return exchange(
        request.app.state.store, data, x_dataset, token if mode == "apply" else None
    )
