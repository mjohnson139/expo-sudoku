# Cube Flow — Feature Plan

The cube's second epic. V1 built a notebook you can write solves in
(`docs/cube-plan.md`); this one gives that notebook the **structure a drilling
session actually has** — one scramble, several attempts, each attempt a known
sequence of stages — and puts it on the screen instead of behind a flag.

## For the implementer (start here)

- **Repo:** `mjohnson139/expo-sudoku`. The app code is in the `SudokuApp/`
  subdirectory (Expo · React Native · JavaScript).
- **This document is the source of truth** for scope and approach.
- **Start here if you are a new session:** **`docs/cube-flow-handoff.md`** always
  describes *the next step only*, so a session can start from a one-line prompt.
  **Rewriting it for the following step is part of every step's definition of
  done** — the same discipline Fungiku and the V1 cube epic ran on.
- **Read `docs/cube-plan.md` before changing anything.** It is a closed epic's
  plan, but it is also the reasoning behind every line of code this epic edits.
  §7.1 (what survives), §8.5 (markers, not ranges) and §8.6 (the cube is sized
  first) are load-bearing here and are **not** overturned.
- **Tracker:** GitHub issue **#107**. Tick your step's checkboxes as you go.
- **Process:** follow `.github/dev-process.md` — one delivery step per branch,
  commit after each step, **open the PR as soon as the step is pushed** so the
  workflow publishes its `pr-<N>` preview build, and **prompt the operator to
  test after each step**, against that build.
- **The design:** `Cube Flow.dc.html` in the Claude Design project
  `2acc14f2-7f7e-434f-a29d-e0fe29fa876a` ("Expo Sudoku design system"), settled
  2026-08-16. That project's `design-decisions.md` carries the settled summary.

### Branching

```
main ─── epic/cube-flow ─── feature/cube-flow-<step>   (PRs target epic/cube-flow)
```

`epic/cube-flow` is cut from `main` at `a691be2`, the commit that closed V1.
Pushing to it publishes an EAS Update branch of the same name
(`.github/workflows/eas-publish.yml`), so the epic stays openable in Expo Go
between step PRs; a step PR also gets its own throwaway `pr-<N>` preview.

Build notes are per release, not per step (V1 plan §12). This epic is **3.2.0** —
extend that one entry as steps land, and keep `app.json`'s `expo.version`
matching.

## 1. What this epic changes, and why

V1 shipped and merged on 2026-08-08. It answers *"am I getting better at this
scramble?"*, and four things about how it answers are wrong — not broken, but
wrong in the way that only shows up after a fortnight of using the thing.

**A scramble and its solves are related by a hidden flag.** `solving` is a
persisted boolean and `openId` a persisted id; one screen renders three modes off
them (`CubeScreen.js:400`, `:920`). The list of solves for a scramble lives
behind a modal. So the one-scramble-many-solves structure — the entire point of
the notebook, and the thing Step 4 went to some trouble to make real in the file
— is invisible on the screen that owns it.

**Method is a flag-time decision.** `PHASE_METHODS` (`solveList.js:259`) is a
vocabulary for a chip grid and nothing more. Nothing stores which method a solve
uses, which is why `comparePhases` has to infer column order from label
sequences and refuse to align Roux against CFOP by inspection.

**The flag key asks you to remember.** A phase is written wherever the cube
happens to be standing — `endPhaseHere` passes `player.index`
(`CubeScreen.js:823`) — and named from a modal. But the moment a method is
chosen, the stages are *known*. Asking the operator to remember to mark a
boundary they already declared is asking twice.

**Undo only removes tokens.** There is no undo stack in the codebase; `undoMove`
is `dropLastToken` plus a backwards animation (`CubeScreen.js:746`). Nothing
takes back a phase lock.

### The shape that replaces it

**Scramble is home and owns the cube; a solve is a navigation push.** The solves
for the scramble are cards under it. Tapping one pushes the solve screen with a
standard back button and a standard edge swipe — a pattern nobody has to learn,
replacing a mode flip nobody could see. Method is chosen when a solve is created
and drives the phase rail, the comparison columns, and eventually the algorithm
tagger. Undo and redo take the pad slots that backspace and the flag vacate.

**What this retires:** the bottom Solve button, the asymmetric top back-arrow,
the flag key, the flag-time method picker, backspace, and the segmented
`Scramble | Solve` control that an earlier design round proposed and this one
rejected. New scramble and Save move into the home header, which is what frees
the bottom of the scramble screen for the list.

