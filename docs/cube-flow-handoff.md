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
  had). A step that needs a third should say why in its PR. **`utils/buildNotes.js`
  does not count** — the release entry is mandated by the plan, and every step
  extends `3.2.0`'s.
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

## What landed in Steps 1–3 (read this before Step 4)

**Step 1** put the app on `@react-navigation/native` + `native-stack` (v7).
`App.js` is `SafeAreaProvider` → the `SafeAreaView` carrying the simulator-tap
interception → `NavigationContainer` → `Stack.Navigator` with
`headerShown: false`; the hub is the root route and each `games/registry.js`
entry is pushed on top of it. `onExitToHub` is `navigation.popToTop()`, the
`appKey` remount on `AppState → 'active'` survives as a `key` on the game screen,
and `HubRoute` remounts the hub on a **blur→focus round trip** because a screen
under a push stays mounted.

**Step 2** split the cube into `CubeScreen` (a 78-line shell) over
`CubeContext` · `CubeHome` · `CubeSolve`, with `cubeChrome.js` and
`useCubeStage.js` between them. Five things Step 4 still inherits:

- **`solving` is gone.** What is persisted is `workspace.solveId`, written **only
  while the solve route is focused** (`solveOpen`), so a non-null id means "the
  solve screen was on the stack" and restoring it is what `CubeHome` does on
  mount. `sanitizeWorkspace` still honours a pre-Step-2 `solving: false`.
- **`openId` means *the page you are on for this scramble*** and outlives the
  push. Since Step 3 that is what decides which card wears the accent.
- **The restore waits a commit and keeps the route key.** A screen's mount effect
  runs before its navigator's, and an unkeyed home route in a `reset` payload
  remounts `CubeHome` into a loop. **Do not move that effect.**
- **`CubeSolve` outlives its solve by one animation** (`lastSolve`), because a
  popped screen stays mounted while it slides out.
- **`ScreenHeader` grew four optional props** (`homeIcon`, `homeLabel`,
  `homeHint`, `subtitleFont`) — the epic's second sanctioned edit outside
  `games/cube/`. No third has been needed since.

**Step 3** put the solves on the scramble screen. New files:

```
CubeSolveList.js   the cards, the capped scroll, and the action row under it
CubeSolveMenu.js   the long-press sheet: rename · duplicate · clear · delete
CubeCompareModal.js  what CubeSolvesModal became — the Compare half, alone
recency.js         describeRecency(savedAt, now) — "yesterday", with a clock
solveCards.js      orderCards + the card geometry and the list's height cap
```

`CubeSolvesModal.js` is **deleted**. `resumeSolve` retired from `CubeContext`
with the Solve button it served. `cubeChrome`'s `bottomRow` is gone.

Six things Step 4 inherits and should not rediscover:

- **The home header holds exactly four controls at 320 points, and it is full.**
  The home button is 38, each control 39, and `ScreenHeader`'s dense right-hand
  column has `flexShrink: 0` — so an extra control never overflows, it
  *ellipsizes the title*, silently. Four leave 94 points for the title; five
  leave 55, and `Scramble` is 77. The four are **New scramble · Save ·
  Favorites · Turn around**. **Step 4 has nothing to add here** — its sheet opens
  from the `+ New solve` card — but if it ever wants a fifth, something has to
  leave first.
- **The title is `Scramble`, and `Reset the view` was removed** to make the four
  fit. That is the one V1 affordance this step dropped; it is flagged for the
  operator in PR #111 and may come back if they miss it.
- **Compare is a button beside `+ New solve`, not a header icon** — open question
  2 answered with its own alternative, because a sixth control did not fit. It is
  also still on the solve screen, where the notebook button used to be. Both
  appear only once `mySolves.length > 1`.
- **The in-progress card is `openId`, hoisted to the top by `orderCards` and
  stored nowhere.** Its meta line says `"57 moves · in progress"`; every other
  card says `"57 moves · yesterday"`. **Step 4's method pill goes on this line**,
  and the line is `numberOfLines={1}` inside a card of fixed height —
  `CARD_HEIGHT` is computed in `solveCards.js` and the cap that decides how many
  cards fit is computed from the same constants, so **a taller card is a change
  to `solveCards.js`, not to the stylesheet.**
