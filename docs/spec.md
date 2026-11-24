# Accountable product specification

## Problem

A small business keeps track of its customers and sales in spreadsheets, inboxes, and people's heads. Nobody can see at a glance which companies the business deals with, who its contacts are, what is in the sales pipeline, what happened last with a customer, or what needs doing next.

## Product purpose and current scope

Accountable is the main place for one small-business salesperson to track customers and deals. A new salesperson can learn the workflow with realistic sample data. An experienced salesperson can find the next follow-up, judge which deals are likely to close, and review customer history quickly. The product helps salespeople miss fewer follow-ups and find customer history when they need it.

Accountable runs on one computer. It includes Dashboard, Organizations, Contacts, Deals, Pipeline, Trash, spreadsheet import and export, and local data commands. It supports light and dark modes. It uses US dollars and a fixed pipeline. It excludes sign-in, user accounts, shared data, a user audit log, hosted access, a phone layout, AI, email, calendar and phone integrations, other business-system integrations, other currencies, reports beyond the Dashboard, tags, custom fields, and pipeline configuration.

This specification describes the whole product as it stands today. The implementation uses the [tech stack](TECH_STACK.md), and the interface follows the [brand skill](../.agents/skills/brand/SKILL.md). The final section records design decisions that define current product behavior.

## Navigation and common interactions

- Open Dashboard at `/`. Use a persistent left navigation for the five main sections. Put Trash and Data in a separate utility group. Data contains spreadsheet tools and local backup management.
- Use `/organizations`, `/contacts`, `/deals`, and `/pipeline` for the main views. Use `/organizations/:id`, `/contacts/:id`, and `/deals/:id` for detail pages. Use `/trash` and `/data` for utilities. Links in relationships and dialogs open the corresponding detail page.
- Show a labeled theme toggle in a shared top bar on every page. Show the current choice and let the user switch modes with the keyboard or pointer. Apply the selected mode immediately to the whole interface, including dialogs and charts. Start in light mode until the user selects a mode. Use the app preference independently of the device's theme setting.
- Each main record table has a search field, sortable data column headings, an Add button, and Edit and Delete actions on each row. The name opens the detail page. Search is case-insensitive and matches visible text fields, including linked names. Use typed sorts for amounts, dates, and stage order. Use the record ID to break ties. Contacts also have a status filter that combines with search.
- Add and edit open a form with labeled fields, Save, and Cancel. Mark required fields. Keep entered values if validation fails and show the error beside the field where possible. After a successful write, refresh affected lists, links, timelines, and Dashboard data. When a write fails, keep the last saved view and show a message that tells the user what to do.
- Confirm any deletion that can proceed. Name the record and show which related records move to Trash or lose a link. A blocked deletion opens an explanation with links to all blocking deals. If the data changes while a confirmation dialog is open, check the impact again before applying the deletion.
- Give views distinct loading, empty, no-match, and error states as applicable. Use visible keyboard focus, logical tab order, labeled controls, and keyboard access to row actions, dialogs, filters, and the Pipeline. Dialogs keep focus inside and return focus to a sensible control when they close. Use text or symbols as well as color for states such as Late and Overdue.

## Brand and layout

The approved light-mode visual reference is [Mockup 6 — Deal Workspace](mockups/06-deal-workspace.html). The [Playwright screenshot](mockups/06-deal-workspace.png) shows the Dashboard and the Pipeline with a selected deal open beside the board.

