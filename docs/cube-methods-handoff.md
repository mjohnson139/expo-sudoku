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
- **The code session owns the PR.** GitHub CLI is authenticated in these
  sessions. Push the feature branch, run `gh pr view` to avoid duplicating an
  existing PR, and, when none exists, create it with `gh pr create --base
  epic/cube-methods`. Report the PR number and URL, then ask for the device pass.
  Never hand PR creation to the operator; it is part of the delivery step.

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
  algorithmRuns, savedAt, editedAt }`. `phases` are **markers** — `{ at, label }` — and the
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

## Next step — Step 6: stage → algorithms

Plan **§3.6**. Make every method stage lead to the algorithms assigned to it, and make the same assignment editable from both the method and library ends.

### Scope

- A stage row opens a filtered algorithm list for that exact `{ method, stage }`. It shows the number linked, or the settled empty copy **no algorithms · intuitive**.
- From the stage list, assign or unassign existing library entries and create a new algorithm already assigned to the stage. Both directions must call the existing `editAlgorithm` funnel; do not introduce a second assignments writer.
- Keep assignment editing on the algorithm-entry screen, now covering user methods as well as presets. User-method filter chips must appear and disappear safely through the existing `algorithmFilters` / `liveFilter` derivation.
- A renamed stage already propagates its assignments atomically in Step 5; do not duplicate or work around that rule in either screen.
- Do not start Step 7's cube-state predicates or Step 8's journey.

### Files to read

Read `userMethods.js`, `algorithms.js`, `CubeMethods.js`, `CubeAlgorithms.js`, `CubeAlgorithmEntry.js`, `CubeAlgorithmSaveSheet.js`, and the catalogue/state wiring in `CubeContext.js`. Re-read plan §3.6 and §5's edit-funnel and label identity traps.

### What must be visible in Expo Go

Every preset and user-method stage says how many algorithms it has and opens its own list. An empty stage explains that it is intuitive; an assigned stage can add, remove, open, and create entries without losing its filter. The builder still adds no row to a cube screen and costs the cube zero points.

### How to verify

- Run `npm test` from `SudokuApp/`; cover filtering by exact stage, toggling from both ends, pre-assigned creation, empty-stage copy, user-method chips, and the disappearing-active-chip fallback.
- Browser-check at 320×568 and 393×852 in classic and dark, especially long method/stage names and a chip row wider than the phone.
- Device-smoke both assignment directions, create-from-stage, back navigation, persistence, background/resume, and stage rename followed by reopening the stage list.

### Then rewrite this file

Brief **Step 7 — exit-state checks** (plan §3.7), including preset-only predicates, replay at marker indices, and the unverified treatment for user stages.

## What Step 5 discovered

- **The first device pass found the library blanking on open when an entry had
  multiple assignments.** `entry.assignments.map(describeAssignment)` was
  accidentally passing the array index as `describeAssignment`'s catalogue
  argument; index 1 then reached `findMethod` as a number and threw during the
  native render. The library now closes over the real catalogue explicitly,
  and the assignment edit comparison does the same for user methods.
- User methods are sanitized before solves and algorithm assignments, then appended after frozen presets. Picker visibility is a projection only: toggling a user method off never removes it from the catalogue that validates existing work.
- Stage identity remains its label. Renaming therefore updates the user method, matching solve markers and matching algorithm assignments as one context action; accepting duplicate stage labels would make one rail position unreachable.
- Explicit up/down controls make ordering usable on native and web without introducing a gesture dependency. The builder is a route from the library, adds no row to a screen containing the cube, and costs the cube zero points.
- Device feel, persistence and resume still require the PR preview pass.

## What Step 4 discovered

### The device pass

**Tested on the final `pr-139` Expo Go build, 2026-08-26, and passed cleanly.**
The operator accepted the catalogue refactor and Beginner LBL preset with no
follow-up findings. The required Cube Flow regression therefore remains
unchanged on a real device: preset solve creation and reopening, rails,
boundaries, comparisons, algorithm assignments, saved solves and resume all
retain their existing behaviour.

- The catalogue remains an ordinary parameter. `CubeContext` currently supplies the frozen presets as the whole catalogue; Step 5 adds sanitized user methods without changing helper signatures or mutable module state.
- Beginner LBL is a preset with `Cross`, `F2L basic`, `OLL 2-look` and `PLL 2-look`. It is the only visible delta and costs the cube zero points.
- Whole-save reads pass the same catalogue to solves and algorithm assignments, pinning the ordering seam Step 5 will use after sanitizing `methods` first.

## What Step 3 discovered

### The device pass

**Tested on the final `pr-138` Expo Go build, 2026-08-25, and passed cleanly.**
The operator accepted the reciprocal solve workflow and the follow-up boundary
shape on a device. This retires the device-only questions around reaching
Algorithms with the pad open or closed, applying through the native sheet and
existing playback handoff, selecting and saving a performed run, and reading a
named run after the move track wraps.

- The solve-side Algorithms control shares the transport card's existing
  44-point handle row and the picker is modal, so it costs the cube **zero
  points** with the pad shown or hidden.
- A tapped selection is token-bounded and painted in the move track. A second
  tap derives the selected moves, real setup and containing assignment in the
  pure `tagRun.js`; a cross-boundary choice is refused without editing the
  solve.
- Applying seeks to the live end, then writes only `entry.moves` through
  `editOpen` and `withMoves`. The growing-algorithm handoff in the existing
  player visibly animates the appended tokens rather than introducing a second
  transport.
- Applied and saved runs now persist a named, end-exclusive `algorithmRuns`
  annotation beside the solve's unchanged notation. The track draws the name as
  a boundary; tapping it folds the underlying moves to a chip and tapping again
  restores them. Applied runs begin expanded so playback remains visible.
- Empty and full libraries are deliberately asymmetric: empty offers the
  workbench, full disables only Save a run, and every existing entry remains
  applicable.
- Device feedback clarified the expanded tag treatment: the name is the start
  of one boundary, not a standalone badge. The same accent outline continues
  across every move in the run and survives a wrapped track.

## What Step 2.5 discovered

### The device pass

**Tested on the final `pr-133` Expo Go build, 2026-08-25, and passed.** The
operator exercised the complete workbench after the authored-start, explicit
inverse, large-cube synchronization, keyboard avoidance and restored shared 3D
preview follow-ups. Finger and pad input, post-settle folds/cancels, start
selection, live preview, save/edit, and the native pushed flow are accepted.
Those are precisely the paths the browser could not settle.

The pass closes five device findings rather than erasing them: authored `setup`
was added because inverse-only could not define where an algorithm begins; the
large cube was separated from continuous inverse derivation; the save modal now
avoids the iOS keyboard; the 3D preview is shared across all three surfaces; and
the preview is a visible control that seeks the large cube back to its start.

- **Extraction decision: the cheap path.** The workbench composes the already
  independent cube renderer, touch hook, player, track, scrubber, move pad and
  measured-stage hook. It deliberately does not extract `CubeSolve`'s assembled
  screen: phases, hold, rail, Compare and `editOpen` make that extraction more
  than mechanical, so combining it with a new screen would give a solve
  regression and workbench behaviour one suspect.
- The live 3D case preview and track share one 60-point row. That row costs the cube 60
  points at constrained heights; the remaining workbench rows replace solve
  apparatus rather than adding to it.
- `CubeAlgorithmSaveSheet` is the shared Step 3 seam. It collects only a name
  and stage assignments; callers still go through `createAlgorithm` or
  `editAlgorithm`, never write the collection themselves.
- **Device feedback changed the starting-state decision.** An inverse is a
  useful fallback, but it is not a substitute for letting the operator define
  where an algorithm begins. The workbench now authors and persists `setup`
  moves before the algorithm; older entries derive the same start they did
  before.
- **The inverse path is explicit and pinned algebraically.** **Derive later**
  lets a new entry be written before it has moves to invert; **Use inverse** is
  the same choice once moves exist. `inverseSetup(A)` is tested by applying
  `A⁻¹ A` and requiring a solved cube. Confirming either an authored or derived
  start seeks the transport to 0, because showing the solved end immediately
  made a correct inverse look as though it had done nothing.
- Preview was deferred. The complete forward authoring path, edit path, live
  case and safe full-library refusal shipped first, as the handoff required.
- Browser input remains orbit-only. Passing layout in a browser does not verify
  the workbench's primary finger-turn path, folding/cancelling after settle, or
  native stack behaviour; those require the PR preview on a device.

## What Step 2 discovered

### The device pass

**Tested on the `pr-132` build, 2026-08-24, and it passed clean.** The one thing
the browser could not settle was the tile's legibility at arm's length, and it
reads on both themes at 40 points — which retires the question the PR flagged
rather than leaving it open. Every entry written in Step 1 showed its case
without having been re-saved, which is the derive-on-read path working against a
real save file rather than a seeded one.

**Step 1's own outstanding items are still outstanding.** Its typing round-trip,
filter chips and action row have browser evidence only, and this pass did not
change that — see "What Step 1 discovered". Re-exercise them at Step 2.5's pass,
which touches the same screens.

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

From `docs/cube-methods-plan.md` §6. The new question 3 is answered by this rewrite: applying a saved algorithm belongs in Step 3 alongside tagging a run.

1. **Is the library's door in the right place?** The scramble header is full at
   four controls, so it is in the action row. Dropping a header control instead
   was rejected without asking.
2. **Does a tagged run replace its moves in the track, or only get marked?**
   Step 3 says marked; the stored `alg` is untouched.
3. **Answered: can a saved algorithm be applied to a solve?** Yes. Step 3 now
   appends `entry.moves` at the live end through `editOpen` + `withMoves` and
   visibly plays them. It never prepends `setup` or inserts into reviewed history.
4. **Three demonstrations — is three right?** The design's default; one
   constant in `journey.js`; only a drilling session can say.
5. **Should deleting a solve roll the journey back?** It does, by construction.
6. **Does the journey want a door on the solve screen too?** Not drawn, not
   built.
7. **Should a preset be hideable?** `forNewSolves` covers user methods; presets
   deliberately have no equivalent.
8. **Answered: does the workbench need an authored starting state?** Yes. It
   authors `setup` moves from solved; older/pasted entries fall back to
   `A⁻¹(solved)` without migration.
9. **Is nine characters of the U face enough of a case?** No: the shared
   three-face `CubeCasePreview` now preserves the side stickers that distinguish
   PLLs. The nine-cell pattern remains only as compact description/correction data.
10. **Should `＋` still offer typing at all?** It is **Paste an algorithm** on
   the entry screen. If it is never reached for after the library is seeded, it
   can go.
11. **Should the case preview be tappable to correct it?** `toggleCaseCell`
   exists and is tested, but the preview currently uses its tap to seek the large
   cube to the starting position. Build correction only for a real wrong case.

Carried from `docs/cube-flow-plan.md` §6 and still open there: whether the
phase-split tick track comes back now the rail exists (q5), and where the app's
preferences live (q13). **This epic must not answer q13 by accident** —
`DEMOS_REQUIRED` is a constant, not a setting.
