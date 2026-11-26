# Spreadsheet import and export

Use an `.xlsx` workbook with three named sheets. One sheet can be supplied for a partial import. Provide a downloadable blank template and an export that follows the same schema.

| Sheet | Columns |
| --- | --- |
| Organizations | ID, Name, Website, Industry, Notes |
| Contacts | ID, Name, Email, Phone, Job title, Status, Organization ID |
| Deals | ID, Name, Stage, Value USD, Probability %, Expected close date, Actual close date, Organization ID, Main contact ID |

- Use text IDs, numeric decimal amounts in US dollars, whole-number percentages from 0 to 100, and calendar dates in `YYYY-MM-DD` or Excel date cells. For example, enter `25` for 25%. A blank ID creates a record with a generated ID. A known active ID updates its record. A new ID can be used as a key in the workbook and is retained as the record ID. Reject IDs already used by a different record type or a record in Trash. Duplicate names are allowed. Match records by ID only.
- Require the listed headers for each sheet present. On an update, a blank optional cell clears that field. A blank probability keeps the current probability if the stage is unchanged. Give the user a preview of adds and updates before they apply the import. Validate headings, cell types, duplicates, fields, and links against the final combined state. Resolve organizations before contacts and deals. Require at least one valid link for every deal. Reject formulas in input cells with a clear row error. Store exported text as text.
- Show import errors by sheet, row, and field. Keep all records unchanged when validation fails or the user cancels. On confirmation revalidate and commit the workbook as one transaction. Carry out stage changes using the same rules as the app. For a new deal, use its supplied probability or the stage default. On an existing deal with a stage change, show in the preview that the stage default replaces any supplied probability. An unchanged stage accepts the imported manual probability.
- Attribute new records to the user who applies the import. For existing records, keep the original creator and record the user who applies the changes as the last editor.
- Export the current active organizations, contacts, and deals and their relationship IDs. Data offers the workbook template, import, and export.

## JSON API design

Validate and preview an uploaded workbook, apply its validated changes, and download an export or template.

## Verification

| Area | Required verification |
| --- | --- |
| Spreadsheet exchange | Import a workbook with all three record types and cross-sheet links, find and edit those records in the app, export and verify the updated workbook. Test invalid and stale imports and check that no partial changes are applied. |

## Design decisions

| Area | Concern and treatment |
| --- | --- |
| Workbook scope | The workbook covers three active record types. A spreadsheet round trip updates those records by ID. Use Trash to restore individual deleted records. |

See the [deal stage change rules](deals.md#stage-changes) and [shared attribution rules](records.md#attribution).
