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

---

## Next step — Step 2: the case grid

Plan **§3.2**. Give an algorithm the thing that makes it findable by *sight*: the
nine stickers of the U face it recognises. One pure module, one 40-point tile,
and the tap-to-toggle editor on the entry screen. Step 1 left the slot for it in
the file and a dashed placeholder for it on the card, so nothing about the
library's layout moves when this lands.

### Scope

- **`games/cube/algCase.js`**, new and pure, in `algorithms.js`' style.
  - `EMPTY_CASE` — nine dots.
  - `captureCase(cube)` reads `facelets(cube).U` (`cubeState.js:160`) and returns
    nine characters, `y` where the sticker matches the U **centre** and `.` where
    it does not. **The centre, never a fixed colour** — that is what makes the
    capture honest for a cube being held any way up, and it is the whole reason
    this is a function rather than a string comparison. Note that `facelets`
    hands back an **array of nine letters**, not a string; the ninth-and-centre
    is index 4.
  - `toggleCaseCell(pattern, index)` — its own inverse.
  - `sanitizeCase(raw)` — `EMPTY_CASE` for anything that is not nine `y`/`.`
    characters.
  - `describeCase(pattern)` — the pattern **in words**, for the label (see
    "Never colour alone" below).
- **`algorithms.js` has the seam already.** `sanitizeCaseShape` is a private
  nine-character regex with a comment saying it is Step 2's to replace; swap it
  for `sanitizeCase` and delete it. `editAlgorithm` already routes a `case` in a
  patch through it, and `createAlgorithm` already writes `null` — decide there
  whether a new entry's empty case is `null` or `EMPTY_CASE`, and say which in
  the PR, because `algorithms.test.js` pins the current answer.
- **The tile** is the design's: 40 × 40, a 3 × 3 grid of 2-point-gapped cells on
  a near-black rounded square, yellow for `y` and grey for `.`. It replaces
  `CubeAlgorithms.js`' dashed `CASE_TILE` placeholder — **which is already 40
  points wide**, so the card's layout does not move.
- **The editor** is the same tile, larger, on `CubeAlgorithmEntry`, with each
  cell a tap target. Every tap goes through `editAlgorithmById` — Step 1's one
  funnel — with `toggleCaseCell` computing the next pattern.
- **Where a case comes from this step is a finger.** Capturing one *from a cube*
  is what `captureCase` is for and **Step 3** is what calls it (tagging a run).
  Writing and testing it here is the plan's own split; do not go looking for a
  caller.

### Files to read first

- `games/cube/cubeState.js:150-199` — `facelets`, its face order and its reading
  order, which is what decides which of the nine is the middle one.
- `games/cube/algorithms.js` — `sanitizeCaseShape` and the comment above it; the
  entry shape; `editAlgorithm`'s field-by-field sanitizing.
- `games/cube/CubeAlgorithms.js` — `CASE_TILE` and `styles.caseTile`, the
  placeholder this replaces.
- `games/cube/CubeAlgorithmEntry.js` — where the editor goes, and how every other
  field on that screen writes.
- `games/cube/CubeGlyph.js` — the precedent for drawing rather than borrowing,
  and `react-native-svg` is already a dependency if the tile wants to be one.
- `games/cube/padPalette.js` — the colours the cube already uses, so the tile's
  yellow is *the* yellow.

### Easy to get wrong

1. **Never colour alone.** A case is a pattern, and a pattern of two greys would
   still be a pattern — but a 40-point tile is unreadable to a screen reader by
   construction. `describeCase` has to say **which cells are oriented**;
   `"top row: corner, edge, corner"` is not enough.
2. **The centre, not a colour.** A cube rotated whole must capture the same
   pattern as the cube at rest. That is a test (`algCase.test.js`), and it is the
   one that catches a `=== 'U'` written in a hurry.
3. **A style *variant* must be a whole style.** Twenty-seven cells with a colour
   swapped in is where `[base, variant]` is most tempting, and V1 shipped a
   phone-only bug on exactly that (`ScreenHeader.js:112-126`). Colour alone is
   safe to layer; anything with layout in it is not.
4. **The card's height must not change.** `CubeAlgorithms`' card is built around
   a 40-point tile today. A tile that came out 44 would move every card in the
   list and would not fail a test.
5. Everything Step 1 learned, below, still applies.

### What must be visible in Expo Go

Open an entry from the library and tap stickers: the tile fills and empties, and
the card behind it shows the same pattern when you back out. Background and
resume, then kill and cold start — the pattern is still there. An entry with no
case shows an empty tile rather than a gap. Read the tile at arm's length on both
themes. Turn VoiceOver or TalkBack on and check the tile says something true.

### How to verify

- `npm test` from `SudokuApp/`, with `algCase.test.js` green — a solved cube
  captures nine `y`; a Sune-case cube captures the design's `.y..yy.y.`; a cube
  rotated whole captures the same pattern as the cube at rest; toggling is its
  own inverse; a corrupt pattern sanitizes to `EMPTY_CASE` — and the count in the
  PR.
- Browser screenshots at 320 × 568, 375 × 667 and 393 × 852: the library list
  with cases on the cards, and the entry screen's editor. Check for horizontal
  overflow at 320.
- **A device pass** for the two things a browser cannot answer: whether a
  40-point tile is legible at arm's length, and whether a 12-point cell is a
  target a thumb can hit. Say in the PR which behaviours the browser covered.

### Then rewrite this file

Brief **Step 3 — tag a run from a solve** (plan §3.3) at this level of detail —
it is the step with the most ways to be wrong on a phone, and the one plan §5
says this epic is most tempted to put on an invisible gesture. Add whatever Step
2 discovered to "Easy to get wrong".

## What Step 1 discovered (keep reading this)

Written down because they are the things the next few steps will trip on.

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

From `docs/cube-methods-plan.md` §6 — none of them block Step 1:

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

Carried from `docs/cube-flow-plan.md` §6 and still open there: whether the
phase-split tick track comes back now the rail exists (q5), and where the app's
preferences live (q13). **This epic must not answer q13 by accident** —
`DEMOS_REQUIRED` is a constant, not a setting.