- **`savedAt` is creation time and nothing bumps it.** So a card's recency says
  when the solve was *started*, not when it was last written to. Nothing in Step 3
  changed that, and it is honest enough for a drilling session written in one
  sitting — but if a card ever needs to say "last worked on", that is a
  deliberate change to what the field means and it wants the operator's word
  first.
- **`describeRecency` counts elapsed minutes under the hour and *calendar days*
  above it**, so "yesterday" is a fact about midnight rather than about 24 hours.
  Its suite builds times with the local `Date` constructor so it means the same
  thing in every timezone; it passes under `America/Los_Angeles`,
  `Pacific/Auckland`, `Asia/Kolkata` and `UTC`.

**Layout, in points (§8.6).** `bottomRow` went (−44); the list block is the
capped scroll (**126** at two cards, **182** at three) plus a 6-point gap and a
37-point action row. Measured in a browser, the cube goes **300 → 182** at
320×568, **355 → 281** at 375×667 and **373 → 373** at 393×852 — worst case,
with more solves than fit. The tall phone pays nothing. The full table is in the
plan's §3.3.

**Verified in a browser** (Playwright against the web build, three viewports,
zero console errors): the cards and their order; the open one accented and
hoisted after a round trip; tapping one pushing the solve; `+ New solve`;
long-press reaching rename, duplicate, clear and delete; deleting the open solve
and deleting the last one; Compare from the list and from the solve header;
New scramble emptying the list; Save toggling; loading a favorite bringing its
solves back; a cold start restoring the pushed solve and a cold start staying on
the scramble; and that the **page** never scrolls while the **list** does
(client 126 against content 168 at 320×568).

**Device pass: not yet done.** Ask the operator, and write down what the device
finds. The layout numbers above are from a browser at those viewports, and the
web container's padding is not the same as a phone's safe area.

---

## Next step — Step 4: method as data

`docs/cube-flow-plan.md` §3.4 is the brief. Step 3 gave a solve a card; this step
gives it a **method**, which is what Step 5's rail is built from and what stops
`comparePhases` guessing its own column order.

### Scope

- **`games/cube/methods.js` is new and pure.** It promotes `PHASE_METHODS`
  (`solveList.js:259` — today a `{ name, labels }` chip vocabulary) into
  `{ id, name, stages }` for Roux and CFOP, plus `findMethod` and `stagesOf`.
  Shipped presets are **read-only constants**. User-definable methods, the
  journey screen and packs belong to the separate *Cube Methods & Algorithms*
  design and are **not in this epic**.
- **The solve record gains `method`** — a method id, or `null`.
  `createSolve(solves, scramble, { method })`. Nothing else about the record
  changes.
- **Migration is by shape and needs no `_v` bump.** `storage.js:29-36` is explicit
  that nothing branches on the version. A pre-Step-4 solve simply has no
  `method`; `sanitizeSolves` maps a missing or unknown id to `null`, meaning
  **legacy / freeform** — such a solve keeps its free-text markers and today's
  `CubePhaseStrip`, read-only. **This is what lets Step 5 retire the flag key
  without rewriting anyone's saved work**, and it is why `method` lands before
  the rail rather than with it.
- **`CubeNewSolveSheet.js` opens from the `+ New solve` card**: Roux or CFOP, the
  numbered stage list for the pick, and **Start solve**, which creates the solve
  and pushes. Today that card calls `openNewSolve` in `CubeHome` — `startNewSolve`
  then `navigate` — and the sheet goes between the two.
- **`comparePhases` gets better for free.** `mergeLabelOrder` (`:455`) exists to
  guess a column order from label sequences; with `method` stored, same-method
  solves align by the method's own stage list. Worth doing here, while the reason
  is in front of you.

### The files to read first