- Support light and dark modes on laptop and desktop screens. In light mode, use page background `#F0F4F5`, white panels and cards, and Midnight `#073B4C` for ink. Keep the existing light-mode appearance, apart from the shared top bar and toggle. In dark mode, use page background `#04232E`, black panels and cards, and Sea Mist `#CDD8DB` for ink. Use rounded panels without outlines in both modes. Avoid single-edge panel borders, top rules, and heavy gradients.
- Use Instrument Sans for headings and body, JetBrains Mono for figures and identifiers, and Instrument Serif only when a tagline or quote has a purpose. Ship the fonts with the app after setup so they load offline.
- Use Sea Green `#06D6A0` for primary actions, Marigold `#FFC145` and Coral `#F78C6B` for supporting accents, Cerulean `#118AB2` for information, and Raspberry `#EF476F` for alerts. Use Midnight on the first three. For adjacent chart series or stage accents, apply these colors in that order and use a neutral treatment for the sixth stage. Keep stage names visible.
- Reserve the exact Cerulean and Raspberry for visual accents or labels large enough to meet text contrast requirements. Use darker variants, `#087391` and `#C62752`, when small text must be white on a colored surface. Use darker variants of Sea Green and Marigold for text on light surfaces and lighter variants for text on dark surfaces.
- Define colors for both modes in one set of shared color tokens. Use the active mode's tokens for all app surfaces, text, and chart elements. Use existing dependencies for both modes.
- Check WCAG AA text contrast in both modes at the sizes used in the browser, including chart labels. Use at least 4.5:1 for normal text and 3:1 for large text. Meet these thresholds throughout dark mode and in the new light-mode top bar. Preserve existing light-mode color pairings. If an existing pairing needs a contrast fix, adjust only its dark-mode tokens.
- Use plain business English, short labels, and no exclamation marks. Show currency with every money amount, for example `US$12,500.00`. Give charts labeled axes and values that a keyboard user can reach, or provide the same values in text.

## Records and validation

Use stable generated IDs. Store creation and update timestamps and soft-deletion state. Store timestamps in UTC and calendar dates as dates. Use the computer's local date and time zone for display, month grouping, and date comparisons.

| Record | Fields and rules |
| --- | --- |
| Organization | Required name. Optional website, industry, and notes. Many contacts and deals can link to it. Accept HTTP or HTTPS for clickable website links. |
| Contact | Required name and status. Status is Lead, Qualified, or Customer. Optional email, phone, job title, and organization. Validate email format when supplied. A lead is a contact with Lead status. |
| Deal | Required name, stage, value, probability, and expected close date for open deals. Optional organization and main contact, with at least one active link required. The two links are independent. Closed deals have an actual close date. Preserve any expected close date when the deal closes. |
| Activity | One owner, either a contact or a deal. User-entered type is Note, Call, or Email. Require a description and time of occurrence. Optional follow-up date and completion state. A follow-up starts open. A stage change adds a system event to the deal timeline. |

Trim names and reject blank names. Store deal values as nonnegative integer cents and probabilities as whole percentages from 0 to 100. Allow a manual probability on a deal. Keep it until the stage changes. Use fixed, ordered stages and defaults.

| Stage | Default probability | Open |
| --- | ---: | --- |
| New | 10% | Yes |
| Qualified | 25% | Yes |
| Proposal | 50% | Yes |
| Negotiation | 75% | Yes |
| Won | 100% | No |
| Lost | 0% | No |

In record lifecycle rules, **active** means outside Trash. Won and Lost deals remain active until deleted and can block deletion of linked records. **Open** means the stage is New, Qualified, Proposal, or Negotiation. Only active, open deals contribute to open pipeline totals. A deal is late if it is open and its expected close date is before today.

## Main views

| View | Contents and actions |
| --- | --- |
| Organizations | Show name, website, and industry in the table. Show notes, linked active contacts, and linked active deals on the detail page. |
| Contacts | Show name, status, organization, email, and phone in the table. Show job title, organization if present, deals where the contact is the main contact, and the contact timeline on the detail page. Provide Log activity there. |
| Deals | Show name, stage, value, probability, close date, organization, and main contact in the table. Use expected close for open deals and actual close for closed deals. Mark late rows with a visible Late label. Open a deal to see its summary, linked records, notes, and timeline, with actions to manage notes and log activities. |
| Pipeline | Show one column per stage in the fixed order. Cards show name, value, probability, close date, note count, and Late when applicable. A card opens the deal details beside the board. Each column has Add deal, which opens the form at that stage. |
| Dashboard | Show monthly deal wins and won revenue, open pipeline totals, a sales funnel, recent activity, and upcoming and overdue follow-ups. This is the landing page. |

### Deal details and notes

- The deal details show the stage, value, probability, close date, organization, and main contact. Show links to the organization and main contact when present. The Notes section has Add note and Edit and Remove actions for each saved note. Save note keeps the note across refresh and restart. Confirm removal and send the note to Trash as an activity of type Note.
- From a deal opened outside Pipeline, Show in pipeline opens the Pipeline at the deal's current stage. Bring the deal card into view, highlight it, and keep the same deal details open beside the board. Preserve any note draft in the open editor during the jump. The user can still see the surrounding cards and stage totals. Closing the detail window clears the highlight and returns keyboard focus to the card.

