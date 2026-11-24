# Fix plan for a stalled theme read

## Problem

At startup, Accountable waits for `GET /api/preferences/theme` before it opens the workspace. If the request stays pending, the app continues to show “Loading…”. The user cannot open a page or retry the theme read, even when the sales API is available.

The [dark mode plan](plan.md#order-of-work) requires the app to apply a saved theme before it shows the workspace. If the read fails, the app must open in light mode and let the user retry.

## Changes

1. In `frontend/src/data.tsx`, add an optional `AbortSignal` to the existing API helper and pass it to `fetch`.
2. In `frontend/src/theme.tsx`, start a new request and timer for each theme read, including a retry. Use a named three-second deadline for the local request. Keep the deadline active until the response body is read. Abort the request at the deadline. Clear the timer when the read finishes. On cleanup, cancel the request and prevent updates from that attempt.
3. If the read succeeds before the deadline, apply the saved theme to the document before the first workspace render. If the read fails or reaches the deadline, use the existing light-mode fallback. Show the workspace and the retry control. Release the pending state so the user can retry.
4. Keep the workspace open during a retry. Apply the saved theme if the retry succeeds. If it fails, keep the light-mode workspace and let the user retry again. Ignore a late response from an expired attempt.

## Verification

- Add a Vitest regression test that holds the theme request open. Use fake timers to reach the deadline. Check that the request is aborted and that light mode, navigation, and the retry control appear. Resolve a retry with a saved dark theme. Check that the theme changes and that a late result from the first attempt has no effect.
- Add a Chrome test in `e2e/theme.spec.ts`. Hold only the initial theme request open and leave the sales API available. Check that a direct visit to Organizations shows its records in light mode after the deadline. Retry against a saved dark preference and check that the page stays open and switches to dark mode. Use Playwright assertions to wait for these results.
- Run `npm run check` from the repository root. Confirm that Vitest, pytest, and Playwright pass, and that Vitest and pytest each reach at least 80% line coverage. Record the results in `docs/STATUS.md`.
