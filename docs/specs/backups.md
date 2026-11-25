# Sample data and local backups

Seed a new database once. An intentionally empty database remains empty on startup. Use fictional, realistic organizations from several industries, contacts in every status, and deals in all six stages. Generate dates relative to the local date at seed time. Include wins and losses across several past months, late open deals, future closes, notes, calls and emails, and both upcoming and overdue follow-ups. Include coherent historical stage transitions for the funnel and enough related records to try the main workflows. Start the sample state with empty Trash.

## Commands and controls

| Action | Behavior |
| --- | --- |
| `npm run save` | Save a full local backup and print its identifier and path. |
| `npm run load -- <backup-id>` | Validate the selected backup. Automatically save a fresh backup of current data, then replace the database contents with the selected state. |
| `npm run seed` | Explain the reset and ask for confirmation. After confirmation, save a full backup, then replace active records and Trash with the sample state. |
| Delete backup in Data | Show a first dialog naming the selected backup. On confirmation, show a separate final confirmation. Cancel in either dialog and keep the file. |

## Backup and recovery rules

Use a dedicated local backup directory and unique backup IDs. Keep the database and backups outside version control. Use a versioned snapshot of all application data, including active and trashed records, all recovery metadata and links, activity and follow-up state, and board order. Write a temporary file in the backup directory and publish a complete backup atomically. Before load or reset, hold the writer transaction through the snapshot and replacement so no intervening write can escape the backup. Abort the replacement if backup creation fails. Validate the selected snapshot and all references, and roll back the replacement if validation or a write fails. Keep any completed automatic backup if replacement fails. Report where the backup is stored and which snapshot is loaded.

Advance a dataset revision on each successful load or reset, regardless of the revision of the saved data. The UI checks this revision on window focus and periodically while the app is open. Refresh app views after a data replacement and require stale forms to reload before saving.

For backup deletion, bind the two sequential confirmations to the selected file. The server accepts the final request only after the first confirmation for that backup and rechecks the selected ID before deletion. A cancellation ends the confirmation flow without deleting the file. Only list and manage files that the app recognizes in its backup directory.

## JSON API design

List app-managed backups and delete one only after both confirmation steps.

## Verification

| Area | Required verification |
| --- | --- |
| Local recovery | Check full save and load, reset to samples, and automatic backups before load and reset. Verify a backup includes Trash and board order. Force an automatic backup failure and verify the saved data stays intact. Cancel each backup deletion dialog in turn, then confirm both and verify deletion. |

## Design decisions

| Area | Concern and treatment |
| --- | --- |
| Terminal commands and confirmation windows | Reset uses one terminal confirmation. The two confirmations for backup deletion are separate browser dialogs in the local Data view. Save and load remain terminal commands. |

See [Spreadsheet import and export](spreadsheets.md) for the other tools in Data.
