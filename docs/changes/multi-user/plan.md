# Multi-user implementation plan

## Files that change

Paths are relative to the repository root. Each part has one owner. New file names are proposed. The sign-in and database owner makes all changes to shared entry points, including the search and menu connections in later phases.

### Sign-in and database

- Backend entry points and storage. `backend/main.py`, new `backend/auth.py` and `backend/settings.py`, `backend/db/__init__.py`, new `backend/db/migrations.py`, and `backend/seed.py`. Define the account preference table here for the user menu to use.
- Shared writes and reads. `backend/api/{records,sales,workbooks}.py` and `backend/services/{records,sales,workbooks,trash}.py`. Pass the verified actor to every write and return creator labels where the product displays them.
- App shell and records. `frontend/src/{App,Workspace,Records,Sales,Dashboard,DataView,dialogs,data}.tsx`, `frontend/src/style.css`, and `frontend/vite.config.ts`. Add `frontend/src/auth.tsx`, `SignIn.tsx`, and `sign-in.css`. Own the top bar and its connections to Search and UserMenu. Keep the shared API client and theme tokens here. Search and the user menu have their own component styles.
- Backup removal. Delete `backend/api/backups.py`, `backend/services/backups.py`, `backend/data_commands.py`, and `backend/tests/test_recovery.py`. Remove the backup scripts from `package.json` and remove backup controls from Data.
- Startup and hosting. `scripts/dev.mjs`, new `scripts/dev-test.mjs` and `backend/tests/local_app.py`, `.github/workflows/ci.yml`, new `render.yaml`, `README.md`, `pyproject.toml`, `uv.lock`, `frontend/package.json`, and `package-lock.json`. Update `.codex/agents/ui-check.toml` to use the isolated browser setup. The runtime reads the three settings named in the intent. Leave all `.env` files untouched.
- Tests. `backend/tests/conftest.py`, `backend/tests/test_{startup,records,sales,trash,workbook,atomic_edits}.py`, and new `backend/tests/test_auth.py`. Update `frontend/src/{App,Data,Records,Sales}.test.tsx` and `frontend/src/test-setup.ts`. Own `e2e/fixture.ts`, `e2e/{startup,records,sales,trash,data,walkthrough}.spec.ts`, and new `e2e/auth.spec.ts`. Keep the existing chart and theme regression cases for the menu owner to adapt in their test files. Move any theme-only cases out of `App.test.tsx` into the menu owner's test scope.
- Documentation. Own `docs/STATUS.md` and any product summary or area spec edits needed to keep the agreed behavior accurate through all phases.

### Search

- Add `backend/api/search.py`, `backend/services/search.py`, and `backend/tests/test_search.py`.
- Add `frontend/src/Search.tsx`, `frontend/src/search.css`, `frontend/src/Search.test.tsx`, and `e2e/search.spec.ts`. Reuse the authenticated API client and existing detail URL helper. Give the sign-in and database owner the router and component exports to register.

### User menu

- Update `backend/api/preferences.py` and `backend/tests/test_preferences.py`. Use the account preference table and verified user from phase 1.
- Update `frontend/src/theme.tsx` and `frontend/src/Dashboard.test.tsx`. Add `frontend/src/UserMenu.tsx`, `frontend/src/user-menu.css`, `frontend/src/UserMenu.test.tsx`, and `frontend/src/theme.test.tsx`. Update `e2e/theme.spec.ts` and add `e2e/user-menu.spec.ts`. Keep the resolved Light or Dark theme available to charts through `ThemeMode`. Give the sign-in and database owner the preference router, theme provider, and menu exports to connect.

## Order of work

1. **Sign-in and database.** Set up SQLAlchemy Core on Supabase Postgres and isolated SQLite for tests. Run versioned migrations at startup. Seed sample data once in a new database and preserve existing shared records, including an empty database after initialization. Use `psycopg` as the required Postgres driver. Add `@supabase/supabase-js` to handle browser sign-in, session refresh, and sign-out with the publishable key. Move `httpx` into runtime dependencies so the API can verify bearer tokens with Supabase Auth using a bounded timeout. Reuse the existing schema version mechanism and SQLAlchemy Core statements. Add a time zone data dependency only if the supported runtimes lack the IANA time zones required by the spec.
   - Gate every page through the sign-in screen. Keep the requested URL so successful sign-in opens the requested page. Put all application API routes, including version, workbook downloads, and future search and preferences, under the same authentication guard. Use the verified account ID and profile as the actor. Provide the browser only the Supabase URL and publishable key through public runtime configuration.
   - Record creator and last editor for organizations, contacts, deals, and activities. Apply the rules to forms, follow-up completion, Pipeline, workbook apply, and Trash, including records changed by cascading updates. Show **Added by** on details, activity entries, and Trash. Keep the **Sample data** label after an edit. Save each follow-up's time zone as required by the product spec and use US Eastern Time for new follow-ups and dates without a saved zone.
   - Keep spreadsheet preview, apply, template, and export. Use the authenticated request path for workbook downloads. Retire local backups and data commands. Set up the signed-in top bar and retire the old global theme control. Connect the account theme provider in phase 3.
   - Set up a test-only app entry point with a local auth double, two test accounts, and a fresh SQLite database. Use it in Playwright and `ui-check`. Use a readiness check outside the protected application API. Configure Render to build the frontend and run one FastAPI service on its assigned port. Serve static assets and app deep links from FastAPI, then verify the same setup locally with the built app and Supabase.
