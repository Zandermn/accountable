# Pipeline

## Main view

| View | Contents and actions |
| --- | --- |
| Pipeline | Show one column per stage in the fixed order. Cards show name, value, probability, close date, note count, and Late when applicable. A card opens the deal details beside the board. Each column has Add deal, which opens the form at that stage. |

## Pipeline movement and ordering

Drop a card anywhere in a column, including between two cards or in an empty column. The drop position determines its saved position. Provide keyboard controls to move a card between stages and to change its position within a stage. Use a server-owned position per active deal and a single write transaction to update source and destination order. Append new or restored deals to their stage unless the action provides a position. Restore the last saved board if a move fails.

See [Deals](deals.md#stage-changes) for rules that apply to stage changes.

Show value and expected revenue for the open deals on the board and for each open column. Label Won and Lost as closed so their amounts cannot be mistaken for open totals. Refresh all affected totals as part of the move, without waiting for a reload.

## JSON API design

| Area | Operations |
| --- | --- |
| Pipeline | Read ordered cards and totals. Move by target stage and placement relative to a neighboring card, or to the end of a column. Validate the board revision, then return the saved ordering and refreshed totals. |

## Verification

| Area | Required verification |
| --- | --- |
| Pipeline | Move a deal to another stage and verify its default probability, table entry, and the board and column totals. Reorder higher and lower within a column, drop into an empty column, and verify persistence after refresh. Add a deal from a column and check late labels in both views. From the Deals table and a linked record, use Show in pipeline. Verify the correct card is visible and highlighted, the details and note draft stay open, and closing returns focus to the card. |
