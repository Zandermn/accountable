# Runtime, hosting, and verification

## Development and persistence

- Use a TypeScript React and Vite frontend in `frontend/`, with Node.js 24 or later and Node.js 26 as the project target. Use a Python 3.12 FastAPI backend in `backend/` with uv and root-level `pyproject.toml` and `uv.lock`. Use the root npm workspace and cross-platform npm scripts.
- In development, bind both servers to loopback and use Vite to proxy the same-origin JSON API to FastAPI. Serve assets and fonts with the app. The one-time setup installs the runtimes, project dependencies, and Chrome for browser tests. The app requires an internet connection for Supabase.
- Use Postgres on Supabase for app data and isolated SQLite databases for tests. Keep application tables in the private `accountable` Postgres schema. Use SQLAlchemy Core with no raw SQL. Use a versioned schema for records, attribution, links, deletion metadata, board order, stage history, and account preferences. Use database constraints for referential integrity and shared service validation for active-state rules. Commit changes before returning success.
- Use a shared backend domain service for API writes and workbook import. Validate active links, stage changes, and restore conditions within the write transaction. Before a confirmed deletion or board move, check that the request uses the current revision. Refresh the affected view when a revision conflict occurs.
- Use the same backend calculations for Dashboard and Pipeline summaries that need to agree. Add a dependency only if the implementation plan explains why it is needed.

## Hosting

- Deploy one web service on Render's free plan. FastAPI serves the built frontend and the API at the service's `onrender.com` URL. Run database migrations when the service starts.
- Use `DATABASE_URL`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY` as environment settings. Set them in `.env` for local development and in Render for the hosted service. Use `render.yaml` to describe the service. Enter the setting values in Render.
- Start a new Supabase database with [sample data](sample-data.md).

## Startup and test commands

| Action | Behavior |
| --- | --- |
| `npm run dev` | Start FastAPI and Vite, print the local browser URL, and connect to the configured Supabase project. |
| `npm run dev:test` | Start FastAPI and Vite with local test accounts and a temporary SQLite database for browser inspection. Open `http://127.0.0.1:5173` by default. |
| `npm run build` then `npm start` | Build the frontend and serve the app and API from FastAPI. |
| `npm test` | Run frontend, backend, and browser tests, even when an earlier suite fails. Return a failure if any suite fails or cannot start. |
| `npm run check` | Check formatting, lint, types, and secrets, then run all three test suites. |

The local data commands `npm run save`, `npm run load`, and `npm run seed` are retired.

## JSON API design

Apply the [API access rules](accounts.md#api-access) to every application API route. Use `/health` for readiness and `/auth-config` for the public sign-in settings. Return field errors for invalid inputs, a missing-record response for unavailable record URLs, and a conflict response when a link, blocking deal, or revision makes the request invalid in the current state. Return the current blocker or recovery options with the conflict. Treat repeated or stale actions as conflicts when the original action no longer applies, so they cannot create duplicate stage events or repeat a deletion.

## Verification

Use Vitest for frontend tests, pytest for backend tests, and Playwright Test with installed Chrome for browser tests in `e2e/`. Browser tests start the app themselves. Automated tests run offline after setup and use isolated SQLite data. Browser tests and UI checks sign in with test accounts without contacting Supabase or using a real account password. CI runs without secrets. Each unit test, old or new, runs in under one second on the development computer. Vitest and pytest each reach at least 80% line coverage of application code.

| Area | Required verification |
| --- | --- |
| Full product check | Run `npm run check` with and without local Supabase settings. Verify that both runs pass without contacting Supabase. Use the isolated browser setup to review every screen, walk through the sales tasks, and check the browser console. |
| Production startup | Build the frontend and run the app locally as Render runs it. Verify that migrations run at startup, FastAPI serves the built frontend and API, and a Supabase account can sign in and use the shared records. Verify the deployed service opens at its Render URL. |
| Search parity | Check case-insensitive name matching against SQLite in the automated suite and against Postgres in the production startup check. |
