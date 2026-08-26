# Cube Methods & Algorithms — Feature Plan

The cube's third epic. V1 built a notebook you can write solves in
(`docs/cube-plan.md`). Cube Flow gave that notebook the structure a drilling
session has — a method chosen up front, a rail of stages, a boundary you place
at the scrubber (`docs/cube-flow-plan.md`). This one builds **the thing those
stages are made of**: one shared library of algorithms that grows out of real
solving, methods the operator can *build* rather than pick from a list of two,
and a journey that orders those methods beginner → advanced and unlocks the next
stage when the current one is demonstrated in real solves.

## For the implementer (start here)

- **Repo:** `mjohnson139/expo-sudoku`. The app code is in the `SudokuApp/`
  subdirectory (Expo · React Native · JavaScript).
- **This document is the source of truth** for scope and approach.
- **Start here if you are a new session:** **`docs/cube-methods-handoff.md`**
  always describes *the next step only*, so a session can start from a one-line
  prompt. **Rewriting it for the following step is part of every step's
  definition of done** — the discipline Fungiku, the V1 cube epic and Cube Flow
  all ran on.
- **Read `docs/cube-flow-plan.md` before changing anything.** It is a closed
  epic's plan and it is the reasoning behind almost every line this epic edits.
  §3.4 (method as data), §3.5 and §3.8 (the rail, and boundaries at the
  scrubber), §5 (things that are easy to get wrong) are load-bearing here and are
  **not** overturned. `docs/cube-plan.md` §7.1 (what survives a background),
  §8.5 (markers, not ranges) and §8.6 (the cube is sized first, every other row
  is on a budget) are still in force underneath both.
- **Tracker:** GitHub issue **#126**. Tick your step's checkboxes as you go.
- **Process:** follow `.github/dev-process.md` — one delivery step per branch,
  commit after each step, **open the PR as soon as the step is pushed** so the
  workflow publishes its `pr-<N>` preview build, and **prompt the operator to
  test after each step**, against that build. Close the step out with the
  `closeout` skill (`.claude/skills/closeout/`).
  Code sessions have authenticated `gh`; the session that writes the step must
  push it and create its own PR against `epic/cube-methods` (after checking for
  an existing PR with `gh pr view`), then report its number and URL. Creating a
  PR is not an operator handoff and must never be left for the operator.
- **The design:** `Cube Methods & Algorithms.dc.html` in the Claude Design
  project `2acc14f2-7f7e-434f-a29d-e0fe29fa876a` ("Expo Sudoku design system"),
  settled 2026-08-16. That project's `design-decisions.md` carries the settled
  summary in prose, under *Algorithms & methods*.

### Branching

```
main ─── epic/cube-methods ─── feature/cube-methods-<step>
                               (PRs target epic/cube-methods)
```

`epic/cube-methods` is cut from **`main` at `22b117b`**, the commit that closed
Cube Flow. Pushing to it publishes an EAS Update branch of the same name
(`.github/workflows/eas-publish.yml`), so the epic stays openable in Expo Go
between step PRs; a step PR also gets its own throwaway `pr-<N>` preview.

**Cube Flow merged to `main` on 2026-08-23** at release 3.2.0, after an operator
device regression of the accumulated epic. `epic/cube-flow` is deleted and
nothing should be branched from it; `docs/cube-flow-handoff.md` is a record now
rather than a brief, and is still the fastest way to understand the code this
epic edits.

**One piece of Cube Flow's operational debt is still open and it is not this
epic's to clear.** Step 1 of that epic added `react-native-screens`, an EAS
Update cannot ship native code, and `runtimeVersion.policy` is `sdkVersion` — so
the standalone `preview` and `production` binaries need one rebuild, and until
they get it an old binary keeps serving the old bundle *silently*. Expo Go and
the EAS Update channels are unaffected, which is where every step of this epic
is tested — but **a step here that behaves oddly in a standalone build should
suspect this first.**

Build notes are per release, not per step (V1 plan §12). This epic is **3.3.0** —
add that one entry with Step 1 and extend it as steps land, keeping `app.json`'s
`expo.version` matching.

## 1. What this epic changes, and why

Cube Flow ended with a solve that knows what method it is and a rail that spells
that method out in stages. Three things about that are still hollow, and all
three are the same hollowness: **the app knows the names of the stages and
nothing about their content.**

**A method is two frozen constants.** `METHODS` in `games/cube/methods.js` is
Roux and CFOP, four stage strings each, `Object.freeze`d with a comment saying
user-definable methods belong to this design round. An operator drilling
two-look CMLL has no way to say so, and the rail they get is the rail for the
method they are not doing.

**An algorithm exists only as moves the operator typed.** `R U R' U R U2 R'` is
seven tokens in a solve's `alg` and nothing else — not a thing with a name, not
a thing that can be looked up, not a thing that can be found again next week.
The library the operator actually keeps is on paper or in their head, and the
one place they *do* write those moves down — the app — throws the structure away
the moment the solve scrolls past.

**Nothing knows whether a stage was done or merely marked.** A locked phase on
the rail says "the operator put a boundary here". It does not say the first
block was actually built, and `cubeState.js` has known the answer all along:
`facelets(cube)` is right there, and a phase boundary is an index into an
algorithm that can be replayed exactly.

### The shape that replaces it

**One shared library.** An algorithm is *name + moves + the case it solves +
where it is used + private notes*, owned by a library that both the scramble
screen and any solve can reach, and referenced by any method's stage. Zero or
more assignments, so one entry serves Roux CMLL and CFOP OLL at once and an
unassigned entry stays findable.

**Methods become data the operator owns.** A method is an ordered stage list.
The shipped Roux, CFOP and LBL stay read-only presets, and a variant is made by
**duplicating** one and editing its stages — a 2-look CMLL is not a setting on
Roux, it is a different stage list, and every attempt to express that as a flag
ends in a rail that has to explain itself.

**The library grows out of solving, not out of data entry.** Select a run inside
a locked phase, name it, and it lands in the library with its case captured from
the cube state at the run's start. That is the feature Cube Flow §4 deferred to
this round, and it is the reason the library will have anything in it.

**And where there is no solve to take a run from, there is a cube to write on.**
The **algorithm workbench** is the solve screen's apparatus — the cube, the move
track, the transport, the move pad, a finger on a sticker — over a *solved* cube
with no scramble and no hold. You turn the cube; the moves accumulate; you save
them. **An algorithm is written the way a move is written**, which is the thing
this app has spent two epics getting right, and typing notation on a phone
keyboard is the fallback rather than the front door.

**A journey, not a curriculum.** Methods ordered beginner → advanced on a
vertical track, each stage a pill that is done, open or locked, unlocked by
**demonstrating it** — locking that phase in a real solve with the cube actually
in the stage's exit state, three times. No quiz mode, no separate practice
screen: the solve screen already knows both facts.

**What this retires:** `METHODS` as the only source of methods; `PHASE_METHODS`'
last descendants; and the assumption baked into every signature in
`methods.js` that the catalogue is a module-level constant.

## 2. Decisions taken before the first line

