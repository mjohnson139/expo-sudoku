# Cube Methods & Algorithms — next-step handoff

**If you are a session picking up Cube Methods & Algorithms work: this file is
your entry point. Read it first, then do the step described under "Next step"
below.**

It always describes **exactly one step — the next one**. It is rewritten at the
end of every step so the following session can start from a one-line prompt.

## The one-line prompt that starts a session

```
Work in mjohnson139/expo-sudoku. Continue the Cube Methods epic: check out
epic/cube-methods, read docs/cube-methods-handoff.md and do the next step it
describes.
```

Nothing else needs to be pasted.

## Before you finish: rewrite this file

**This is part of every step's definition of done.** Before you open your PR,
replace the "Next step" section with a brief for the step *after* yours, at the
same level of detail — scope, the files to read, the behaviours that are easy to
get wrong, what must be visible in Expo Go, and how to verify. Carry the open
questions forward, and add what your step discovered to "Easy to get wrong" in
the words you would have wanted to read.

---

## Standing context (true for every step)

- **Repo:** `mjohnson139/expo-sudoku`. App code is in **`SudokuApp/`**
  (Expo · React Native · JavaScript).
- **Source of truth:** `docs/cube-methods-plan.md`. Read it end to end before
  writing code — what the epic changes and why (§1), the decisions already taken
  (§2), the step table (§3), what is out of scope (§4), the things that are easy
  to get wrong (§5), open questions (§6).
- **Read `docs/cube-flow-plan.md` too.** It is the closed epic immediately
  underneath this one and the reasoning behind nearly every line this epic
  edits: §3.4 (method as data), §3.5 and §3.8 (the rail; boundaries at the
  scrubber), §5 (the traps). `docs/cube-plan.md` §7.1 (what survives a
  background), §8.5 (markers, not ranges) and §8.6 (the cube is sized first,
  every other row is on a budget) are still in force under both and are **not**
  overturned here.
- **The design:** `Cube Methods & Algorithms.dc.html` in the Claude Design
  project `2acc14f2-7f7e-434f-a29d-e0fe29fa876a`, settled 2026-08-16. That
  project's `design-decisions.md` has the settled summary in prose, under
  *Algorithms & methods*.
- **Tracker:** GitHub issue **#126**. Tick your step's checkboxes as you go.
- **Process:** `.github/dev-process.md` — one delivery step per branch, commit
  after each step, **open the PR as soon as the step is pushed**, and **prompt
  the operator to test after each step.** The PR is what triggers the automatic
  build: `.github/workflows/eas-publish.yml` publishes an EAS Update preview to
  `pr-<N>` and comments the QR code, and that build is what the operator tests.
  Holding the PR back leaves them nothing to open. Close the step out with the
  `closeout` skill.

### Branching

```
main ─── epic/cube-methods ─── feature/cube-methods-<step>
                               (PRs target epic/cube-methods)
```

Branch from **`epic/cube-methods`** and open your PR **against** it. The epic
merges to `main` once the feature is worth shipping, so `main` never carries a
half-built library.

`epic/cube-methods` is cut from `main` at **`22b117b`**, the commit that closed
Cube Flow. Pushing it publishes an EAS Update branch of the same name, so the
epic is always openable in Expo Go (project → Branches) even with no step PR
open.

**One thing about Cube Flow is worth knowing before you blame your own step:**
its `react-native-screens` dependency still needs one rebuild of the standalone
`preview` and `production` binaries, and until it gets one, an old binary keeps
serving the old bundle *silently* rather than failing. Expo Go and the EAS
Update channels — which is where every step of this epic is tested — are
unaffected. That rebuild is Cube Flow's debt, not this epic's.

**Release:** this epic is **3.3.0**. Add the build-notes entry with Step 1 and
extend it as steps land, keeping `app.json`'s `expo.version` matching.

### Golden rules

- **The cube's code lives under `games/cube/`.** Sudoku and Fungiku keep working
  exactly as they do, and the expectation for this epic is **no sanctioned edits
  outside it at all** — every screen it adds is a route on the cube's own nested
  stack (`CubeScreen.js`). A step that needs one must say why in its PR.
  `utils/buildNotes.js` does not count.
- **One edit funnel per collection.** `editOpen` is the only funnel for the open
  solve and `withMoves` the only sanctioned moves patch; this epic adds
  `editAlgorithm` and `editMethod` and no others. Two writers is how the file and
  the screen learn to disagree.
