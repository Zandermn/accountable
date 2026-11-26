# Deals

## Fields and rules

| Record | Fields and rules |
| --- | --- |
| Deal | Required name, stage, value, probability, and expected close date for open deals. Optional organization and main contact, with at least one active link required. The two links are independent. Closed deals have an actual close date. Preserve any expected close date when the deal closes. |

Store deal values as nonnegative integer cents and probabilities as whole percentages from 0 to 100. Allow a manual probability on a deal. Keep it until the stage changes. Use fixed, ordered stages and defaults.

| Stage | Default probability | Open |
| --- | ---: | --- |
| New | 10% | Yes |
| Qualified | 25% | Yes |
| Proposal | 50% | Yes |
| Negotiation | 75% | Yes |
| Won | 100% | No |
| Lost | 0% | No |

In record lifecycle rules, **active** means outside Trash. Won and Lost deals remain active until deleted and can block deletion of linked records. **Open** means the stage is New, Qualified, Proposal, or Negotiation. Only active, open deals contribute to open pipeline totals. A deal is late if it is open and its expected close date is before today.

## Main view

| View | Contents and actions |
| --- | --- |
| Deals | Show name, stage, value, probability, close date, organization, and main contact in the table. Use expected close for open deals and actual close for closed deals. Mark late rows with a visible Late label. Open a deal to see its summary, linked records, notes, and timeline, with actions to manage notes and log activities. |

## Deal details and notes

- The deal details show Added by, stage, value, probability, close date, organization, and main contact. Show links to the organization and main contact when present. The Notes section has Add note and Edit and Remove actions for each saved note. Show Added by on each saved note. Save note keeps the note across refresh and restart. Confirm removal and send the note to Trash as an activity of type Note.
- From a deal opened outside Pipeline, Show in pipeline opens the Pipeline at the deal's current stage. Bring the deal card into view, highlight it, and keep the same deal details open beside the board. Preserve any note draft in the open editor during the jump. The user can still see the surrounding cards and stage totals. Closing the detail window clears the highlight and returns keyboard focus to the card.

## Stage changes

Every stage change, including edits and imports, applies the destination's default probability and creates one event with the previous stage, new stage, and change time. Reordering within a stage preserves probability and creates no stage event. When a stage change enters Won or Lost, default the actual close date to today if the user has supplied no actual date for that transition. Keep the actual date if the deal switches directly between Won and Lost without a date edit. When reopening a deal, clear the actual date and use its preserved expected date. If it has none, ask for one before saving the move.

## Design decisions

| Area | Concern and treatment |
| --- | --- |
| Manual probability and stage transitions | Import and form edits can provide both a probability and a new stage. Apply the stage default on the transition, then let the salesperson edit the probability in a later save. The UI shows this rule before saving. The default percentages are fixed product values. |
| Open deals and active deals | Active and open have different meanings. Closed deals still in the app can prevent deletion of a linked record. The open pipeline reports only the four selling stages. Use these definitions consistently in the UI, API, queries, and tests. |

See [Records and validation](records.md) for shared record rules, [Pipeline](pipeline.md) for ordering, [Activities and follow-ups](activities.md) for the timeline, and [Deletion, Trash, and restoration](trash.md) for deletion and restoration.
