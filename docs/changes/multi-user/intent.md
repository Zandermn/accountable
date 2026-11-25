# Intent: sign-in, search and a user menu

## Problem

Accountable runs on one computer for one person. A team can't share it, nobody signs in, and there's no quick way to find a record.

## Proposed outcome

A small team shares one Accountable on the web. Everyone signs in and works on the same organizations, contacts and deals, and each record shows who added it. A search box in the top bar finds any organization, contact or deal. A menu under your initials holds the theme, light, dark or system, and signing out.

## Constraints

- The data lives in Postgres on Supabase, still through SQLAlchemy Core. The tests keep their own SQLite databases.
- Sign-in uses Supabase Auth with an email and password. The browser holds only the publishable key. The backend checks the token on every request and takes the user from it, never from the request.
- There's no sign-up page. People are added in Supabase's dashboard.
- The settings live in .env as DATABASE_URL, SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.
- Each organization, contact, deal and activity records who added it and who last changed it.
- The “Added by” label shows the creator's display name. If the account has no display name, show its email address. For seeded records and activities, show “Sample data”.
- The end-to-end tests and ui-check sign in without anyone's real password and never touch Supabase. CI needs no secrets.
- Search ignores case and works the same on SQLite and Postgres.
- The theme moves from the dark mode button into the menu. Save each account's choice across browsers. Start new accounts in System mode. System follows the current device's setting.
- Accountable now needs an internet connection, for Supabase. The tests still run without one.
- Keep spreadsheet import and export in Data. Retire the local backup controls and the `npm run save`, `npm run load`, and `npm run seed` commands.
- The app deploys to Render's free plan as one web service: FastAPI serves the built frontend and the API, migrations run when it starts, and it answers at its onrender.com address. A render.yaml describes it, with the Supabase settings entered in Render, not written in the file.
- Every unit test, old and new, runs in under a second on this computer, because CI runs on a much slower machine.
- No new dependencies unless the plan makes the case for one.

## Not in this change

- Roles and permissions: everyone can do everything.
- Moving the data in the local SQLite file to Supabase. Supabase starts with the sample data.
- Signing in with Google, magic links or a password reset.

## Success criteria

1. npm run check passes and never touches Supabase, with or without the settings in .env.
2. Signed out, every page shows the sign-in screen and every API route refuses. Signed-in users can still use Dashboard, Organizations, Contacts, Deals, Pipeline, Trash, and spreadsheet import and export. Data no longer offers local backup controls.
3. Every record and activity shows its creator's display name or email address. Seeded records and activities show “Sample data”.
4. Search finds an organization, a contact and a deal by part of a name, in any case.
5. A new account starts in System mode. The menu's theme choice is remembered when the same account signs in from another browser. System follows each device's setting.
6. The built app runs on this computer the way Render runs it, signed in against Supabase.