## 2. Decisions taken before the first line

| Question | Decision | Why |
|---|---|---|
| Scope | The full design **minus algorithm tagging** | The design itself marks tagging *future*, and it depends on the separate *Cube Methods & Algorithms* design round. |
| The hold / inspect phase, which the design never draws | **Keep it as the pushed solve screen's first state** | V1 §8.3 settled that the hold is *panned to, not typed*, and the operator chose panning over the keyboard explicitly. `orientation: null` stays the sentinel; `setStartingOrientation` and `reorient` survive unchanged. The push wraps it; it does not replace it. |
| The phase-split tick track the design redraws | **Not rebuilt** | It was built in Step 8 and removed the same day at the operator's request — at 42 moves a tick is six points wide, and it cost 22 points of cube to restate `42 / 42` (`CubeScrubber.js:22-34`). The rail carries the per-phase counts it was restating. **If it comes back it comes back with the rail as evidence**, not on spec. |
| Navigation | **Adopt `react-navigation` (native-stack)** | Operator's call, 2026-08-16, against the hand-rolled alternative. `App.js:6-18` said "revisit if the app ever grows genuinely deep navigation"; this is that. |

### What react-navigation costs, verified before committing to it

- **`react-native-screens` is included in Expo Go** (Expo SDK docs list it
  `inExpoGo: true`), and `react-native-safe-area-context` and
  `react-native-gesture-handler` are already dependencies. So the epic stays
  openable in Expo Go and the EAS Update / PR-preview loop keeps working. This
  was checked rather than assumed, because the whole test habit depends on it.
- **Existing standalone `preview` and `production` builds cannot pick it up over
  the air.** An EAS Update cannot ship native code, and `app.json` pins
  `runtimeVersion.policy: "sdkVersion"`, so an old binary would silently keep
  serving the old bundle rather than failing loudly. **Rebuild both channels once
  Step 1 merges.** This is the one operational cost of the decision and it is
  easy to forget precisely because nothing breaks.
- **Web is a required check, not an assumption.** The workflow deploys to
  gh-pages; `react-native-screens` no-ops under `react-native-web` and
  react-navigation runs there, but this repo has shipped two animation bugs that
  were invisible in a browser and one layout bug that was *only* visible on a
  phone (V1 §8.6). Check both.

## 3. Delivery steps

Eight steps. The risky infrastructure is quarantined in Step 1, the large
refactor in Step 2, and the two biggest design changes are last because nothing
depends on them — so a wrong call in Step 6 or 7 costs a step, not the epic.

| # | Step | Delivers |
|---|---|---|
| 1 | A real stack | react-navigation, behaviour-neutral |
| 2 | Split `CubeScreen` | home + solve screens over one state owner |
| 3 | Solves on the scramble screen | the card list; New and Save move to the header |
| 4 | Method as data | `method` on the record, the new-solve sheet |
| 5 | The phase rail | pre-built stages; the flag key retires |
| 6 | Undo and redo | whole actions; the pad's bottom row is rebuilt |
| 7 | Variations per phase | alternative attempts at one stage |
| 8 | Layout budget pass | the §8.6 accounting, at three widths |

### 3.1 Step 1 — put the app on a real stack

Behaviour-neutral. The app looks and works exactly as it does today, on top of a
real navigator. Shipping this alone is the point: it separates a native
dependency change from every design change that follows, so a regression here has
one suspect.

- `npx expo install @react-navigation/native @react-navigation/native-stack
  react-native-screens`.
- `App.js` becomes `SafeAreaProvider` → `NavigationContainer` →
  `createNativeStackNavigator` with `headerShown: false`, because every screen
  already draws its own `ScreenHeader`. Routes: `Hub`, plus one per
  `games/registry.js` entry.
- **Three behaviours the current router has that are load-bearing and are not
  automatic:**
  - *Unmount on leave.* `App.js:6-18` relies on it to stop timers and force
    re-hydration from storage. A native-stack **pop** unmounts the popped screen,
    so `popToTop()` for the home button is equivalent — but a `navigate` to an
    already-mounted route is not. Verify rather than assume.
  - *Remount on resume.* The `appKey` bump on `AppState → 'active'`
    (`App.js:25-32`) must survive as a `key` somewhere.
  - *Simulator tap interception.* `handleTouchStart` / `global.touchHandler` and
    the web `CustomEvent('simulatorTap')` path wrap the whole tree today; keep
    them wrapping the container.