| Question | Decision | Why |
|---|---|---|
| Scope | The full design **minus packs** | The design marks packs *future* and says v1 is free-only. A pack is a read-only algorithm group plus an optional preset method, and it renders as one card in the library's filtered view — **no new screen and no layout change**, which is exactly why it can wait. |
| Where the library and the user methods are stored | **The existing cube blob**, `@CubeScramble`, as two new top-level keys, `_v: 3` | Tagging a run writes a solve *and* a library entry in one action, and `CubeContext` is already the single debounced writer for everything the operator authored. A second key buys two writers and two ways for them to disagree. `readCubeSave` reads every version by shape, so this costs no migration in either direction (`favorites.js:128`). |
| Preset methods | **Stay frozen constants in `methods.js`**, joined by a *catalogue* | `methods.js` already says it: *"When user methods do arrive they arrive as a second source that `findMethod` consults, not as a mutation of this array."* Presets are read-only so they stay clean starting points; a user's variant is theirs entirely. |
| How a variant is made | **Duplicate, then edit** | The design's own panel. It is also the cheap answer: a duplicate is a new id, so no existing solve references it and no marker in anybody's file is disturbed. |
| Stage identity | **A stage is still a plain string, and it is still the marker's label** | `phases[].label` is the file format and `railStates` matches spans to stages by that string (`phaseRail.js`). Giving user stages ids would mean a second matching rule and a migration. The cost is §5's rename trap, which is paid once, in one tested function. |
| Deleting a method that solves use | **Refused.** A method any solve references cannot be deleted; the *"Use for new solves"* toggle is how it leaves the picker | The alternative is a solve pointing at a method that no longer exists, which `sanitizeMethodId` would quietly turn into Freeform — silently discarding a rail the operator built. |
| The case | **Stored/corrected as nine characters of the U face; presented as the real three-face starting cube** | Device comparison on PR #133 settled the visual: the flat tile hides side stickers and makes every PLL look identical, while the 3D preview shows the actual authored or inverse-derived start. The compact pattern remains useful for descriptions and a future correction editor, but is not the library artwork. |
| Journey progress | **Derived from the solves, stored nowhere** | The same discipline as `solveCards.js`' "in progress" and `defaultMethod`. A demonstration *is* a locked phase whose exit state checks out, and those are already in the file. Storing a counter alongside would be a second thing to keep honest on every edit, and it would survive the deletion of the solve that earned it. |
| Exit-state checks for user stages | **Only the shipped presets' stages carry predicates** | Nobody can know what a stage called "my thing" ends in. A user stage with no predicate counts a lock as a lock — the journey says so on the card rather than pretending to check. |
| **How an algorithm is written** | **On the cube.** Finger turns and the move pad are the primary input, on a workbench screen and on the solve screen; typing notation is the *paste* path, not the front door | **The finding that produced this row came from a device**, on Step 1 (§3.1). Cube Flow spent a whole step making a finger write a move and made it the primary input; a library whose `＋` opens a text keyboard contradicts the app around it. |
| **What the workbench cube starts as** | **An authored starting case.** Turn a solved cube into the position where the algorithm begins, then lock that start and write the algorithm | Device feedback on Step 2.5 made the inverse-only assumption concrete: an editor that cannot say where an algorithm begins cannot faithfully record the operator's algorithm. The setup is moves from solved, not a second cube-state format. |
| **Where a workbench algorithm's case comes from** | **Its authored `setup`, falling back to its inverse for older and pasted entries.** | Existing entries upgrade without migration; workbench entries preserve the position the operator actually chose. A stored hand correction still wins over both. |
| Entry points | **One door from the scramble screen**, into the library; the library and the journey are one control apart from each other | Measured, not assumed — see below. |

### What the entry point costs, measured before committing to it

The scramble screen's header is **full at four controls** and Cube Flow Step 3
did the arithmetic in the source (`CubeHome.js`, the comment above
`headerActions`): at 320 points the header has 300, the home button takes 38,
the right-hand end takes 4 of padding, and each control is 34 points of button
with 5 of margin in front of it. Four leave 94 points for the title, which is
`Scramble` at 17pt bold with air to spare. **Five leave 55, and the title starts
ellipsizing** — `ScreenHeader`'s dense right-hand column has `flexShrink: 0`, so
what gives is always the word on the left. That is why Compare is not up there.

So the library's door is **an icon button in the solve list's action row**
(`CubeSolveList.js`, `styles.actions`), beside `New solve` and `Compare`. That
row already exists, its `newAction` card flexes and its `compareAction` does
not, so a 34-point icon button plus the row's 6-point gap costs the New solve
card 40 points of width and **costs the cube nothing** — no new row, and §8.6's
budget is untouched. Verify the three-control row at 320 in a browser before
believing this paragraph; it is arithmetic, not a measurement.

**The journey does not get a second door.** The library's header carries `＋`
and a journey control; the journey's header carries the home chevron and a
library control. Two screens, one control apart, and the scramble screen pays
for one of them. This is also why the journey is Step 8 rather than Step 2: it
arrives through a door that already exists.

## 3. Delivery steps

Nine steps and a closeout. The order is chosen so that **the two riskiest things
are quarantined**: Step 4 is a signature refactor with no visible change, exactly
as Cube Flow Step 1 was, and Step 7 is the only step whose correctness is a
cube-theory question rather than a UI question. Everything before Step 4 is a
new, isolated domain that touches existing code in one place; everything after it
depends on the catalogue being a parameter.

**Step 2.5 is a guest, and it arrived the way Cube Flow's Step 3.5 did** — out
of the operator using what shipped and finding it wanting. It is numbered 2.5
rather than renumbering 3–9 because every cross-reference in this file, the
handoff and #126 is worth more than a tidy sequence; that is the same call Cube
Flow made and it held. What it changes about the steps after it is written into
each of them, and it changes §3.3 most.

| # | Step | Delivers |
|---|---|---|
| 1 | The library, stored and shown | `algorithms.js`, the save slot, the list screen — *landed, with one finding* |
| 2 | The case, and where it comes from | `algCase.js`: capture, invert, derive; the 3×3 tile |
| 2.5 | The algorithm workbench | a solved cube you write an algorithm on with your finger — *added after Step 1's device pass* |
| 3 | Use or tag an algorithm in a solve | apply a library entry to the live solve; keep a run as a new entry |
| 4 | Methods as a catalogue | behaviour-neutral; the catalogue becomes a parameter; LBL joins the presets |
| 5 | The method builder | user methods, duplicate-to-edit, stages, "use for new solves" |
| 6 | Stage → algorithms | the assignment, from both ends; the meta line becomes true |
| 7 | Exit-state checks | `stageChecks.js`; a lock that was *demonstrated* |
| 8 | The journey | the track, the pills, the gates |
| 9 | Epic closeout | regression, 3.3.0, merge to `main` |

### 3.1 Step 1 — the library, stored and shown

The whole domain, end to end, with nothing clever in it. An entry is written by
hand on this step; **Steps 2.5 and 3 are what make writing one by hand the
unusual case**, and the device pass below says how urgently.

- **`games/cube/algorithms.js` is new and pure.** The shape is the design's
  *Algorithm entry* panel:

  ```js
  { id, name, moves, case: null, assignments: [], notes: '', savedAt, editedAt }
  ```

  with `assignments` an array of `{ method, stage }` — a method id from the
  catalogue and one of its stage strings. `case` stays `null` until Step 2.
  Exports, following `solveList.js`' conventions exactly: `MAX_ALGORITHMS`
  (100, matching `MAX_SOLVES`), `MAX_ALG_NAME` (40, matching `MAX_SOLVE_NAME`),
  `nextAlgorithmId`, `createAlgorithm`, `editAlgorithm` (the *one* edit funnel —
  see §5), `removeAlgorithm`, `sanitizeAlgorithms`, `findAlgorithm`,
  `searchAlgorithms(list, query)` and `filterAlgorithms(list, methodId)`.
  Injected clocks, as `solveList.js` does.
- **The moves are validated the way a solve's are.** `algError` /
  `isValidAlg` from `moves.js` already exist and already produce the message the
  alg input modal shows; an entry whose moves do not parse is not saved.
  `normalizeAlg` decides what is stored.