### Pipeline movement and ordering

Drop a card anywhere in a column, including between two cards or in an empty column. The drop position determines its saved position. Provide keyboard controls to move a card between stages and to change its position within a stage. Use a server-owned position per active deal and a single write transaction to update source and destination order. Append new or restored deals to their stage unless the action provides a position. Restore the last saved board if a move fails.

Every stage change, including edits and imports, applies the destination's default probability and creates one event with the previous stage, new stage, and change time. Reordering within a stage preserves probability and creates no stage event. When a stage change enters Won or Lost, default the actual close date to today if the user has supplied no actual date for that transition. Keep the actual date if the deal switches directly between Won and Lost without a date edit. When reopening a deal, clear the actual date and use its preserved expected date. If it has none, ask for one before saving the move.

Show value and expected revenue for the open deals on the board and for each open column. Label Won and Lost as closed so their amounts cannot be mistaken for open totals. Refresh all affected totals as part of the move, without waiting for a reload.

### Activities and follow-ups

Use one timeline sorted by occurrence time, newest first. Show user activities and automatic stage events together on deal pages. Show user activities on contact pages. Users can edit or delete their own activities through the timeline. Stage events are system-managed and move with the deal as part of its recorded history.

A user can add an optional follow-up date when logging or editing an activity. The Dashboard links each incomplete follow-up to its owner and offers Mark done. Dates before today are overdue. Today and future dates are upcoming. Sort each group by earliest due date and distinguish tasks due today. Save completion across refresh and restart.

### Dashboard metrics

| Item | Design and calculation |
| --- | --- |
| Won revenue | Use a line chart for the last six calendar months including the current month. Sum the values of active Won deals by actual close month. Include months with zero revenue. |
| Deals won | Use a bar chart with the same month range and count active Won deals by actual close month. |
| Open pipeline | Show the number and total value of active open deals. Expected revenue is the sum of each deal's value times its probability. Compute from cents and integer percentages, then round displayed money totals to cents. |
| Sales funnel | For each fixed stage, sum the current values of active deals that reached that stage at least once. Use the starting stage and recorded transitions. Count a deal at most once per stage. A skipped stage receives no value from that deal. Label the visual so users can distinguish stage history from current Pipeline occupancy. |
| Recent activity | Show the latest visible activities and stage events, newest first, with links to the relevant record. |
| Follow-ups | Show overdue and upcoming open follow-ups for active activities with active owners. Update the Dashboard after a relevant write, including a win, a new or completed follow-up, or a Trash action. |

## Deletion, Trash, and restoration

Validate links and make each operation atomic on the server. An active contact can link only to an active organization. An active deal must have at least one active linked record, and every populated active link must point to an active record. Each active activity must have an active owner. Preserve the relationship history needed for recovery separately from active links.

| Record | Delete | Restore |
| --- | --- | --- |
| Organization | Block when any active deal links to it and has no main contact. List links to every blocking deal. The user can add a main contact or change the deal's organization. If deletion proceeds, move the organization to Trash and clear its links from active contacts and deals. Keep those records active. | Restore the organization and automatically reattach the links cleared by its deletion for former contacts and deals that are active and have no organization. Preserve current links. Skip any former link the user explicitly declined or changed after deletion. |
| Contact | Block if any active deal uses it as main contact, even when that deal has an organization. List all blocking deals. The user can replace the main contact or clear it if the deal has an active organization. The contact's organization link does not block deletion. On confirmation, move the contact and its active activities to Trash. | If the contact had an organization when deleted, name it in a dialog. Offer Previous organization if it is active, and Restore as individual. If the former organization is in Trash, show that it must be restored first to use that option. Restore only the activities that moved with this contact deletion. |
| Deal | On confirmation, move the deal and its active activities to Trash. Keep its stage history and the links needed to offer recovery choices. | Use former links that are active, or accept an explicit selection of an active organization or main contact. Show unresolved links and let the user restore the original linked record separately or choose a replacement. Keep the deal in Trash if it has no valid active link. Restore the activities that moved with this deal deletion. |
| Activity | On confirmation, move that activity to Trash. Keep its owner, follow-up date, and completion state. A call note belongs to its contact and can move with that contact. | Restore an individual activity only while its owner is active. If the owner is in Trash, identify it and tell the user to restore it first. |