- **Say what a new row costs the cube, in points, in the PR.** V1 §8.6's rule,
  and it applies to any step that touches a screen with a cube on it.
- **Pure modules carry the logic.** The test runner is `testEnvironment: "node"`
  with no jsdom and no renderer, so nothing that could be *wrong* belongs inside
  a component. `solveList.js`, `phaseRail.js`, `solveCards.js` and
  `trackLayout.js` are the pattern: the derivation in its own file, with its own
  suite.
- **There is no lint and no typecheck.** `npm test` and the operator are the
  whole net.
- **The device is the only evidence that counts for feel.** Two animation bugs
  and one layout bug in this repo were invisible in a browser. **Write down when
  a finding came from a device.**

---

## What you inherit (read before your step)

Everything below is current on `epic/cube-methods` and none of it is this epic's
to change casually. Most of it is Cube Flow's; the last block is Step 1's.

- **The cube is a nested stack inside the app's stack.** `CubeScreen.js` is a
  58-line shell: `CubeProvider` over a `native-stack` with `scramble`
  (`CubeHome`) and `solve` (`CubeSolve`), `headerShown: false` because both
  screens draw their own `ScreenHeader`. **New screens are routes here.**
- **`CubeContext.js` owns everything persisted** — the scramble, favorites,
  solves, which solve is open, the view angle — with one debounced writer and an
  `AppState` flush. Both screens read one list; there is exactly one writer.
- **The cube opts out of the resume remount** via `keepsStateOnResume` in
  `games/registry.js`, and must stay opted out: a remount resets the cube's own
  navigator, which is how a solve screen came to slide in over itself on every
  resume (Cube Flow Step 3a, found on a device).
- **The save file** is one AsyncStorage key, `@CubeScramble`:
  `{ _v: 3, scramble, favorites, solves, algorithms, workspace }`. `readCubeSave`
  (`favorites.js`) reads **every version by shape** — a missing key and a corrupt
  one get the same answer — which is why adding a collection costs no migration
  in either direction. `_v` is a label; **nothing branches on it and nothing
  should have to.** Only authored text is stored; the cube itself is a pure
  function of the algorithm.
- **A solve** is `{ id, scramble, name, method, orientation, alg, phases,
  savedAt, editedAt }`. `phases` are **markers** — `{ at, label }` — and the
  spans and counts are derived every render by `phaseSpans`, never stored.
  `orientation` has three states (`null`, `''`, notation) and `null` is
  "inspecting".
- **A method is `{ id, name, stages }`** in `games/cube/methods.js`, frozen, with
  Roux and CFOP shipped and `null` meaning Freeform-or-legacy. That file already
  says how this epic must extend it: *"When user methods do arrive they arrive as
  a second source that `findMethod` consults, not as a mutation of this array."*
- **The rail** is `railStates(method, phases, alg, cursor)` in `phaseRail.js`,
  matching spans to stages **by label string**, and `placeMethodBoundary`
  (`solveList.js:470`) places or moves a boundary at the scrubber's cursor.
- **The scramble screen's header is full at four controls**, measured: at 320
  points it has 300, the home button takes 38, the right end 4 of padding, each
  control 34 + 5, and four leave 94 for the title. A fifth ellipsizes the title.
  The solve list's action row (`CubeSolveList.js`, `styles.actions`) is where
  things go that did not fit — that is where Compare lives.
- **The move pad is a manual drawer** (Cube Flow Step 9): the handle rides on the
  transport card, tap or pull to show and hide, and writing a move never changes
  the layout. Backspace stays on the transport card in both states.
- **Finger turns write moves** (Cube Flow Step 3.5) and are **orbit-only on
  web**, so the primary input path is not testable in a browser.

### And from Step 1 of this epic

- **The cube's stack has four routes.** `scramble`, `solve`, `algorithms`
  (`CubeAlgorithms`) and `algorithm` (`CubeAlgorithmEntry`), all on the one
  navigator in `CubeScreen.js`, with the route name constants beside the state in
  `CubeContext.js`. The library is pushed over the scramble and an entry over the
  library.
- **`games/cube/algorithms.js` is the library, pure**, modelled on
  `solveList.js`. An entry is `{ id, name, moves, case, assignments, notes,
  savedAt, editedAt }`; `moves` is the one required field and an entry whose moves
  do not parse is refused on the way in and dropped on the way back.
  `editAlgorithm` is **the one edit funnel** and every field rule lives inside it.
