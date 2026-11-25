# Accountable MVP

The local CRM is implemented. It includes Dashboard, Organizations, Contacts, Deals, Pipeline, Trash, and Data. Record forms, board moves, and workbook imports use the same stage rules. The app keeps records and board order in SQLite.

## Documentation organization

- Recorded the dark mode intent and updated the [product specification](spec.md) for the shared theme toggle, saved preference, brand colors, and verification in both modes. Contrast fixes for existing color pairings apply only to dark mode.
- Added the [dark mode implementation plan](changes/dark-mode/plan.md) with work phases, risks, and verification.
- Added the [theme read fix plan](changes/dark-mode/fixplan.md) to define a startup deadline, light-mode fallback, and regression tests.
- Moved the MVP intent and plan to `docs/changes/mvp/`.
- Made `docs/spec.md` the standalone specification for the current product, including the original customer problem.
- Updated `AGENTS.md` to put the specification first and isolate each change's documents by branch name.
- Updated `docs/REVIEW.md` to require findings for code that the specification does not describe.
- Added [the harness improvement checklist](IMPROVE.md) for Deploy, after the review fixes and before the merge.

## Codex project agents

- `reviewer` reads branch changes and reports Important findings and Nits under the [review policy](REVIEW.md). Its instructions restrict it to read-only commands.
- `ui-check` uses Playwright MCP to check the running app in light and dark modes against the product spec and brand skill. It saves screenshots in the Git-ignored `.playwright-mcp/` directory.
- The project registers Playwright MCP in `.codex/config.toml`. Open a new Codex session in the trusted project to load the configuration. Start the app with `npm run dev` before you ask Codex to use `ui-check`.
- On 2026-11-25, `ui-check` found no issues on Dashboard or Pipeline in Chrome at 1440 × 900 in either theme. It restored the saved Dark preference, and both app servers stopped after the check.
- The review of commit `0b04e3b` found that a theme save can still complete on the server after the browser times out. If that save finishes after a newer save, it can overwrite the newer choice. The finding came from code inspection.

## Dark mode on Windows (2026-11-24)

- Added a shared Light and Dark switch. The app starts in light mode by default and reads the saved choice from SQLite before it shows the workspace. The database migration preserves existing records. Theme saves leave the sales revision unchanged. Backup load and sample reset keep the active theme.
- Applied shared color tokens to the app, dialogs, Pipeline, and Dashboard charts. In Chrome, all ten route screenshots matched the previous light-mode screenshots pixel for pixel with the top bar hidden. Checked both modes, visible keyboard focus, the form dialog, and chart labels and tooltips. Edge loaded the mode saved in Chrome.
- The lowest measured dark-mode route text contrast was 5.51:1. The light and dark top-bar mode labels measured 10.71:1 and 8.53:1. Chart axis labels measured 6.36:1 and 10.81:1, and revenue tooltip text measured 12.63:1 and 8.56:1.
- `npm run check` passed on Windows. Vitest passed 22 tests with 83.83% line coverage. pytest passed 43 tests with 88.81% line coverage. Playwright passed 13 tests in Chrome. Gitleaks found no leaks when run with access to the installed scanner.
- Repeated the full check on commit `2b27795` and captured 28 Playwright screenshots. They show all ten routes in both modes, the organization form, the revenue tooltip, keyboard focus, both saved themes after reload, and dark mode in Edge. The final light-mode capture matched all ten baselines with the top bar hidden.

## Theme request recovery

- Added a three-second deadline to startup and retry theme reads. When a read times out, the app opens in light mode and offers Retry theme. A late response cannot replace the result of a newer attempt.
- `npm run check` passed on Windows. Vitest passed 23 tests with 84.08% line coverage. pytest passed 43 tests with 88.81% line coverage. Playwright passed 14 tests in Chrome. Gitleaks found no leaks.
- Playwright captured both modes on all ten routes, both reloads, dark mode in Edge, and the light fallback and dark recovery. The lowest measured dark-mode route text contrast was 5.51:1. Chart axes measured 6.36:1 in light mode and 10.81:1 in dark mode. Light-mode screenshots matched the baseline with the top bar hidden. The Dashboard comparison loaded both fonts before it drew the charts.
- The next review found the same failure in theme saves. The switch stayed disabled while the request was pending. The save now has a five-second deadline. If the browser cannot confirm the save, the app shows the previous mode and lets the user reload or retry. Playwright confirmed that reload reads the saved mode when the server completed the write before its response stalled.
- The new Playwright regression test failed before the save fix and passed after it. The full Windows check passed with 23 Vitest tests at 84.14% line coverage, 43 pytest tests at 88.81%, and 15 Playwright tests. Gitleaks found no leaks.