Trash lists organizations, contacts, deals, and activities. Show the record type, name or activity summary, deletion time, and Restore action. Support filtering by type and sorting by deletion time. Keep Trash across restart. There is no permanent delete action in Trash.

Tag cascaded activities with the specific parent deletion so restoring the parent cannot revive an activity deleted on its own. Keep the organization link history by deletion operation and record whether the link has been changed or declined since detachment. This keeps an older deletion from reviving a rejected link. Hide trashed records, their activities, and their open follow-ups from active views. Restore an open follow-up with its activity. Keep a completed follow-up complete.

## Spreadsheet import and export

Use an `.xlsx` workbook with three named sheets. One sheet can be supplied for a partial import. Provide a downloadable blank template and an export that follows the same schema.

| Sheet | Columns |
| --- | --- |
| Organizations | ID, Name, Website, Industry, Notes |
| Contacts | ID, Name, Email, Phone, Job title, Status, Organization ID |
| Deals | ID, Name, Stage, Value USD, Probability %, Expected close date, Actual close date, Organization ID, Main contact ID |

- Use text IDs, numeric decimal amounts in US dollars, whole-number percentages from 0 to 100, and calendar dates in `YYYY-MM-DD` or Excel date cells. For example, enter `25` for 25%. A blank ID creates a record with a generated ID. A known active ID updates its record. A new ID can be used as a key in the workbook and is retained as the record ID. Reject IDs already used by a different record type or a record in Trash. Duplicate names are allowed. Match records by ID only.
- Require the listed headers for each sheet present. On an update, a blank optional cell clears that field. A blank probability keeps the current probability if the stage is unchanged. Give the user a preview of adds and updates before they apply the import. Validate headings, cell types, duplicates, fields, and links against the final combined state. Resolve organizations before contacts and deals. Require at least one valid link for every deal. Reject formulas in input cells with a clear row error. Store exported text as text.
- Show import errors by sheet, row, and field. Keep all records unchanged when validation fails or the user cancels. On confirmation revalidate and commit the workbook as one transaction. Carry out stage changes using the same rules as the app. For a new deal, use its supplied probability or the stage default. On an existing deal with a stage change, show in the preview that the stage default replaces any supplied probability. An unchanged stage accepts the imported manual probability.
- Export the current active organizations, contacts, and deals and their relationship IDs. Use full local backups for Trash, activities, stage history, follow-up state, and board order.

## Local runtime and persistence

- Use a TypeScript React and Vite frontend in `frontend/`, with Node.js 24 or later and Node.js 26 as the project target. Use a Python 3.12 FastAPI backend in `backend/` with uv and root-level `pyproject.toml` and `uv.lock`. Use the root npm workspace and cross-platform npm scripts.
- Bind both servers to loopback. Use Vite to proxy a same-origin JSON API to FastAPI. Serve assets and fonts locally and use local dependencies after setup. The one-time setup installs the runtimes, project dependencies, and Chrome for browser tests. After setup, the startup and runtime paths must avoid network fetches, including package resolution on launch.
- Use local SQLite and SQLAlchemy Core with no raw SQL. Version the schema. Store records, current links, deletion metadata, order, and stage history in the database. Use database constraints for referential integrity and shared service validation for active-state rules. Commit changes before returning success.
- Use a shared backend domain service for API writes, workbook import, and local data commands. Serialize writes through SQLite transactions. Validate active links, stage changes, and restore conditions inside those transactions. Use record or dataset revisions to reject stale confirmations and refresh the affected view. A backup or reset must see a consistent data state even if the app is open.
- Prefer supported table, chart, drag-and-drop, and workbook libraries. Use the same backend calculations for Dashboard and Pipeline summaries that need to agree.
- Save the theme as a local app preference that all browsers on the same computer can read when they open Accountable. Restore the saved theme on reload.

### JSON API design

