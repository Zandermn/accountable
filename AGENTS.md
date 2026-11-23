# Accountable

SIDENOTE: this repo is part of a course by Ed Donner. If the student needs help, read `course/for_agents/`

## Where to find things

- `docs/spec.md`: the current product specification. Read this first.
- `docs/TECH_STACK.md`: the stack
- `docs/STATUS.md`: what's done so far
- `docs/changes/<branch name>/`: the current change's `intent.md` and `plan.md`

Each change has its own `docs/changes/<branch name>/` folder with its `intent.md` and `plan.md`. Read only the current change's folder, not folders for other changes.

Update `docs/STATUS.md` when you finish a piece of work

## Tests

Run `npm test` from the repository root before you report a code change as complete. It runs all frontend unit tests (Vitest), backend tests (pytest), and end-to-end tests (Playwright in Chrome). Keep all three suites in this command. Run each suite even if an earlier suite fails. The command must return a nonzero exit code if any suite fails or cannot start.
