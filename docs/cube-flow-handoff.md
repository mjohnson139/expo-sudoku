# Cube Flow — next-step handoff

**If you are a session picking up Cube Flow work: this file is your entry point.
Read it first, then do the step described under "Next step" below.**

It always describes **exactly one step — the next one**. It is rewritten at the
end of every step so the following session can start from a one-line prompt.

## The one-line prompt that starts a session

```
Work in mjohnson139/expo-sudoku. Continue the Cube Flow epic: check out
epic/cube-flow, read docs/cube-flow-handoff.md and do the next step it describes.
```

Nothing else needs to be pasted.

## Before you finish: rewrite this file

**This is part of every step's definition of done.** Before you open your PR,
replace the "Next step" section with a brief for the step *after* yours, at the
same level of detail — scope, the files to read, the behaviours that are easy to
get wrong, what must be visible in Expo Go, and how to verify. Carry the open
questions forward.

---

## Standing context (true for every step)

- **Repo:** `mjohnson139/expo-sudoku`. App code is in **`SudokuApp/`**
  (Expo · React Native · JavaScript).
- **Source of truth:** `docs/cube-flow-plan.md`. Read it end to end before
  writing code — what the epic changes and why (§1), the decisions already taken
  (§2), the step table (§3), what is out of scope (§4), the things that are easy
  to get wrong (§5), open questions (§6).
- **Read `docs/cube-plan.md` too.** It is a closed epic's plan, but it is the
  reasoning behind every line this epic edits. §7.1 (what survives a
  background), §8.5 (markers, not ranges) and §8.6 (the cube is sized first and
  every other row is on a budget) are **still in force** and are not overturned
  here.
- **The design:** `Cube Flow.dc.html` in the Claude Design project
  `2acc14f2-7f7e-434f-a29d-e0fe29fa876a`, settled 2026-08-16. That project's
  `design-decisions.md` has the settled summary in prose.
- **Tracker:** GitHub issue **#107**. Tick your step's checkboxes as you go.
- **Process:** `.github/dev-process.md` — one delivery step per branch, commit
  after each step, **open the PR as soon as the step is pushed**, and **prompt
  the operator to test after each step.** The PR is what triggers the automatic
  build: `.github/workflows/eas-publish.yml` publishes an EAS Update preview to
  `pr-<N>` and comments the QR code, and that build is what the operator tests.
  Holding the PR back leaves them nothing to open.

### Branching

```
main ─── epic/cube-flow ─── feature/cube-flow-<step>   (PRs target epic/cube-flow)
```

Branch from **`epic/cube-flow`** and open your PR **against** it. The epic merges
to `main` once the flow is worth shipping, so `main` never carries a half-rebuilt
screen.

`epic/cube-flow` is cut from `main` at `a691be2`, the commit that closed the V1
cube epic. Pushing it publishes an EAS Update branch of the same name, so the
epic is always openable in Expo Go (project → Branches) even with no step PR
open.

### Golden rules

- **The cube's code lives under `games/cube/`.** Sudoku and Fungiku keep working
  exactly as they do. Two edits outside it have been sanctioned so far: **Step 1**
  (`App.js`, `package.json`, for the navigator) and **Step 2** (four optional
  props on `components/ScreenHeader.js`, so a header's corner can be a back
  chevron and its subtitle monospaced — every other caller keeps the header it
  had). A step that needs a third should say why in its PR.
- **`editOpen` is the only edit funnel** for the open solve, and `withMoves` is
  the only sanctioned moves-edit patch. Two writers is how the file and the
  screen learn to disagree.
- **Say what a new row costs the cube, in points, in the PR.** V1 §8.6's rule.
  It is what made the layout legible in the end, and this epic is adding rows.
- **Pure modules carry the logic.** The test runner is `testEnvironment: "node"`
  with no jsdom and no renderer, so nothing that could be *wrong* belongs inside a
  component. `trackLayout.js` and `compareLayout.js` are the pattern: arithmetic
  in its own file, with its own suite.
- **There is no lint and no typecheck.** `npm test` and the operator are the
  whole net.
- **The device is the only evidence that counts for feel.** Both animation bugs
  this repo has shipped were invisible in a browser, and one layout bug was only
  visible on a phone. **Write down when a finding came from a device.**

---

## What landed in Steps 1–2 (read this before Step 3)