## Ideas for later

- Add a background highlight to the Dashboard header to match Pipeline.
- Add a background highlight to the Organizations header to match Pipeline.
- Add a background highlight to the Contacts header to match Pipeline.
- Add a background highlight to the Deals header to match Pipeline.

## Review policy

The [review policy](REVIEW.md) defines four checks before merge, including a check against the project standards. It defines when a finding blocks the merge and covers partial workbook imports, local access to sales records, and recovery from data loss.

## MVP review against main

The review of `ae4d0f1` found nine defects and one sign-off gap.

- Vite could serve local CRM files. FastAPI accepted untrusted host names.
- Workbook stage changes could replace the actual close date or lose the saved expected date. Export could truncate a long note.
- An old Restore dialog could reverse a later deletion of the same record.
- Dropping a deal in the gap between cards could move it to the end of the column.
- Clearing Probability could replace a manual value with the stage default. Editing an activity description could also change its occurrence time.
- An open Dashboard could keep the previous day's dates and month range.
- The plan requires disconnected checks on Windows, macOS, and Linux. The earlier Windows check kept the network adapter enabled.

## Review follow-up verification on Windows (2026-11-23)

The API accepts only local app host names. Repeated delete and restore actions return conflicts. An explicit blank organization link stays blank when the former organization is restored. An unchanged closed deal rejects a blank actual close date instead of replacing its history with today's date. Regression tests cover these cases in the record API and workbook preview.

`npm test` passed: 11 Vitest, 40 pytest, and 10 Playwright tests. macOS and Linux setup, offline startup, and runtime checks remain outstanding. This run does not complete the disconnected cross-platform sign-off.

## Sidebar icons

Each of the seven sidebar links has a distinct Lucide icon and a visible text label. The app bundles the icons for offline use. Playwright verified all seven in Chrome on Windows.

## Technology tutorial

- Expanded the [HTML technology and agent workflow course](techbreakdown/index.html) to 12 lessons in four stages: foundations, application layers, professional agent-led development, and a guided capstone. The 14 pages include the course home, quick reference, and lessons on specification-driven changes, coding agents, debugging, review, and delivery.
- Updated the technical lessons for schema version 2, saved light and dark preferences, request deadlines, Gitleaks, Lefthook, coverage gates, CI, and the current change-document layout. Removed links to superseded root-level intent and plan documents.
- Made the course question-led with 88 practical problem-and-answer prompts. Examples trace real requirements to source and tests, including stage changes, workbook recovery, stale actions, and uncertain theme saves.
- The course works offline with local fonts and optional copy-code controls. Checked 467 local file links, 157 anchors, unique IDs, navigation, current-page markers, and question-led instructional sections. Chrome passed 28 desktop and mobile renders with no horizontal overflow, console errors, or external requests.
- `npm run check` passed on Windows after the course update. Vitest passed 23 tests with 84.14% line coverage, pytest passed 43 tests with 88.81% line coverage, and Playwright passed 15 tests. Gitleaks found no leaks.

## One-time setup

Install Node.js 26, uv, and Google Chrome. Node.js 24 or later is supported. Install Gitleaks 8.30 or later and make it available on `PATH` to run the repository checks. Open a terminal in this repository. With internet access, run these commands.

```sh
uv python install 3.12
uv sync --locked
npm ci
```

The Lefthook package installs the Git hooks during `npm ci`. To install the hooks again, run `npx --no-install lefthook install`. Before each commit, Lefthook formats staged frontend and Python files, stages the formatting changes, runs lint and type checks, and scans the staged changes with Gitleaks. When Gitleaks detects a secret, it reports the file and line number and redacts the secret value. The hook skips the test suites.

