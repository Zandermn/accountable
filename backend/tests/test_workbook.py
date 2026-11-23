from io import BytesIO

import pytest
from conftest import add, deal, remove
from openpyxl import Workbook, load_workbook

HEADERS = {
    "Organizations": ["ID", "Name", "Website", "Industry", "Notes"],
    "Contacts": ["ID", "Name", "Email", "Phone", "Job title", "Status", "Organization ID"],
    "Deals": [
        "ID",
        "Name",
        "Stage",
        "Value USD",
        "Probability %",
        "Expected close date",
        "Actual close date",
        "Organization ID",
        "Main contact ID",
    ],
}


def workbook(sheets):
    book = Workbook()
    book.remove(book.active)
    for name, rows in sheets.items():
        sheet = book.create_sheet(name)
        sheet.append(HEADERS[name])
        for row in rows:
            sheet.append(row)
    out = BytesIO()
    book.save(out)
    return out.getvalue()


def send(api, data, token=None):
    return api.post(
        "/api/workbook/" + ("apply" if token else "preview"),
        files={"file": ("sales.xlsx", data)},
        data={"token": token} if token else {},
    )


def apply(api, data):
    preview = send(api, data)
    assert preview.is_success, preview.text
    return send(api, data, preview.json()["token"])


def test_cross_sheet_partial_update_blank_probability_and_export_text(api):
    data = workbook(
        {
            "Deals": [["d", "Contract", "Qualified", 123.45, 39, "2026-12-01", None, "o", "c"]],
            "Contacts": [["c", "June", None, None, None, "Lead", "o"]],
            "Organizations": [["o", "Company", None, "Retail"]],
        }
    )
    assert apply(api, data).is_success
    assert apply(
        api,
        workbook(
            {"Deals": [["d", "Contract", "Qualified", 150, None, "2026-12-02", None, "o", None]]}
        ),
    ).is_success
    row = api.get("/api/records/deals/d").json()
    assert (row["value_cents"], row["probability"], row["contact_id"]) == (15000, 39, None)
    moved = workbook({"Deals": [["d", "Contract", "Lost", 150, 60, "2026-12-02", None, "o", None]]})
    assert "0%" in str(send(api, moved).json()["changes"])
    assert (
        apply(api, moved).is_success
        and len(api.get("/api/records/deals/d").json()["timeline"]) == 1
    )
    api.patch("/api/records/organizations/o", json={"notes": "=1+1"}).raise_for_status()
    book = load_workbook(BytesIO(api.get("/api/workbook/export").content))
    assert (
        book["Organizations"]["E2"].value == "=1+1" and book["Organizations"]["E2"].data_type == "s"
    )
    assert book["Deals"]["D2"].value == 150
    template = load_workbook(BytesIO(api.get("/api/workbook/template").content))
    assert template.sheetnames == list(HEADERS) and template["Deals"].max_row == 1


@pytest.mark.parametrize(
    "sheets,field",
    [
        ({"Organizations": [["x", "One"], ["x", "Two"]]}, "ID"),
        (
            {
                "Organizations": [["x", "One"]],
                "Contacts": [["x", "Person", None, None, None, "Lead"]],
            },
            "ID",
        ),
        ({"Organizations": [["ok", "Valid"], ["bad", "=A1"]]}, "Name"),
        (
            {
                "Organizations": [["ok", "Valid"]],
                "Deals": [["d", "Bad", "Won", 10, 100, None, None, "missing"]],
            },
            "Organization ID",
        ),
    ],
)
def test_errors_report_location_and_preserve_database(api, sheets, field):
    response = send(api, workbook(sheets))
    assert response.status_code in (409, 422)
    assert (
        response.json()["field"] == field
        and response.json()["row"] >= 2
        and response.json()["sheet"] in sheets
    )
    assert api.get("/api/records/organizations").json() == []


def test_revalidate_preview_after_write_or_workbook_change(api):
    data = workbook({"Organizations": [["a", "Add me"]]})
    token = send(api, data).json()["token"]
    assert send(api, workbook({"Organizations": [["b", "Different"]]}), token).status_code == 409
    other = add(api, "organizations", name="Other")
    assert send(api, data, token).status_code == 409
    assert [r["name"] for r in api.get("/api/records/organizations").json()] == ["Other"]
    assert remove(api, "organizations", other).is_success
    assert send(api, workbook({"Organizations": [[other["id"], "Retry"]]})).status_code == 409


def test_import_preserves_close_dates_across_stage_changes(api):
    org = add(api, "organizations", name="Client")
    sale = deal(api, organization_id=org["id"], expected_date="2025-09-20")
    for stage, actual in [("Won", "2025-09-18"), ("Lost", None), ("New", None)]:
        row = [sale["id"], "Renewal", stage, 100, None, None, actual, org["id"]]
        response = apply(api, workbook({"Deals": [row]}))
        assert response.is_success, response.text
        saved = api.get("/api/records/deals/" + sale["id"]).json()
        assert saved["expected_date"] == "2025-09-20"
        assert saved["actual_date"] == (None if stage == "New" else "2025-09-18")


def test_import_rejects_a_blank_close_date_without_a_stage_change(api):
    org = add(api, "organizations", name="Client")
    sale = deal(
        api,
        stage="Won",
        actual_date="2026-09-18",
        expected_date="2026-09-20",
        organization_id=org["id"],
    )
    row = [sale["id"], "Renewal", "Won", 100, 100, "2026-09-20", None, org["id"], None]
    response = send(api, workbook({"Deals": [row]}))
    assert response.status_code == 422
    assert response.json()["field"] == "Actual close date"
    assert api.get("/api/records/deals/" + sale["id"]).json()["actual_date"] == "2026-09-18"


def test_export_reports_text_that_excel_cannot_store(api):
    note = "x" * 32768
    org = add(api, "organizations", name="Client", notes=note)
    response = api.get("/api/workbook/export")
    assert response.status_code == 422
    assert response.json()["field"] == "Notes"
    assert response.json()["sheet"] == "Organizations"
    assert api.get("/api/records/organizations/" + org["id"]).json()["notes"] == note
