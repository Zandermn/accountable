# Records and validation

Use stable generated IDs. Store creation and update timestamps and soft-deletion state. Store timestamps in UTC and calendar dates as dates. Use the user's device date and time zone for timestamp display, month grouping, and general date comparisons. Use the [time zone saved on the follow-up](activities.md#timelines-and-follow-ups) when displaying its due date and determining its status.

Trim names and reject blank names.

## Attribution

For each organization, contact, deal, and activity, record the creator and the last editor. On creation, set both to the signed-in user. On later changes, preserve the creator and update the last editor. This applies to writes from forms, Pipeline, Data, and Trash. Get the acting user from the [verified token](accounts.md#api-access).

Show **Added by** on record details, activity entries, and Trash. When a user adds a record, save their display name, or their email address if their account has no display name. Keep that label with the record. Show **Sample data** for seeded records and activities, including after a user edits them.

## JSON API design

| Area | Operations |
| --- | --- |
| Records | List, view, create, and edit organizations, contacts, and deals. List endpoints accept search and sort. Contacts also accept status. Detail responses contain linked record summaries and timeline data where applicable. |

## Verification

| Area | Required verification |
| --- | --- |
| Records and relationships | Create, find, sort, edit, and delete all three main record types. Filter contacts by status. Save a contact without an organization and add one later. Check all three valid deal link combinations and reject a deal with neither. Exercise both blocked deletion dialogs with multiple links. Follow each link and verify allowed organization deletion clears only the appropriate links. Check persistence after refresh and restart. |
| Attribution | Create each record type and an activity as one user. Change them as another. Verify that the creator stays the same and the last editor changes. Check the display name, email fallback, and Sample data labels. |

See [Navigation, brand, and theme](interface.md#navigation-and-common-interactions) for shared controls and [Deletion, Trash, and restoration](trash.md) for record lifecycle rules.
