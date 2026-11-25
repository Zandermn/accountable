# Local runtime and verification

## Local runtime and persistence

- Use a TypeScript React and Vite frontend in `frontend/`, with Node.js 24 or later and Node.js 26 as the project target. Use a Python 3.12 FastAPI backend in `backend/` with uv and root-level `pyproject.toml` and `uv.lock`. Use the root npm workspace and cross-platform npm scripts.
- Bind both servers to loopback. Use Vite to proxy a same-origin JSON API to FastAPI. Serve assets and fonts locally and use local dependencies after setup. The one-time setup installs the runtimes, project dependencies, and Chrome for browser tests. After setup, the startup and runtime paths must avoid network fetches, including package resolution on launch.
- Use local SQLite and SQLAlchemy Core with no raw SQL. Version the schema. Store records, current links, deletion metadata, order, and stage history in the database. Use database constraints for referential integrity and shared service validation for active-state rules. Commit changes before returning success.
- Use a shared backend domain service for API writes, workbook import, and local data commands. Serialize writes through SQLite transactions. Validate active links, stage changes, and restore conditions inside those transactions. Use record or dataset revisions to reject stale confirmations and refresh the affected view. A backup or reset must see a consistent data state even if the app is open.
- Prefer supported table, chart, drag-and-drop, and workbook libraries. Use the same backend calculations for Dashboard and Pipeline summaries that need to agree.

## Startup and test commands

| Action | Behavior |
| --- | --- |
| `npm run dev` | Start FastAPI and Vite, print the local browser URL, and open the existing data or initialize the sample state on first run. |
| `npm test` | Run frontend, backend, and browser tests and fail if any fail. Test data is isolated from user data. |

## JSON API design

Return field errors for invalid inputs, a missing-record response for unavailable record URLs, and a conflict response when a link, blocking deal, or revision makes the request invalid in the current state. Return the current blocker or recovery options with the conflict. Treat repeated or stale actions as conflicts when the original action no longer applies, so they cannot create duplicate stage events or repeat a deletion.

## Verification

Use Vitest for frontend tests, pytest for backend tests, and Playwright Test with installed Chrome for browser tests in `e2e/`. Browser tests start the app themselves and use an isolated database and backup directory. The one-time setup and commands are documented in [project status](../STATUS.md).

| Area | Required verification |
| --- | --- |
| Offline startup and sample data | On Windows, macOS, and Linux, complete setup and disconnect from the internet. Run `npm run dev`, open Dashboard, and use all five sections with sample data. Verify fonts, charts, and assets load offline. |
| Full product check | Run `npm run check`, which includes `npm test`. Walk through the applicable actions in a real browser as a salesperson, review every screen, and verify the browser console has no errors. Run the local data commands with representative records. Record the test results and OS coverage before sign-off. |

## Design decisions

| Area | Concern and treatment |
| --- | --- |
| Offline use and initial setup | Google Fonts identifies the brand typefaces. The app serves installed copies locally. Downloads are part of one-time setup. Test the offline path on all three operating systems before sign-off. |

See [Sample data and local backups](backups.md) for sample initialization and [Navigation, brand, and theme](interface.md#theme-persistence) for theme persistence.