- `games/cube/solveList.js` — `PHASE_METHODS`, `createSolve`, `duplicateSolve`,
  `sanitizeSolves`, `comparePhases` and `mergeLabelOrder`. This is the step's
  centre of gravity.
- `games/cube/CubeHome.js` — `openNewSolve`, and the header's four-control
  budget above.
- `games/cube/CubeSolveList.js` — the card's meta line, where the pill goes, and
  `solveCards.js` beside it for why the card's height is a constant.
- `games/cube/storage.js` — the read path, and why no version bump is needed.

### Easy to get wrong

1. **A saved solve must not be damaged by the upgrade.** This is the one to test
   hardest, and the one a test can only half-cover: `sanitizeSolves` has to map
   absent and unknown ids to `null` without touching anything else on the record.
2. **A `method: null` solve is not a broken solve, it is a legacy one.** Every
   screen that reads `method` needs the null branch, and it is the branch Step 5
   keeps `CubePhaseStrip` alive for.
3. **No saved label may be orphaned.** `solve.test.js:32-40` is the precedent for
   a cross-module pin: assert that **every label the old `PHASE_METHODS` could
   have written still resolves** against the new stage lists.
4. **The pill goes on a card whose height is a constant.** See `solveCards.js` —
   change the constant, not the stylesheet, and the list's cap follows.
5. **The sheet is a third modal on the scramble screen.** `CubeSolveMenu`,
   `CubeNameModal`, `CubeCompareModal` and `CubeFavoritesModal` are already there
   and are opened one at a time on purpose — a Modal over a Modal is reliable on
   web and finicky on iOS.
6. **`duplicateSolve` must carry the method across.** It spreads `...source`, so
   it does already — but it is the sort of thing a rewrite quietly loses, and a
   copy that forgot its method would build the wrong rail in Step 5.

### What must be visible in Expo Go

Starting a solve asks which method, and shows that method's numbered stages
before you commit; the pill appears on the card and in the solve header; a solve
written before this step still opens, still shows its old chips, and is not
damaged.

### How to verify

- `npm test` from `SudokuApp/` — green, plus the new `methods.test.js` and the
  extended `solveList.test.js`.
- **Open a save file written before this step** (the epic's own EAS branch is one)
  and check every solve in it still opens with its markers.
- Compare two same-method solves and check the columns come from the method
  rather than from label order.
- **A device pass**, and write down which findings came from the device.

### Then rewrite this file for Step 5

Step 5 builds the phase rail from `solve.method`'s stages, derives pill state
rather than storing it, moves `at` to `moveCount(alg)`, and retires the flag key
— which leaves a hole in `PAD_LAYOUT` that Step 6's redo fills, so read §3.5's
last bullet before choosing whether to land 5 and 6 together.

---

## Open questions being carried forward

From `docs/cube-flow-plan.md` §6 — none of these block Step 4, and all of them
want a drilling session rather than an opinion:

1. Does the rail want a "no method" option for a scratch attempt? **Step 4 is
   where this becomes a decision**, because Step 4 is the sheet that asks.
2. ~~Where does the Compare table belong now?~~ **Shipped as a button beside
   `+ New solve`, not a header button** — the header was full at four controls.
   Still worth the operator's opinion, but it is built, not open.
3. Is long-press the right home for rename / duplicate / delete? **Shipped in
   Step 3 to be tried.** The question is now "did you find it", and the
   alternatives are unchanged: icons on the card, or an overflow in the header.
4. Should the rail lock a phase automatically when the cube reaches the stage's
   goal state?
5. Does the phase-split tick track come back once the rail exists?
6. How many variations per phase is too many?
7. **New in Step 3: does the scramble screen miss `Reset the view`?** It was
   removed to fit New scramble and Save on the header. If it is missed, something
   else has to leave — the likeliest candidate is folding Save into the favorites
   button, at the cost of a second tap.
8. **New in Step 3: should a card's recency be when the solve was *started* or
   when it was *last written to*?** `savedAt` is creation time today and nothing
   bumps it. Changing that is a change to what a stored field means.

V1's own open questions (`docs/cube-handoff.md`) are unaffected and still stand.