- **`CubeContext` holds the library** beside the solves, through the same single
  debounced writer, and exposes `algorithms`, `addAlgorithm`, `editAlgorithmById`,
  `deleteAlgorithm` and `algorithmById`. Both library screens read it; neither
  keeps a copy.
- **The library's door is an icon button at the right-hand end of
  `CubeSolveList`'s action row**, beside `New solve` and Compare. It costs the
  cube nothing — see the measurements below.

### And from Step 2

- **`games/cube/algCase.js` is the case, pure.** Nine characters of the U face,
  `y` where a sticker matches the U **centre**; `captureCase(cube)`,
  `sanitizeCase`, `toggleCaseCell`, `describeCase` and — the one that matters —
  **`caseOfAlgorithm(moves)`**, which is
  `captureCase(cubeFromAlg(invertAlg(moves)))` and is **memoized inside the
  module**, so it is callable from any render without a hook.
- **`invertAlg` and `tryInvertAlg` are in `moves.js`**, working on **tokens**:
  `invertAlg("r U r'")` is `"r U' r'"`, never `"Rw U' Rw'"`.
- **A case is derived on read, never stored by arithmetic.** `algorithmCase`
  (`algorithms.js`) is stored-wins-else-derived, which is what gave every Step 1
  entry a case with no migration and nothing re-saved. **Nothing writes `case`
  except a hand correction**, and there is no screen for that yet.
- **`CubeCaseTile`** takes `pattern`, `size` and an optional `label`; without a
  `label` it is hidden from the screen reader, because the row around it says the
  case instead. 40 on a library card, 76 on the entry screen.
- **The tile is not themed** and has a fixed hairline rim, `#3a3a3a`. Both are
  deliberate — see "What Step 2 discovered".

---

## Next step — Step 2.5: the algorithm workbench

Plan **§3.2.5**. **The biggest step of the epic so far, and the one the operator
is waiting for** — it is the step Step 1's device pass created, and it is what
turns `＋` from "type notation into a modal" into "write an algorithm on a cube".

A screen that is the solve screen's apparatus over a **solved** cube: you turn
the cube with a finger or the pad, the moves accumulate, the case tile fills in
as you write, and you save the result as a library entry.

### Name the extraction decision explicitly, in the PR

**This is what the step turns on, and it is the first thing to decide, not the
last.** `CubeSolve.js` is 876 lines and most of them are solve-specific — phases,
the rail, the hold, Compare, persistence through `editOpen`. The stack the
workbench wants (cube · move track · transport card with scrubber and Backspace ·
move-pad drawer) is assembled *inside* it. Two paths, and §3.2.5 says pick one
deliberately and say which:

1. **Extract the shared apparatus** into a component both screens render, with
   the solve-specific parts passed in. The right end state.
2. **Extract only what is cheap** — the pad drawer, the transport card,
   `useCubeStage` — and let the workbench compose the rest itself.

**Do not build it by copying `CubeSolve`.** And if the extraction turns out to be
more than mechanical, **split the step**: ship the behaviour-neutral extraction
alone, with `CubeSolve` proving it unchanged, then build the workbench on it.
That is Cube Flow Step 1's lesson — a dependency change and a design change in
one PR have two suspects — and `CubeSolve` is the screen this app is about. A
regression there is not worth a saved session.

### Scope

- **`CubeWorkbench` is a fifth route** on the cube's own stack in
  `CubeScreen.js`, with its route-name constant beside the others in
  `CubeContext.js`. It takes an optional algorithm id: no id is a new entry, an
  id opens that entry's moves for editing. Pushed from the library's `＋` and
  from an entry's **Edit on the cube**.
- **Top to bottom it is `CubeSolve`'s stack minus the solve.** Finger turns write
  moves exactly as they do there — same `useCubeTouch`, same `CubeMovePad`, same
  `applyPadPress`, same folds and cancels **after the turn settles** (plan §5).
- **The cube starts solved and there is no hold.** No scramble, no
  `orientation`, no inspection, no phases, no rail, no Compare. **The list of
  absences is the specification** — it is what makes this screen smaller than the
  one it borrows from.
