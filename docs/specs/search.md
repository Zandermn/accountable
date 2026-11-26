# Search

Put a Search field in the shared top bar on signed-in pages. Search active organizations, contacts, and deals by part of their names. Ignore letter case. Show the name and record type for each match. Open the record's detail page when the user selects a result.

Give the search field a visible label or an accessible name. Support keyboard access to the results and show a clear message when there are no matches.

Trim the query and compare names using Unicode case folding on both Postgres and SQLite. Treat wildcard characters as literal text. An empty query has no results. The search API requires sign-in. Main record tables also retain their own [search and filters](interface.md#navigation-and-common-interactions).

## Verification

From a signed-in page, enter part of a name with a different letter case. Verify that a matching organization, contact, and deal appear. Open each result and check its detail page. Check the no-match state, keyboard access, and exclusion of records in Trash. Verify the same matching behavior on SQLite and Postgres.