- `HubScreen`'s `onSelectGame` and every game's `onExitToHub` keep their prop
  names, adapted at the call site, so `HubScreen.js` and all three game screens
  are untouched. **Nothing in `games/` changes this step.**

**Tests:** none new — this is component wiring and the runner is
`testEnvironment: "node"` with no renderer. `npm test` stays green.

**Operator tests:** all three games open and return to the hub; Android hardware
back returns to the hub; iOS edge-swipe returns to the hub; backgrounding and
resuming restores each game; the gh-pages preview still routes.

### 3.2 Step 2 — split `CubeScreen`, push the solve

`CubeScreen.js` is 1525 lines and every step below adds to it. Split it now,
while the split is still mechanical rather than a rewrite.

- **`games/cube/CubeContext.js` owns everything persisted** — `scramble`,
  `favorites`, `solves`, `openId`, the hydration gate, the debounced save effect
  (`CubeScreen.js:283-332`) and the `AppState` flush. One provider above a nested
  stack of `CubeHome` and `CubeSolve`, so both screens read one list and there is
  exactly one writer. **`editOpen` (`:528`) moves here intact and stays the only
  edit funnel** — V1 put every edit through it deliberately and this epic does not
  get to add a second door.
- **The route replaces the `solving` flag.** `solving` retires from state and from
  the save file's `workspace`; `openId` stays persisted so a cold start restores
  the pushed screen. `inspecting = orientation === null` (`:920`) survives
  unchanged as the solve screen's first state.
- **Header split.** Home keeps the home button and the view actions. Solve gets
  the back chevron, `title="Solve 3"`, and `subtitle` = the scramble, mono and
  truncated — which is what retires the `solveBar` (`:1301-1328`). Note
  `ScreenHeader.js:18-20` warns that a *conditional* subtitle changes header
  height, so the solve header always carries it.
- `startSolving` / `stopSolving` collapse into a navigate and a `goBack`.
  `openSolveById`, `startNewSolve` and `copySolve` keep their bodies and end in a
  navigate.

**Tests:** none new. The risk is entirely in wiring; the pure modules are
untouched, which is the argument for doing this as its own step.

**Operator tests:** every V1 behaviour still reachable — write a solve, back out,
return to it, background and resume mid-solve, delete the open solve, change
scramble with a solve open.

### 3.3 Step 3 — solves on the scramble screen

- The bottom row (`:1221-1278`) goes. **New scramble** and **Save** become header
  icon buttons beside the existing favorites button; the "Solves on this
  scramble" list takes the space they free.
- Cards render from `solvesFor` (`solveList.js:84`), already newest-first. Per
  card: name; meta `"57 moves · in progress"` from `describeSolveSize` (`:731`);
  a chevron; accent border and top position for the in-progress one; a dashed
  `+ New solve` card last.
- **`games/cube/recency.js` is new and pure.** `formatElapsed`
  (`utils/gameProgress.js:15`) is `mm:ss` and is the wrong instrument — the card
  wants *"yesterday"*. `describeRecency(savedAt, now)` with an injected clock, in
  the style of `compareLayout.js`.

**Two gaps the design does not cover, resolved here rather than discovered
mid-build:**

- **Solve management.** The design's card has no rename / duplicate / clear /
  delete. Keep `CubeSolvesModal`'s per-row actions reachable by **long-press on a
  card**, rather than putting five icons on a card the design draws clean.
- **Compare.** V1 Step 9's table (`comparePhases`, `CubeCompareTable`,
  `compareLayout`) has no home in the new design and is far too good to drop —
  it is the direct answer to the epic's own question. Put it behind a **home
  header button**, and reduce `CubeSolvesModal` to the Compare view alone.

**Tests:** `recency.test.js` — boundaries at just-now / minutes / today /
yesterday / days / weeks, injected `now`, following `solveList.test.js`'s
injected-clock convention.

**Operator tests:** the list shows every solve for the scramble with the right
counts and recency; the in-progress one is top and accented; a new scramble
empties it; long-press reaches every management action.

### 3.4 Step 4 — method as data

- **`games/cube/methods.js`** promotes `PHASE_METHODS` from a chip vocabulary
  into the real thing: `{ id, name, stages }` for Roux and CFOP, plus
  `findMethod` and `stagesOf`. Shipped presets are **read-only constants**.
  User-definable methods, the journey screen and packs belong to the separate
  *Cube Methods & Algorithms* design and are **not in this epic**.
