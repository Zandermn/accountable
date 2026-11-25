# Records and validation

Use stable generated IDs. Store creation and update timestamps and soft-deletion state. Store timestamps in UTC and calendar dates as dates. Use the computer's local date and time zone for display, month grouping, and date comparisons.

Trim names and reject blank names.

## JSON API design

| Area | Operations |
| --- | --- |
| Records | List, view, create, and edit organizations, contacts, and deals. List endpoints accept search and sort. Contacts also accept status. Detail responses contain linked record summaries and timeline data where applicable. |

## Verification

| Area | Required verification |
| --- | --- |
| Records and relationships | Create, find, sort, edit, and delete all three main record types. Filter contacts by status. Save a contact without an organization and add one later. Check all three valid deal link combinations and reject a deal with neither. Exercise both blocked deletion dialogs with multiple links. Follow each link and verify allowed organization deletion clears only the appropriate links. Check persistence after refresh and restart. |

See [Navigation, brand, and theme](interface.md#navigation-and-common-interactions) for shared controls and [Deletion, Trash, and restoration](trash.md) for record lifecycle rules.
