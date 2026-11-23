# Accountable MVP implementation plan

## Files that change

The implementation follows the [intent](intent.md), [specification](spec.md), [tech stack](TECH_STACK.md), [brand guidelines](../.agents/skills/brand/SKILL.md), and [approved Deal Workspace mockup](mockups/06-deal-workspace.html). The paths below show the planned file layout.

| Path | Phase | Planned change |
| --- | --- | --- |
| `package.json`, `package-lock.json`, `scripts/` | 1–4 | Add the npm workspace and commands for startup, tests, save, load, and seed. Use the same commands on Windows, macOS, and Linux. |
| `pyproject.toml`, `uv.lock` | 1–4 | Pin backend and test dependencies for Python 3.12. |
| `frontend/package.json`, `frontend/index.html`, `frontend/tsconfig*.json`, `frontend/vite.config.ts` | 1 | Set up React, TypeScript, Vite, Vitest, and the local API proxy. |
| `frontend/src/`, `frontend/public/fonts/` | 1–4 | Add navigation, shared forms and dialogs, the five main views, Trash, and Data. Include the approved fonts and their licenses for offline use. Keep frontend unit tests beside the features they cover. |
| `backend/main.py`, `backend/db/`, `backend/services/`, `backend/api/` | 1–4 | Add the FastAPI entry point, versioned SQLite schema, SQLAlchemy Core queries, shared write operations, calculations, and API routes. |
| `backend/seed.py`, `backend/data_commands.py`, `backend/tests/` | 1–4 | Add sample data, full backup and reset commands, and pytest coverage. Use shared services for CLI and API writes. |
| `playwright.config.ts`, `e2e/` | 1–5 | Add the Chrome runner, isolated app startup and test data, and browser tests. |
| `.gitignore`, `docs/STATUS.md` | 1–5 | Keep runtime files and backups out of Git. Record progress, one-time setup, local commands, and sign-off results. |

## Order of work

Add the applicable tests in each phase. Use the phase checks below before starting dependent work.

1. **Phase 1 — Local runtime and storage.** Set up the npm workspace, uv, loopback servers, and Vite API proxy. Version the schema and store record links, restore metadata, stage history, board positions, and revisions. Add first-run sample data with dates relative to the local date. Configure the test runner so all three suites start with isolated data.
   - **Complete when** `npm run dev` prints a local URL and the browser loads the app shell with locally served fonts. Chrome can start the app from the test runner. A fresh database receives the sample data once, and restart preserves both an edited database and an intentionally empty one.
2. **Phase 2 — Records, activities, and Trash.** Implement shared validation and write services before connecting the API and views. Implement stage transitions when building the Deals form so all later entry points can use the same rules. Add activity create and edit operations and timeline actions before wiring up their Trash flows. Add confirmation previews, blocker links, transactional restores, and search, sort, and filters.
   - **Complete when** the three main record tables work after restart. A stale delete preview returns the current impact or blockers and leaves the records intact. Restores preserve valid links and explicit user choices, and leave independently deleted activities in Trash. Pass the Records and Trash browser flows, with the Dashboard follow-up checks in Phase 3.
3. **Phase 3 — Deal Workspace, Pipeline, and Dashboard.** Add the approved deal notes panel and link it to the saved activity operations. Use the Phase 2 transition service for board moves. Add drag and keyboard placement, saved order, and **Show in pipeline**. Build the Dashboard queries and views for the two monthly charts, pipeline totals, historical funnel, recent activity, and follow-ups.
   - **Complete when** board moves and form edits agree on the saved stage, probability, close date, and history. Moving a card updates visible totals and survives restart. **Show in pipeline** preserves the selected deal and any draft. A win and a follow-up update the Dashboard without a reload. Pass the Pipeline and Activities browser flows and the Dashboard follow-up checks in the Trash flow.
