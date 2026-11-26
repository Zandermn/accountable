from datetime import date, datetime
from decimal import Decimal
from hashlib import sha256
from io import BytesIO
from zipfile import ZipFile

from openpyxl import Workbook, load_workbook
from sqlalchemy import select

from backend.db import STAGES, TABLES, Problem, state
from backend.services.records import find, save

COLUMNS = {
    "Organizations": {
        "ID": "id",
        "Name": "name",
        "Website": "website",
        "Industry": "industry",
        "Notes": "notes",
    },
    "Contacts": {
        "ID": "id",
        "Name": "name",
        "Email": "email",
        "Phone": "phone",
        "Job title": "job_title",
        "Status": "status",
        "Organization ID": "organization_id",
    },
    "Deals": {
        "ID": "id",
        "Name": "name",
        "Stage": "stage",
        "Value USD": "value_cents",
        "Probability %": "probability",
        "Expected close date": "expected_date",
        "Actual close date": "actual_date",
        "Organization ID": "organization_id",
        "Main contact ID": "contact_id",
    },
}


def export(conn, template=False):
    book = Workbook()
    book.remove(book.active)
    for name, columns in COLUMNS.items():
        sheet = book.create_sheet(name)
        sheet.append(list(columns))
        sheet.freeze_panes = "A2"
        if template:
            continue
        table = TABLES[name.lower()]
        rows = conn.execute(
            select(table).where(table.c.deleted_at.is_(None)).order_by(table.c.id)
        ).mappings()
        for index, row in enumerate(rows, 2):
            for position, (header, key) in enumerate(columns.items(), 1):
                value = row[key]
                if isinstance(value, str) and len(value) > 32767:
                    raise Problem(
                        f"Excel can store up to 32,767 characters per cell. "
                        f"Check {header} on record {row['id']} or save a full backup.",
                        field=header,
                        sheet=name,
                        row=index,
                    )
                cell = sheet.cell(index, position)
                cell.value = value / 100 if key == "value_cents" else value
                if isinstance(value, str):
                    cell.data_type = "s"
    stream = BytesIO()
    book.save(stream)
    return stream.getvalue()


def cell_value(cell, key):
    value = cell.value
    if cell.data_type == "f":
        raise Problem("Replace the formula with a value.")
    if value is None:
        return None
    if key in ("value_cents", "probability"):
        if type(value) not in (int, float):
            raise Problem("Enter a numeric value.")
        number = Decimal(str(value)) * (100 if key == "value_cents" else 1)
        if (
            number != number.to_integral_value()
            or number < 0
            or (key == "probability" and number > 100)
        ):
            raise Problem("Enter a valid amount or whole percentage.")
        return int(number)
    if key in ("expected_date", "actual_date") and isinstance(value, date):
        return (value.date() if isinstance(value, datetime) else value).isoformat()
    if not isinstance(value, str):
        raise Problem(
            "Enter text." if not key.endswith("_date") else "Enter a calendar date."
        )
    return value.strip() or None


def parse(data):
    try:
        with ZipFile(BytesIO(data)) as archive:
            if sum(item.file_size for item in archive.infolist()) > 64 * 1024 * 1024:
                raise Problem("Select a smaller workbook.")
        book = load_workbook(
            BytesIO(data), read_only=True, data_only=False, keep_links=False
        )
    except Problem:
        raise
    except Exception as exc:
        raise Problem("Select a valid .xlsx workbook.") from exc
    seen = set()
    try:
        if not book.sheetnames or set(book.sheetnames) - set(COLUMNS):
            raise Problem("Use the sheet names from the template.")
        for name, columns in COLUMNS.items():
            if name not in book:
                continue
            rows = iter(book[name].rows)
            headers = [c.value for c in next(rows, ())]
            if len(headers) != len(columns) or set(headers) != set(columns):
                raise Problem(
                    "Use all template headers for this sheet.",
                    field="Headers",
                    sheet=name,
                    row=1,
                )
            for index, cells in enumerate(rows, 2):
                if all(c.value is None for c in cells):
                    continue
                fields = {}
                for header, cell in zip(headers, cells):
                    try:
                        fields[columns[header]] = cell_value(cell, columns[header])
                    except Problem as exc:
                        raise Problem(
                            str(exc), field=header, sheet=name, row=index
                        ) from exc
                identifier = fields.pop("id")
                if identifier:
                    if identifier in seen:
                        raise Problem(
                            "Duplicate ID in the workbook.",
                            field="ID",
                            sheet=name,
                            row=index,
                        )
                    seen.add(identifier)
                yield name, index, identifier, fields
    finally:
        book.close()


def exchange(store, data, dataset, actor, supplied_token=None):
    rows = list(parse(data))
    preview = supplied_token is None
    with store.write(dataset, advance=not preview) as conn:
        version = conn.execute(select(state)).mappings().one()
        token = sha256(data + f"|{dataset}|{version['revision']}".encode()).hexdigest()
        if not preview and supplied_token != token:
            raise Problem(
                "The workbook or database changed. Preview the workbook again.", 409
            )
        trial = conn.begin_nested()
        changes = []
        for sheet, index, identifier, fields in rows:
            kind = sheet.lower()
            old = find(conn, TABLES[kind], identifier) if identifier else None
            try:
                if old and old["deleted_at"]:
                    raise Problem("This ID belongs to a record in Trash.", 409, "id")
                if kind == "deals" and old and fields["probability"] is None:
                    fields["probability"] = old["probability"]
                row = save(
                    conn,
                    kind,
                    fields,
                    actor,
                    identifier if old else None,
                    new_id=identifier,
                )
            except Problem as exc:
                header = next(
                    (h for h, k in COLUMNS[sheet].items() if k == exc.detail["field"]),
                    "ID",
                )
                raise Problem(
                    str(exc), exc.status, header, sheet=sheet, row=index
                ) from exc
            change = "Update" if old else "Add"
            summary = f"{sheet}, row {index}: {change} {row['name']}"
            if old and kind == "deals" and old["stage"] != row["stage"]:
                summary += f" · Stage sets probability to {STAGES[row['stage']]}%"
            changes.append(summary)
        if preview:
            trial.rollback()
        else:
            trial.commit()
        return {"token": token, "changes": changes}