- **The save slot.** `algorithms` joins `{ _v, scramble, favorites, solves,
  workspace }`, sanitized by shape in `favorites.js`' `readCubeSave` and written
  by `storage.js`. `CUBE_STORAGE_VERSION` becomes **3** — the number exists so a
  file can say what wrote it, and nothing branches on it. A pre-Step-1 file has
  no `algorithms` key and `sanitizeAlgorithms(undefined)` is the empty list,
  which is the truth.
- **`CubeAlgorithms` is a route on the cube's own stack** (`CubeScreen.js`,
  beside `scramble` and `solve`), reached from the action-row button described
  in §2. Header: the back chevron, `Algorithms`, and `＋`. Body: the search
  field, the filter chips (`All · N`, one per method with assignments,
  `Unassigned`), and the cards.
- **`CubeAlgorithmEntry` is the second route** — name, moves, assignments,
  notes — pushed by `＋` and by a card. Reuse `CubeAlgInputModal`'s validated
  moves input rather than writing a second one.
- **Notes are never shown on the solve screen.** The design says so and it is
  worth obeying from the first line: notes are finger tricks and personal cues,
  and a solve screen is not where you read them.

**Tests:** `algorithms.test.js` — creation, the name uniqueness rule, the
bounds, sanitizing a corrupt and a future-shaped file, search over both name and
moves, filtering by method and by unassigned.

**Operator tests:** add three entries by hand, one with two assignments and one
with none; search by name and by a move; every filter chip; edit and delete;
background and resume; kill and cold start; confirm the scramble screen's action
row still reads well at the phone's width.

**Landed 2026-08-24** (PR #130, merged to `epic/cube-methods`; **merged with a
device finding outstanding** — see Step 1a, which is the step that finding
created). `algorithms.js` (605 lines, 580 of tests),
the `_v: 3` save slot, `CubeAlgorithms` and `CubeAlgorithmEntry` as routes on
the cube's stack, and the library button in the solve list's action row. Two
shapes it settled that were not in the brief and are worth keeping: the entry
screen has **no Save** — every field commits as it settles, the way the rest of
this app works — and `＋` creates the record from the moves rather than holding a
draft, because a name without moves is not an entry.

**Four things found in the build, not in the brief**, each naming a mechanism
rather than a symptom:

- **`editAlgorithm` returns the list itself when nothing changed**, and that is
  load-bearing rather than an optimisation: the entry screen writes on every
  keystroke, so a no-op that still stamped `editedAt` would turn *"when did I
  last change this"* into *"when did I last look at it"*.
- **A filter chip can stop existing under the screen.** Unassign the last Roux
  algorithm while the Roux chip is selected and the chip is gone, leaving a
  library that looks empty with no control to get out of it. `liveFilter` is the
  fix, and **Step 6 has more ways to reach this, not fewer.**
- **`createAlgorithm` refuses at the cap rather than evicting**, unlike
  `createSolve`, which prepends and slices. A solve list is a rolling record; a
  library is months of work, and dropping its oldest entry to make room is the
  worst thing that file could do.
- **`UNASSIGNED` is the string `'unassigned'`**, which is the one place the chip
  vocabulary and the method-id vocabulary can collide. **Step 5 mints user method
  ids and must not mint that one.**

**Layout, in points (§8.6).** The library button is 34 points at the right-hand
end of an action row that already existed, measured at 320 × 568 with all three
controls up: the row is 300 wide, Compare is 105, and `New solve` keeps 149
against the 87 its icon and label need. **The cube pays nothing** — no new row.
It is the right-hand control on purpose: Compare comes and goes with the number
of attempts, so a button between the two would jump 111 points sideways the first
time a second solve was written.

#### Step 1a — the front door was a keyboard (found on a device)

**The operator's verdict, immediately, on the `pr-130` build:** they did not like
it. The reason is one line of the flow: **`＋` opens a modal asking you to type
notation.**

That is the wrong front door, and the argument against it is the app's own
history. Cube Flow Step 3.5 spent an entire unplanned step making **a finger on a
sticker write a move**, and Step 9 rearranged the whole solve screen around the
consequence. In an app where the cube is the input device, a library whose only
way in is the phone keyboard reads as a different product — and it is also
*harder*: `R U R' U R U2 R'` is seven tokens with two apostrophes to find on a
software keyboard, and every one of them is a chance to mistype a cube nobody can
check by eye.

**This is not a defect in what Step 1 built.** The module, the storage slot, the
list, the search and the filters are all correct and all needed, and typed entry
is a real secondary path — pasting an algorithm you found written down is exactly
how a library gets seeded from outside. What is wrong is which of the two is the
default.

**The fix is Step 2.5, not a patch here.** `＋` cannot stop opening the keyboard
until there is somewhere better for it to go, so this finding is recorded and
spent on §3.2.5, which is the step it created. When the workbench lands, `＋`
opens the workbench and typing moves to a secondary **Paste an algorithm** action
on the entry screen.

### 3.2 Step 2 — the case, and where it comes from

**This step is now two things, and the second one is what Step 2.5 is built on.**
It is still the 40-point tile; it is also the arithmetic that means an operator
never has to draw a case by hand.

- **`games/cube/algCase.js` is new and pure.** `captureCase(cube)` reads
  `facelets(cube).U` (`cubeState.js:160`) and returns nine characters, `y` where
  the sticker matches the U **centre** and `.` where it does not — the centre
  rather than a fixed colour, so the capture is honest for a cube being held any
  way up. `toggleCaseCell(pattern, index)` and `sanitizeCase(raw)` complete it;
  `EMPTY_CASE` is nine dots. **Step 2 corrected one line of this too**: a corrupt
  pattern sanitizes to `null`, not to `EMPTY_CASE`. `null` is what
  `algorithmCase` reads as *"nothing stored, derive it from the moves"*, while
  `EMPTY_CASE` is a real answer meaning *"nothing is oriented"* — sanitizing
  corruption to it would pin a blank tile onto an entry whose moves knew the
  answer.
- **`invertAlg(text)` belongs in `moves.js`, not here**, beside `tokenize` and
  `normalizeAlg`: reverse the token order and flip each token's modifier — `R` ↔
  `R'`, `R2` ↔ `R2`. **Work on the tokens, not on parsed moves.** `moves.js`
  already explains why (its `scanAlg` comment): `parseMove` normalizes `r` to
  `Rw`, and echoing `Rw U Rw'` back at somebody writing Roux corrects them in
  notation their own method does not use. `invertAlg("r U r'")` is `"r U' r'"`.
- **`caseOfAlgorithm(moves)` is the one that matters.** It is
  `captureCase(cubeFromAlg(invertAlg(moves)))`, and the reasoning is one line:
  **if `A` takes case `C` to solved, then `A⁻¹` takes solved to `C`.** So an
  algorithm carries a useful fallback case for older and pasted entries. The
  workbench additionally stores authored `setup` moves from solved, because the
  operator must be able to define the position where their algorithm begins.
- **The compact tile** remains the correction/description representation. The
  visible library and entry preview is the real starting cube at a fixed
  three-face angle, derived from authored `setup` or `A⁻¹(solved)` for older
  entries. This preserves side stickers and distinguishes PLLs.
- **Every entry that has moves gets a case on this step**, derived — including
  the ones Step 1 already stored with `case: null`. Derive on read rather than
  migrating the file: a stored `case` wins, and a null one is computed from the
  moves. That way a case the operator has corrected is never overwritten by
  arithmetic, and nothing has to be rewritten to get the benefit.