- **The case is shown live**, as a tile beside the track, recomputed on every
  move. This is the payoff: for a last-layer algorithm the tile fills in the case
  as you write, so you see the thing you are writing an algorithm *for* without
  ever having said what it was. Step 2 built everything this needs — see below.
- **Save** opens a sheet: a name, the stage-assignment chips the entry screen
  already has, and Save → `createAlgorithm` (or `editAlgorithm` for an existing
  id) and back. **The same sheet Step 3 uses** (§3.3).
- **`＋` in the library stops opening the keyboard.** Typing becomes **Paste an
  algorithm**, a secondary action on the entry screen — the right weight for it.
- **Preview, if it fits.** Set the cube to `A⁻¹(solved)` — the derived case — and
  play `A` through the existing transport, ending solved. The starting state is
  real, it is computed, and there is no UI for entering one. **Build the forward
  path first and Preview second**, in the same step if it fits and as a follow-on
  if it does not.
- **Rewrite the 3.3.0 build note that says "tap the ＋, type the moves".** It is
  true today and will not be true after this step. `utils/buildNotes.js`; keep
  `app.json`'s `expo.version` at 3.3.0.

### What Step 2 left you, and where it is callable from

- **`caseOfAlgorithm(moves)` in `games/cube/algCase.js` takes text and answers
  nine characters, and it is memoized inside the module.** So the workbench can
  call it straight from its render on every move — there is nothing to thread
  through the context and no hook to build. It answers `null` for text that does
  not parse, which is the state a half-written algorithm is never in (the
  workbench builds its text from moves it applied) but a **Paste** field is.
- **`CubeCaseTile` takes `pattern`, `size` and an optional `label`.** Omit
  `label` and it is hidden from the screen reader — right when the row around it
  already says the case; pass `describeCase(pattern)` where it stands alone,
  which is what the workbench wants. The outer box is exactly `size`. 40 and 76
  are the two sizes in use; both divide evenly into three cells.
- **`algorithmCase(entry)` in `algorithms.js`** is the *entry*-shaped read —
  stored case wins, else derived. The workbench has no entry until Save, so it
  wants `caseOfAlgorithm` on its own accumulated text, not this.
- **`invertAlg` and `tryInvertAlg` are in `moves.js`**, and Preview is
  `cubeFromAlg(invertAlg(text))` as its starting cube. That is the whole of what
  Preview needs from Step 2.

### Files to read first

- `CubeSolve.js` **end to end** — the extraction decision cannot be made from a
  skim, and knowing which of its 876 lines are solve-specific *is* the decision.
- `useCubeStage.js`, `CubeMovePad.js`, `CubeMoveTrack.js`, `CubeScrubber.js`,
  `useCubeTouch.js`, `touchTurn.js` — the apparatus itself.
- `solve.js` and `solveList.js` — how a solve's moves are accumulated and
  patched, which is the shape the workbench's own move list will echo without
  being.