- **The solve record gains `method`** — a method id, or `null`.
  `createSolve(solves, scramble, { method })`. Nothing else about the record
  changes.
- **Migration is by shape and needs no `_v` bump.** `storage.js:29-36` is
  explicit that nothing branches on the version and `readCubeSave` reads every
  version by shape. A pre-Step-4 solve simply has no `method`; `sanitizeSolves`
  maps a missing or unknown id to `null`, meaning **legacy / freeform** — such a
  solve keeps its free-text markers and today's `CubePhaseStrip`, read-only.
  **This is what lets Step 5 retire the flag key without rewriting anyone's saved
  work**, and it is the reason `method` lands before the rail rather than with it.
- **The sheet** (`CubeNewSolveSheet.js`) opens from the `+ New solve` card: Roux
  or CFOP, the numbered stage list for the pick, and **Start solve**, which
  creates the solve and pushes.
- **`comparePhases` gets better for free.** `mergeLabelOrder` (`:455`) exists to
  guess a column order from label sequences; with `method` stored, same-method
  solves align by the method's own stage list. Worth doing here, while the reason
  is in front of you.

**Tests:** extend `solveList.test.js` for `createSolve` with a method and for
`sanitizeSolves` mapping absent / unknown / valid ids. New `methods.test.js`
pinning unique ids and non-empty stage lists — and, in the style of
`solve.test.js:32-40`'s cross-module pin, that **every label the old
`PHASE_METHODS` could have written still resolves**, so no saved label is
orphaned by the promotion.

**Operator tests:** creating a solve asks for a method and shows its stages; the
pill appears on the card and in the solve header; **solves written before this
step still open, still show their old chips, and are not damaged by the
upgrade** — this is the one to test hardest.

### 3.5 Step 5 — the phase rail, and the flag key retires

- **The rail is pre-built from `solve.method`'s stages, and pill state is derived
  rather than stored.** A stage with a marker is *locked* (green check, final
  count); the first without one is *open* (accent outline, a live count that
  accrues every typed move); the rest are dashed *upcoming* and not tappable.
- **Tapping the open pill locks it.** Reuse `endPhase` (`solveList.js:350`)
  exactly as it stands — it already names the marker where the group started and
  opens a fresh one, which is precisely this transition, and it is the function
  V1 §8.5 spent a step getting right.
- **One deliberate behaviour change:** `at` becomes `moveCount(solve.alg)` — the
  end of what has been *written* — instead of `player.index`, where the cube
  happens to be *standing*. This is the design's intent ("moves accrue to the
  open phase") and it removes the class of bug where scrubbing back and tapping
  the flag marks the wrong place.
- **Labels now come from the method**, so the chip grid and the free-text escape
  hatch both retire with `CubePhaseModal`. Legacy (`method: null`) solves keep
  `CubePhaseStrip` read-only — their markers are still theirs, and there is no
  method to build a rail from.
- **Pad:** remove the `flag` cell from `PAD_LAYOUT` (`solve.js:51-72`, row 3
  col 3); `canPhase` and `onPhase` go with it. `solve.test.js:32-40` pins
  `PAD_LAYOUT.length === PAD_COLUMNS * PAD_ROWS` and "no empty cells left", and
  Step 6 fills the slot with redo — so either **land Steps 5 and 6 on one
  branch**, or leave the slot as a documented gap for exactly one step and change
  that test deliberately rather than incidentally.

**Tests:** extend `solveList.test.js` for `endPhase` at `moveCount(alg)`. New
`phaseRail.test.js` for a pure `railStates(method, phases, alg)` — the
locked/open/upcoming derivation is exactly what `trackLayout.js` and
`compareLayout.js` set the precedent for putting in its own file.

**Operator tests:** the rail shows the method's stages from the first move; the
open pill counts up as you type; tapping it locks with the right count and opens
the next; a legacy solve still shows its old chips; the pad has no flag key.

### 3.6 Step 6 — undo and redo of whole actions

- **Model: a bounded snapshot ring, not an inverse-action log.** The undoable
  state of a solve is `{ alg, phases }` — a short string and a small array — plus
  Step 7's variations. Snapshots are a few hundred bytes, they compose trivially
  with `withMoves` / `clampPhases` (a restored snapshot is already clamped), and
  they cannot drift the way a log of inverses can. `games/cube/history.js` is
  pure: `push`, `undo`, `redo`, `canRedo`, bounded at ~50.