| Area | Operations |
| --- | --- |
| Records | List, view, create, and edit organizations, contacts, and deals. List endpoints accept search and sort. Contacts also accept status. Detail responses contain linked record summaries and timeline data where applicable. |
| Deletion and Trash | Preview deletion impact, delete with the preview revision, list Trash, and restore with any required link selection. A blocker response includes the IDs and names of all blocking deals. |
| Pipeline | Read ordered cards and totals. Move by target stage and placement relative to a neighboring card, or to the end of a column. Validate the board revision, then return the saved ordering and refreshed totals. |
| Activities and Dashboard | Create, edit, delete, and mark follow-ups done. Read Dashboard metrics, recent activity, and open follow-ups from the same saved state. |
| Spreadsheet and backups | Validate and preview an uploaded workbook, apply its validated changes, and download an export or template. List app-managed backups and delete one only after both confirmation steps. |

Return field errors for invalid inputs, a missing-record response for unavailable record URLs, and a conflict response when a link, blocking deal, or revision makes the request invalid in the current state. Return the current blocker or recovery options with the conflict. Treat repeated or stale actions as conflicts when the original action no longer applies, so they cannot create duplicate stage events or repeat a deletion.

### Sample data and backups

Seed a new database once. An intentionally empty database remains empty on startup. Use fictional, realistic organizations from several industries, contacts in every status, and deals in all six stages. Generate dates relative to the local date at seed time. Include wins and losses across several past months, late open deals, future closes, notes, calls and emails, and both upcoming and overdue follow-ups. Include coherent historical stage transitions for the funnel and enough related records to try the main workflows. Start the sample state with empty Trash.

| Action | Behavior |
| --- | --- |
| `npm run dev` | Start FastAPI and Vite, print the local browser URL, and open the existing data or initialize the sample state on first run. |
| `npm run save` | Save a full local backup and print its identifier and path. |
| `npm run load -- <backup-id>` | Validate the selected backup. Automatically save a fresh backup of current data, then replace the database contents with the selected state. |
| `npm run seed` | Explain the reset and ask for confirmation. After confirmation, save a full backup, then replace active records and Trash with the sample state. |
| Delete backup in Data | Show a first dialog naming the selected backup. On confirmation, show a separate final confirmation. Cancel in either dialog and keep the file. |
| `npm test` | Run frontend, backend, and browser tests and fail if any fail. Test data is isolated from user data. |

Use a dedicated local backup directory and unique backup IDs. Keep the database and backups outside version control. Use a versioned snapshot of all application data, including active and trashed records, all recovery metadata and links, activity and follow-up state, and board order. Write a temporary file in the backup directory and publish a complete backup atomically. Before load or reset, hold the writer transaction through the snapshot and replacement so no intervening write can escape the backup. Abort the replacement if backup creation fails. Validate the selected snapshot and all references, and roll back the replacement if validation or a write fails. Keep any completed automatic backup if replacement fails. Report where the backup is stored and which snapshot is loaded.

Advance a dataset revision on each successful load or reset, regardless of the revision of the saved data. The UI checks this revision on window focus and periodically while the app is open. Refresh app views after a data replacement and require stale forms to reload before saving.

For backup deletion, bind the two sequential confirmations to the selected file. The server accepts the final request only after the first confirmation for that backup and rechecks the selected ID before deletion. A cancellation ends the confirmation flow without deleting the file. Only list and manage files that the app recognizes in its backup directory.

## Verification

Use Vitest for frontend tests, pytest for backend tests, and Playwright Test with installed Chrome for browser tests in `e2e/`. Browser tests start the app themselves and use an isolated database and backup directory. The one-time setup and commands are documented in [project status](STATUS.md).