4. **Phase 4 — Spreadsheet exchange and local recovery.** Add the workbook template, preview, atomic apply, and export with the existing record and stage rules. Establish a full save and load round trip before making reset depend on it. Add automatic backups, dataset revision checks, and two separate deletion confirmations in Data.
   - **Complete when** a workbook with cross-sheet links can be imported, edited in the app, and exported. Invalid or stale imports leave all records intact. Load and reset preserve a recoverable copy of the prior state, and a backup write failure leaves that state in place. Pass the Local recovery and Spreadsheet exchange browser flows below.
5. **Phase 5 — Verification and handoff.** Run all suites, finish the salesperson walkthrough, and verify setup and offline use on Windows, macOS, and Linux.
   - **Complete when** all sign-off checks under Proof pass and `docs/STATUS.md` records the setup steps, command examples, test results, and OS coverage.

## Risks

| Risk | Control |
| --- | --- |
| Delete or restore can leave an invalid active link or bring back an unrelated activity. | Recheck links inside the write transaction. Record each deletion operation and each changed or declined link. Include Won and Lost deals in blocker checks while they are active. |
| Board moves, edits, and imports can disagree about probability, close dates, stage history, or card order. | Use one stage transition service. Check the board revision before a move. Update both column orders in one transaction. Derive shared totals on the backend. |
| Reports can disagree around local midnight, month boundaries, or fractional cents. | Keep calendar dates distinct from timestamps. Use the same local date and time zone for all related calculations. Round money totals at display precision and use fixed clocks and amounts in tests. |
| A workbook can contain bad links, formulas, or a preview that became stale. | Validate the proposed final state across sheets. Reject formulas and report the sheet, row, and field. Revalidate on apply and commit the workbook in one transaction. |
| Load or reset can overwrite data or miss a write made while the app is open. | Keep the SQLite writer transaction through the automatic backup and replacement. Publish only complete backup files. Abort replacement if backup creation fails. Advance the dataset revision after success. Bind backup deletion confirmations to the selected backup ID. |
| A form or confirmation opened before load or reset can act on a replacement record with the same ID. | Check the dataset revision on the server for stale writes. Check it in the UI on focus and periodically. Require a fresh view before the user submits the action again. |
| A setup that works on one OS can fail offline on another. | Use local assets and installed dependencies, serve both processes on loopback, and prevent startup from resolving packages over the network. Verify setup and offline startup on each required OS. |
| The deal panel can cover the selected card or lose the draft or focus on navigation. | Check the approved layout at laptop and desktop sizes. Preserve the open editor state on navigation and return focus to the card on close. Use visible stage names and status labels, plus the specified contrast-safe colors. |

## Proof

### Unit tests

| Suite | Planned cases |
| --- | --- |
| Vitest — tables and forms | Verify search, sort, and status controls send the correct query. Verify failed validation keeps entered values and displays field errors. Check loading, empty, no-match, and error states. |
| Vitest — deal panel and dialogs | Preserve the note draft during the jump to Pipeline. Clear the highlight and restore focus on close. Restore the saved board and totals after a failed move. Show all blocker links and restore choices. Cancel either backup confirmation without sending the final deletion request. Require reload before a stale form can save again. |
| pytest — records and recovery | Check case-insensitive search across linked names, typed sort with ID tie-breaks, and combined search and status filtering. Accept all three valid deal link combinations and reject missing or inactive links. Check blockers with an active Won or Lost deal and with a blocker added after preview. Verify an organization restore skips later link edits and a contact's explicit choice to stay independent. Verify a parent restore leaves independently deleted activities in Trash and keeps completed follow-ups complete. |
| pytest — pipeline, dates, and dashboard | Check insertion at either end, between cards, and in an empty column. A stale move leaves order intact. Same-stage reorder keeps probability and creates zero events. A stage change applies the destination probability and creates one event, including when a repeated stale request is rejected. Check actual and expected dates when closing, switching closed stages, and reopening with or without an expected date. With fixed dates, verify six calendar months including zero buckets, due-today versus overdue tasks, and one funnel contribution per reached stage. For example, two active open deals worth US$100.00 at 25% and US$200.00 at 50% yield US$300.00 open value and US$125.00 expected revenue, even when a Won deal is also present. |
| pytest — workbook and data commands | Verify partial workbooks, cross-sheet references, blank cell behavior, and ID-based updates. Reject duplicate IDs, conflicting IDs, invalid links, formulas, and stale previews. Check exported text stays text. Check first-run seed behavior and snapshot validation. |