**Step 1** put the app on `@react-navigation/native` + `native-stack` (v7).
`App.js` is `SafeAreaProvider` → the `SafeAreaView` carrying the simulator-tap
interception → `NavigationContainer` → `Stack.Navigator` with
`headerShown: false`; the hub is the root route and each `games/registry.js`
entry is pushed on top of it. `onExitToHub` is `navigation.popToTop()`, the
`appKey` remount on `AppState → 'active'` survives as a `key` on the game screen,
and `HubRoute` remounts the hub on a **blur→focus round trip** because a screen
under a push stays mounted.

**Step 2** split the cube. `CubeScreen.js` is **78 lines** — a provider and a
nested stack — and what it used to be is now:

```
CubeScreen.js     the shell: <CubeProvider> over a nested Stack of two routes
CubeContext.js    everything persisted, one debounced writer, `editOpen`
CubeHome.js       the scramble (root route)
CubeSolve.js      the solve (pushed route)
cubeChrome.js     shared styles, the header action button, the loading view
useCubeStage.js   the cube's measurement and size, so both screens agree
```

Five things Step 3 inherits and should not rediscover:

- **`solving` is gone from state and from the file.** What is persisted is
  `workspace.solveId`, written **only while the solve route is focused**
  (`solveOpen` in the context, reported by both screens' `focus` listeners). A
  non-null id in the file therefore means "the solve screen was on the stack",
  and restoring it is what `CubeHome` does on mount. `sanitizeWorkspace` still
  reads a pre-Step-2 `solving: false` and honours it.
- **`openId` still means what it meant in V1** — *the page you are on for this
  scramble* — and it **outlives the push**, which is what keeps the Solve button
  resuming the page you left rather than the newest one. It is not the route.
- **Restoring the pushed route waits a commit, and keeps the route key.** A
  screen's mount effect runs before its navigator's, so a `reset` dispatched on
  the first commit is silently overwritten by the navigator's initial state; and
  a route in a reset payload without a `key` is a *new* route, so an unkeyed
  home route remounts `CubeHome`, which restores again, forever. Both are
  written up where the effect is. **Do not move that effect.**
- **`CubeSolve` outlives its solve by one animation.** Deleting the open page
  leaves nothing open and the screen goes back — but a popped screen stays
  mounted while it slides out, so the screen draws the last solve it had
  (`lastSolve`) rather than blanking on the way off.
- **`ScreenHeader` grew four optional props** (`homeIcon`, `homeLabel`,
  `homeHint`, `subtitleFont`) so the solve screen's corner can be a chevron and
  its subtitle can be monospaced. Every other caller passes none of them and
  keeps exactly the header it had. This is the epic's second sanctioned edit
  outside `games/cube/`.

**Layout, in points (§8.6):** the solve screen lost the `solveBar` (~30pt:
an 11pt line, 8 of padding, 2 of border, 6 of margin) and the header gained a
12pt subtitle line — which the dense header's `minHeight: 34` absorbs most of, so
the row goes ~34 → ~36. **Net ≈ −28pt on the solve screen, and 0 on the
scramble.** Step 8's table should be re-based on that.

**Verified in a browser** (Playwright against the web build): the push and the
back chevron; a cold start restoring the pushed solve; backing out and a cold
start opening on the scramble; deleting the open solve (next page opens) and
deleting the last one (the screen pops); a simulated background→resume mid-solve
coming back to the solve with its moves; favorites, New scramble, the picker,
the flag and the phase strip. **No device pass yet — that is the operator's, and
the two animation bugs this repo has shipped were both invisible in a browser.**

---

## Next step — Step 3: the solves on the scramble screen

`docs/cube-flow-plan.md` §3.3 is the brief. Step 2 gave the scramble a screen of
its own and left its bottom row exactly as V1 had it. This step spends that room
on the thing the epic exists for: **the solves for this scramble, as cards, on
the screen that owns them.**

### Scope

- **The bottom row goes** (`CubeHome.js`, the `styles.bottomRow` block).
  **New scramble** and **Save** become header icon buttons beside the existing
  favorites button — `headerAction` in `cubeChrome.js` is what they are built
  from, and Save keeps its two states (`saved` is already in the context). The
  "Solves on this scramble" list takes the space they free.
- **Cards render from `mySolves`** (already on the context, already newest-first
  — `solvesFor` filters and does not sort, so the order is creation order). Per
  card: name; meta `"57 moves · in progress"` from `describeSolveSize`
  (`solveList.js:731`); a chevron; accent border and top position for the
  in-progress one; a dashed `+ New solve` card last.
- **Tapping a card is `showSolve(id)` then `navigate(SOLVE_ROUTE)`** — the two
  calls `CubeHome`'s `openSolveScreen` already makes. The Solve button's
  "resume the page you were on" (`resumeSolve`) retires with the row it sat in.
- **`games/cube/recency.js` is new and pure.** `formatElapsed`
  (`utils/gameProgress.js:15`) is `mm:ss` and is the wrong instrument — the card
  wants *"yesterday"*. `describeRecency(savedAt, now)` with an injected clock, in
  the style of `compareLayout.js`.
- **Two gaps the design does not cover, already resolved in §3.3:** solve
  management (rename / duplicate / clear / delete) hangs off a **long-press** on
  a card rather than five icons on a card the design draws clean; and **Compare**
  moves behind a **home header button**, with `CubeSolvesModal` reduced to the
  Compare view alone.

### The files to read first

- `games/cube/CubeHome.js` — all of it; this is the screen being rebuilt.
- `games/cube/CubeContext.js` — everything the cards need is already on it
  (`mySolves`, `showSolve`, `startNewSolve`, `copySolve`, `deleteSolve`,
  `renameSolveById`, `clearSolveById`). **Adding a second writer is the bug.**
- `games/cube/CubeSolvesModal.js` — the per-row actions the long-press has to
  reach, and the Compare view that stays.
- `games/cube/useCubeStage.js` — the cube is sized from what the stage measures,
  so a list under it costs the cube directly. §8.6 again.

### Easy to get wrong

1. **The list is under the cube, and the cube is what pays for it.** The stage
   takes the leftover height, so every point the cards take comes off the cube on
   a small phone. Say what the row costs in the PR, and check 320×568 — the width
   where V1's rows stopped fitting.
2. **The page does not scroll and must not start.** The cube claims every pan
   inside its square; a `ScrollView` around it is the race Fungiku already lost
   (`docs/fungiku-plan.md` §2). If the card list scrolls, **the list scrolls**,
   not the page.
3. **A long-press is invisible** — open question 3. Ship it, and ask the operator
   in the PR whether it is findable; do not add a row of icons pre-emptively.
4. **The in-progress card is derived, not stored.** `openSolve` is the page on the
   cube; "in progress" is a fact about the list, not a field on a solve.
5. **`describeRecency` needs an injected clock** or its test is a stopwatch race.
   `solveList.test.js` has the convention.
6. **A style *variant* must be a whole style.** `[base, variant]` flattens to
   something Yoga and `react-native-web` disagree about, and this repo shipped a
   phone-only bug because of it.

### What must be visible in Expo Go

The scramble screen lists the solves written against the scramble on the cube,
newest first, with the in-progress one accented at the top; tapping one pushes
the solve screen Step 2 built; `+ New solve` starts one; New scramble and Save
are icons in the header; a new scramble empties the list.

### How to verify

- `npm test` from `SudokuApp/` — green, plus the new `recency.test.js`.
- The list matches the picker it replaces: same solves, same counts, same order.
- Long-press reaches rename, duplicate, clear and delete, and deleting the open
  solve still leaves the screen somewhere honest.
- Load a favorite with solves against it and watch the list change with it.
- **A device pass**, and write down which findings came from the device.

### Then rewrite this file for Step 4

Step 4 makes the method data: `games/cube/methods.js`, `method` on the solve
record, the new-solve sheet, and `comparePhases` aligning by the method's own
stage list. `docs/cube-flow-plan.md` §3.4 is the brief.

---

## Open questions being carried forward

From `docs/cube-flow-plan.md` §6 — none of these block Step 2, and all of them
want a drilling session rather than an opinion:

1. Does the rail want a "no method" option for a scratch attempt?
2. Where does the Compare table belong now — a home header button, or a card?
3. Is long-press the right home for rename / duplicate / delete?
4. Should the rail lock a phase automatically when the cube reaches the stage's
   goal state?
5. Does the phase-split tick track come back once the rail exists?
6. How many variations per phase is too many?

V1's own open questions (`docs/cube-handoff.md`) are unaffected and still stand.