| Area | Required verification |
| --- | --- |
| Offline startup and sample data | On Windows, macOS, and Linux, complete setup and disconnect from the internet. Run `npm run dev`, open Dashboard, and use all five sections with sample data. Verify fonts, charts, and assets load offline. |
| Records and relationships | Create, find, sort, edit, and delete all three main record types. Filter contacts by status. Save a contact without an organization and add one later. Check all three valid deal link combinations and reject a deal with neither. Exercise both blocked deletion dialogs with multiple links. Follow each link and verify allowed organization deletion clears only the appropriate links. Check persistence after refresh and restart. |
| Pipeline | Move a deal to another stage and verify its default probability, table entry, and the board and column totals. Reorder higher and lower within a column, drop into an empty column, and verify persistence after refresh. Add a deal from a column and check late labels in both views. From the Deals table and a linked record, use Show in pipeline. Verify the correct card is visible and highlighted, the details and note draft stay open, and closing returns focus to the card. |
| Activities and Dashboard | Log an activity on each owner type, edit it, set a follow-up, and mark it done. Add and edit a deal note, verify it after refresh and restart, then remove it and verify it appears in Trash. Check timeline order, exactly one event per stage change, and no event for a reorder. Verify Dashboard calculations against known values and check updates after a win and a follow-up. |
| Brand and accessibility | In Chrome, visually inspect every screen in both modes against the brand. Check text contrast, including chart labels, and check that existing light-mode colors are preserved. Use the demo to find the next follow-up, identify deals most likely to close, and find recent customer history. Check keyboard access, visible focus, and status labels. |
| Theme preference | Verify that light mode is the default, including when the device uses dark mode. Check that the shared toggle shows the selected mode on every page and that charts switch with the app. Use an automated test to verify that the selected mode is restored after a reload. Open Accountable in a second browser on the same computer and verify that it uses the saved mode. |
| Trash and restoration | Restore all four record types after restart. Verify automatic organization relinking, preservation of newer links, both contact restore choices, and the unavailable former organization case. Verify an invalid deal stays in Trash until a link is available or selected. Check activity cascade, separate activity deletion, note ownership, and follow-up visibility and completion on restore. |
| Local recovery | Check full save and load, reset to samples, and automatic backups before load and reset. Verify a backup includes Trash and board order. Force an automatic backup failure and verify the saved data stays intact. Cancel each backup deletion dialog in turn, then confirm both and verify deletion. |
| Spreadsheet exchange | Import a workbook with all three record types and cross-sheet links, find and edit those records in the app, export and verify the updated workbook. Test invalid and stale imports and check that no partial changes are applied. |
| Full product check | Run `npm run check`, which includes `npm test`. Walk through the applicable actions in a real browser as a salesperson, review every screen, and verify the browser console has no errors. Run the local data commands with representative records. Record the test results and OS coverage before sign-off. |

## Areas of concern and design decisions

| Area | Concern and treatment |
| --- | --- |
| Five accent colors and six stages | The brand names five ordered accents. Use those five and a neutral sixth accent with visible stage labels. This preserves all six stages and avoids inventing a brand color. |
| White text on information and alert colors | White on exact Cerulean is about 3.96:1 and white on exact Raspberry is about 3.62:1. These pairings fall short of 4.5:1 for normal text. The darker fills in the brand section are deliberate exceptions to the exact color values for small white text. |
| Manual probability and stage transitions | Import and form edits can provide both a probability and a new stage. Apply the stage default on the transition, then let the salesperson edit the probability in a later save. The UI shows this rule before saving. The default percentages are fixed product values. |
| Organization restoration and contact choice | Automatic restoration applies to eligible links cleared by the organization's deletion. An explicit decision to restore a contact as an individual takes precedence over an older pending link. If the contact is already in Trash when the organization goes to Trash, the contact's own restore dialog controls its former link. |
| Open deals and active deals | Active and open have different meanings. Closed deals still in the app can prevent deletion of a linked record. The open pipeline reports only the four selling stages. Use these definitions consistently in the UI, API, queries, and tests. |
| Tables and record ownership | Main tables represent organizations, contacts, and deals, with their own Add actions. Activities are entered from their owner. Trash is a recovery list, so its available action is Restore. This preserves the general table requirements for the main record tables and the specific restrictions on Trash. |
| System stage events and activity editing | Keep stage events in the deal's history when users edit or delete their notes, calls, and emails. This preserves the lifecycle data used by the funnel. For deals created or imported at an advanced stage, history starts at the first recorded stage. The funnel measures recorded reach, with no estimates for earlier stages. |
| Spreadsheet versus full recovery | The minimum spreadsheet contract covers three active record types. A spreadsheet round trip updates those records by ID. Restore a previous complete state from a local backup, including Trash and activity data. |
| Trash retention and dataset replacement | Individual record deletion always goes to Trash. Reset and load replace the whole dataset, including Trash. The automatic backup keeps the replaced records recoverable. Backup deletion can remove that recovery copy, so it requires both confirmations. |
| Offline use and initial setup | Google Fonts identifies the brand typefaces. The app serves installed copies locally. Downloads are part of one-time setup. Test the offline path on all three operating systems before sign-off. |
| Terminal commands and confirmation windows | Reset uses one terminal confirmation. The two confirmations for backup deletion are separate browser dialogs in the local Data view. Save and load remain terminal commands. |
