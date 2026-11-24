# Improve the harness

Run this at Deploy, after the review fixes and before the merge.

1. Review the findings, the user's corrections, and the failed checks for this change. Look for other paths that can fail in the same way.
2. For a mistake that has happened twice, add an automated check if possible. Confirm that it catches the original failure. Otherwise, add the correction to [AGENTS.md](../AGENTS.md) or [REVIEW.md](REVIEW.md), or suggest a change to [the project standards](Standers.md) for the user to make.
3. Remove outdated guidance or correct it if it still applies.
4. Update this checklist with what will help on the next change. Keep this as the last step.