- **Session-only, in a ref on `CubeContext`, deliberately not persisted.** V1
  §7.1's rule is that *authored work* survives backgrounding. Gesture history is
  not authored work, and a redo stack that outlives a cold start is a surprise
  rather than a feature. Say so where the ref is declared, or someone will
  "fix" it.
- **It composes with `retract`, it does not replace it.** Undo dispatches on what
  the top snapshot changed: a trailing-token difference with the cube at the end
  of the alg routes through `retract` (`useScramblePlayer.js:336-354`) so the
  backwards animation is kept; a phase lock has nothing to animate and applies
  immediately. `resetGesture()` runs on every undo and redo, as it does today.
- **Pad:** `backspace` → **undo** at row 3 col 1; the vacated flag slot at row 3
  col 3 → **redo**, `tone: 'tool'`, dimmed through the existing `disabled` style
  when `!canRedo`. The long-press repeat the design asks for **already exists** —
  `REPEAT_AFTER_MS = 400` then `setInterval(onUndo, 120)`
  (`CubeMovePad.js:158-162`) is exactly "long-press undo scrubs back at 120ms per
  step". No new gesture code.
- `clearSolve` becomes undoable, which it is not today — it is a snapshot like
  any other, and V1 flagged its double spelling as a known wart.

**Tests:** `history.test.js` — round-trips, the bound, and the invariant that a
fresh edit drops the redo stack. Update `solve.test.js`'s `PAD_LAYOUT` pins.

**Operator tests:** undo removes the last move with the backwards animation as
before; undo after locking a phase unlocks it; redo replays both; redo is dim
until there is something to redo; long-press scrubs; redo dies when you type.

### 3.7 Step 7 — variations per phase

The largest data change, and last on purpose — nothing above depends on it.

- **Keep `alg` a flat string.** The record gains
  `variations: [{ id, phaseAt, alg, savedAt }]` holding only the runs **not**
  currently in use; the in-use run stays spliced into `alg`. This is the decision
  that keeps `useScramblePlayer`, `CubeMoveTrack`, `phaseSpans`, `comparePhases`
  and the whole storage layer working unchanged — `player.js` is index-based and
  has no phase awareness at all, and it should stay that way.
