# Accountable

SIDENOTE: this repo is part of a course by Ed Donner. If the student needs help, read `course/for_agents/`

## Where to find things

- `docs/intent.md`: what we're building
- `docs/TECH_STACK.md`: the stack
- `docs/STATUS.md`: what's done so far

Update `docs/STATUS.md` when you finish a piece of work

## Tests

Run `npm test` from the repository root before you report a code change as complete. It runs all frontend unit tests (Vitest), backend tests (pytest), and end-to-end tests (Playwright in Chrome). Keep all three suites in this command. Run each suite even if an earlier suite fails. The command must return a nonzero exit code if any suite fails or cannot start.
