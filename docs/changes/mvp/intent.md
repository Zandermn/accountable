# Intent: the Accountable MVP

## Problem

A small business keeps track of its customers and sales in spreadsheets, inboxes and people's heads. Nobody can see at a glance which companies we deal with, who our contacts are, what's in the sales pipeline, what happened last with a customer or what needs doing next.

## Proposed outcome

Accountable is a business management system: a sales CRM that will grow into a full Business OS, including ERP. This first version, the MVP, is a complete sales CRM for one person, running on their own computer. Think of it as a private Salesforce that does the everyday CRM essentials really well. It should feel sharp, modern and professional, and be a pleasure to use.

The MVP helps salespeople miss fewer follow-ups, see which deals are likely to close, and find customer history quickly. It should be easy to use for people new to sales and for experienced salespeople doing daily work.

Accountable is the salesperson's main place to track customers and deals. A salesperson can bring existing customer and deal records into Accountable from a spreadsheet and export their data to a spreadsheet when they need a copy.

### Five sections

- **Dashboard**, the landing page: how sales are going at a glance. Deals won and revenue won month by month, the open pipeline and its expected revenue (each deal's value times its probability of close), a sales funnel showing how much value reaches each stage, recent activity, and the follow-ups that are coming up or overdue. Use a clean layout with at least a line chart, a bar chart and a visual of the pipeline. Which figures each one shows, and how, is the designer's call.
- **Organizations**: the companies we do business with. Open one to see its contacts and deals.
- **Contacts**: the people we deal with, including leads and customers, with a filter by status. Open one to see their timeline and their organization, if they have one.
- **Deals**: the potential sales, with each one's stage, value and close date. Open one to see its details and its timeline. A deal still open after its expected close date stands out, in the table and on its pipeline card.
- **Pipeline**: the deals as cards on a board, one column per stage. Drag a card to another column to change the deal's stage, or within a column to change its place; a card can be dropped anywhere in a column, and it stays where it was dropped. A new deal can be added straight into a column, at that stage. The board shows the total value and expected revenue of the deals still open, each column shows its own, and the figures change as soon as a card moves.

Every table has a search box, columns you can sort by clicking their headings, a way to add a new record, and edit and delete on each row. That's how we add a new deal, a new lead or a new customer. Deleting asks first, and says what will happen to the records linked to the one being deleted.

Block contact deletion while the contact is the main contact on any active deal. A dialog explains why the contact cannot be deleted and links to every active deal that uses that contact. Each link opens the deal's page. Before trying again, the user can replace the main contact or clear the main contact if the deal has an active organization.

A contact's organization link does not block contact deletion. When the user restores a contact who had an organization at deletion, a dialog names the former organization and offers two choices. The user can restore the contact with that organization if it is active, or restore the contact as an individual with no organization. If the former organization is in Trash, the dialog explains that it must be restored first to use the organization option.

Block organization deletion if any active deal linked to it has no main contact. The dialog explains why and links to every deal that blocks deletion. The user can give each of those deals a main contact or move it to another organization, then try again. When the user confirms an allowed deletion, remove the organization links from its active contacts and deals and keep those records.

When the user restores an organization, restore its former links to contacts and deals that are active and have no organization. Keep any organization links those records already have.

Trash holds deleted organizations, contacts, deals and activities. The user can open Trash, select a deleted record and restore it. When the user confirms deletion of a contact or deal, move the record and its directly linked activities to Trash. When the user restores the contact or deal, restore the activities that moved with it. Hide deleted records from the main tables, pipeline, timelines and dashboard. Hide their open follow-ups from the dashboard and show them again when the relevant activities return. Trash has no permanent delete action.

A call note belongs to the contact it was logged on. A call note does not block deletion of its contact. If the note is active when the contact goes to Trash, it goes with the contact and returns when the contact is restored. The contact must be active before the user can restore any of its call notes from Trash.

To restore a deal, it must have at least one active link to an organization or main contact. If neither previous link is active, keep the deal in Trash. The user can restore an original organization or contact, or select another active organization or contact as part of the deal restoration.

From any contact or deal you can log an activity (a note, call or email) and give it a follow-up date. A follow-up shows on the dashboard as a task until it's marked done. Activities can be edited and deleted too. When a deal moves to another stage, including Won or Lost, an entry such as "Moved from Proposal to Negotiation" appears in its timeline and in the dashboard's recent activity by itself.

### Four kinds of record

- **Organization**: a company we do business with. Name, website, industry and notes. An organization has many contacts and many deals.
- **Contact**: a person we deal with. Name, email, phone, job title, and a status (lead, qualified or customer). The organization is optional for every contact. You can add the link later. A lead is a contact with the lead status, so there's no separate list of leads.
- **Deal**: a potential sale. Name, stage (New, Qualified, Proposal, Negotiation, Won or Lost), value in US dollars, probability of close, and expected or actual close date. A deal must link to an organization, a main contact, or both. Each stage has a usual probability of close, and a deal takes its new stage's probability when it moves; a probability set by hand is kept until the stage changes.
- **Activity**: something that happened, or needs to happen, with a contact or deal. Type (note, call or email), the contact or deal it relates to, a description and when it happened, and optionally a follow-up date and whether it's done.

### Sample data

Accountable starts with realistic sample data that a prospective salesperson can use to try the app before entering their own data. The demo includes organizations across several industries, contacts at every status, and deals at every stage. It includes deals won and lost over the past months, deals expected to close in the months ahead, and late deals. Activities give contacts and deals a visible history, with follow-ups due soon and others overdue.

### Look and feel

The look follows Accountable's brand guidelines, which take priority over any general design guidance. The interface should feel welcoming, minimal and professional. Use clear labels and make common actions easy to find. The MVP is light mode, designed for a laptop or desktop screen.

## Affected users and systems

- The first user is one salesperson at a small business. They use Accountable on their own computer for daily sales work. In a typical session, they check the pipeline and follow-ups, update contacts and deals, and log activity. The rest of the sales team joins later.
- No other systems are involved yet.

## Constraints

- The technology in `docs/TECH_STACK.md`.
- After a documented one-time setup, `npm run dev` starts the app locally on Windows, macOS and Linux. Starting and using the app after setup requires no internet connection.
- Every change is kept: it's still there after a browser refresh, and every time the app starts it shows every change made before.
- Separate documented commands save a full local backup and load a selected backup. A backup includes active records and records in Trash, with their links, activities and follow-up status.
- Before loading a selected backup, save a new backup of the current data automatically. Load the selected backup only after the new backup succeeds. If the save fails, the current data stays in place.
- The documented `npm run seed` command resets the data to the sample data. After the user confirms reset, the command saves a full local backup automatically. It replaces the active records and Trash with the sample state only after the backup succeeds. If the backup fails, the current data stays in place.
- Deleting a saved backup requires two separate confirmation dialogs. If the user cancels either dialog, keep the backup.
- The MVP includes all five sections described above and spreadsheet import and export. Import and export must cover at least organizations, contacts and deals.
- MVP exclusions are sign-in, user accounts or support for several users, dark mode or a phone layout, AI features, email, calendar or phone integrations, direct connections to other business systems, currencies other than US dollars, reports beyond the dashboard, tags or custom fields, and changes to the pipeline stages.

## Success criteria

1. After the one-time setup, a non-technical user can run `npm run dev` while offline, open Accountable in a browser and land on the dashboard. The sample data lets a prospective salesperson try all five sections immediately. Verify offline startup and use on Windows, macOS and Linux before sign-off.
2. Organizations, contacts (leads, qualified contacts and customers) and deals can each be added, found by searching, sorted, edited and deleted from their tables, and every change is still there after a refresh and after a restart. Deletion requires confirmation when it can proceed. An active deal blocks deletion of its main contact even if the deal also has an organization. An active deal blocks deletion of its organization if the deal has no main contact. For either blocked action, the record stays and a dialog opens with a working link to each deal that blocks deletion. When organization deletion succeeds, its active contacts and deals stay and their links to the organization are removed. The reset command brings back the sample data.
3. Contacts can be filtered by status. A user can save a contact without an organization and link one later. A user can save a deal with only an organization, only a main contact, or both. To save a deal, the user must select at least one of these links. Each record's page shows the records it's linked to.
4. Dragging a deal to another column on the pipeline changes its stage and its probability of close, and the deals list shows both. A card dropped anywhere in a column, including higher or lower in its own column, stays there after a refresh. The board's and the columns' totals and expected revenue change as soon as the card moves. A deal added in a column starts at that stage, and late deals stand out.
5. An activity or follow-up logged on a contact or deal appears in its timeline, newest first, and so does an entry for each change of stage. Follow-ups show on the dashboard as upcoming or overdue until they're marked done.
6. The dashboard's figures match the data, and they reflect a deal marked won or a new follow-up.
7. Every screen follows the brand and has a welcoming, minimal layout. The dashboard has a line chart, a bar chart and a visual of the pipeline. In the browser walkthrough, a tester uses the sample data to find the next follow-up, identify the deals most likely to close, and review a customer's recent history.
8. The user can find and restore deleted organizations, contacts, deals and individual activities from Trash after a restart. Restoring an organization links it again to its former active contacts and deals that have no organization. Any link to another organization stays in place. Deleting a contact or deal hides the record and its directly linked activities from the main views. Restoring it brings back the activities that moved with it. In particular, an active call note moves to Trash and returns with its contact, and an individual call note can be restored only while its contact is active. An open follow-up disappears from the dashboard when its activity goes to Trash and returns when the activity is restored.
9. A deal whose only linked record is in Trash stays in Trash when the user tries to restore it. The user can restore the deal after restoring the linked record or selecting another active main contact or organization.
10. The user can delete a contact who has an organization and no active deals. When the user restores the contact, the dialog names the former organization. If the organization is active, the user can choose to restore the link or restore the contact as an individual. If the organization is in Trash, the user can restore the contact as an individual or restore the organization first.
11. A confirmed reset saves a backup that includes active records and Trash before restoring the sample data. Loading a selected backup also saves a new backup of the current data first, then restores the active records and Trash from the selected backup. If the automatic backup fails during reset or load, the current data stays in place. Cancelling either confirmation when deleting a saved backup keeps the backup.
12. A salesperson can import organizations, contacts and deals from a spreadsheet, find and update those records in Accountable, and export the updated records to a spreadsheet.
13. Before sign-off, all automated tests pass. A tester uses every section and performs every applicable action above in a real browser as a salesperson would. The tester checks each screen by eye and confirms that the browser console shows no errors. The tester also verifies the local data commands.

## Open questions

- Sign-in, several people sharing the same data, and a record of who did what are for a later intent.
- Making Accountable available to people beyond the computer it runs on is for later too.