The project also defines a Codex hook for `.env` files. In a trusted project, review and trust the hook in Codex Settings > Hooks or with `/hooks` in the CLI. The hook blocks matching patch, shell, and filesystem tool calls that name a `.env` path. It checks tool arguments, so it can miss paths that a script computes at run time.

On Windows, a test commit included both formatters' fixes and preserved an unstaged edit. It ran in about seven seconds and skipped the test suites. Separate test commits failed on a staged fake secret and on lint and type errors. Codex listed the project hook. The hook script denied seven test requests that named `.env` files and allowed three other requests.

The Codex Stop hook runs `npm run check` from the repository root before the turn ends. A failure asks Codex to fix the errors and rerun the check. On the next stop attempt in the same turn, the hook allows the turn to end. Review and trust the Stop hook in Codex before use.

## Continuous integration

The [GitHub Actions workflow](../.github/workflows/ci.yml) runs the `check` job on every branch push. Gitleaks scans the checked-out repository first. If the scan finds a secret, the job stops. The job then sets up Node.js and uv, installs the locked dependencies, and runs `npm run check:quick`. This command checks formatting, lint rules, types, and secrets, then runs Vitest and pytest. CI skips the Playwright end-to-end tests.

Run `npm run check` locally for all checks and all three test suites, including Playwright in Chrome.

## GitHub fork

