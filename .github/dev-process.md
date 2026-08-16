
Dev Process {
    - current work is detailed in the `current-work.md` file. 
    - Do not move on to any other steps until we have a well defined implmentation plan for th work.
    - create or select a github issue
    - create step by step implementation plan and update issue with markdown checkboxes to keep track of our progress
    - create a branch in the form [feature, bug, chore]/<short-skewer-name>
    - implement each step in the implementation plan, updating the issue and committing your work after each step.
    - when a step's changes are finished, push the branch and open the pull request. do not hold it back for testing: opening the PR is what triggers the automatic build -- the workflow in `.github/workflows/eas-publish.yml` publishes an EAS Update preview to the `pr-<N>` branch and comments the QR code on the PR, which is what the user tests on a device.
    - prompt the user to test after each step -- after the PR is open, so there is a build to test.
}