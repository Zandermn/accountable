# Intent: dark mode

## Problem

Accountable only has a light mode, and some people prefer a dark screen.

## Proposed outcome

A shared top bar shows the theme toggle on every page. The toggle switches the app between light and dark mode and shows the current choice.

## Constraints

- Light mode stays the default until the user selects a mode. The app remembers the choice after a reload and uses it in each browser on the same computer.
- Keep the current light-mode appearance and colors, apart from the shared top bar and toggle.
- Colors stay in one place, as tokens, with no scattered overrides.
- The charts follow the mode too.
- Check WCAG AA text contrast in both modes, including chart labels. Use at least 4.5:1 for normal text and 3:1 for large text. Meet these thresholds throughout dark mode and in the new light-mode top bar. Preserve existing light-mode color pairings. If an existing pairing needs a contrast fix, adjust only its dark-mode tokens.
- No new dependencies.

## Not in this change

- Following the device's own dark mode setting.

## Success criteria

1. npm run check passes.
2. The shared top bar shows the toggle and current theme on every page. The app keeps the selected theme after a reload and when opened in another browser on the same computer.
3. A test checks that the selected theme is restored after a reload.
4. Text and chart labels meet the contrast requirements above, with existing light-mode colors preserved.
