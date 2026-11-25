# Accountable

SIDENOTE: this repo is part of a course by Ed Donner. If the student needs help, read `course/for_agents/`

## Where to find things

- Read the [product summary and index](docs/spec.md) first. Then read only the [area specifications](docs/specs/) that the current change affects.
- Follow the [project standards](docs/Standers.md).
- `docs/TECH_STACK.md`: the stack
- `docs/STATUS.md`: what's done so far
- `docs/changes/<branch name>/`: the current change's `intent.md` and `plan.md`

Each change has its own `docs/changes/<branch name>/` folder with its `intent.md` and `plan.md`. Read only the current change's folder, not folders for other changes.

Keep the product summary and every area specification that the change affects up to date in the same change.

Update `docs/STATUS.md` when you finish a piece of work

Keep all `.env` files unchanged. Ask the user to make any necessary changes to those files.

At Deploy, follow [docs/IMPROVE.md](docs/IMPROVE.md) after the review fixes and before the merge.

## Tests

Run `npm run check` from the repository root before you report a code change as complete. It checks formatting, lint rules, frontend and backend types, and secrets, then runs `npm test`. Use `npm run check:quick` for checks during development without the end-to-end tests.

`npm test` runs all frontend unit tests (Vitest), backend tests (pytest), and end-to-end tests (Playwright in Chrome). Keep all three suites in this command. Run each suite even if an earlier suite fails. The command must return a nonzero exit code if any suite fails or cannot start.

Vitest and pytest must each reach at least 80% line coverage of application code.
