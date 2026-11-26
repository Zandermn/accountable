# Independent review: multi-user

## Scope

Reviewed the complete committed branch diff with `git diff main...HEAD`.

- Fixed point: `main` at `5a71edb16a827a4bb66b606c025ab0a24a053835`
- Branch: `multiuser`
- Commits: `aecc88c`, `b1259c2`, `1a3c727`, `0e7feb8`
- Emphasis: code quality, readability, project standards, and specification compliance
- Uncommitted working-tree edits were not reviewed.

## Standards

### Hard violations

- **Raw SQL is prohibited.** `backend/db/migrations.py:26-30` returns `f"ALTER TABLE {table} ADD COLUMN {column}"`. This violates `docs/TECH_STACK.md:6`: “using SQLAlchemy Core with no raw SQL.” Use a migration mechanism that does not construct SQL strings.

- **The course README was modified.** `README.md:11-22` adds a “Run Accountable” section, and line 106 rewrites course instructions. `docs/TECH_STACK.md:18` explicitly says: “README.md is the course's own guide, so leave it as it is.” Move operational instructions elsewhere.

### Judgement calls

- **Long, multi-purpose function; Mysterious Name.** `frontend/src/theme.tsx:58-115` declares `async (next?: ThemeChoice, reload = false)`. `change` loads, saves, retries, times out, rolls back, and manages busy/error state. This conflicts with `docs/Standers.md:5`: “Favor short functions and method with one purpose.” Its name also conceals loading and retry behavior. Split these operations and share only the timeout and rollback logic.

- **Implementation-specific tests.** `e2e/data.spec.ts:28`, `e2e/records.spec.ts:40`, and `e2e/records.spec.ts:154` use `p.locator('.directory-tools').getByRole('searchbox')`. The new dependency on a layout class conflicts with `docs/Standers.md:8`: “Avoid brittle tests that are tied to implementation specifics.” Prefer an accessible, record-search-specific name or role query.

- **Duplicated Code.** `e2e/theme.spec.ts:4-5` and `e2e/user-menu.spec.ts:4-6` independently define the same menu and radio locators, including `page.getByRole('radio', { name, exact: true })`. Extract shared user-menu helpers.

- **Mysterious Name.** `backend/db/__init__.py:180` sets `self.path = database`, although `database` can now be a PostgreSQL URL as well as a SQLite `Path`. Rename the attribute to `database` or `database_source` so its contents remain clear.

## Spec

### Missing or partial

- **Production acceptance is incomplete.** The intent requires: “The app deploys to Render's free plan as one web service … and it answers at its onrender.com address” (`docs/changes/multi-user/intent.md:24`) and “The built app runs on this computer the way Render runs it, signed in against Supabase” (`docs/changes/multi-user/intent.md:41`). However, `docs/STATUS.md:12` explicitly says: “Live Supabase and Render verification remain pending.” The Blueprint exists, but production migrations, one-time seeding, real Supabase sign-in and shared records, and availability at the Render URL remain unverified. This leaves success criterion 6 and the deployment requirement unsatisfied.

### Scope creep

- **A project-specific hosted Supabase MCP integration was added without a specification request.** The plan’s tooling scope says: “Update `.codex/agents/ui-check.toml` to use the isolated browser setup” (`docs/changes/multi-user/plan.md:13`). Instead, `.codex/config.toml:12-13` registers a read-only Supabase MCP server hard-coded to `project_ref=xpqppjtyddgrimbdmzet`. Opening the trusted project in Codex therefore exposes an external integration tied to one particular Supabase project, rather than the developer’s configured project. Remove it, justify it separately, or keep it as local configuration.

### Wrong implementation

No additional confirmed implementation defects were found. The committed paths implement authenticated API requests and downloads, verified-user attribution including cascades and imports, case-insensitive literal search, account-versioned theme persistence, requested-URL preservation, backup retirement, and the Render startup configuration.

---

Standards: 6 findings; the most serious is the raw-SQL migration, which directly violates the documented stack. Spec: 2 findings; the most serious is incomplete live Supabase and Render acceptance.