- **`games/cube/variations.js` is pure and owns three operations:** **fork**
  (stash the phase's current run, clear its span, reopen the phase), **switch**
  (splice a stored run back into `alg`, stash the displaced one, re-clamp), and
  **best** (shortest run for a phase). Each returns an `{ alg, phases,
  variations }` patch, so `editOpen` stays the only writer and `withMoves` stays
  the only moves-edit contract.
- The design's rule that **retrying always forks and never edits A** falls out of
  this: "try again" is *fork*, unconditionally, so a worse attempt costs nothing.
- Rail: a locked pill with variations wears a count badge; tapping expands the
  row (in-use filled, shortest marked `best`); picking one is *switch*, which
  replays from the phase's entry through the existing `seek` + `playTo` pair
  (`CubeScreen.js:850-856`).
- Switches push onto Step 6's history, which is why that step comes first.
- `sanitizeSolves` gains a `sanitizeVariations` beside `sanitizePhases`, clamping
  `phaseAt` to a real marker and dropping unparseable algs — the same shape-based
  tolerance as everything else on the read path.

**Tests:** `variations.test.js` — fork/switch round-trips preserve structure;
switching twice returns the original; `best` ties break deterministically; a
variation pointing at a dropped marker is discarded on load.

**Operator tests:** lock a phase, "try again", write a shorter run, see it marked
best, switch between them and watch the cube replay from the phase's entry; undo
a switch; background and resume with variations stored.

### 3.8 Step 8 — the layout budget pass

V1 §8.6's rule is that the cube is sized first and every other row justifies
itself in points. Open question 13 says the next win must come from **hiding**
chrome rather than cutting it. This step is the accounting, and it is close to
neutral by construction:

| Row | Change |
|---|---|
| `solveBar` (~27pt) | **removed** — its content is the solve header's subtitle now |
| header subtitle | **+~12pt** — the dense header gains a permanent second line |
| `CubePhaseStrip` (~28pt, conditional) | replaced by `CubePhaseRail` (~28pt, **permanent**) |
| tick track | **not rebuilt** |
| pad | unchanged at 152pt — flag out, redo in |

Net ≈ **+13pt** against V1's ~340pt of fixed rows in writing mode. **Verify by
measurement at 320×568, 375×667 and 393×852** — the three widths §8.8 already
reasons about — and confirm `LEGEND_MIN_HEIGHT = 780` still drops the pad legend
in the right place. **Put the numbers in the PR**, as every layout-touching step
in V1 did.

If the rail pushes the small phone past its budget, **the rail is the row that
scrolls**, horizontally, as `CubePhaseStrip` already does
(`CubePhaseStrip.js:84-89`) — not the cube that shrinks.

## 4. What this epic does not do

- **Algorithm tagging.** The design draws it and labels it *future*. It needs the
  *Cube Methods & Algorithms* round's shared library, the auto-captured case
  pattern, and a way to name a run — a step of its own at least.
- **User-definable methods, the journey screen, packs.** Same round, same reason.
  Roux and CFOP ship as read-only presets.
- **The V1 leftovers.** Editing a solve in the middle is still tabled (§8.7), the
  solver is still outsourced (§8.9), entering a cube by hand is still dropped
  (§8.12), and analysis (V1's Step 9) is still unbuilt. None of them are made
  easier or harder by this epic, except that **analysis gets better ground to
  stand on** once a phase knows which method's stage it is.
- **Sudoku and Fungiku.** Outside `games/cube/`, this epic touches exactly two
  things: `App.js` and `package.json`, both in Step 1. Nothing else in the app
  should move a pixel — and Step 1's whole design is to make that checkable.

## 5. Things that are easy to get wrong

- **`editOpen` is the only edit funnel and must stay so.** Two writers to the
  solve list is how the file and the screen learn to disagree.
- **`withMoves` is a contract, not enforcement.** Anything calling `updateSolve`
  with a bare `{ alg }` bypasses phase clamping. V1 already has one deliberate
  exception (`clearSolve`) and one duplicate of it (`clearSolveById`); do not add
  a third.
- **`removePhase` does not clamp or re-sort** (`solveList.js:377`), unlike every
  other phase mutator. It is safe today only because it returns a subset of an
  already-clamped list. Step 7 splices spans; check this holds.
- **`orientation` has three states** — `null`, `''`, notation — and the
  `null → ''` fallback on unparseable text is load-bearing for `inspecting`.
  Nothing in this epic may collapse them to two.
- **A style *variant* must be a whole style.** `[base, variant]` flattens to
  something Yoga and `react-native-web` disagree about, and V1 shipped a bug that
  only appeared on a phone because of it (`ScreenHeader.js:112-126`,
  `CubeMovePad.js:387-395`).
- **The device is the only evidence that counts for feel.** Both animation bugs
  this repo has shipped were invisible in a browser. Steps 1, 6 and 7 touch
  animation or gesture; each needs a device pass, and **write down when a finding
  came from a device.**
- **There is no lint and no typecheck in this repo.** `npm test` and the operator
  are the whole net, which is why every derivation that could be wrong belongs in
  a pure module with its own suite rather than inside a component the runner
  cannot render.

## 6. Open questions for the operator

1. **Does the rail want a "no method" option?** Every solve created after Step 4
   has a method. A quick scratch attempt with no intention of naming phases has
   nowhere to go except a method it will ignore. Legacy solves prove the
   `method: null` path works; whether it should be *offered* is a use question.
2. **Where does Compare belong now?** Step 3 puts it behind a home header button
   on the argument that it compares solves and home is where solves live. It
   could equally be a third card at the bottom of the list.
3. **Is long-press the right home for rename / duplicate / delete?** It is
   invisible, which is the standard objection. The alternative is a row of icons
   on a card the design draws clean, or an overflow button in the solve header.
4. **Should the rail lock automatically?** Tapping to lock is explicit and cheap,
   but the app knows the stage is finished the moment the cube reaches that
   stage's goal state — V1's untaken analysis step is exactly the machinery that
   would know. Deliberately not assumed here.
5. **Does the tick track come back once the rail exists?** Decided *out* for this
   epic on V1's evidence. The design redraws it grouped by phase, which is the
   version that was never tried. One drilling session with the rail settles it.
6. **How many variations is too many?** No cap is specified. `MAX_PHASES` is 40
   and `MAX_SOLVES` 100; variations need a number before the file finds one.
