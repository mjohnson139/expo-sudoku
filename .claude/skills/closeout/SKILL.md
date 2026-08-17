---
name: closeout
description: Close out a delivery step in this repo after the operator has tested it — record the device-pass result, add the "landed" note to the epic's plan, rewrite the handoff for the next step, comment the tracker issue, merge the step PR into the epic branch, and hand back the one-line prompt that starts the next session. Use this whenever the operator comes back from testing a step's preview build and says it works, or says "close it out", "merge it", "ship it", "update the docs and merge", "wrap up this step", or asks for the next session's starting prompt. Also use it when they come back from testing with findings — the same checklist decides that the step is not closeable yet and what to do instead. Covers the final step of an epic too, where the epic branch merges to main and the handoff becomes a record.
---

# Closing out a step

This repo delivers in **steps**: one step per branch, a PR against the epic
branch, an EAS preview the operator tests on a device, and then a closeout. The
closeout is the part that keeps the next session cheap — a session here starts
from a one-line prompt and gets everything else from the handoff, so a handoff
that is stale or a plan that never recorded what actually happened costs the
following step hours of rediscovery.

`.github/dev-process.md` is the process this belongs to. The epic's own docs are
the source of truth for its content; this skill is about the sequence.

## Find the three documents first

Every epic here has the same three, and their names come from the epic:

| What | Where | What it holds |
|---|---|---|
| **Plan** | `docs/<epic>-plan.md` | Scope, decisions, the step table, the traps. **Source of truth.** |
| **Handoff** | `docs/<epic>-handoff.md` | Exactly one step — the next one. Rewritten at the end of every step. |
| **Tracker** | a GitHub issue, named in both | Checkboxes per step |

The current branch and the handoff's "Next step" heading tell you which epic and
which step you are closing. Read the handoff before anything else — it names the
tracker, the branching, and the golden rules the step was held to, and its own
"Before you finish" section is the contract you are completing.

## 1. Read the verdict before you touch anything

The operator's message is the input. Three outcomes, and only one of them is a
closeout:

- **Clean pass** — "tested and working great", "all good", "ship it". Close out.
- **Findings** — anything they noticed, however small. **Do not merge.** Fix on
  the same branch, push (the PR republishes its preview), and ask them to retest.
  Then close out on the *next* clean pass. A finding from a device is the most
  expensive evidence this project has; spending it and merging anyway wastes it.
- **Not tested yet** — they are asking you to merge without a device pass. Say so
  plainly and ask, rather than assuming. Both animation bugs this repo has
  shipped were invisible in a browser, and one layout bug was only visible on a
  phone. If they confirm they want it merged untested, merge it and **write in
  the handoff that no device pass happened** — an unrecorded gap is the thing
  that hurts later.

If they mention anything specific they exercised, or anything that surprised
them, capture the words — that is what goes in the docs at step 3.

## 2. Confirm the ground truth

Cheap, and it stops a closeout built on a wrong assumption:

