# Deletion, Trash, and restoration

Validate links and make each operation atomic on the server. An active contact can link only to an active organization. An active deal must have at least one active linked record, and every populated active link must point to an active record. Each active activity must have an active owner. Preserve the relationship history needed for recovery separately from active links.

| Record | Delete | Restore |
| --- | --- | --- |
| Organization | Block when any active deal links to it and has no main contact. List links to every blocking deal. The user can add a main contact or change the deal's organization. If deletion proceeds, move the organization to Trash and clear its links from active contacts and deals. Keep those records active. | Restore the organization and automatically reattach the links cleared by its deletion for former contacts and deals that are active and have no organization. Preserve current links. Skip any former link the user explicitly declined or changed after deletion. |
| Contact | Block if any active deal uses it as main contact, even when that deal has an organization. List all blocking deals. The user can replace the main contact or clear it if the deal has an active organization. The contact's organization link does not block deletion. On confirmation, move the contact and its active activities to Trash. | If the contact had an organization when deleted, name it in a dialog. Offer Previous organization if it is active, and Restore as individual. If the former organization is in Trash, show that it must be restored first to use that option. Restore only the activities that moved with this contact deletion. |
| Deal | On confirmation, move the deal and its active activities to Trash. Keep its stage history and the links needed to offer recovery choices. | Use former links that are active, or accept an explicit selection of an active organization or main contact. Show unresolved links and let the user restore the original linked record separately or choose a replacement. Keep the deal in Trash if it has no valid active link. Restore the activities that moved with this deal deletion. |
| Activity | On confirmation, move that activity to Trash. Keep its owner, follow-up date, time zone, and completion state. A call note belongs to its contact and can move with that contact. | Restore an individual activity only while its owner is active. If the owner is in Trash, identify it and tell the user to restore it first. |

Trash lists organizations, contacts, deals, and activities. Show the record type, name or activity summary, Added by, deletion time, and Restore action. Support filtering by type and sorting by deletion time. Keep Trash across restart. There is no permanent delete action in Trash. Preserve the [creator](records.md#attribution) through deletion and restoration.

Tag cascaded activities with the specific parent deletion so restoring the parent cannot revive an activity deleted on its own. Keep the organization link history by deletion operation and record whether the link has been changed or declined since detachment. This keeps an older deletion from reviving a rejected link. Hide trashed records, their activities, and their open follow-ups from active views. Restore an open follow-up with its activity. Keep a completed follow-up complete.

## JSON API design

| Area | Operations |
| --- | --- |
| Deletion and Trash | Preview deletion impact, delete with the preview revision, list Trash, and restore with any required link selection. A blocker response includes the IDs and names of all blocking deals. |

## Verification

| Area | Required verification |
| --- | --- |
| Trash and restoration | Restore all four record types after restart. Verify automatic organization relinking, preservation of newer links, both contact restore choices, and the unavailable former organization case. Verify an invalid deal stays in Trash until a link is available or selected. Check activity cascade, separate activity deletion, note ownership, and follow-up visibility and completion on restore. |

## Design decisions

| Area | Concern and treatment |
| --- | --- |
| Organization restoration and contact choice | Automatic restoration applies to eligible links cleared by the organization's deletion. An explicit decision to restore a contact as an individual takes precedence over an older pending link. If the contact is already in Trash when the organization goes to Trash, the contact's own restore dialog controls its former link. |
