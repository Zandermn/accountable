# Accountable product specification

## Problem

A small business keeps track of its customers and sales in spreadsheets, inboxes, and people's heads. Nobody can see at a glance which companies the business deals with, who its contacts are, what is in the sales pipeline, what happened last with a customer, or what needs doing next.

## Product purpose and current scope

Accountable is the main place for one small-business salesperson to track customers and deals. A new salesperson can learn the workflow with realistic sample data. An experienced salesperson can find the next follow-up, judge which deals are likely to close, and review customer history quickly. The product helps salespeople miss fewer follow-ups and find customer history when they need it.

Accountable runs on one computer. It includes Dashboard, Organizations, Contacts, Deals, Pipeline, Trash, spreadsheet import and export, and local data commands. It supports light and dark modes. It uses US dollars and a fixed pipeline. It excludes sign-in, user accounts, shared data, a user audit log, hosted access, a phone layout, AI, email, calendar and phone integrations, other business-system integrations, other currencies, reports beyond the Dashboard, tags, custom fields, and pipeline configuration.

This specification describes the whole product as it stands today. The implementation uses the [tech stack](TECH_STACK.md), and the interface follows the [brand skill](../.agents/skills/brand/SKILL.md). The area files record the detailed requirements and design decisions.

## Product areas

- Routes, shared interactions, visual design, accessibility, and theme. [Navigation, brand, and theme](specs/interface.md)
- Metrics, recent activity, and follow-ups. [Dashboard](specs/dashboard.md)
- Fields, list, and detail page. [Organizations](specs/organizations.md)
- Fields, list, detail page, and timeline links. [Contacts](specs/contacts.md)
- Fields, stages, closing rules, details, and notes. [Deals](specs/deals.md)
- Board, card movement, ordering, and totals. [Pipeline](specs/pipeline.md)
- Timelines, stage events, and follow-up completion. [Activities and follow-ups](specs/activities.md)
- Shared record fields, validation, and API operations. [Records and validation](specs/records.md)
- Deletion blockers, cascading changes, and recovery. [Deletion, Trash, and restoration](specs/trash.md)
- Workbook schema, validation, and import preview. [Spreadsheet import and export](specs/spreadsheets.md)
- Sample records, backup controls, save, load, and reset. [Sample data and local backups](specs/backups.md)
- Local startup, database, shared API errors, and product-wide checks. [Local runtime and verification](specs/runtime.md)