- `npm test` from `SudokuApp/` — green, with the count.
- The PR's checks. **Read them, don't tally them.** This repo has a persistent
  red status that means nothing: `EAS Update — @mjohnson139/expo-sudoku` is the
  Expo **GitHub App** integration and it errors on an account-permissions
  problem ("this Expo account doesn't have a member with a GitHub user that has
  admin access"). The check that matters is the **`EAS Publish & Web Deploy`
  workflow run** (`.github/workflows/eas-publish.yml`) — that is what published
  the preview the operator just tested. Confirm a red status is pre-existing by
  looking at the previous step's PR before dismissing it.
- The PR is still open and mergeable, and its base is the epic branch.

## 3. Record what the device said

The golden rule this repo runs on is **write down when a finding came from a
device**. A clean pass is a finding too — it is the evidence that the risky part
worked on real hardware, and the next session should not have to wonder.

- **Handoff**: in the verification section, add the pass, dated, and name the
  things a browser could not have settled — resume behaviour, gestures, feel,
  animation. If something was flagged for the pass in the PR and came back fine,
  say that explicitly; it retires the question instead of leaving it open.
- **Plan**: the step's section gets a `**Landed <date>** (PR #N, merged to
  <epic branch>)` note, in the shape the earlier steps' notes already use.

## 4. Write the plan's landed note

Not a summary of the diff — the diff is in git. What earns its place is
**everything the brief did not predict**: the traps you hit, the fix, and why the
failure was hard to see. Every one of those is a session's worth of time saved.

The existing landed notes are the template. They tend to run: what the shape
became, then a short list of "found in the build, not in the brief", each one
naming the mechanism rather than the symptom.

If the step changed a rule the plan states elsewhere — a file it promised not to
touch, a count it quoted, a budget in points — fix that statement too. A plan
that contradicts itself is worse than one that is merely out of date.

## 5. Rewrite the handoff for the next step

**This is the part that matters most and the part most likely to be done
thinly.** The handoff's own "Before you finish" section defines it; follow that.
It should be written so a session that has read nothing else can start.

What separates a good one from a box-ticking one:

- **Scope** in terms of the code that exists *now*, naming the files and
  functions the next step will actually edit, with line references where they
  help.
- **"Easy to get wrong"** carrying the traps *this* step discovered, not just
  the ones the plan predicted. Whatever nearly cost you an afternoon belongs
  here in the words you would have wanted to read.
- **What the next step inherits** — the shape you just built, and the parts of
  it that are load-bearing for reasons that are not obvious from reading them.
  Anything you had to fix twice is worth a sentence saying so.
- **What must be visible in Expo Go**, and **how to verify** — including a device
  pass, because every step here ships something the operator can open.
- **Open questions carried forward**, unchanged unless the step answered one.

Also refresh the standing context if the step invalidated it — an exception that
is now spent, a rule that now has a second sanctioned use, a file count that has
changed.

## 6. Build notes and version

Build notes are per **release**, not per step (the plan says which release the
epic is). Extend that one entry in `SudokuApp/utils/buildNotes.js` with what the
operator would notice, in their language rather than the code's, and keep
`SudokuApp/app.json`'s `expo.version` matching it.

## 7. Commit, merge, sync

```bash
git add -A && git commit    # the doc updates, on the step branch
git push -u origin <step-branch>
```

Merge the PR into the epic branch with **squash** — the epic's history is one
commit per step. Title `<Step title> (#N)`; body the substance of the PR
description. The branch is deleted on merge.

Then leave the local checkout on the epic branch at the merge commit, so the
session is standing where the next piece of work starts:

```bash
git fetch origin <epic-branch> && git checkout <epic-branch> && git reset --hard origin/<epic-branch>
```

The doc updates go in **before** the merge, deliberately: the handoff has to be
correct on the epic branch the moment the next session checks it out.

## 8. Comment on the tracker — do not rewrite its body

**Post a comment. Do not edit the issue body to tick the checkboxes.** The GitHub
MCP returns issue bodies HTML-escaped (`&#39;` for an apostrophe), so writing one
back re-encodes it and quietly mangles a long, hand-written tracker. The comment
carries the same information without that risk.

What the comment is for — the tracker is where the operator reconstructs the
epic months later:

- The step merged, its PR and commit, and the device-pass result.
- The step's boxes, restated as ticked, so it is obvious what is done.
- **Anything the step changed about the tracker's own claims** — a settled
  decision that has moved, a box that turned out to need adding.
- What the next step inherits and should not rediscover.
- Housekeeping that outlives the step: work deferred to the epic's merge,
  infrastructure that needs fixing, a check that is red for reasons unrelated to
  the code.

## 9. Hand back the starting prompt

Close your reply with the one-line prompt from the handoff's "The one-line prompt
that starts a session" section, verbatim, in a code block — and one short
paragraph on what it will land on, so they know what they are starting before
they paste it. If the step surfaced questions that come due next, name them; the
next session will ask.

## When the step being closed is the epic's last

Same sequence, three differences:

- The **epic branch merges to `main`**, not into anything else, and the PR is
  the epic's.
- The **handoff becomes a record instead of a brief.** `docs/fungiku-handoff.md`
  and `docs/cube-handoff.md` are both worked examples: they open by saying the
  epic is closed and there is no next step, then keep the open questions, the
  "noted in passing" list and the step history as reference for whoever edits
  the code next. Say plainly where to branch from now.
- **The deferred operational work comes due.** For anything that changed native
  code, an EAS Update cannot ship it and `runtimeVersion` is `sdkVersion`, so the
  `preview` and `production` binaries must be rebuilt — an old binary keeps
  serving the old bundle *silently*, which is exactly why it needs saying out
  loud at the merge rather than being discovered.

## What a closeout is not

It does not invent work, start the next step, or tick a box for something that
was not built. If a step landed less than its brief promised, the honest closeout
says so in all three places — the plan's landed note, the handoff's next-step
brief, and the tracker comment — and the next session picks it up with its eyes
open.