- **The tap-a-sticker editor is the correction path, and it can wait.** The
  design draws it and §2 keeps it as an editable field, but derivation removed
  its main use. Build it if the tile turns out to be wrong for something; do not
  build it on spec.
- **Never colour alone.** A case is a pattern, and a pattern of two greys would
  be a pattern; the accessibility label says the pattern in words
  (`"top row: corner, edge, corner"` is not enough — say which cells are
  oriented), because a 40-point tile is not readable to a screen reader by
  construction.

**Tests:** `algCase.test.js` — a solved cube captures nine `y`; a cube rotated
whole captures the same pattern as the cube at rest; a corrupt pattern sanitizes
to `EMPTY_CASE`. And the two that earn their keep: **`invertAlg` is its own
inverse** over a corpus of real algorithms and preserves the notation it was
given, and **`caseOfAlgorithm("R U R' U R U2 R'")` is the Sune pattern
`.y.yyyyy.`** — which is the only way to know the arithmetic agrees with what a
cuber would draw. **Step 2 corrected this literal.** It was written here as
`.y..yy.y.`, read off the design, and the design's tile is a drawing: that
pattern has three of the four edges oriented and no corners, and last-layer edge
orientation is always even, so no cube with its first two layers solved can show
it. Sune's real case is the one every OLL sheet draws — all four edges plus one
corner, six oriented stickers — and that is `.y.yyyyy.`. Pin one PLL too (`T-perm` is all
nine `y`, because permutation leaves every sticker oriented) — it is the case
that proves the U-face-only pattern is *not* enough on its own, and it is the
evidence §6's richer-case question wants.

**Operator tests:** the tile reads at arm's length on both themes; every entry
written in Step 1 now shows a case, and it is the right one for a Sune and a
T-perm held in the hand next to the phone.

**Landed 2026-08-24** (PR #132, merged to `epic/cube-methods`; **device pass
passed clean on the `pr-132` build** — the tile reads at arm's length on both
themes, which was the one thing a desktop screenshot at 2× could not settle, and
every entry written in Step 1 showed its case without having been re-saved). Two
new files, `algCase.js` and `CubeCaseTile.js`; `invertAlg` and `tryInvertAlg` in
`moves.js`; `algorithmCase` in `algorithms.js`, and `sanitizeCaseShape` grown up
into `algCase.js`'s `sanitizeCase`.

**The shape it became.** The step's whole weight is on one function —
`caseOfAlgorithm(moves)` = `captureCase(cubeFromAlg(invertAlg(moves)))` — and on
the decision to **derive on read rather than migrate the file**. A stored case
wins and a `null` one is computed, which is what gave every entry Step 1 wrote a
case the moment this build was installed, with nothing re-saved and no migration
in either direction. `createAlgorithm` still writes `case: null`, and **nothing
in the app writes a case at all**: the field exists only for a hand correction
that overrules the arithmetic, and there is no screen for one yet.

**Five things found in the build, not in the brief:**

- **The design's Sune literal was wrong, and this section said to pin it.**
  `.y..yy.y.` has three of the four edges oriented and no corners, and last-layer
  edge orientation is always even — so no cube with its first two layers solved
  can show it. (It is a reachable *capture*: a scrambled cube whose top layer
  holds pieces from elsewhere produces it, which was confirmed by brute force. It
  is not a reachable OLL.) Sune's real case is `.y.yyyyy.`, four edges plus one
  corner, and the test pins that with the reasoning in its body. **The mechanism
  worth remembering: the design is a drawing and the arithmetic is holding a
  cube — but check which algorithm the drawing is of before concluding either is
  wrong.** Anti-Sune came out `.yyyyy.y.`, the dot OLL `....y....`, both correct.
- **`sanitizeCase` must answer `null` for corruption, not `EMPTY_CASE`**, which
  is the opposite of what this section's test list said. `null` is what
  `algorithmCase` reads as *derive it*; `EMPTY_CASE` is a real answer meaning
  *nothing is oriented*. Sanitizing corruption to `EMPTY_CASE` would pin a
  permanent blank tile onto an entry whose moves knew the answer. Both lines in
  §3.2 are corrected above.
- **The memo is load-bearing, not an optimisation.** A capture is ~0.07 ms in
  node — call it half a millisecond in Hermes — and the whole library re-renders
  on every keystroke in the search field, so a hundred entries is 50 ms a render
  without it. `caseOfAlgorithm` therefore memoizes **inside `algCase.js`** rather
  than leaving each screen to arrange a `useMemo`, which is also what lets Step
  2.5's workbench call it straight from a render on every move.
- **The tile dissolved into the card on the dark theme**, found in a browser at
  393 × 852: the card is near-black and so is the tile's body, so what was left
  read as stickers floating on the card rather than as a cube face. Fixed with a
  fixed `#3a3a3a` hairline rim — **fixed rather than the theme's border colour**,
  because a pale rim would halo the black square on the light themes, which is
  the same bug pointing the other way.
- **`toggleCaseCell` refuses the centre.** It is the sticker the other eight are
  measured against, so a grid that let you turn it off would let you draw a case
  no capture could produce. **The tap-a-sticker editor itself was not built** —
  this section says build it when the tile turns out to be wrong for something
  real, and nothing was. `toggleCaseCell` is written and tested for that day, and
  the question is carried as §6 q10.

**Layout, in points (§8.6).** **Zero.** The step adds no row to any screen with a
cube on it: the library card's 40-point square was reserved by Step 1 precisely
so that filling it would move nothing, and it did not. The entry screen's tile is
76 points on a screen with no cube.

**§6 question 8 now has evidence rather than a prediction.** A library holding a
T-perm and a J-perm shows two identical all-yellow tiles side by side, visible in
the step's screenshots. The U-face-only case is still what the design draws and
what this epic ships; what is now missing is a *decision* about what a richer one
would be, which is a design question rather than an arithmetic one.

### 3.2.5 Step 2.5 — the algorithm workbench

**The step Step 1's device pass created** (§3.1's Step 1a). A screen that is the
solve screen's apparatus over a **solved** cube: you turn the cube with a finger
or the pad, the moves accumulate, and you save them as a library entry. It is
the front door `＋` should have had.

#### What it is

- **`CubeWorkbench` is a route on the cube's own stack**, taking an optional
  algorithm id: no id is a new entry, an id opens that entry's moves for editing.
  Pushed from the library's `＋`, and from an entry's **Edit on the cube**.
- **Top to bottom it is `CubeSolve`'s stack minus the solve**: the cube, the
  move track, the transport card with its scrubber and Backspace, and the move
  pad drawer. Finger turns write moves exactly as they do on the solve screen —
  same `useCubeTouch`, same `CubeMovePad`, same `applyPadPress`, same folds and
  cancels **after the turn settles** (§5).
- **The setup phase starts solved and there is no hold.** The operator either
  turns that cube into an authored start or chooses Derive later / Use inverse;
  then the algorithm phase starts from that position. There is no scramble,
  `orientation`, solve inspection, phases, rail or Compare.
- **The case it solves is shown live** as a shared three-face
  `CubeCasePreview` beside the track. An authored `setup` supplies the cube;
  otherwise `A⁻¹(solved)` follows the moves. Top and side stickers stay visible,
  so PLLs do not collapse into the same all-yellow U-face picture.
- **Save** opens a sheet: a name, the stage assignment chips the entry screen
  already has, and Save → `createAlgorithm` (or `editAlgorithm` for an existing
  id) and back. **The same sheet Step 3 uses** — see §3.3.
- **`＋` in the library stops opening the keyboard.** Typing becomes **Paste an
  algorithm**, a secondary action on the entry screen, which is the right weight
  for it: seeding the library from something written down elsewhere is real, and
  it is not the common case.

