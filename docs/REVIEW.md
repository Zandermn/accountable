# Review policy

Every change is reviewed against this policy before it merges. The reviewer reports its findings and doesn't change any code.

## Passes

Make a separate pass over every change for each of these:

- **Bugs:** the code does what it's meant to, including when something goes wrong.
- **Security:** no secrets or personal data are exposed, and nobody can do what they shouldn't.
- **Spec and plan:** read the [product summary and index](spec.md) first, then the [area specifications](specs/) affected by the change. Check that the change meets the requirements in those files and in the current plan. Check for missing requirements and extra behavior.
- Check the change against the [project standards](Standers.md).

For a database access finding, verify which roles can reach the affected data before assigning severity. Report a disabled safeguard and confirmed access as separate facts.

When a change affects a documented startup command, run the command with its documented defaults and verify the first user action. Include sign-in when the command starts the app.

In browser tests, use the control's role and accessible name when they identify the control reliably.

Check that the change updates the product summary and all affected area specifications as needed. Flag any code that neither the product summary nor the applicable area specifications describe.

## Important

An Important finding must be fixed before the change merges. A finding is Important if the change breaks behavior that should work, leaks data or breaks a rule in AGENTS.md.

## Nits

A nit is a small point, such as style or naming, that doesn't block the merge. Report at most five per review.
