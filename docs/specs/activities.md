# Activities and follow-ups

## Fields and rules

| Record | Fields and rules |
| --- | --- |
| Activity | One owner, either a contact or a deal. User-entered type is Note, Call, or Email. Require a description and time of occurrence. A follow-up is optional. Each follow-up has a due date, a time zone, and a completion state. A follow-up starts open. A stage change adds a system event to the deal timeline. |

## Timelines and follow-ups

Use one timeline sorted by occurrence time, newest first. Show activities and automatic stage events together on deal pages. Show activities on contact pages. Show [Added by](records.md#attribution) on activity entries. Any signed-in user can edit or delete an activity through the timeline. Stage events are system-managed and move with the deal as part of its recorded history.

A user can add a follow-up when logging or editing an activity. Show a **Time zone** field beside the due date. Default new follow-ups to **US Eastern Time** (`America/New_York`). Users can choose a different time zone when they add or edit a follow-up. Save the selected time zone with the due date. Use named time zones that follow local daylight saving rules. If an existing follow-up has no saved time zone, use US Eastern Time. Changing the time zone keeps the selected calendar date unless the user edits the date as well.

Show the due date and its time zone together wherever a follow-up due date appears. Use the calendar day in the follow-up's saved time zone to calculate its status. A follow-up is **Due today** throughout its due date in that time zone. It becomes **Overdue** at the start of the next day in that time zone. All teammates see the same status.

The Dashboard links each incomplete follow-up to its owner and offers Mark done. Group open follow-ups as overdue or upcoming, with due-today tasks in the upcoming group. Sort each group by earliest due date. Save completion across refresh and restart.

## JSON API design

Create, edit, delete, and mark follow-ups done. Accept and return the due date and named time zone. Reject an unrecognized time zone.

## Verification

| Area | Required verification |
| --- | --- |
| Activities and Dashboard | Log an activity on each owner type, edit it, set a follow-up, and mark it done. Add and edit a deal note, verify it after refresh and restart, then remove it and verify it appears in Trash. Check timeline order, exactly one event per stage change, and no event for a reorder. Verify Dashboard calculations against known values and check updates after a win and a follow-up. |
| Follow-up time zone | Verify the US Eastern Time default. Select a different time zone and verify it appears next to the due date after reloading. Edit the time zone and verify that the due date stays the same. Open the same follow-up on two devices in different time zones and check that both switch from Due today to Overdue at midnight in the saved time zone. Check this in both standard time and daylight saving time. |

## Design decisions

| Area | Concern and treatment |
| --- | --- |
| System stage events and activity editing | Keep stage events in the deal's history when users edit or delete their notes, calls, and emails. This preserves the lifecycle data used by the funnel. For deals created or imported at an advanced stage, history starts at the first recorded stage. The funnel measures recorded reach, with no estimates for earlier stages. |

See [Deletion, Trash, and restoration](trash.md) for deletion and restoration.