The local `Harness` branch was pushed to the [Harness branch on GitHub](https://github.com/Zandermn/accountable/tree/Harness) and tracks `fork/Harness`. The `fork` remote points to `Zandermn/accountable`. The `origin` remote points to the [original course repository](https://github.com/ed-donner/accountable).

## Local runtime

Start the app with `npm run dev`. Open the local URL printed by Vite, normally `http://127.0.0.1:5173`. Keep the terminal open while you use the app. Press Ctrl+C to stop both servers. Startup uses the installed dependencies and local fonts.

The first launch fills `data/accountable.db` with sample records. Each later launch opens the saved database. Backups go in `data/backups/`. Set `ACCOUNTABLE_DB` and `ACCOUNTABLE_BACKUPS` to use other locations. Use the same settings for the app and its data commands.

## Commands

| Command | Result |
| --- | --- |
| `npm run check` | Check frontend and backend formatting, lint rules, and types. Scan the working tree for secrets with Gitleaks, then run all three test suites. |
| `npm run check:quick` | Run the same checks and unit tests. Skip the Chrome tests. |
| `npm run format` | Apply Prettier formatting to the frontend and Ruff formatting to the backend. |
| `npm test` | Run Vitest, pytest, and Playwright in order. Chrome starts the app on temporary ports. Each browser case gets a separate database and backup directory. |
| `npm run test:ui`, `npm run test:api`, `npm run test:e2e` | Run one test suite. |
| `npm run build` | Check TypeScript and build the frontend in `frontend/dist/`. |
| `npm run save` | Save a complete backup, including Trash, links, notes, follow-ups, stage history, and board order. The command prints the backup ID and file path. |
| `npm run load -- <backup-id>` | Replace `<backup-id>` with the ID printed by save. The command validates that backup, saves the current data, and loads the selected backup. |
| `npm run seed` | Type `yes` to save a full backup and replace the current data with fresh samples. Press Enter to cancel. |

Use **Data** to download the workbook template, preview an import, export active sales records, or delete a backup. Backup deletion requires two confirmations. Use **Trash** to restore an individual record.

Gitleaks scans the current working tree, including untracked source files. It uses its default rules and a project rule that also catches shorter OpenAI project key patterns. The scan allows the Git-ignored root `.env` file and excludes generated files in dependency, cache, build, local data, and test output directories.

`tsc` checks frontend types and `ty` checks backend Python types. Vitest and pytest each require at least 80% line coverage of their application code. Frontend tests cover Dashboard follow-ups, record details, Trash, workbook import, deal notes, and reopening closed deals.

## Deal Workspace visual check on Windows (2026-11-23)

Compared all five sales views in Chrome with the [approved mockup](mockups/06-deal-workspace.html) at 1440 × 900. Playwright captured the mockup and the app before and after the changes. The app screenshots use the local sales records.

The Dashboard now shows the board below the charts. Opening a card there keeps the selected deal beside the board. The Dashboard shows three recent activities and a control to expand the list. The charts, follow-up rows, board totals, cards, and deal notes use the mockup layout. The directories show record counts and compact rows. Organizations also shows the number of linked active contacts and deals.

The Pipeline totals measured 36 pixels high in both the app and the mockup. The deal panel fit beside the board at 1440 and 1280 pixels wide. At 1100 pixels, it moved below the board.

The production build passed. The final `npm test` run passed all 49 tests, including the linked-record counts and the Dashboard card selection and focus checks.

## Browser test startup on Windows

The Playwright fixture selects free test ports from `20000` through `29999`. Windows can assign ports that Fetch and Chrome block when the fixture asks the operating system for any free port. A startup failure now reports both ports and the app startup log.

## Test runner verification on Windows (2026-11-23)

`npm test` runs all three suites even if one fails. Each run gives pytest a temporary directory for its databases and cache. This avoids a Windows access error when a different account owns a previous pytest directory.

A temporary failing Vitest test confirmed the failure path. All 31 backend tests and 10 Chrome tests still ran and passed. The command returned exit code 1.

After removal of the temporary test, all 49 project tests passed (8 Vitest, 31 pytest, and 10 Playwright). The command returned exit code 0.

## Windows verification · 2026-11-22

Tested the uncommitted working tree on branch `MVP`, based on `91e45facfac1830fba51b05d494f32a94f80225c`. The requested OS scope was Windows. The host reported build 26300.9974 (26H2). The run used Node.js 26.13.1, npm 11.7.0, Python 3.12.12, uv 0.11.23, and installed Google Chrome 145.0.7632.110.

| Check | Result |
| --- | --- |
| `npm test` with the app stopped | 8 frontend tests, 31 backend tests, and 10 Chrome tests passed. |
| Production build | TypeScript and Vite passed. |
| Sales walkthrough | Opened all five sales views, Trash, and Data. Followed an overdue task to its contact, sorted deals by probability, and checked recent history. Verified notes, stage moves, and saved changes after restart. |
| Layout and keyboard | Inspected the board and deal panel at 1280 × 900 and 1440 × 900. The selected card stayed visible. A keyboard move saved the new order. Closing the panel returned focus to the card. Monthly charts had keyboard-accessible values. |
| Offline operation | Ran `npm run dev` with installed dependencies and npm offline mode. Chrome blocked non-loopback browser requests. Both fonts and charts loaded. A new organization survived restart. The walkthrough recorded zero external requests and zero browser errors. The network adapter stayed enabled. |
| Recovery and exchange | Executed save, load, cancelled reset, and confirmed reset against the browser test database. Checked both backup confirmations. Imported linked records, edited a deal, and checked the downloaded workbook. Failure tests verified rollback and the dataset revision. |

The walkthrough writes screenshots under `test-results/`. Pytest reports one upstream Starlette deprecation warning for its HTTP test client.

## MVP implementation plan

- Wrote and reviewed [the MVP implementation plan](changes/mvp/plan.md). It maps file changes to work phases, defines when each phase is complete, and lists unit, integration, browser, and offline sign-off checks.

## MVP specification

- Wrote `docs/spec.md` for engineering handoff. It covers the five main sections, the brand, record lifecycle rules, spreadsheet exchange, local backups, and acceptance checks. It records design decisions where requirements overlap or leave details open.
- Added five HTML mockups in `docs/mockups/`, each with a full-page Playwright screenshot of Dashboard and Pipeline. Each mockup has searchable Organizations, Contacts, and Deals with linked sample records. Sales Pulse and Deal Desk explore different ways to present the sales funnel. The mockups use sample data and local browser storage.
- Selected [Mockup 6 — Deal Workspace](mockups/06-deal-workspace.html) as the approved MVP design. The spec records the deal notes and Show in pipeline behavior. The [Playwright screenshot](mockups/06-deal-workspace.png) shows the selected deal beside the board. The mockup saves notes in browser storage.

## MVP intent

- Completed the intent interview. The MVP covers all five sections for one salesperson doing daily sales work. Sign-off requires offline startup and use after setup on Windows, macOS and Linux, passing automated tests, and a full browser walkthrough. See `docs/changes/mvp/intent.md`.
- Clarified that a contact can exist without an organization and can be linked to one later. See `docs/changes/mvp/intent.md` and `GLOSSARY.md`.
- Clarified that a deal must have an organization, a main contact, or both.
- Required the user to clear all active deal links before deleting a contact. The dialog links to each deal that blocks deletion.
- Blocked organization deletion while an active deal depends on that organization alone. When deletion can proceed, the contacts and deals stay and their links to the organization are removed.
- Defined Trash and recovery for all four record types, including activities and follow-ups that move with a deleted contact or deal.
- Defined which contact and deal links return automatically when an organization is restored.
- Required at least one active organization or main contact link when a deal is restored. Only active deals can block deletion of a contact or organization.
- Clarified that call notes belong to their contact and move to Trash and return with that contact.
- Added a choice when restoring a contact with a former organization. The user can restore the active organization link or restore the contact as an individual.
- Defined local save and load commands, automatic backups before reset and load, and two separate confirmations before deleting a saved backup.
- Set three daily sales outcomes and clarified the need for a welcoming, minimal interface for new and experienced salespeople.
- Set Accountable as the main place to track customers and deals. Added spreadsheet import and export to MVP scope.
- Defined realistic sample data as the demo for prospective salespeople and included it in the browser walkthrough.

## Tooling setup

- Added private pi project config at `.pi/settings.json` (git-ignored, per-developer). Points at `https://pi.dev/schemas/settings.schema.json` for editor validation.
- Because `.pi/settings.json` exists, pi will ask for project trust the first time it starts here. Approve once and the decision is saved in `~/.pi/agent/trust.json`.
- Added a private permission gate at `.pi/extensions/permission-gate/` (pi has no built-in allow/ask/deny rules, so this is a `tool_call` extension). Current rules: allow `Bash(npm test)`, ask `Bash(git push *)`, deny `Read(./.env)`; unmatched calls are allowed. Run `/permissions` in-session to inspect, or `node --test .pi/extensions/permission-gate/rules.test.ts` for the unit tests.
- Known gap: the `read` deny does not cover `bash` (e.g. `cat .env`), because a `tool_call` gate cannot see inside a shell command.
- Added the project-level `brand` skill at `.agents/skills/brand/SKILL.md`. It contains the brand guidance formerly in `docs/BRAND.md` and applies to all UI work.
- Copied the `brand` skill to `.claude/skills/brand/SKILL.md` so Claude Code loads it. Claude Code does not scan `.agents/skills/`. Keep the two copies in sync.
- Added private Claude Code permission rules at `.claude/settings.local.json` (git-ignored), copied from `.kimi-code/local.toml`: allow `Bash(npm test)`, ask `Bash(git push *)`, deny `Read(./.env)`. Restart the session or open `/permissions` to load the file, because `.claude/` did not exist when this session started.
- Added the Playwright MCP server at project scope in `.mcp.json` (`claude mcp add -s project playwright -- npx @playwright/mcp@latest`). The file is committed so every developer gets the same server. It stays pending until the first session approves it; type `/mcp` to approve, or approve the prompt when Claude Code starts. Its screenshots go in `.playwright-mcp/`, which git ignores.
- Added the same Playwright MCP server for pi at project scope in `.pi/mcp.json` (`npx -y @playwright/mcp@latest`), with `exposure: "deferred"` so its 25 `browser_*` tools are loaded by `tool_search` instead of being declared on every turn. `.pi/` is git-ignored, so this is per-developer like the rest of the pi config. Verified with `pi mcp list` (connected, 25 tools). Run `/reload` in a running session to pick it up. For a user-level copy that works in every project: `pi mcp add playwright -- npx -y @playwright/mcp@latest`.
