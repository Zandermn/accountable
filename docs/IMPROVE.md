# Improve the harness

Run this at Deploy, after the review fixes and before the merge.

1. Review the findings, the user's corrections, and the failed checks for this change. Look for other paths that can fail in the same way. Compare the test setup with the steps a user follows. Test settings can hide problems with the default startup command.
2. For a mistake that has happened twice, add an automated check if possible. Confirm that it fails on the original behavior and passes after the fix. For a display problem, check the text or layout that the user sees. When automation is impractical, add the correction to [AGENTS.md](../AGENTS.md) or [REVIEW.md](REVIEW.md), or suggest a change to [the project standards](Standers.md) for the user to make.
3. Remove outdated guidance or correct it if it still applies.
4. Record the checks that ran and any remaining findings. Update this checklist with what will help on the next change. Keep this as the last step.
