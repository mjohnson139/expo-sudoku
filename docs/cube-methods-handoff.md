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

## What you inherit from Cube Flow (read before Step 1)

Everything below is current on `epic/cube-methods` and none of it is this epic's
to change casually.

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
  `{ _v: 2, scramble, favorites, solves, workspace }`. `readCubeSave`
  (`favorites.js:128`) reads **every version by shape** — a missing key and a
  corrupt one get the same answer — which is why adding a collection costs no
  migration in either direction. Only authored text is stored; the cube itself is
  a pure function of the algorithm.
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

---

## Next step — Step 1: the library, stored and shown

Plan **§3.1**. Build the algorithm library end to end, with nothing clever in
it: a pure module, a slot in the save file, a list screen and an entry screen.
Entries are written by hand this step — Steps 2 and 3 are what make writing one
by hand the unusual case.

### Scope

- **`games/cube/algorithms.js`**, new and pure, in `solveList.js`' style. The
  entry shape is the design's *Algorithm entry* panel:

  ```js
  { id, name, moves, case: null, assignments: [], notes: '', savedAt, editedAt }
  ```

  `assignments` is an array of `{ method, stage }`; `case` stays `null` until
  Step 2. Export `MAX_ALGORITHMS` (100), `MAX_ALG_NAME` (40),
  `nextAlgorithmId`, `createAlgorithm`, `editAlgorithm` (**the one edit
  funnel**), `removeAlgorithm`, `findAlgorithm`, `sanitizeAlgorithms`,
  `searchAlgorithms(list, query)`, `filterAlgorithms(list, methodId)`. Inject
  clocks the way `solveList.js` does.
- **Validate moves with what exists.** `algError` / `isValidAlg` / `normalizeAlg`
  from `moves.js` already produce the message `CubeAlgInputModal` shows. An entry
  whose moves do not parse is not saved.
- **The save slot.** `algorithms` joins the blob; sanitize it by shape in
  `readCubeSave` (`favorites.js`), write it in `storage.js`, bump
  `CUBE_STORAGE_VERSION` to **3**. Nothing branches on `_v` and nothing should
  have to. A pre-Step-1 file has no key and sanitizes to `[]`, which is the
  truth. Hold the collection in `CubeContext` beside `solves`, through the same
  single debounced writer.
- **`CubeAlgorithms`** — a new route on the cube's stack. Header: back chevron,
  `Algorithms`, `＋`. Body: the search field (`Search moves or name`), the filter
  chips (`All · N`, one per method that has assignments, `Unassigned`), and the
  cards: an empty 40-point case tile placeholder, the name, a `✎` when there are
  notes, the moves in `ALG_FONT` mono, the assignment tags, a chevron.
- **`CubeAlgorithmEntry`** — the second route, pushed by `＋` and by a card:
  name, moves, assignments, notes, and delete. Reuse `CubeAlgInputModal`'s
  validated input rather than writing a second one.
- **The door**, per plan §2: an icon button in `CubeSolveList`'s action row
  beside `New solve` and `Compare`. **Measure the three-control row at 320
  before believing the arithmetic** — it should cost the cube zero points
  because it adds no row, and the PR has to say so with a number.

### Files to read first

- `games/cube/solveList.js` — the module this one is modelled on: the bounds,
  the sanitizers, the name-uniqueness helper, the injected clocks.
- `games/cube/favorites.js:100-145` — `readCubeSave` and the shape rules, which
  is where the new collection is read.
- `games/cube/storage.js` — the writer, the version constant, and the comment
  explaining why there is only one key.
- `games/cube/CubeContext.js` — where the collection lives and how it is written.
- `games/cube/CubeScreen.js` — the nested stack the new routes join.
- `games/cube/CubeSolveList.js` — the action row and its styles, and
  `solveCards.js` for the numbers the list is built from.
- `games/cube/CubeAlgInputModal.js` and `games/cube/CubeNameModal.js` — the
  existing input surfaces.
- `games/cube/methods.js` — `METHODS` and `stagesOf`, which is what an
  assignment references this step.

### Easy to get wrong

1. **`assignments` must be sanitized against the catalogue, not trusted.** This
   step only has the two frozen presets, so an assignment naming an unknown
   method or an unknown stage is dropped on read. Do not invent the catalogue
   parameter here — that is Step 4, deliberately alone.
2. **One edit funnel.** Every mutation of an entry goes through `editAlgorithm`,
   including the ones the entry screen makes field by field. The moment there are
   two, the file and the screen start to disagree.
3. **A screen under a push stays mounted.** The library is pushed over the
   scramble; anything it computes once at mount is stale when an entry is added
   two routes away. The list comes from `CubeContext`, not from a local copy.
4. **The action row is measured, not guessed.** At 320 the row is three
   controls wide; `newAction` flexes and `compareAction` does not. Check that
   `New solve` still reads whole with Compare present, and say what it cost.
5. **Notes are never shown on the solve screen.** The design is explicit and it
   is worth obeying from the first line.
6. **`_v: 3` is a label, not a branch.** Do not add a migration path; shape-first
   reading is what makes both directions of version skew free.

### What must be visible in Expo Go

Open the library from the scramble screen. Add an entry by hand with a name and
moves; add a second with two assignments and a third with none. Search by a name
and by a move token. Every filter chip. Edit an entry, delete one. Background and
resume, then kill the app and cold start — everything is still there. Back out of
the library to the scramble and confirm nothing about the scramble screen moved.

### How to verify

- `npm test` from `SudokuApp/`, with the new `algorithms.test.js` green and the
  count in the PR.
- Browser screenshots at 320×568, 375×667 and 393×852: the library list, the
  entry screen, and the scramble screen's action row with its third control.
  Check for horizontal overflow at 320.
- **A device pass** — this step is mostly lists and text, so the browser covers
  a lot of it, but the action row's feel and the new routes' back gestures are
  not among them. Say in the PR which behaviours the browser did and did not
  cover.

### Then rewrite this file

Brief **Step 2 — the case grid** (plan §3.2) at this level of detail, and add
whatever Step 1 discovered to "Easy to get wrong".

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
