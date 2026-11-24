# Plan for dark mode

## Files that change

| File | Change |
| --- | --- |
| `backend/db/__init__.py` | Add a versioned SQLite migration for one app-wide theme preference. Use the existing transaction mechanism. |
| `backend/api/preferences.py` (new), `backend/main.py` | Add and register a local API that reads and saves the theme. Accept `light` and `dark`. |
| `frontend/src/App.tsx`, `frontend/src/theme.tsx` (new) | Add the shared top bar and manage the app theme outside the page routes. Use the existing API helper in `frontend/src/data.tsx`. |
| `frontend/src/style.css` | Define light and dark color tokens in one place. Apply them to the top bar, dialogs, controls, and other app surfaces. |
| `frontend/src/Dashboard.tsx`, `frontend/src/Sales.tsx` | Use shared tokens for Dashboard charts, the sales funnel, and Pipeline stage colors. |
| `backend/tests/test_preferences.py` (new), `frontend/src/App.test.tsx`, `frontend/src/Dashboard.test.tsx` | Cover theme persistence, the shared toggle, and chart updates. |
| `e2e/theme.spec.ts` (new) | Verify theme behavior through the existing Chrome fixture with its own database. |
| `docs/STATUS.md` | Record the implementation and verification results. |

## Order of work

1. **Phase 1. Save the preference.** Add a preference table to the local database and migrate existing databases in a transaction. Treat a missing preference as light. Save changes without changing sales record revisions. Keep the preference outside the sales dataset that backup and reset commands replace.
2. **Phase 2. Add the shared control.** Read the saved theme at startup and apply it to the document root before the first themed view appears. Add a labeled toggle that shows the current mode and works with the keyboard and pointer. Apply a change immediately and save it through the API. Allow one save at a time. If saving fails, restore the last saved mode and show an error so the user can try again. If reading fails, show the app in light mode with a retryable message.
3. **Phase 3. Apply the brand and update charts.** Capture the current light-mode appearance before moving its colors into tokens. Add the dark palette with a `#04232E` page, black cards and panels, and Sea Mist `#CDD8DB` text. Use the active tokens for links, focus, status labels, form controls, dialogs, and Pipeline stages. Resolve the chart tokens to color values before passing them to Chart.js. Update the chart axes, grid, series, points, and tooltips when the mode changes. Keep stage names, accent order, and chart values. Use existing dependencies.
4. **Phase 4. Verify the change.** Run the tests in Proof. Inspect each screen in both themes. Compare light mode with the baseline and measure text contrast, including chart labels and the new top bar. Run `npm run check` from the repository root and record the results.

## Risks

| Risk | Treatment |
| --- | --- |
| Browser storage is specific to one profile. A second browser could start with a different theme. | Read the preference from the local app API on startup. Check it from a fresh browser session and from a second browser on the same computer. |
| Adding a preference could affect existing databases, backup files, or record editing. | Test the migration with an existing database. Keep the preference separate from the sales dataset and its revision counter. Check that a backup or reset leaves the current theme in place. |
| Replacing color literals could change the light-mode appearance or reduce contrast. | Keep the current light-mode color values and compare the rendered screens with the baseline. Fix contrast for existing elements in dark-mode tokens only. Check the new top bar in both modes. |
| Canvas charts can keep old colors after a theme change. | Resolve shared tokens to concrete Chart.js colors after the new theme is active. Check that the charts redraw with the new colors and keep the same values. |

## Proof

**Unit tests**

- **Vitest.** Check that the toggle shows light when there is no saved choice, applies a saved dark choice at startup, and saves a keyboard or pointer change. Check that a failed save restores the previous mode and shows an error. Check that a failed read falls back to light and can be retried.
- **Vitest.** Check that the Dashboard passes the selected theme's colors to the line and bar charts after a toggle. Check that chart data and the text alternative stay the same.
- **pytest.** Check the light default, saving both themes, and rejecting an invalid theme while retaining the last valid value. Reopen the same database in a new app instance and check that it returns the saved theme. Check that an existing database migrates with its records intact and that a theme write leaves the dataset revision unchanged.
- **pytest.** Check that loading a sales backup or resetting sample data preserves the active theme. Run the existing recovery tests against the revised database code.

**End-to-end tests**

- Start with no preference and emulate a device in dark mode. Check that Accountable starts in light mode. Tab to the labeled toggle and switch to dark mode with the keyboard. Check that its state and the rendered page colors change. Reload and confirm dark mode is restored. Switch back to light and reload again.
- Open the same app in a fresh Chrome context with no browser storage after saving dark mode. Check that it starts in dark mode. Visit all seven navigation destinations and the organization, contact, and deal detail pages. Check that the toggle and current mode appear on each page.
- On Dashboard, switch modes with the pointer. Check that the revenue and wins charts redraw and that the funnel follows the selected mode. Compare the displayed values before and after. Open a form dialog in dark mode and check that it uses the selected theme.

**Browser inspection and full check**

- Open the same local app in a second browser to confirm it uses the saved choice. Inspect every screen, including chart axes and tooltips, forms, dialogs, and status labels. Check for visible keyboard focus. Compare light mode with the baseline and verify at least 4.5:1 contrast for normal text and 3:1 for large text in dark mode and in the top bar in both modes.
- Run `npm run check`. Confirm that Vitest, pytest, and Playwright pass and that Vitest and pytest each reach at least 80% line coverage of application code.
