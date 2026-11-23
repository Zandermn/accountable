"""Prepare and inspect workbooks exchanged through the browser."""

import sys

from openpyxl import Workbook, load_workbook

from backend.services.workbooks import COLUMNS

mode, path = sys.argv[1:3]
if mode == "inspect":
    book = load_workbook(path)
    row = next(r for r in book["Deals"].values if r[0] == "external/2026-01")
    assert (
        row[1] == "Edited renewal"
        and row[3] == 125.25
        and row[-2:] == ("external-org", "external-person")
    )
else:
    book = Workbook()
    book.remove(book.active)
    for name, columns in COLUMNS.items():
        book.create_sheet(name).append(list(columns))
    book["Organizations"].append(["external-org", "Prairie Design"])
    book["Contacts"].append(
        ["external-person", "Ari Shore", None, None, None, "Qualified", "external-org"]
    )
    book["Deals"].append(
        [
            "external/2026-01",
            "Studio renewal",
            "Proposal",
            125.25,
            48,
            "2027-10-01",
            None,
            "external-org",
            "external-person",
        ]
    )
    if mode == "invalid":
        book["Organizations"].append(["partial", "Should roll back"])
        book["Deals"].append(["bad", "Unlinked", "New", 1, 10, "2027-12-01"])
    book.save(path)
