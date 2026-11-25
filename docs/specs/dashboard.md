# Dashboard

## Main view

| View | Contents and actions |
| --- | --- |
| Dashboard | Show monthly deal wins and won revenue, open pipeline totals, a sales funnel, recent activity, and upcoming and overdue follow-ups. This is the landing page. |

## Dashboard metrics

| Item | Design and calculation |
| --- | --- |
| Won revenue | Use a line chart for the last six calendar months including the current month. Sum the values of active Won deals by actual close month. Include months with zero revenue. |
| Deals won | Use a bar chart with the same month range and count active Won deals by actual close month. |
| Open pipeline | Show the number and total value of active open deals. Expected revenue is the sum of each deal's value times its probability. Compute from cents and integer percentages, then round displayed money totals to cents. |
| Sales funnel | For each fixed stage, sum the current values of active deals that reached that stage at least once. Use the starting stage and recorded transitions. Count a deal at most once per stage. A skipped stage receives no value from that deal. Label the visual so users can distinguish stage history from current Pipeline occupancy. |
| Recent activity | Show the latest visible activities and stage events, newest first, with links to the relevant record. |
| Follow-ups | Show overdue and upcoming open follow-ups for active activities with active owners. Update the Dashboard after a relevant write, including a win, a new or completed follow-up, or a Trash action. |

## JSON API design

Read Dashboard metrics, recent activity, and open follow-ups from the same saved state.

See [Activities and follow-ups](activities.md#verification) for the shared verification.
