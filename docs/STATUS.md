The project has not yet started.

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