2. **Search.** Add a protected endpoint for case-insensitive substring matching on active organization, contact, and deal names. Define one matching rule for SQLite and Postgres. Show the name and type in each result and open its detail URL on selection. Support keyboard access and display loading, no-match, and error states. The sign-in and database owner registers the router and mounts Search in the top bar after the search owner hands over the exports.
3. **User menu.** Show the user's initials in the top bar and give the button an accessible name. Show Light, Dark, and System with the current choice marked. Save the choice by verified account ID. Default to System, follow changes to the device preference while System is selected, and apply the resolved theme to the whole app. Restore the saved choice on reload and on sign-in from another browser. Sign out, clear the session and account-specific state, and show the sign-in screen. The sign-in and database owner connects the router, provider, and menu after the menu owner hands over the exports.

## Risks

- SQLite and Postgres differ in locking, date handling, and text matching. Keep shared writes transactional and preserve revision checks. Check simultaneous startup, seed behavior after restart, and search with the same cases on both database engines.
- A route outside the authentication guard can expose shared records. Register every application API route through the guard, send the bearer token for download requests, and reject requests before any business operation when verification fails. Check that unknown API paths return an API error instead of the frontend page.
- An inherited setting can send a test to Supabase. Give automated tests and `ui-check` explicit local settings and verify offline operation with and without inherited Supabase settings. Keep test authentication out of the production entry point.
- A delayed response can show the wrong search results or overwrite a theme change. Ignore stale searches and responses from a previous session. Protect newer preference writes from delayed saves and show a retry state on failure.
- Render startup depends on the assigned port, the frontend build output, database connectivity, and startup migrations. Use the same build and start commands for the local production check. Put the environment setting names in `render.yaml` and enter their values in Render.

## Proof

### Unit tests

- **Sign-in and database.** In pytest, check token rejection, verified actor attribution despite client-supplied identity, access to the same records for two users, and creator preservation after another user edits them. Check display name, email fallback, and Sample data. Cover workbook writes, Pipeline moves, follow-up completion, deletion and restoration, including cascades. Check migration and seed behavior for new, existing, and intentionally empty test databases. Check follow-up status around a date change in two time zones. In Vitest, check sign-in errors, return to the requested page, bearer headers for JSON and downloads, and creator labels.
- **Search.** In pytest, check all three record types, mixed-case substrings, literal wildcard characters, empty input, and records in Trash. In Vitest, check result names and types, keyboard selection, detail links, no-match and error states, and stale responses.
- **User menu.** In pytest, check System as the default, valid choices, account isolation, and delayed or conflicting saves. In Vitest, check initials and the accessible menu name, current selection, device changes in System mode, failure and retry, sign-out, and chart theme updates with the same values.

### End-to-end tests

- **Sign-in and database.** In Playwright, open each main page and representative detail URLs while signed out. Check the sign-in screen and verify that every application API route refuses missing and invalid tokens. Sign in as two test users, share and edit records, and check creator labels on organizations, contacts, deals, and activities. Exercise Dashboard, Pipeline, Trash, and spreadsheet template, import, and export. Check that Data has no local backup controls and that saved work survives restart.
- **Search.** From the top bar, find an organization, contact, and deal by mixed-case substrings. Open the correct detail page for each type. Select a result with the keyboard. Check the no-match message and verify that putting a record in Trash removes its result.
- **User menu.** Start a new account in System. Check light and dark device settings, including charts and dialogs. Change the theme with the keyboard and pointer, reload, and sign in with the same account from a second browser context. Verify the saved choice and check that a different account keeps its own choice. Sign out and check that protected pages and API calls require sign-in again.

### Release checks

- Run `npm run check` both with local Supabase settings and in a clean test process without them. Both runs must finish without contacting Supabase. `npm test` must attempt Vitest, pytest, and Playwright even if an earlier suite fails and return a failure if any suite fails or cannot start. Measure each existing and new unit test against the one-second limit on the development computer. Require at least 80% line coverage in Vitest and pytest.
- Use the isolated `ui-check` setup to inspect all screens in Chrome in both themes. Check keyboard access, focus, contrast, and the browser console during the sales walkthrough.
- Run the production build locally with Supabase. Verify startup migrations, one-time seed, sign-in, shared records, and static assets and deep links. Repeat the SQLite search cases on Postgres to verify parity. Verify the service at its Render URL after deployment.
