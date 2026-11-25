# Navigation, brand, and theme

## Navigation and common interactions

- Open Dashboard at `/`. Use a persistent left navigation for the five main sections. Put Trash and Data in a separate utility group. Data contains spreadsheet tools and local backup management.
- Use `/organizations`, `/contacts`, `/deals`, and `/pipeline` for the main views. Use `/organizations/:id`, `/contacts/:id`, and `/deals/:id` for detail pages. Use `/trash` and `/data` for utilities. Links in relationships and dialogs open the corresponding detail page.
- Show a labeled theme toggle in a shared top bar on every page. Show the current choice and let the user switch modes with the keyboard or pointer. Apply the selected mode immediately to the whole interface, including dialogs and charts. Start in light mode until the user selects a mode. Use the app preference independently of the device's theme setting.
- Each main record table has a search field, sortable data column headings, an Add button, and Edit and Delete actions on each row. The name opens the detail page. Search is case-insensitive and matches visible text fields, including linked names. Use typed sorts for amounts, dates, and stage order. Use the record ID to break ties. Contacts also have a status filter that combines with search.
- Add and edit open a form with labeled fields, Save, and Cancel. Mark required fields. Keep entered values if validation fails and show the error beside the field where possible. After a successful write, refresh affected lists, links, timelines, and Dashboard data. When a write fails, keep the last saved view and show a message that tells the user what to do.
- Confirm any deletion that can proceed. Name the record and show which related records move to Trash or lose a link. A blocked deletion opens an explanation with links to all blocking deals. If the data changes while a confirmation dialog is open, check the impact again before applying the deletion.
- Give views distinct loading, empty, no-match, and error states as applicable. Use visible keyboard focus, logical tab order, labeled controls, and keyboard access to row actions, dialogs, filters, and the Pipeline. Dialogs keep focus inside and return focus to a sensible control when they close. Use text or symbols as well as color for states such as Late and Overdue.

## Brand and layout

The approved light-mode visual reference is [Mockup 6 — Deal Workspace](../mockups/06-deal-workspace.html). The [Playwright screenshot](../mockups/06-deal-workspace.png) shows the Dashboard and the Pipeline with a selected deal open beside the board.

- Support light and dark modes on laptop and desktop screens. In light mode, use page background `#F0F4F5`, white panels and cards, and Midnight `#073B4C` for ink. Keep the existing light-mode appearance, apart from the shared top bar and toggle. In dark mode, use page background `#04232E`, black panels and cards, and Sea Mist `#CDD8DB` for ink. Use rounded panels without outlines in both modes. Avoid single-edge panel borders, top rules, and heavy gradients.
- Use Instrument Sans for headings and body, JetBrains Mono for figures and identifiers, and Instrument Serif only when a tagline or quote has a purpose. Ship the fonts with the app after setup so they load offline.
- Use Sea Green `#06D6A0` for primary actions, Marigold `#FFC145` and Coral `#F78C6B` for supporting accents, Cerulean `#118AB2` for information, and Raspberry `#EF476F` for alerts. Use Midnight on the first three. For adjacent chart series or stage accents, apply these colors in that order and use a neutral treatment for the sixth stage. Keep stage names visible.
- Reserve the exact Cerulean and Raspberry for visual accents or labels large enough to meet text contrast requirements. Use darker variants, `#087391` and `#C62752`, when small text must be white on a colored surface. Use darker variants of Sea Green and Marigold for text on light surfaces and lighter variants for text on dark surfaces.
- Define colors for both modes in one set of shared color tokens. Use the active mode's tokens for all app surfaces, text, and chart elements. Use existing dependencies for both modes.
- Check WCAG AA text contrast in both modes at the sizes used in the browser, including chart labels. Use at least 4.5:1 for normal text and 3:1 for large text. Meet these thresholds throughout dark mode and in the new light-mode top bar. Preserve existing light-mode color pairings. If an existing pairing needs a contrast fix, adjust only its dark-mode tokens.
- Use plain business English, short labels, and no exclamation marks. Show currency with every money amount, for example `US$12,500.00`. Give charts labeled axes and values that a keyboard user can reach, or provide the same values in text.

## Theme persistence

Save the theme as a local app preference that all browsers on the same computer can read when they open Accountable. Restore the saved theme on reload.

## Verification

| Area | Required verification |
| --- | --- |
| Brand and accessibility | In Chrome, visually inspect every screen in both modes against the brand. Check text contrast, including chart labels, and check that existing light-mode colors are preserved. Use the demo to find the next follow-up, identify deals most likely to close, and find recent customer history. Check keyboard access, visible focus, and status labels. |
| Theme preference | Verify that light mode is the default, including when the device uses dark mode. Check that the shared toggle shows the selected mode on every page and that charts switch with the app. Use an automated test to verify that the selected mode is restored after a reload. Open Accountable in a second browser on the same computer and verify that it uses the saved mode. |

## Design decisions

| Area | Concern and treatment |
| --- | --- |
| Five accent colors and six stages | The brand names five ordered accents. Use those five and a neutral sixth accent with visible stage labels. This preserves all six stages and avoids inventing a brand color. |
| White text on information and alert colors | White on exact Cerulean is about 3.96:1 and white on exact Raspberry is about 3.62:1. These pairings fall short of 4.5:1 for normal text. The darker fills in the brand section are deliberate exceptions to the exact color values for small white text. |
| Tables and record ownership | Main tables represent organizations, contacts, and deals, with their own Add actions. Activities are entered from their owner. Trash is a recovery list, so its available action is Restore. This preserves the general table requirements for the main record tables and the specific restrictions on Trash. |
