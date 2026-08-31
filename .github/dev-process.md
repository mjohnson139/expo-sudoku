
Dev Process {
    - current work is detailed in the `current-work.md` file. 
    - Do not move on to any other steps until we have a well defined implmentation plan for th work.
    - create or select a github issue
    - create step by step implementation plan and update issue with markdown checkboxes to keep track of our progress
    - create a branch in the form [feature, bug, chore]/<short-skewer-name>
    - implement each step in the implementation plan, updating the issue and committing your work after each step.
    - code sessions have an authenticated GitHub CLI (`gh`) and are responsible for their own pull requests. Push the branch, check `gh pr view` first so an existing PR is updated rather than duplicated, then use `gh pr create` when one does not exist. Do not ask the operator to create the PR on the session's behalf.
    - when a step's changes are finished, push the branch and open the pull request. do not hold it back for testing: opening the PR is what triggers the automatic build -- the workflow in `.github/workflows/eas-publish.yml` publishes an EAS Update preview to the `pr-<N>` branch and comments the QR code on the PR, which is what the user tests on a device. Report the PR number and URL before prompting the operator to test.
    - prompt the user to test after each step -- after the PR is open, so there is a build to test.
    - when the user comes back from testing, close the step out with the `closeout` skill (`.claude/skills/closeout/`): it records the device-pass result, adds the plan's landed note, rewrites the handoff for the next step, comments the tracker, merges the PR into the epic branch and hands back the one-line prompt that starts the next session.
}