### Integration tests

Use pytest with temporary SQLite databases and backup directories for transaction and API checks.

- Change a record between preview and confirmation, then verify the API returns the current conflict and commits no partial change. Check the same guarantee when a later workbook row fails during apply.
- Compare the full restored state with the saved state, including active records, Trash, recovery links, activity completion, stage history, and board order. Check the automatic backup against the pre-load or pre-reset state.
- Force failure before backup publication and during database replacement. Verify data and dataset revision stay the same in both cases. Keep the published backup if replacement fails after publication.
- Use two database connections to verify load and reset prevent an intervening write between snapshot and replacement. After successful replacement, reject a write that carries the previous dataset revision, even when its record ID still exists.
- Verify backup deletion rejects a final confirmation for a different ID or without the first confirmation. Verify successful deletion removes the selected backup only.

### End-to-end tests

Run Playwright Test with installed Chrome. Start the app from the test runner with a separate database and backup directory. Restart the app against the same test database when a case checks persistence.

| Browser flow | Passing result |
| --- | --- |
| First launch and demo (intent 1, 7) | Dashboard opens with realistic sample data. All five sales views work. A tester can find the next follow-up, identify deals likely to close, and review recent customer history. |
| Records and blockers (intent 2, 3) | Add, find, sort, edit, and delete each main record type. Filter contacts and add an organization to an independent contact. Save each valid deal link combination and reject a deal without a link. Follow every link in both multi-deal blocker dialogs. Verify allowed organization deletion clears links and keeps the related records. Check saved changes after refresh and restart. |
| Pipeline and Deal Workspace (intent 4) | Drag between stages and into an empty column. Reorder higher and lower in a column and move a card with the keyboard. Verify position after reload, the new probability in Deals, and updated totals. Add a deal in a stage and check late labels in the table and board. Jump from Deals and a linked record to a visible, highlighted card with details and draft open. Verify focus on close. |
| Activities and dashboard (intent 5, 6) | Log and edit activities on both owner types. Save and edit a deal note, restart, and then remove the note to Trash. Verify newest-first history, one event per stage change, upcoming and overdue tasks, and completion after restart. Compare the charts and totals with known data and check updates after a win and a follow-up. |
| Trash (intent 8–10) | Restore all four record types after a restart. Check automatic organization relinking, preservation of newer links, and both contact restore choices, including an unavailable former organization. Keep a deal in Trash until a valid link is available. Verify call note ownership, separate activity deletion, and follow-up visibility when the activity leaves or returns. |
| Local recovery (intent 11) | Run `npm run save`, `npm run load -- <backup-id>`, and `npm run seed` against the browser test dataset. Cancel reset and check that the data stays intact. Confirm reset and check that sample data returns and the prior records can be recovered. Verify views refresh on focus after replacement and stale forms cannot save. Cancel each backup deletion dialog, then complete both and verify deletion. |
| Spreadsheet exchange (intent 12) | Import a workbook with linked organizations, contacts, and deals. Find and edit the records in the app, then check the export. Reject invalid and stale imports and verify that no partial changes were applied. |

### Sign-off

- Run `npm test` from a stopped app and verify that Vitest, pytest, and Playwright run against isolated data.
- In Chrome, walk through each screen and applicable action as a salesperson. Check the approved layout, chart labels, text contrast, keyboard access, and visible status labels. Verify the console has no errors. Use the documented local commands with representative saved data.
- On each of Windows, macOS, and Linux, complete the one-time setup, disconnect from the internet, and run `npm run dev`. Open all five sales views, make and save a change, and verify the change after restart. Check that fonts, charts, and other assets load.
- Record the tested commit, suite results, OS and Chrome versions, and walkthrough results in `docs/STATUS.md`.