#### The authored starting state

Device feedback on the first Step 2.5 build found the inverse-only flow's large
drawback: **the operator could not define where their algorithm begins.** The
workbench now has two explicit phases. First, turn a solved cube into the
starting case and choose **Use this start**; then write the algorithm from that
cube. The setup is stored as notation in `setup`, so the cube remains a pure
function of text and there is no second facelet-state format to migrate.

For older and pasted entries with no setup, `A⁻¹(solved)` remains the lossless
fallback. Editing one on the cube seeds the starting phase from that inverse.
The choice is visible: **Derive later** before a new algorithm has moves, and
**Use inverse** once it does. The invariant is executable, not assumed:
`A⁻¹ A` must leave `isSolved` true. After either start is confirmed, the
transport seeks to 0 so the cube visibly shows the chosen starting state rather
than the solved end of the algorithm.

#### The engineering decision this step actually turns on

`CubeSolve.js` is 876 lines and most of them are solve-specific — phases, the
rail, the hold, Compare, persistence through `editOpen`. The cube-plus-track-
plus-transport-plus-pad stack the workbench wants is assembled *inside* it.

**Do not build the workbench by copying `CubeSolve`.** Two paths, and the step
should pick one deliberately and say which in its PR:

1. **Extract the shared apparatus** into a component both screens render, with
   the solve-specific parts passed in. This is the right end state.
2. **Extract only what is cheap** — the pad drawer, the transport card, the
   stage measurement (`useCubeStage`) — and let the workbench compose them
   itself.

**If the extraction turns out to be more than mechanical, split it: ship the
behaviour-neutral extraction alone, with `CubeSolve` proving it unchanged, and
build the workbench on top of it.** That is Cube Flow Step 1's whole lesson —
a native-dependency change and a design change in one PR have two suspects — and
`CubeSolve` is the screen this app is about. A regression there is not worth a
saved session.

**Tests:** `invertAlg` and `caseOfAlgorithm` are Step 2's. What is new and pure
here is small — whether the workbench's alg is saveable, the default name, the
edit-versus-create decision — and belongs beside `algorithms.js`. The input path
itself is already pinned by `touchTurn.test.js` and `solve.test.js` and must not
be re-pinned.

**What must be visible in Expo Go:** open `＋` from the library onto a solved
cube. Write `R U R' U R U2 R'` with a finger, and again with the pad. Watch the
case tile fill in. Backspace a move. Hide and show the pad. Save it with a name
and a stage, find it in the library with the right case. Open it again and edit
the moves. Background and resume mid-write.

**Operator tests, on a device — this step cannot be verified anywhere else.**
Finger turns are orbit-only under `react-native-web` (§5), so a browser pass
covers the layout and the case arithmetic and **none of the input**. Say so in
the PR.

