# Accountable product specification

## Problem

A small business keeps track of its customers and sales in spreadsheets, inboxes, and people's heads. Nobody can see at a glance which companies the business deals with, who its contacts are, what is in the sales pipeline, what happened last with a customer, or what needs doing next.

## Product purpose and current scope

Accountable gives a small sales team one shared place on the web to track customers and deals. Each team member signs in and works with the same records. A new salesperson can learn the workflow with realistic sample data. An experienced salesperson can find a record from any page, find the next follow-up, judge which deals are likely to close, and review customer history quickly.

Accountable includes Dashboard, Organizations, Contacts, Deals, Pipeline, Trash, and spreadsheet import and export in Data. Search in the top bar finds active organizations, contacts, and deals by name. Record details, activity entries, and Trash show who added each record. Each account can choose Light, Dark, or System in the menu under the user's initials. System is the default. The hosted app requires an internet connection. It uses US dollars and a fixed pipeline.

Each follow-up shows its due date and time zone. New follow-ups default to US Eastern Time. Users can change the time zone when they add or edit a follow-up.

All signed-in users have the same access to shared data. Out of scope are roles, per-record permissions, self-service sign-up, password reset, Google sign-in, magic links, a user audit log, local backups and data commands, migration of existing local data, a phone layout, AI, email, calendar and phone integrations, other business-system integrations, other currencies, reports beyond the Dashboard, tags, custom fields, and pipeline configuration.

The area files record the detailed requirements and design decisions. The interface follows the [brand skill](../.agents/skills/brand/SKILL.md).

## Product areas

- Routes, shared interactions, visual design, accessibility, and theme. [Navigation, brand, and theme](specs/interface.md)
- Sign-in, shared access, and the menu under the user's initials. [Accounts and access](specs/accounts.md)
- Search across organizations, contacts, and deals. [Search](specs/search.md)
- Metrics, recent activity, and follow-ups. [Dashboard](specs/dashboard.md)
- Fields, list, and detail page. [Organizations](specs/organizations.md)
- Fields, list, detail page, and timeline links. [Contacts](specs/contacts.md)
- Fields, stages, closing rules, details, and notes. [Deals](specs/deals.md)
- Board, card movement, ordering, and totals. [Pipeline](specs/pipeline.md)
- Timelines, stage events, and follow-up completion. [Activities and follow-ups](specs/activities.md)
- Shared record fields, attribution, validation, and API operations. [Records and validation](specs/records.md)
- Deletion blockers, cascading changes, and recovery. [Deletion, Trash, and restoration](specs/trash.md)
- Workbook schema, validation, and import preview. [Spreadsheet import and export](specs/spreadsheets.md)
- Initial sample records and activities. [Sample data](specs/sample-data.md)
- Local development, hosting, database, shared API errors, and product-wide checks. [Runtime, hosting, and verification](specs/runtime.md)
