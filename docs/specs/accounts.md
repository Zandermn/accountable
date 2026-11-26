# Accounts and access

## Sign-in and shared access

- Use Supabase Auth with email and password. Add accounts in the Supabase dashboard. The app has no sign-up, password reset, Google sign-in, or magic link flow.
- Show the sign-in screen at every app page URL when the user is signed out. Label the fields Email and Password and the action Sign in. Keep labels and errors clear and follow the [brand and accessibility rules](interface.md#brand-and-layout).
- All signed-in users can see and work with the same organizations, contacts, deals, and activities. They can also use Dashboard, Pipeline, Trash, and Data. Creator and last editor information does not restrict access.

## User menu

Show the user's initials in the shared top bar. Give the menu button an accessible name. The menu offers Light, Dark, and System and shows the current choice. Sign out ends the session and returns to the sign-in screen. Follow the [theme rules](interface.md#theme-persistence).

## API access

Require a valid Supabase Auth token on every application API request. Refuse unauthenticated requests. Get the user identity from the verified token. Ignore any user identity supplied in request data. Use the verified identity for record attribution and account preferences. The publishable key is the only Supabase key available to the browser.

## Verification

Open each app page while signed out and check that it shows the sign-in screen. Check that each API route refuses requests with a missing or invalid token. Sign in as two test users. Verify that both can see and change the same records and that the API attributes writes to the verified user. Sign out from the user menu and verify that protected pages and API calls require sign-in again.