**Landed 2026-08-25** (PR #133, merged to `epic/cube-methods`; **device pass clean after five device-found follow-ups**). The library's `＋` now opens a fifth cube-stack route: a solved-cube workbench built by composing the existing renderer, player, track, scrubber, move pad and measured stage rather than extracting the solve-specific screen. An entry can be created or edited with finger turns or the pad; the live three-face `CubeCasePreview` is shared by the workbench, cards and entry screen; the shared save sheet collects the name and stage assignments; Paste remains secondary.

What the preview builds found, and the brief did not:

- **A derived case is not enough to author a starting position.** The first device pass exposed the missing start immediately. Entries now have optional normalized `setup` moves from solved. **Use this start** records the cube actually shown at the scrubber; **Derive later / Use inverse** deliberately leaves `setup` empty and uses `A⁻¹(solved)` as a continuously derived fallback for old and pasted entries.
- **The derived case and the editor's animation base are different concerns.** Recomputing the large cube's starting state from the growing inverse made the track advance while the cube stayed solved (`A⁻¹ A`). `workbenchCube` now independently derives the settled display from explicit setup plus moves through the cursor, while an empty setup lets the editor animate forward from solved.
- **A flat U-face tile loses PLL identity.** The three places that show a case now share `CubeCasePreview`, using `buildScene` and the real starting cube so top and side stickers remain visible. A later force-push briefly regressed this by dropping the component; sharing it is the guard against the surfaces drifting again.
- **A modal owns its own keyboard avoidance.** The save sheet's name field was hidden by the iOS keyboard until the modal gained a bounded, scrollable `KeyboardAvoidingView`; the workbench outside it cannot move modal content.
- **The small case preview is a control as well as a picture.** Tapping it pauses and seeks the large cube to the authored/derived start. The transport names that same destination. This restored a discoverable 3D starting-case view without another row.

**Layout, in points (§8.6).** The shared case-preview/track row is 60 points and costs the workbench cube **60 points** on constrained screens. The Change start / Save actions share one existing row, and making the preview tappable adds no row. Library-card (56) and entry-screen (112) previews are on screens without the main cube.

### 3.3 Step 3 — use or tag an algorithm in a solve

**The library and a solve become reciprocal here.** The workbench writes an
algorithm in isolation; Step 3 makes the library useful during a real solve in
both directions:

1. **library → solve:** choose a saved algorithm and apply its moves to the live
   end of the open solve;
2. **solve → library:** select a run already performed and keep it as a new
   library entry.

Both directions use the records and funnels Step 2.5 landed. There is no second
algorithm shape, no component-owned library, and no shortcut around `editOpen`,
`withMoves`, `createAlgorithm` or `editAlgorithm`.

#### The Algorithms control

- Add one explicit, labelled **Algorithms** control to the transport card — the
  row that survives with the move pad hidden and already carries Backspace.
  **One door serves both directions** so Apply and Save a run do not consume two
  permanent controls or two rows from the cube.
- It opens a solve-side algorithm sheet. The first action is **Save a run from
  this solve**; below it is the library picker. Search stays available, and
  entries assigned to the solve's current method · open stage are shown first,
  followed by the rest of the library. Do not hide unassigned entries: the
  operator may know the algorithm better than the catalogue does.
- Reuse `CubeCasePreview`, the algorithm name, moves and assignment labels. A
  row must say what will be applied before a tap changes the solve; a bare case
  picture is not a sufficient picker.
- State the transport-control and sheet layout cost in points in the PR. The
  target is **zero points from the cube**: add a control to the existing
  transport row and put the list in a modal sheet, not a new fixed row.

#### Apply a saved algorithm — library → solve

- Tapping **Apply** appends **only `entry.moves`** to the open solve, through
  `editOpen(current => withMoves(...))`. `entry.setup` describes the position the
  algorithm expects; it is never prepended to the solve and never turns the
  solve into the workbench's authored case.
- Apply at the **live end** of the solve, matching every pad press and typed
  algorithm today. If the scrubber is reviewing an earlier position, applying
  first returns to the end; it does not insert into history. Mid-solve insertion
  would change every later cube state and phase index and is a different edit
  contract, not a convenience hidden inside Apply.
- The appended moves visibly play through the existing transport from the cube
  the solve is actually on. They must not appear instantly, and the whole
  algorithm is one authored action even though playback lands one move at a
  time.
- Applying respects the solve's notation exactly as the library stores it and
  uses `withMoves` so phase markers remain clamped. It does **not** create a
  second solve, change the solve's method, or write a tag automatically.
- Do not automatically refuse a case mismatch in this step. Exact recognition
  of "this algorithm fits the cube now" is still out of scope (§4), and a
  setup can be useful as instruction without being an equality gate. The picker
  supplies preview, moves and assignment; the operator chooses.
- Empty library: say **No algorithms yet** and offer the existing workbench
  route. A library at `MAX_ALGORITHMS` can still apply entries; the cap only
  refuses creating another one.

#### Keep a run — solve → library

- **Selection is visible after Save a run is chosen, not an invisible gesture.**
  The move track takes a first and last token, snaps to token boundaries and
  draws the range before confirmation. Cube Flow's discoverability lesson still
  applies: nothing relies on a long press.
- **A run is tagged inside one locked phase.** The phase supplies the default
  `{ method, stage }`. A run that straddles a boundary has no honest assignment;
  refuse it rather than guessing.
- Capture the run's actual starting cube as `setup` moves from solved — scramble,
  solve `orientation`, then the solve prefix up to the first selected token.
  That is what lets `CubeCasePreview` and the workbench reopen the real position;
  storing only the legacy nine-cell `case` loses it.
- Open the same `CubeAlgorithmSaveSheet` Step 2.5 uses, prefilled with the stage
  assignment. Save through `CubeContext.addAlgorithm`; a full-library refusal
  leaves the range selected and the solve untouched.
- **Tagging does not touch the solve's stored `alg`.** The moves remain exactly
  as performed. After save, the range may read as an algorithm chip in the
  track, and that chip can open the entry/workbench, but presentation is not a
  move-list edit.
- **A used algorithm is named in the track without replacing its notation.** A
  persisted, end-exclusive `algorithmRuns` annotation identifies the range and
  keeps a name fallback if its library entry is later deleted. The name toggles
  between a compact chip and the complete underlying moves. A newly applied run
  starts expanded so its existing transport animation stays visible; folding it
  later is presentation only and never rewrites `alg`.

#### Pure logic and tests

Put the derivation in `tagRun.js` or a similarly focused pure module:

- range normalization and refusal across a phase boundary;
- default assignment from the containing method stage;
- `setup` at the run's first token;
- the exact move string represented by the range;
- the apply decision: append `moves`, never `setup`, at the live end;
- phase-marker clamping through the existing `withMoves` contract;
- library ordering for current stage first without dropping unassigned entries;
- empty and full-library behavior (full refuses Save, not Apply).

The input path is already covered by `touchTurn.test.js` / `solve.test.js`; do
not duplicate those suites. What is new is the selection, derivation and
apply-versus-setup boundary.

**What must be visible in Expo Go:** in a method solve, open Algorithms, apply a
saved entry while the pad is shown and hidden, and watch every move play onto the
large cube and remain in the solve. Scrub backward, apply another, and confirm it
returns to the live end rather than inserting into history. Confirm the setup was
not written. Then save a run within one phase, find it in the library with the
right start and assignment, and open it in the workbench. Try a cross-boundary
run and a full library. Background during selection and during apply playback.

**Device pass required.** Browser input is orbit-only and cannot settle the
animation handoff, pad/transport reachability, native sheet navigation or resume
behavior.

**Landed 2026-08-25** (PR #138, merged to `epic/cube-methods`; **device pass
clean**). The solve transport now opens one Algorithms sheet for both directions:
saved entries append only their performed moves at the live end and play through
the existing transport, while a visible token selection can be saved with its
real starting setup and containing stage assignment. Saved and applied runs keep
the solve notation intact and add a named, end-exclusive annotation whose accent
boundary continues across the complete run, including wrapped track rows.

What the final device-tested shape added beyond the original brief:

- **A run name is an annotation over moves, not a replacement for them.** The
  compact name toggles to the underlying notation and back; a newly applied run
  begins expanded so its transport animation remains visible.
- **The label boundary has to encompass the moves it names.** Device feedback on
  the first preview made a standalone badge read as detached metadata. The final
  preview extends the same accent outline across every move recovered from the
  entry's exact setup and move sequence, including across wraps.
- **Recovery matches setup as well as notation.** Identical move sequences can
  occur more than once in a solve, so matching only the moves would annotate the
  wrong occurrence. The pure derivation verifies the run's real starting setup
  before painting it.

**Layout, in points (§8.6).** The labelled control shares the transport card's
existing 44-point handle row and the picker is modal, so Step 3 costs the cube
**zero points** with the pad either shown or hidden.

### 3.4 Step 4 — methods as a catalogue (behaviour-neutral)

The signature change, alone, so that a regression here has one suspect. Nothing
on screen changes except that a third preset appears in the new-solve sheet.

- **`methods.js` takes a catalogue.** `findMethod(id, catalogue)`,
  `stagesOf(id, catalogue)`, `methodName(id, catalogue)`,
  `sanitizeMethodId(raw, catalogue)`, `defaultMethod(mySolves, catalogue)`, each
  defaulting to the shipped presets so a caller that has no catalogue yet is
  unchanged. **The catalogue is a parameter, never module state** — the test
  runner is `testEnvironment: "node"` and a module-level mutable list is the one
  shape those tests cannot pin.
- **Threaded from `CubeContext`,** which gains `useMethods()` returning
  `PRESETS.concat(userMethods)` — an empty user list this step. Call sites:
  `phaseRail.js`' `railStates`, `solveList.js`' `createSolve`,
  `CubeSolve.js:527` (`placeMethodBoundary`'s `stagesOf`), `CubeSolveList.js`'
  method segment, `CubeNewSolveSheet.js`, and `favorites.js`' `sanitizeSolves`.
- **Storage sanitizes methods before solves.** `readCubeSave` builds the
  catalogue from the file's own `methods` key first, then sanitizes `solves`
  against it — otherwise every solve using a user method degrades to Freeform on
  the first load after the feature ships, which is a data loss that no error
  message accompanies.
- **Beginner LBL joins the presets**, because the journey's first card is LBL and
  because it is the honest starting point of the track: `Cross`, `F2L basic`,
  `OLL 2-look`, `PLL 2-look`, as the design names them.

**Tests:** extend `methods.test.js` — every function with an explicit catalogue,
every function with none, an id that exists only in the catalogue, an id that
exists in neither (still `null`), and the sanitizing order over a whole save.

**Operator tests:** every Cube Flow behaviour, unchanged — start a solve in each
method, place and move boundaries on the rail, Compare two attempts, open a
pre-existing solve, cold start. The step passes when nothing is different.

**Landed 2026-08-26** (PR #139, merged to `epic/cube-methods`; **device pass
clean**). The frozen presets now travel through the app as an explicit
catalogue rather than mutable module state. The same catalogue validates solve
methods, rails, comparison ordering, labels, new-solve choices, algorithm
assignments and whole-save reads. Beginner LBL is the third shipped preset,
with the four stages named above. The operator accepted the final Expo Go
preview with no follow-up findings; the step added no row to a cube screen and
cost the cube zero points.

### 3.5 Step 5 — the method builder

- **User methods join the save** as a top-level `methods` array of
  `{ id, name, stages, forNewSolves, from, savedAt, editedAt }` — `from` being
  the id this was duplicated from, which is what places it on the journey's
  track in Step 8 and what the design's `duplicated from Roux` subtitle says.
  Ids are minted like `nextSolveId` does, in a namespace that cannot collide
  with a preset id.
- **The builder is the design's screen**: the name field, `Stages · in solve
  order` with drag handles and a `Reorder` affordance, `＋ Add stage`, and the
  `Use for new solves` toggle with its `Appears in the method sheet` subtitle.
- **Presets are read-only and say so.** Opening a preset shows the same screen
  with everything disabled and one action: **Duplicate to edit**. The `⋯` on a
  user method offers duplicate, rename and delete — with delete refused, with a
  reason, while any solve references it (§2).
- **A stage name is unique within its method**, enforced in the builder, because
  `railStates` builds a `Map` keyed by label and a duplicate stage would make one
  of the two unreachable.
- **Renaming a stage relabels every marker that uses it.** See §5 — this is the
  trap of the epic, and it is paid here, once, in a tested pure function called
  through `CubeContext`'s single writer.
- The new-solve sheet lists every method with `forNewSolves`, plus Freeform,
  with stages previewed as it already does.

**Tests:** `userMethods.test.js` — duplication (name, `from`, stage copy,
independence from the preset), the uniqueness rules, the delete refusal, the
rename relabelling across a solve list, sanitizing a corrupt method out of a
save without taking the good ones with it.

**Operator tests:** duplicate Roux, split CMLL in two, use it for a real solve
and watch the rail; rename a stage the solve already marked and confirm the
marker followed; try to delete a method in use; toggle one off and confirm the
sheet drops it while existing solves keep it.

### 3.6 Step 6 — stage → algorithms

- A stage row's chevron opens **the algorithms assigned to that stage** — the
  design's `7 algorithms linked`, made true. From that list an entry can be
  assigned or unassigned, and a new one created already assigned.
- The same assignment is editable from the library side, which Step 1 built.
  **One writer**: both screens call `editAlgorithm`.
- `no algorithms · intuitive` is what a stage with none says — the design's own
  words, and the right thing for a Roux first block.
- The library's filter chips now cover user methods; `All · N` counts the
  library, `Unassigned` is the entries with no assignments, which is where a
  tagged run lands if its phase had no method.

**Tests:** the counts and the filtering are pure and belong in
`algorithms.test.js`; assignment add/remove is idempotent and cannot duplicate a
`{ method, stage }` pair.

**Operator tests:** assign from both ends; delete an algorithm that a stage
lists; rename a stage and confirm its assignments follow (the same relabelling
as Step 5, now with a second reader).

### 3.7 Step 7 — exit-state checks

The only step whose correctness is a cube question. It ships **no new screen**.

- **`games/cube/stageChecks.js` is new and pure.** A predicate per stage of each
  shipped preset, over the facelets of the cube at that moment:
  Roux `First block` (the D-L 1×2×3 block, relative to its own centres),
  `Second block` (D-R as well), `CMLL` (both blocks plus the U corners oriented
  *and* permuted), `LSE` (solved); CFOP `Cross`, `F2L`, `OLL` (every U sticker
  is the U colour), `PLL` (solved); LBL's four the same way. `isSolved`
  (`cubeState.js:194`) is the model for the shape of these: check the facelets,
  not the pieces, so a whole-cube rotation cannot change the answer.
- **Evaluated through the solve's hold.** The cube at a phase's end is the
  scramble, then the solve's `orientation` prefix, then the solve's moves up to
  `phase.at`. A Roux first block is *the operator's* down-left block, which is
  what the hold decides.
- **A user stage with no predicate returns `null`, not `false`** — "no opinion",
  which the journey renders as "counts a lock" rather than as a failure. Three
  states, and nothing may collapse them to two (the same discipline
  `orientation` gets, §5).
- **On the rail**, a lock whose exit state checks out is distinguishable from
  one that does not. Keep it quiet: the rail is a working surface and this is
  not a grade. A filled check versus an outlined one, and the accessibility
  label saying which.

**Tests:** `stageChecks.test.js`, and it is the biggest suite of the epic —
known-good algorithms per stage from a real scramble, near-misses (a first block
with one edge flipped), each check under a whole-cube rotation, and each check
against the hold that Roux is actually drilled in.

**Operator tests:** write a real Roux solve and confirm each lock is recognised;
deliberately mark a boundary in the wrong place and confirm it is not.

### 3.8 Step 8 — the journey

- **`games/cube/journey.js` is new and pure.** It takes the catalogue, the
  solves and the checks, and returns the design's cards: the method order
  (presets by their shipped level; a user method immediately after the method it
  was duplicated `from`), each stage's state — `done`, `open`, `locked` — the
  method's own state, and the **gate line**: `"🔒 LSE unlocks after 2 more CMLL
  locks — 1 of 3 done"`.
- **The rule is the design's.** A stage is demonstrated by locking it in a real
  solve with the cube in the stage's exit state, `DEMOS_REQUIRED = 3`. Stages
  unlock in order within a method; a method unlocks when the one before it is
  complete.
- **Derived, stored nowhere.** The count is a scan of the solves. Two
  consequences to write down rather than discover: **deleting a solve rolls its
  demonstrations back**, and `MAX_SOLVES = 100` means the count is really *"in
  your last 100 solves"*. Both are honest; both belong on the screen in a
  sentence if the operator is surprised by them.
- **Memoize it once, at the screen.** A scan replays every solve's moves; that
  is nothing once per visit and unacceptable once per card per render.
- The screen is the design's: the spine, the nodes, the cards, the stage pills,
  the state badges, `Yours` for a user variant.

**Tests:** `journey.test.js` — ordering including a duplicate's placement, the
three stage states, the gate text at 0/1/2/3 demonstrations, a user stage with
no predicate, and the roll-back when a solve is removed.

**Operator tests, over a real drilling session:** does the count go up when it
should, does the gate line say something true, and does a locked method feel
like an invitation or a nag.

### 3.9 Step 9 — epic closeout

Regression of the accumulated epic on a device, `3.3.0` build notes and
`app.json` agreeing, `epic/cube-methods` → `main` (after or with Cube Flow's own
merge — see the branching note), and the handoff rewritten as a record rather
than a brief. The `closeout` skill covers the sequence.

## 4. What this epic does not do

- **Packs and the paywall.** A pack is a read-only algorithm group plus an
  optional preset method, rendering as one card at the top of the library's
  filtered view with a price where the chevron is. The design says v1 is free
  and the library is entirely user-built, and the reason to believe that is
  cheap is that a pack needs **no new screen and no layout change**. Do not
  build a "source" abstraction for one hypothetical second source.
- **An independently typed or facelet-authored cube state.** The workbench's
  starting position is `setup` notation authored by turning a solved cube. It
  does not introduce a second serialized cube representation or a facelet editor.
- **Drilling a case against the clock.** Preview (§3.2.5) plays an algorithm
  from its case; that is checking your work, not practice. A practice mode is a
  different feature with a timer in it and it is not in this epic.
- **Recognising the case automatically while solving.** Cube Flow's open
  question 4 declined automatic state recognition and it is still declined: a
  check that *reads* the cube at a boundary the operator placed (Step 7) is not
  the same as a rail that moves boundaries by itself.
- **A solver, or move-count optimisation.** Outsourced in V1 (`docs/cube-plan.md`
  §8.9) and untouched here.
- **A settings store.** Cube Flow's open question 13 is still open and this epic
  must not answer it by accident. `DEMOS_REQUIRED` is a constant in
  `journey.js`, not a preference, until there is a settings screen to put it in.
- **Sudoku and Fungiku.** Outside `games/cube/`, this epic edits only what a step
  sanctions in its own PR, and the expectation is **none at all**: every screen
  it adds is a route on the cube's own nested stack. `utils/buildNotes.js` does
  not count — the release entry is mandated by the plan.

## 5. Things that are easy to get wrong

- **Renaming a stage orphans every marker that used its old name.** A marker
  stores a *label* (`phases[].label`) and `railStates` matches spans to stages by
  string equality (`phaseRail.js`). Rename `CMLL` to `CMLL — orient` in a user
  method and every solve written with it silently loses that pill: the marker is
  still in the file, the rail no longer claims it, and nothing says so. **The
  rename must relabel**, across every solve using that method, in one pure
  function with its own tests, called through `CubeContext`'s single writer.
  This is the trap of the epic and it is worth reading twice.
- **`sanitizeMethodId` turns anything it does not recognise into `null`**, and
  `null` means Freeform. Until Step 4 threads the catalogue through storage,
  loading a save that contains user methods would quietly convert every solve
  using one into a Freeform solve — a rail deleted with no error. **Sanitize the
  methods before the solves**, and test the order over a whole save.
- **`Object.freeze` is shallow, and the presets rely on it being enough.**
  `METHODS` and each method and each `stages` array are frozen individually in
  `methods.js`. A duplicate must be a genuine copy — `stages: [...method.stages]`
  — or the user's variant shares the preset's frozen array and the first edit
  throws in strict mode and silently no-ops outside it.
- **A move is drawn once and tidied after it settles** (Cube Flow §5, §8.10).
  The renderer keys every polygon by where a move *sends* it, so a move whose
  `amount` changes while it is animating — a quarter promoted to a half, an
  original swapped for its inverse — remounts the layer and flashes. Cube Flow
  learned this three times. **The workbench is a new move-entry path and it
  obeys the same rule**: the fold to `F2` and the drop of a cancelled pair run on
  the transport's `afterSettle` hook, on a cube at rest. Getting this wrong looks
  like a flicker, which is exactly the class of bug a browser will not show you.
- **The workbench must never write to the solve list.** It shares the cube, the
  pad, the track and the transport with `CubeSolve`, and it shares *none* of the
  persistence: no `editOpen`, no `withMoves`, no `workspace.solveId`. If an
  extraction makes it possible for the workbench to reach a solve, the
  extraction went too far — pass what the solve screen needs in rather than
  letting the shared piece know about solves.
- **`invertAlg` works on tokens, not on parsed moves.** `parseMove` normalizes
  `r` to `Rw`, so inverting through the parser silently rewrites a Roux user's
  notation into notation they do not use — which `moves.js` calls out explicitly
  as the reason `scanAlg` returns both halves. The inverse of `r U r'` is
  `r U' r'`, not `Rw U' Rw'`.
- **A derived case is not a stored one, and a stored one wins.** Deriving on read
  (§3.2) is what upgrades Step 1's entries for free; overwriting a case the
  operator corrected with arithmetic that disagrees with them is the failure mode
  it invites. Store only what was measured or corrected; compute the rest.
- **Two edit funnels is how the file and the screen learn to disagree.**
  `editOpen` is the only funnel for the open solve and `withMoves` the only
  sanctioned moves patch (Cube Flow §5). This epic adds two more collections and
  must add exactly one funnel each: `editAlgorithm` and `editMethod`. Step 5's
  cross-collection relabel is the one deliberate exception, and it goes through
  the context writer that already exists.
- **Never propose an invisible gesture again without citing question 3.** Cube
  Flow put solve management on a long-press and the operator's device verdict
  was *"the long press honestly I'm not even sure what you're talking about"*.
  The lesson generalises: discoverability is not "will they find it if they
  look", it is "is anything giving them a reason to look". Step 3's selection
  affordance is the place this epic is most tempted.
- **The browser has two holes in it.** `react-native-screens` no-ops under
  `react-native-web`, so no browser pass can see a navigation-animation bug; and
  finger turns degrade to orbit-only on web, so the *primary* way a move gets
  written is not covered at all. A step that says "verified in a browser" has to
  say **which** of its behaviours that covers. Steps 3 and 8 need a device.
- **A screen under a push stays mounted**, so "read it on mount" is not enough.
  The library and the journey are pushed over the scramble; anything they compute
  once at mount is stale the moment an entry is added two routes away. State that
  two screens share lives in `CubeContext` (Cube Flow §5, and `HubRoute` in
  `App.js` for the other answer).
- **The cube opts out of the resume remount** (`keepsStateOnResume` in
  `games/registry.js`) and it must stay opted out. A remount resets the cube's
  own navigator, which is how Cube Flow Step 3a shipped a solve screen sliding in
  over itself on every resume — and adding routes to that navigator makes the
  failure bigger, not smaller.
- **A style *variant* must be a whole style.** `[base, variant]` flattens to
  something Yoga and `react-native-web` disagree about, and V1 shipped a
  phone-only bug because of it (`ScreenHeader.js:112-126`,
  `CubeMovePad.js:387-395`).
- **`orientation` has three states** — `null`, `''`, notation — and the
  `null → ''` fallback is load-bearing for `inspecting`. Step 7's predicates read
  it; nothing may collapse them to two. `stageChecks` gains a third state of its
  own for the same reason: `null` is "no opinion", not "failed".
- **Say what a new row costs the cube, in points, in the PR** (§8.6). Steps 1 and
  3 both touch a screen that has a cube on it.
- **There is no lint and no typecheck.** `npm test` and the operator are the
  whole net, which is why every derivation that could be wrong belongs in a pure
  module with its own suite rather than inside a component the node runner
  cannot render.
- **The device is the only evidence that counts for feel**, and **write down
  when a finding came from a device.**

## 6. Open questions for the operator

1. **Is the library's door in the right place?** §2 puts it in the scramble
   screen's action row because the header is full at four controls. The
   alternative — dropping a header control to make room — was rejected without
   asking, and Cube Flow's question 7 says the operator is willing to lose one.
2. **Answered after the Step 3 operator review: does a tagged run replace its
   moves in the track, or only get marked?** It is a named presentation capsule
   over untouched stored moves. Tap it to show the exact notation in place and
   tap again to show the name. The bounded annotation is persisted, but neither
   view rewrites the solve's `alg`; undo drops an incomplete capsule whole.
3. **Answered after Step 2.5: can a saved algorithm be applied to a solve?**
   Yes — Step 3 is reciprocal now. Apply appends the entry's `moves` at the live
   end through the solve edit funnel; it never prepends `setup` and never inserts
   into reviewed history.
4. **Three demonstrations — is three right?** `DEMOS_REQUIRED = 3` is the
   design's default and nothing but a drilling session can confirm it. It is one
   constant.
5. **Should deleting a solve roll the journey back?** It does, by construction —
   the count is derived. The alternative is a stored counter, which survives the
   deletion of its own evidence. Worth stating on the screen if it surprises.
6. **Does the journey want to be reachable from the solve screen too?** The
   design does not draw it and the solve header is nearly as full as the
   scramble's. Left out until asked for.
7. **Should a preset be hideable?** An operator who will never drill CFOP still
   sees it on the journey and in the sheet. `forNewSolves` covers user methods;
   presets have no equivalent, deliberately, because hiding the track's
   destination is a strange thing to offer on a screen whose whole point is the
   track.
8. **Answered by Step 2.5 device feedback: yes.** The first build's large
   drawback was that the operator could not define where an algorithm begins.
   `setup` is now authored on the cube before the algorithm and stored as moves
   from solved; inverse derivation remains the fallback for older/pasted entries.
9. **Answered by Step 2.5 device feedback: is a nine-character U face enough
   of a case?** No. A T-perm and J-perm both capture as nine `y`, so the shared
   `CubeCasePreview` now renders the real starting cube from a fixed three-face
   view. The nine-cell pattern remains compact description/correction data.
10. **New in Step 2.5: should `＋` still offer typing at all?** It moves to
   **Paste an algorithm** on the entry screen. If a fortnight goes by without it
   being reached for, it can go — the library will have been seeded by then.
11. **Carried from Cube Flow, unanswered:** does the phase-split tick track come
   back now the rail exists (its q5), and where do the preferences live (its
   q13)? Neither is this epic's to answer, and §4 says this epic must not answer
   the second one by accident.