- `algCase.js` and `CubeCaseTile.js` (Step 2's, both small), and
  `CubeAlgorithmEntry.js` for the Save sheet's chips.
- Plan §3.2.5 and §3.3, and §5 end to end.

### Easy to get wrong

1. **The extraction is the risk, not the workbench.** Anything that changes what
   `CubeSolve` renders belongs in its own PR with "no visible change" in the
   title. See above; it is worth the extra round trip.
2. **Finger turns are orbit-only under `react-native-web`** (§5). A browser pass
   covers the layout and the case arithmetic and **none of the input**. Say so in
   the PR — this step genuinely cannot be verified anywhere but a device.
3. **Folds and cancels happen after the turn settles**, not during. Two of this
   repo's three device-only bugs were here.
4. **`createAlgorithm` refuses at the cap rather than evicting.** The workbench's
   Save can therefore fail with a screenful of work on it — decide what that
   looks like before it happens, because the library's `＋` dims and this screen
   has no equivalent moment.
5. **The workbench must not become a second edit funnel.** `editAlgorithm` and
   `createAlgorithm` stay the only ways in (plan §5).
6. **Say what the workbench's rows cost the cube, in points** (V1 §8.6). This is
   a screen with a cube on it, so unlike Step 2 the answer is not zero, and the
   case tile beside the track is a row that `CubeSolve` does not pay for.

### What must be visible in Expo Go

Open `＋` from the library onto a solved cube. Write `R U R' U R U2 R'` with a
finger, and again with the pad. Watch the case tile fill in — and by the last
move it is the Sune tile, `.y.yyyyy.`, the same one the library card shows.
Backspace a move. Hide and show the pad. Save it with a name and a stage, find it
in the library with the right case. Open it again and edit the moves. Background
and resume mid-write.

### How to verify

- `npm test` from `SudokuApp/`. What is new and pure here is small — whether the
  workbench's alg is saveable, the default name, the edit-versus-create decision
  — and belongs beside `algorithms.js`. **The input path is already pinned** by
  `touchTurn.test.js` and `solve.test.js` and must not be re-pinned. If you take
  the extraction path, `CubeSolve`'s existing suites passing unchanged is the
  evidence that matters.
- Browser screenshots at 320 × 568, 375 × 667 and 393 × 852, on a dark theme as
  well as `classic` — see the note on themes below.
- **A device pass is the whole verification of this step**, not a confirmation of
  it.

### Then rewrite this file

Brief **Step 3 — tag a run from a solve** (plan §3.3) at this level of detail.
It and the workbench are now the same feature reached from opposite ends, and
Step 3 is the smaller half; say what the workbench's Save sheet left it.

## What Step 2 discovered

### The design's Sune tile is wrong, and the arithmetic is right

**The single most useful thing this step found.** Plan §3.2 and the previous
handoff both quoted `.y..yy.y.` as "the design's Sune pattern" and made it the
test that proves the arithmetic agrees with what a cuber would draw. It does not
agree, because the literal is not Sune:

- `.y..yy.y.` has **three of the four edges oriented and no corners at all**.
  Last-layer edge orientation is always even — flipping one edge flips
  another — so **no cube with its first two layers solved can show it.** (It is a
  reachable *capture*: a scrambled cube whose top layer holds pieces from
  elsewhere can produce it. It is not a reachable OLL.)
- Sune's real case is the one every OLL sheet draws: cross done, all four edges
  up, exactly one corner up — six oriented stickers — and that is **`.y.yyyyy.`**,
  with the corner at the front left.

The plan's line is corrected in place and `algCase.test.js` pins `.y.yyyyy.`
with the reasoning in the test body. **Where a drawing and the arithmetic
disagree about a real algorithm, the arithmetic is the one holding a cube** —
but check *which* real algorithm before assuming that, because the design's
pattern was a valid cube state, just not this one's.

Anti-Sune came out as `.yyyyy.y.`, the dot OLL as `....y....`, and a T-perm and a
J-perm as nine `y` each. All four are what an OLL sheet draws.

### Everything else

- **The memo is not an optimisation, it is what makes deriving-on-read
  affordable.** A capture is ~0.07 ms in node — call it half a millisecond in
  Hermes — and a full library re-renders on every keystroke in the search field.
  A hundred entries is 50 ms a render without it. `caseOfAlgorithm` therefore
  memoizes inside `algCase.js` rather than leaving each screen to arrange a
  `useMemo`, which is also why the workbench can call it straight from a render.
- **The tile dissolved into the card on the dark theme**, found in a browser at
  393 × 852: the card is near-black and so is the tile's body, so what was left
  read as stickers floating on the card rather than as a cube face. Fixed with a
  fixed `#3a3a3a` hairline rim — **fixed rather than the theme's border colour**,
  because a pale rim would halo the black square on the light themes, which is
  the same bug pointing the other way.
- **The tile is not themed at all**, for the reason `cubeState.js` gives about
  `STICKER_COLORS`: it is a picture of an object the player owns, not a themed
  surface. The yellow is `STICKER_COLORS.D`'s value even though the case is the
  *U* face — every OLL sheet ever printed draws the last layer yellow-up.
- **`sanitizeCase` answers `null` for corruption, not `EMPTY_CASE`**, and the
  plan's line saying otherwise is corrected. `null` means *derive it from the
  moves*; `EMPTY_CASE` is a real answer meaning *nothing is oriented*, which a
  hand correction can give. Sanitizing corruption to `EMPTY_CASE` would pin a
  blank tile onto an entry whose moves knew the answer.
- **`toggleCaseCell` refuses the centre.** It is the sticker the other eight are
  measured against, so a grid that let you turn it off would let you draw a case
  no capture could produce. The correction editor itself was **not** built —
  §3.2 says build it when the tile is wrong for something real, and nothing was.
- **`describeCase` says the shorter half.** Five oriented cells is a sentence;
  "every sticker oriented except the back-left corner" is the same fact in half
  of it. The centre is never mentioned — it is always `y` and never news.
- **The step added no row to any screen with a cube on it, so it cost the cube
  zero points** (V1 §8.6). The library card's 40-point square was reserved by
  Step 1 for exactly this, and filling it moved nothing.
- **Browser evidence covers most of this step honestly** — it is arithmetic plus
  static rendering. What it does not cover is legibility at arm's length, which
  is the device pass.
- **The app's theme is not the OS colour scheme.** `useAppTheme` reads
  `@AppTheme` from storage (`classic`, `dark`, `twilight`, …). Driving a browser
  with Playwright's `colorScheme` does nothing; seed `localStorage` instead. Same
  for the cube's own save under `@CubeScramble` — seeding it is how you get a
  library onto a fresh browser without typing six algorithms in by hand.

## What Step 1 discovered (still true, keep reading this)

### The device pass, and the finding it produced

**Tested on the `pr-130` build, 2026-08-24. The operator did not like it**, and
the reason was one line of the flow: **`＋` opens a modal asking you to type
notation.** In an app where Cube Flow spent an unplanned step making a finger on
a sticker write a move — and then rearranged the whole solve screen around the
consequence — a library whose only way in is the phone keyboard reads as a
different product.

**Step 1 merged anyway, deliberately, with the finding outstanding.** That is
not this repo's habit and it is worth knowing why it was right here: the finding
is not a defect in what Step 1 built. The module, the storage slot, the list, the
search and the filters are all correct and all needed, and typed entry stays as a
real secondary path. What is wrong is *which of two doors is the default*, and
`＋` cannot stop opening the keyboard until there is somewhere better for it to
go. So the finding was spent on a new step rather than a patch: **plan §3.2.5,
the algorithm workbench**, which is Step 2.5 and comes straight after the step
this handoff briefs.

Two consequences for whoever is reading this:

- **The 3.3.0 build note that says "tap the ＋, type the moves" is true today and
  will not be true after Step 2.5.** Rewrite it there rather than leaving the
  release describing a door that has moved.
- **Nothing else about Step 1 was tested on a device**, because the operator
  stopped at the front door. The typing round-trip, the filter chips and the
  action row have browser evidence only — see the last three bullets below, and
  re-exercise them at the next device pass.

### Everything else, written down because the next few steps will trip on it

- **The entry screen has one mode, and the moves-first flow is what buys it.**
  `＋` pushes `ENTRY_ROUTE` with `{ id: null }`; the screen sees no id, opens
  `CubeAlgInputModal` immediately, and creates the entry from the answer, writing
  the new id back with `navigation.setParams`. Cancel on that first modal pops
  the route. The alternative — a draft held in local state until a Save button —
  is two screens wearing one name: one that edits a record and one that composes
  something that does not exist yet.
- **`editAlgorithm` returns the list *itself* when nothing actually changed**,
  and that is load-bearing rather than an optimisation. The entry screen writes
  on every keystroke, so a no-op that still stamped `editedAt` would turn "when
  did I last change this" into "when did I last look at it".
- **The name field needs a local mirror; nothing else does.** It is the one field
  the funnel can answer differently — type a name another entry has and what is
  kept is `Sune 2`. The mirror is what is being typed, and the blur reseeds it
  from what was kept, so the operator *sees* the answer rather than finding it on
  a card later.
- **`CubeAlgInputModal` is parameterised, not duplicated.** `title`,
  `placeholder`, `initialText`, `submitLabel`, `submitIcon` and `submitHint`, with
  every default exactly what the solve screen already had — so its call site is
  unchanged. `initialText` is deliberately out of the reset effect's deps: it is
  the value as the modal *opened*, and an entry re-rendering underneath must not
  rewrite the field under the thumb.
- **A filter chip can stop existing under the screen.** Unassign the last Roux
  algorithm while the Roux chip is selected and the chip is gone, leaving the
  library looking empty with no control to get out of it. `liveFilter(chips, id)`
  is the one line that fixes it, and Step 6 — which adds user-method chips — has
  more ways to reach it, not fewer.
- **`UNASSIGNED` is the string `'unassigned'`.** Step 5 mints ids for user
  methods and **must not mint that one**; it is the only place the two
  vocabularies can collide.
- **Version skew was kept lossless one field at a time.** `sanitizeAlgorithms`
  preserves a nine-character `case` by shape even though this build cannot draw
  one, so a Step 2 file read by a Step 1 build and written back keeps its cases.
  That is what `readCubeSave`'s "both directions work" claim costs in practice.
- **`createAlgorithm` refuses at the cap rather than evicting**, unlike
  `createSolve`, which prepends and slices. A solve list is a rolling record; a
  library is months of the operator's work, and dropping its oldest entry to make
  room is the worst thing that file could do. The library's `＋` dims and says so.
- **The action row's arithmetic, measured in a browser** at 320 × 568 with all
  three controls up: the row is 300 wide, the library button is **34**, Compare
  is **105**, and `New solve` gets the remaining **149** against the 87 its icon
  and label need. 222 at 393. **The cube pays nothing** — no new row. The library
  button is the **right-hand** control on purpose: Compare comes and goes with the
  number of attempts, so a button between the two would jump 111 points sideways
  the first time a second solve was written.
- **The chip row is a horizontal scroll and at 320 the fourth chip clips.** The
  clipped word is the affordance, the same argument `CARD_PEEK` makes in
  `solveCards.js` — but it is luck rather than arithmetic, and Step 6 adds chips.
  Worth making deliberate when something is being done to that row anyway.
- **Typing round-trips through the context writer and nothing was dropped** at
  12 ms per character in a browser, in both the name and the notes fields. That
  is *not* a device result, and a phone's keyboard is the place it would show.

## Open questions being carried forward

From `docs/cube-methods-plan.md` §6 — none of them block Step 2.5. **Question 8
now has its first evidence under it, and question 7 is answered in practice**:

1. **Is the library's door in the right place?** The scramble header is full at
   four controls, so it is in the action row. Dropping a header control instead
   was rejected without asking.
2. **Does a tagged run replace its moves in the track, or only get marked?**
   Step 3 says marked; the stored `alg` is untouched.
3. **Three demonstrations — is three right?** The design's default; one
   constant in `journey.js`; only a drilling session can say.
4. **Should deleting a solve roll the journey back?** It does, by construction.
5. **Does the journey want a door on the solve screen too?** Not drawn, not
   built.
6. **Should a preset be hideable?** `forNewSolves` covers user methods; presets
   deliberately have no equivalent.
7. **Does the workbench ever need an authored starting state?** §4 says no for
   this epic, and the inverse derivation is why. **Step 2 built the derivation
   and nothing has needed a setup yet**, across Sune, anti-Sune, the dot OLL, an
   H-OLL, a T-perm, a J-perm and a Roux LSE alg — every one of them round-trips
   (`algCase.test.js` runs `A⁻¹ A` and lands on a solved top). The mechanism if
   it is ever wanted is a `setup` string on the entry, defaulting to empty. **Do
   not build it before a real algorithm fails without it** — and when one does,
   write down which algorithm it was.
8. **Is nine characters of the U face enough of a case?** **No, and it is now
   visible rather than predicted**: a library holding a T-perm and a J-perm shows
   two identical all-yellow tiles side by side, which is in Step 2's browser
   screenshots. It is still what the design draws and what this epic ships, and
   the tests pin it so nobody "fixes" it by accident. The evidence for going
   further is now in hand; **what is missing is a decision about what a richer
   case would be** — a second row for the side stickers is the obvious answer and
   is a design question, not an arithmetic one. Worth putting to the operator
   before the drilling steps (7 and 8) lean on the tile to tell cases apart.
9. **Should `＋` still offer typing at all?** After Step 2.5 it becomes **Paste
   an algorithm** on the entry screen. If a fortnight goes by without it being
   reached for, it can go — the library will have been seeded by then.
10. **Should the case tile be tappable to correct it?** New in Step 2.
   `toggleCaseCell` exists and is tested; no screen calls it, because derivation
   removed the editor's main use and §3.2 says build it when the tile turns out
   to be wrong for something real. **Nothing has been wrong yet.** If the answer
   to question 8 is "a richer case", this question probably dissolves into it.

Carried from `docs/cube-flow-plan.md` §6 and still open there: whether the
phase-split tick track comes back now the rail exists (q5), and where the app's
preferences live (q13). **This epic must not answer q13 by accident** —
`DEMOS_REQUIRED` is a constant, not a setting.
