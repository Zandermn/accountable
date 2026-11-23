# Accountable MVP

The local CRM is implemented. It includes Dashboard, Organizations, Contacts, Deals, Pipeline, Trash, and Data. Record forms, board moves, and workbook imports use the same stage rules. The app keeps records and board order in SQLite.

## One-time setup

Install Node.js 26, uv, and Google Chrome. Node.js 24 or later is supported. Open a terminal in this repository. With internet access, run these commands.

```sh
uv python install 3.12
uv sync --locked
npm ci
```

Start the app with `npm run dev`. Open the local URL printed by Vite, normally `http://127.0.0.1:5173`. Keep the terminal open while you use the app. Press Ctrl+C to stop both servers. Startup uses the installed dependencies and local fonts.

The first launch fills `data/accountable.db` with sample records. Each later launch opens the saved database. Backups go in `data/backups/`. Set `ACCOUNTABLE_DB` and `ACCOUNTABLE_BACKUPS` to use other locations. Use the same settings for the app and its data commands.

## Commands

| Command | Result |
| --- | --- |
| `npm test` | Run Vitest, pytest, and Playwright in order. Chrome starts the app on temporary ports. Each browser case gets a separate database and backup directory. |
| `npm run test:ui`, `npm run test:api`, `npm run test:e2e` | Run one test suite. |
| `npm run build` | Check TypeScript and build the frontend in `frontend/dist/`. |
| `npm run save` | Save a complete backup, including Trash, links, notes, follow-ups, stage history, and board order. The command prints the backup ID and file path. |
| `npm run load -- <backup-id>` | Replace `<backup-id>` with the ID printed by save. The command validates that backup, saves the current data, and loads the selected backup. |
| `npm run seed` | Type `yes` to save a full backup and replace the current data with fresh samples. Press Enter to cancel. |

Use **Data** to download the workbook template, preview an import, export active sales records, or delete a backup. Backup deletion requires two confirmations. Use **Trash** to restore an individual record.

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

- Wrote and reviewed [the MVP implementation plan](plan.md). It maps file changes to work phases, defines when each phase is complete, and lists unit, integration, browser, and offline sign-off checks.

## MVP specification

- Wrote `docs/spec.md` for engineering handoff. It covers the five main sections, the brand, record lifecycle rules, spreadsheet exchange, local backups, and acceptance checks. It records design decisions where requirements overlap or leave details open.
- Added five HTML mockups in `docs/mockups/`, each with a full-page Playwright screenshot of Dashboard and Pipeline. Each mockup has searchable Organizations, Contacts, and Deals with linked sample records. Sales Pulse and Deal Desk explore different ways to present the sales funnel. The mockups use sample data and local browser storage.
- Selected [Mockup 6 — Deal Workspace](mockups/06-deal-workspace.html) as the approved MVP design. The spec records the deal notes and Show in pipeline behavior. The [Playwright screenshot](mockups/06-deal-workspace.png) shows the selected deal beside the board. The mockup saves notes in browser storage.

## MVP intent

- Completed the intent interview. The MVP covers all five sections for one salesperson doing daily sales work. Sign-off requires offline startup and use after setup on Windows, macOS and Linux, passing automated tests, and a full browser walkthrough. See `docs/intent.md`.
- Clarified that a contact can exist without an organization and can be linked to one later. See `docs/intent.md` and `GLOSSARY.md`.
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
