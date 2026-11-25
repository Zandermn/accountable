# Activities and follow-ups

## Fields and rules

| Record | Fields and rules |
| --- | --- |
| Activity | One owner, either a contact or a deal. User-entered type is Note, Call, or Email. Require a description and time of occurrence. Optional follow-up date and completion state. A follow-up starts open. A stage change adds a system event to the deal timeline. |

## Timelines and follow-ups

Use one timeline sorted by occurrence time, newest first. Show user activities and automatic stage events together on deal pages. Show user activities on contact pages. Users can edit or delete their own activities through the timeline. Stage events are system-managed and move with the deal as part of its recorded history.

A user can add an optional follow-up date when logging or editing an activity. The Dashboard links each incomplete follow-up to its owner and offers Mark done. Dates before today are overdue. Today and future dates are upcoming. Sort each group by earliest due date and distinguish tasks due today. Save completion across refresh and restart.

## JSON API design

Create, edit, delete, and mark follow-ups done.

## Verification

| Area | Required verification |
| --- | --- |
| Activities and Dashboard | Log an activity on each owner type, edit it, set a follow-up, and mark it done. Add and edit a deal note, verify it after refresh and restart, then remove it and verify it appears in Trash. Check timeline order, exactly one event per stage change, and no event for a reorder. Verify Dashboard calculations against known values and check updates after a win and a follow-up. |

## Design decisions

| Area | Concern and treatment |
| --- | --- |
| System stage events and activity editing | Keep stage events in the deal's history when users edit or delete their notes, calls, and emails. This preserves the lifecycle data used by the funnel. For deals created or imported at an advanced stage, history starts at the first recorded stage. The funnel measures recorded reach, with no estimates for earlier stages. |

See [Deletion, Trash, and restoration](trash.md) for deletion and restoration.
