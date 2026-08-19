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
scramble?"*, and three things about how it answers are wrong — not broken, but
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


### The shape that replaces it

**Scramble is home and owns the cube; a solve is a navigation push.** The solves
for the scramble are cards under it. Tapping one pushes the solve screen with a
standard back button and a standard edge swipe — a pattern nobody has to learn,
replacing a mode flip nobody could see. Method is chosen when a solve is created
and drives the phase rail, the comparison columns, and eventually the algorithm
tagger. Backspace remains the direct, durable way to remove a move.

**What this retires:** the bottom Solve button, the asymmetric top back-arrow,
the flag key, the flag-time method picker, and the segmented
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

Eight steps as planned, plus two that gesture input added — **3.5**, turning the
cube by dragging it, and **9**, the swipe mode it makes possible. The risky
infrastructure is quarantined in Step 1, the large refactor in Step 2, and the
largest remaining design change is last because nothing depends on it — so a wrong
call in Step 7 costs a step, not the epic.

**Step 3.5 is a guest that grew.** It came out of a side exploration
(`docs/cube-touch-exploration.md`) that was never on this roadmap, and it is an
**input** change rather than a structure change — which is the epic's actual
thesis. It is numbered 3.5 rather than renumbering 4–8, because every
cross-reference in this file, the handoff and #107 is worth more than a tidy
sequence. What it changes about the steps after it is §3.3.5 and
`cube-touch-exploration.md` §8.5 — and it turned out to change a lot: the pad is
no longer the only way to write a move, which is what **Step 9** (swipe mode)
spends, and it settled the drawing/storage seam that §5 now makes a rule for
everyone.

| # | Step | Delivers |
|---|---|---|
| 1 | A real stack | react-navigation, behaviour-neutral |
| 2 | Split `CubeScreen` | home + solve screens over one state owner |
| 3 | Solves on the scramble screen | the card list; New and Save move to the header |
| 3.5 | Turn the cube by dragging it | a finger writes the move — layers, wides, the facing face, folds and cancels — *unplanned, landed* |
| 4 | Method as data | `method` on the record, the new-solve sheet |
| 5 | The phase rail | pre-built stages; the flag key retires |
| 6 | Undo and redo | **dropped after device testing; PR #119 closed unmerged** |
| 7 | Variations per phase | alternative attempts at one stage |
| 8 | Layout budget pass | the §8.6 accounting, at three widths |
| 9 | Swipe mode — hide the pad | a finger-only mode: cube, scrubber, backspace, no keyboard — *added by 3.5* |

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

**Landed 2026-08-16** (PR #108, merged to `epic/cube-flow`). Three behaviours
above held as written. **A fourth was found in the build and is the one worth
remembering:** `HubScreen` reads each game's Continue badge *on mount and never
again* — which the old router made sufficient by unmounting the hub behind an
open game. A stack keeps it mounted underneath, so the badges would have shown
the state you *started* the game with. `HubRoute` in `App.js` remounts it on a
**blur→focus round trip** (not focus alone: the initial route is focused as it
mounts). See §5's entry — the same trap is waiting for `CubeHome` in Step 2.

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

**Landed 2026-08-17** (PR #109, merged to `epic/cube-flow`; device pass passed
with nothing found). `CubeScreen.js` is 1525 lines → 78, a shell over
`CubeContext` + `CubeHome` + `CubeSolve`, with `cubeChrome.js` (shared styles, the
header button, the loading view) and `useCubeStage.js` (the cube's measurement)
between them. Three things the brief did not predict, all found in a browser:

- **The restore cannot be dispatched on the navigator's first commit.** A
  screen's mount effect runs *before* its navigator's, and the navigator commits
  its initial state in one of those — so the reset is accepted, appears in
  `getState()`, and is then overwritten. The screen never mounts and nothing
  says so. `CubeHome` waits a commit; see its comment.
- **A route in a `reset` payload with no `key` is a new route.** The first fix
  rebuilt the home route, which remounted `CubeHome`, which read the same flag
  and restored again — a loop at about a frame a second. The payload keeps the
  home route's key, *and* the flag is cleared once acted on.
- **`solving` did not become nothing, it became `solveOpen`.** The file has to
  say whether the solve screen was on the stack, or a resume drops you on the
  scramble; `workspace.solveId` is written *only while the solve route is
  focused*, so one field says both. `openId` keeps V1's meaning underneath —
  the page you are on for this scramble — which is what keeps Solve resuming
  the page you left. Pre-Step-2 files are read by shape: a `solving: false` in
  one still means "the scramble is where I was".

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

**Landed 2026-08-17** (PR #111, against `epic/cube-flow`; **device pass passed
over two rounds** — the first found 3a and 3b below, the second confirmed both
fixes with nothing further). `CubeSolveList`,
`CubeSolveMenu`, `recency.js` and `solveCards.js` are new; `CubeSolvesModal`
became `CubeCompareModal`, the Compare half of itself. **Three calls the brief
did not make, all forced by measurement or by the browser:**

- **The header fits four controls at 320 points, and the step needed six.** The
  home button takes 38, each control 39, and `ScreenHeader`'s dense right-hand
  column does not shrink — so what gives is the title. Four leave 94 points for
  it, five leave 55, and `Scramble` is 77. Two consequences: the title dropped
  from `Cube Scramble` to **`Scramble`** (the pair now reads `Scramble` /
  `Solve 3`), and **`Reset the view` came off the scramble screen** — on the
  solve screen that button means *back to the hold you chose*, and here it only
  ever meant "back to a default nobody picked". It is the one V1 affordance this
  step removes.
- **Compare is a button beside `+ New solve`, not a header icon.** It was the
  sixth control and there was not room for a fifth. This is open question 2's own
  alternative, and it costs the cube nothing extra — it shares the action row the
  new-solve card was already paying for. It is *also* still on the solve screen,
  in the notebook button's slot, since "is this better than last time" is a
  question you ask while writing.
- **The list ends in a 14-point peek, not a clean edge** (found in a browser at
  320×568). Two whole cards with a third behind them draws a list that looks
  finished, with nothing on screen saying the third solve exists — the scrollbar
  is off, and on a phone it only appears once you are already scrolling.

**Layout, in points (§8.6).** The `bottomRow` went — **−44** (a 34-point button
row, 6 above and 4 below) — and the list block arrived: a capped scroll, a
6-point gap and a 37-point action row. The cap is `visibleCards ×
(CARD_HEIGHT + CARD_GAP) + CARD_PEEK` = **126** at two cards and **182** at
three, so the block is **+169** on a short phone and **+225** on a tall one, for
a gross **+125 / +181**.

What that actually costs the cube is less, because the cube is **width**-capped
on every phone and the slack absorbs the first of it. Measured in the browser at
each viewport, before → after, by how many solves the scramble has:

| | before | 0 solves | 1 | 2 | 3+ |
|---|---|---|---|---|---|
| 320×568 | 300 | 278 | 252 | 196 | **182** |
| 375×667 | 355 | 355 | 351 | 295 | **281** |
| 393×852 | 373 | 373 | 373 | 373 | **373** |

So the tall phone pays **nothing**, the 667 pays nothing until the second solve,
and the small phone is the one that pays — **−118 at worst**, landing at 182,
which is still half again V1's 123-point solve-screen cube at the same size.
Step 8's table should be re-based on this plus Step 2's −28 on the solve screen.

#### Step 3a — the resume remount had to go (found on a device)

**Reported by the operator against the `pr-111` build**, and the first finding of
this epic that a browser could not have produced:

> *"If I am on the solve screen and I background the app and then I come back. I
> briefly see the solve screen, but then I also see a slide animation like a push
> onto the navigation stack."*

Exactly what it says. `App.js` bumped `appKey` on `AppState → 'active'` and keyed
it onto the open game, so a resume **remounted the whole cube screen** — which
also reset the cube's *own* navigator to its first route. `CubeHome` then read
`workspace.solveId` and dispatched a `reset` to put the solve back, and **a
native stack animates a route it is handed**. Step 2's comment claimed "there is
nothing to animate"; that was the intent and not the behaviour, and under
`react-native-web` `react-native-screens` no-ops, which is why three browser
passes across two steps never showed it.

**The fix is to stop remounting, not to suppress the animation.** The cube has
not needed the remount since Step 2: `CubeContext` owns everything persisted
above both screens and flushes on the way out, so on resume the state in memory
is *fresher* than the file and re-reading it replaces it with an older copy of
itself. Suppressing the slide would have meant racing a `stackAnimation` prop
change against the transition — untestable from a browser, and it would have left
the app rebuilding a stack it never needed to tear down.

- `games/registry.js` gains **`keepsStateOnResume`**, and the cube sets it.
  `App.js` bumps the key only for games without it, so **Sudoku and Fungiku keep
  the remount they rely on** — verified: both reopen their difficulty modal on
  resume exactly as before.
- **What the remount was quietly enforcing is now written down.** §7.1's
  right-hand column — the scrub position and the turn speed do not survive a
  background — was true only because the hook was being thrown away. It is
  `rewind` in `useScramblePlayer` now, called from a new `useAppBackground`.
- **`background`, not `inactive`.** The save flush deliberately treats `inactive`
  as leaving, because flushing early is free. Throwing away where the operator
  was standing is not: a glance at Control Centre must not lose their place.
- `CubeSolve` clears its half-finished pad gesture on the same signal — the
  promotion expires on its own, an armed `′` has no clock.

**The restore path survives for cold starts**, which is what it was always for,
and a cold start may still show the transition. That is one slide while the app is
launching instead of one on every resume.

Verified in a browser by driving `visibilitychange`: the solve screen stays put
with its moves intact, the scrub position goes back to the end and the speed to
1×, the scramble screen stays on the scramble, and there is no spinner and no
route change. **Confirmed on a device** in the second round — the bug was
device-only and so is the proof.

#### Step 3b — the long-press got a control, because it had no reason to be found

**Open question 3, answered by the device pass rather than argued about.** §3.3
put rename / duplicate / clear / delete on a long-press, on the argument that the
design draws a clean card and the picker it replaced needed four icons per row.
The operator's verdict (2026-08-17):

> *"I don't miss the reset view but the long press honestly I'm not even sure
> what you're talking about"*

That is a stronger result than "hard to find". The standard objection to a
long-press is discoverability, and the usual answer — *it is there for people who
look* — assumes something on screen gives them a **reason to look**. Nothing did.
A gesture nobody knows exists is not a hidden affordance, it is an unshipped
feature.

So the card gets a **`⋯` button**: one 32-point target at its trailing edge,
opening the same `CubeSolveMenu`. That is the middle of the three options question
3 listed — not four icons on the card, and not an overflow buried in the solve
header two screens from the list. The long-press stays as a shortcut, costing
nothing.

**Two structural notes for anyone touching this card again:**

- **The body and the `⋯` are siblings inside a plain `View`, never a `Touchable`
  nested in a `Touchable`.** React Native gives the inner one the responder and
  the outer never fires; `react-native-web` runs on pointer events that bubble,
  so a nested menu tap would open the sheet *and* push the solve. This is the
  same web-vs-native divergence class as §5's style-variant rule.
- **The body owns the chevron**, so the tappable region is the whole card less 32
  points and there is no dead strip at the right edge.

Costs the cube **nothing** — the card's height is unchanged, so `solveCards.js`'s
cap and the §3.3 table above still hold. Verified at 320 and 393: the menu opens,
does *not* also push the solve, the two targets do not overlap (body 244pt, menu
32pt, overlap 0 at 320), tapping the body still opens the solve, and a 26-character
name still fits without clipping.

### 3.3.5 Step 3.5 — turn the cube by dragging it

**The brief is `docs/cube-touch-exploration.md`**, which is a full design
document rather than a section here — this entry is what the *epic* needs to know
about it. Read that document's §8 before its §3: the exploration ran four rounds
past the build this step carries, and §8 is the record of which are in, which are
out, and which was built, reverted, and must not be rebuilt from first
principles.

Put a finger on a sticker and drag: that layer follows it. Past the detent,
letting go carries the turn round and writes the move; short of it, it springs
back and writes nothing. **A finger on the cube — or within a fingertip of its
silhouette, so corners count — turns it and never pans; only two fingers, or a
finger clearly off the cube, orbit** (operator, 2026-08-18). Landing on the seam
between two pieces turns both layers — a wide turn. The face pointing at you has two ways
in: **land a finger on a corner of it and drag round** (the easy one, §3.3d), or
draw a right angle in the middle of it (§3.3c). A straight drag across the middle
of that face cannot turn it — the rotation axis is `normal × direction`, and on
the facing face both lie in the plane of the screen — which is why it takes a
corner or a shape. Two same-direction spins are folded into a half turn (`F F` →
`F2`), but as a *storage* step run after the turn settles, not during it — a
gesture that promoted a move mid-draw would flash, so drawing and folding are
kept apart (exploration doc §8.10). A
layer turned and immediately turned straight back comes off the solve entirely —
figuring a piece out with a finger is quick and common, so the there-and-back is
dropped rather than written down.

Only on the solve screen, and only once the hold is locked in — inspection is
panning to *choose* the hold, and a layer turning during it would change the very
thing being chosen. **Web degrades to orbit-only**, which has consequences below.

**Why it fits the epic rather than fighting it:** the gesture commits through
`editOpen` + `withMoves` + `appendToken` — the sanctioned funnel, no second door
— so a gesture-entered move is phase-clamped, persisted and comparable
like any other. It adds **no** sanctioned edit outside `games/cube/`, and it
costs the cube **zero points**: no new rows on either screen.

**What it changes about the steps after it:**

- **Backspace remains the recovery path.** Device testing of PR #119 found that a
  session-only history strands persisted moves, while persisting a complete
  authored-action timeline would be a new storage model with no honest migration
  for existing flat algorithms. The operator chose the direct tool: Backspace
  stays, including its backwards animation and held repeat.
- **It answers V1's open question 13, and that became Step 9.** Question 13 said
  the next layout win must come from *hiding* chrome rather than cutting it. With
  the cube as a full input, the 152pt pad can be *hidden* — the swipe mode of
  Step 9 — not merely shrunk. **This step deliberately does not touch
  `PAD_LAYOUT`**, so Steps 5 and 8 inherit it exactly as written, and Step 9
  spends the room. The pad stays the only way to write `x`/`y`/`z` and a rotation
  the fingers cannot reach, so it is hidden, never removed.
- **Steps 5 and 7 need no structural change and get easier.** The rail counts a
  gesture move for free — worth one pinning test in Step 5. Step 7's "retrying
  always forks" is worth far more with a cheap input.
- **§5's browser warning gets sharper.** This is orbit-only on web, so **no
  browser pass can check the primary input path** — the same blind spot as Step
  3a's `react-native-screens` finding. Two of the three things this epic most
  needs to verify are now device-only.
- **It settled a seam every future move-entry path now obeys (§5, §8.10).** A
  gesture draws exactly the quarter the finger turned and tidies the *storage*
  afterwards, at rest — the fold to `F2`, the cancel of `L L'` — because
  rewriting a move's `amount` while it is still animating remounts the layer and
  flashes. Drawing and storage are two concerns; anything that writes a move has
  to keep them apart.

**Not in this step, designed in the exploration doc's §8.4:** configurable
gesture profiles — named sets of *how a turn is identified*, *how fast the cube
turns* and *how forgiving the hit targets are* (operator, 2026-08-18). The seam
is a `recognize(gesture, snapshot, tuning)` interface, and every pure function
already takes its tuning as an argument, so it is a small step rather than a
rewrite. **One decision is open**: a profile is neither authored work nor view
state, so §7.1 does not rule on it — it is a *preference*, and there is no
settings store in the app.

**Tests:** the exploration's own suite comes with it — the sign convention pinned
at all twenty-four face-and-direction combinations by applying the returned move
to the model and asserting the dragged sticker went the way the finger did,
rather than twenty-four answers written by hand.

**Operator tests:** write a real solve by turning the cube and see whether you
reach for it again; two-finger orbit as the price of it, and a corner grab that
turns rather than pans; the token that appears holding the cube yellow-up; wide
turns from the seam; the facing face from a corner spin (§3.3d) and from a right
angle (§3.3c); the same layer twice tidying to `F2`; a move and its inverse
leaving no trace; **no flash on any of it**, spinning one face repeatedly and
back and forth; **and background the app mid-drag** — the paths nothing here can
test.

**Landed 2026-08-18** (PR #114, merged to `epic/cube-flow`; device pass over
several rounds). It landed the whole vocabulary above, and every hard problem was
found on the phone, not in the brief — this is a gesture-and-animation step, so
the browser and `npm test` were nearly blind to all of it. Zero sanctioned edits
outside `games/cube/`.

- **The facing face got an easier way in than the brief planned.** The right-angle
  draw (§3.3c) shipped, and on a device it was still the hardest thing to invoke —
  and it is the face you reach for most. The operator's fix became **§3.3d**: land
  on the cube's corner and drag round, a *landing* rather than a shape, exclusive
  in the corner so it never fires the straight `U`/`L` underneath it. The draw
  stays as the way in from the middle of the face.
- **The §8.2 flash came back three times, and each time the cause was one bug: a
  move whose `amount` changed while it was still animating.** The renderer keys a
  polygon by *where the move sends it*, so a promotion (`F F`→`F2`, quarter→half)
  or a cancel drawn as its inverse re-keyed the layer mid-motion and remounted it.
  The fix is now a **rule** (§5, and `cube-touch-exploration.md` §8.10): a gesture
  **draws the one quarter the finger turned and nothing else**, and any change to
  the stored string — the `F2` fold, the drop of a cancelled `L L'` — runs
  **after the turn settles**, on the transport's new `afterSettle` hook, where the
  cube is at rest and the rewrite is the same permutation and redraws as nothing.
  Drawing and storage are two concerns; the seam between them is the load-bearing
  lesson of this step.
- **`afterSettle` had to fire at completion *or* interruption, never later.** A
  fold or drop left pending by an interrupted turn first surfaced on the *next*
  unrelated animation — a delayed flash. It now flushes from a tick's natural end
  and from `settle` when a turn was actually in flight, but not from the `settle`
  that opens a fresh gesture's first move.
- **A corner grab panned instead of turning.** `pickFace` is an exact
  point-in-polygon test and a fingertip at the very corner reports a point just
  outside the sticker — a miss, and a miss meant orbit. `nearestFace` widens the
  "is the cube touched" test to a margin (`NEAR_MARGIN`), so a finger on or at the
  cube turns and only a finger clearly off it pans; the *move* still comes from an
  exact hit, so no token changed. Two fingers orbit anywhere, unchanged.
- **A mistake counter was built and then taken back out** at the operator's call
  — the `cancelInverse` cancel is wanted on its own; a running tally over it was
  not, yet. `cancelInverse`/`cancelTail` stay; the `mistakes` field and its meter
  are gone. If a per-attempt fumble count returns it belongs where Compare reads
  it (§6, open question).
- **Configurable gesture profiles (§8.4) and the pad-hide swipe mode (Step 9) came
  out of this step but did not ship in it** — both designed in the plan and the
  exploration doc, both deferred so the input itself got onto a phone first.

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

#### What landed

**Landed 2026-08-19** (PR #115, merged to `epic/cube-flow`; device pass passed
with nothing further). **All of the above, plus two operator decisions taken before a line was
written**, because both of them changed what got built:

- **Open question 1 — a "no method" option: yes.** The sheet offers **Roux ·
  CFOP · Freeform**, and Freeform stores `method: null` — *the same value* a
  pre-Step-4 solve carries. That is what makes it nearly free: the null branch
  has to exist regardless, since Step 5 keeps `CubePhaseStrip` alive for the
  solves already in the operator's file, and a scratch attempt is just a new
  solve landing on it. The alternative would have made `null` a value with no way
  to reach it, and forced a scratch attempt to call itself Roux.
- **Open question 8 — recency: `savedAt` keeps its meaning and `editedAt` joins
  it.** The operator picked the two-field answer over both "leave it" and
  "redefine `savedAt`". So `savedAt` is still *when the solve was started*, a new
  `editedAt` is *when it was last written to*, `lastTouched(solve)` is the one
  reader and falls back to `savedAt` for every record written before this step,
  and **the card reads it while nothing sorts by it** — a list that re-sorted on
  every keystroke would reshuffle under the thumb that was writing
  (`updateSolve`'s own objection).

`editedAt` is bumped by `editSolve`, which is `updateSolve` plus the stamp;
`editOpen` and `clearSolveById` are built on it, so every authored change is
stamped in one place. **`renameSolve` deliberately is not** — a name is not the
work, and renaming a solve three days later does not make it a solve you were
writing three days later.

**`PHASE_METHODS` is gone** from `solveList.js`; `METHODS` in `games/cube/
methods.js` replaces it and `CubePhaseModal` reads it there. `methods.test.js`
pins the promotion against a **literal copy** of the old table — a copy rather
than an import, because a test that read the live one would pass by construction
and pin nothing.

**`comparePhases` seeding, precisely.** `methodOrders` hands `mergeLabelOrder` one
extra sequence per distinct method in play, **filtered to labels some attempt
actually marked** and fed *first*. So the method decides where its own stages
sit, the solves' own sequences are left to place anything it has never heard of
(free text, or a marker from before this step), and no column is invented for a
stage nobody reached. With no methods stored — every file written before this
step — the seed is empty and the merge is exactly the merge it always was.

**Layout, in points (§8.6): the cube pays nothing on either screen.** The sheet
is a modal and adds no row; the method rides on rows that already existed. The
cost is horizontal and only on the solve screen, where the tag sits in the
header's `actions` (there is no slot beside a `ScreenHeader` title, and this epic
is not spending a third sanctioned edit outside `games/cube/` on one). Measured
in a browser, the tag is **34 points** of the right-hand column at every width,
and since `rightSectionDense` has `flexShrink: 0` it comes off the title column:

| Width | Title column, before | After |
|---|---|---|
| 320×568 | 141 | **107** |
| 375×667 | 196 | **162** |
| 393×852 | 214 | **180** |

At 375 and above a 13-character solve name still fits whole. **At 320 it
truncates by about two characters** — `Jumped to LSE` draws as `Jumped t…` — and
the scramble subtitle, already ellipsized there, loses a little more. That is the
one thing on this step worth an opinion on a device, and it is cheap either way:
**from Step 5 the rail *is* the method**, spelled out in stages, and the tag can
go.

On the card the method is an accented span **on the meta line, not a bordered
chip** — a chip is 20-odd points tall and that line is 14, inside a card whose
height is a constant `solveCards.js` derives the list's cap from. `CARD_HEIGHT`
is untouched, so the cap and the peek are too.

**Verified in a browser** (Playwright against the web build, three viewports,
**zero console errors** at each): the sheet opening from `+ New solve`; Roux,
CFOP and Freeform each showing their stages (and Freeform its sentence); Start
solve creating and pushing; the tag in the solve header through inspection and
writing; `9 moves · Roux · in progress` on the card; **a seeded pre-Step-4 save
file opening with every marker intact** — including a free-text `M-slice tricks`
— with no method segment on its cards and no tag in its header; the sheet
defaulting to Freeform after a legacy newest solve; **two same-method attempts
whose label orders disagree comparing as `First block · Second block · LSE`**
where before this step they compared as `First block · LSE · Second block`; and
the page still not scrolling while the list does.

**What a browser pass did *not* cover, and §5's warning applies:** everything the
device found in Steps 3 and 3.5 was invisible here. Specifically untested by the
above — the modal's feel on iOS (a fifth `Modal` on this screen, opened one at a
time on purpose), whether the tag's 34 points are worth it in the hand at 320,
and whether the nested `<Text>` on the card renders the same on a phone as it
does under `react-native-web`. Colour and weight only, no font size, is the
reason to expect it does.

**The device pass retired all three questions** (operator, `pr-115` preview,
2026-08-19): the method sheet felt right on iOS, the 34-point header tag was
worth its cost at the narrow width, and the card's nested method text rendered
correctly. The operator also confirmed the migration on the pre-Step-4 save —
its existing solve opened with its old markers intact. Nothing further was
found.

### 3.5 Step 5 — the phase rail, and the flag key retires

- **The rail is pre-built from `solve.method`'s stages, and pill state is derived
  rather than stored.** A stage with a marker is *locked* (green check, final
  count); the first without one is *open* (accent outline, a live count that
  accrues every typed move); the rest are dashed *upcoming* and not tappable.
  Because the count derives from `moveCount(solve.alg)`, a gesture move counts for
  free — and so does its **tidy**: when Step 3.5's fold settles `F F` → `F2` or a
  cancel drops `L L'`, the alg shortens and the open pill's count follows on the
  same read. Nothing special is needed; it is a fact about the string. Worth one
  pinning test that the count is `moveCount`, not a running tally the fold could
  desync.
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
  `PAD_LAYOUT.length === PAD_COLUMNS * PAD_ROWS`. The retired flag slot remains
  a documented gap. Preserve it until a real control earns the cell; do not fill
  it merely to make the grid look complete.

**Tests:** extend `solveList.test.js` for `endPhase` at `moveCount(alg)`. New
`phaseRail.test.js` for a pure `railStates(method, phases, alg)` — the
locked/open/upcoming derivation is exactly what `trackLayout.js` and
`compareLayout.js` set the precedent for putting in its own file.

**Operator tests:** the rail shows the method's stages from the first move; the
open pill counts up as you type; tapping it locks with the right count and opens
the next; a legacy solve still shows its old chips; the pad has no flag key.

**Landed 2026-08-19** (PR #118, merged to `epic/cube-flow`). The method rail is
a permanent, horizontally scrolling 28-point row; the old naming modal and flag
key are gone, with the flag's pad cell left as a deliberate gap. Freeform and
legacy solves keep their read-only phase strip. The
Step 4 header tag retired too: the rail now says the method in full, returning
34 horizontal points to the solve title without changing the cube's height.

The first device pass found two related state-derivation bugs that the component
shape did not make obvious:

- The next stage initially inherited the completed stage's count. The generic
  `openPhaseStart` helper intentionally looks *strictly before* a boundary so
  the old modal can rename a just-closed phase; that is the wrong arithmetic for
  a rail standing just after the divider. The rail now measures from the locked
  span's `end`, so the next stage reads `0` immediately and `1` after its first
  move.
- Stored labels were initially treated as an independent checklist, so an
  out-of-order `Second block` marker could lock ahead of `First block`. A method
  is a sequence: only the consecutive prefix matching `method.stages` is locked,
  exactly one following stage is open, and everything after it is upcoming.

**Device pass: passed, 2026-08-19** (operator, `pr-118` preview), after the two
fixes above. The operator confirmed the ordered progression and zero-count
handoff were *"pretty dang good"*. The pass also covers the phone-only primary
input path: finger turns accrue to the open stage and their settled tidy is read
from the algorithm rather than from a second counter.

### 3.6 Step 6 — undo and redo of whole actions — dropped

**Dropped 2026-08-19 after device testing PR #119; the PR was closed unmerged.**
The implementation proved the requirement was wrong for this notebook. A
session-only ring stopped at the moment the solve was opened, leaving older
persisted moves unreachable once Undo ran out. Making Backspace a fallback did
not fix the model: its first deletion created history and changed the control
back to Undo. Keeping three independent controls displaced the algorithm keyboard
and crowded the solve header.

Persisting the ring was rejected rather than promoted into scope. Persisting only
the current session merely moves the same boundary across a cold start; removing
that boundary requires the complete authored-action history from solve creation.
Existing flat `alg` strings cannot be migrated honestly into that model — a pasted
algorithm and the same tokens entered one by one have indistinguishable saved
state but different action boundaries. Variations would make every snapshot larger
and raise a second source-of-truth problem.

**Decision:** keep Backspace as the durable, direct move-removal tool. Keep its
backwards `retract` animation, marker clamping through `withMoves`, and held repeat.
The retired flag cell remains empty. A mistaken rail lock or variation choice gets
an explicit domain action if device use proves it needs one; it does not justify a
general history subsystem. No code from PR #119 lands on `epic/cube-flow`.

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
- `sanitizeSolves` gains a `sanitizeVariations` beside `sanitizePhases`, clamping
  `phaseAt` to a real marker and dropping unparseable algs — the same shape-based
  tolerance as everything else on the read path.

**Tests:** `variations.test.js` — fork/switch round-trips preserve structure;
switching twice returns the original; `best` ties break deterministically; a
variation pointing at a dropped marker is discarded on load.

**Operator tests:** lock a phase, "try again", write a shorter run, see it marked
best, switch between them and watch the cube replay from the phase's entry; switch back
to the original explicitly; background and resume with variations stored.

### 3.8 Step 8 — the layout budget pass

V1 §8.6's rule is that the cube is sized first and every other row justifies
itself in points. Open question 13 says the next win must come from **hiding**
chrome rather than cutting it — and gesture input (Step 3.5) is what makes the
biggest piece of chrome, the pad, hideable. **That hide is its own step (Step 9);
this one is the steady-state accounting** with the pad shown, and it is close to
neutral by construction:

| Row | Change |
|---|---|
| `solveBar` (~27pt) | **removed** — its content is the solve header's subtitle now |
| header subtitle | **+~12pt** — the dense header gains a permanent second line |
| `CubePhaseStrip` (~28pt, conditional) | replaced by `CubePhaseRail` (~28pt, **permanent**) |
| tick track | **not rebuilt** |
| pad | unchanged at 152pt — flag out, its cell remains empty; Backspace stays |

Net ≈ **+13pt** against V1's ~340pt of fixed rows in writing mode. **Verify by
measurement at 320×568, 375×667 and 393×852** — the three widths §8.8 already
reasons about — and confirm `LEGEND_MIN_HEIGHT = 780` still drops the pad legend
in the right place. **Put the numbers in the PR**, as every layout-touching step
in V1 did.

If the rail pushes the small phone past its budget, **the rail is the row that
scrolls**, horizontally, as `CubePhaseStrip` already does
(`CubePhaseStrip.js:84-89`) — not the cube that shrinks.

### 3.9 Step 9 — swipe mode, hiding the pad

**Added by Step 3.5, and the concrete answer to V1's open question 13.** Once a
finger can write every layer, every wide and the facing face (§3.3d), the pad is
no longer the *only* way in — so a drilling session that is all swipes can hide
it and give the room back to the cube. The operator's ask, 2026-08-18: *keep the
keyboard, but let someone who is just swiping hide it and see only the scrubber.*

- **A toggle, not a mode you get trapped in.** The pad hides and shows on demand;
  it is never removed, because it is still the only way to write `x`/`y`/`z` and
  the wide turns a finger cannot reach. Hidden, the solve screen is **cube +
  move track + phase rail + scrubber + Backspace** — everything about *the moves*
  stays; only the keyboard goes.
- **Backspace needs an off-pad home only when the pad actually hides.** Do not
  pre-place it in an earlier step. Start with the operator's proposed compact
  control right-aligned above the scrubber, then judge the composition on a phone.
  It calls the existing Backspace path; there is no history state to mirror.
- **The budget, the other way.** Step 8 accounts for the pad *shown*; this is the
  pad *hidden*: **−152pt of pad** (and its legend), all of it back to the cube.
  On the 320×568 phone that is the difference between a 182pt cube and something
  close to the inspection screen's near-doubled one. **Measure at the three
  widths and put the numbers in the PR**, both states.
- **The toggle is a preference, like the gesture profile (§8.4) and the tuning
  panel.** Neither authored work nor view state, so §7.1 does not rule on it; it
  wants the same small `preferences` slice on `CubeContext`'s save file that
  those want, migrating by shape. Decide the three together rather than inventing
  a settings home three times.
- **Auto-hide is a question, not an assumption.** The app could hide the pad the
  first time a finger writes a move and show it on the first pad tap. Cheaper than
  a toggle to reach, invisible like every gesture this epic has had to give a
  control (open questions 3 and §3.3d). Ship the toggle; let a drilling session
  say whether the auto-hide earns its surprise.

**Tests:** the mode is layout, which the node runner cannot see, so the pins are
on the *preference* — its default, its persistence by shape, and that hiding the
pad does not drop Backspace (a pure check that its off-pad control calls the same
handler as the pad).

**Operator tests:** hide the pad mid-solve and keep writing by finger; Backspace from above the scrubber with the pad gone; the cube measurably bigger; show the pad
again for an `x` rotation; background and resume with the pad hidden; and the
`x`/`y`/`z` reachability that keeps it a hide and not a removal.

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
- **Sudoku and Fungiku.** Outside `games/cube/`, this epic edits only what each
  step has sanctioned in its own PR — `App.js` + `package.json` (Step 1), four
  optional `ScreenHeader` props (Step 2), and `games/registry.js` + one `App.js`
  line (Step 3a). **Step 3.5, for all it added, touched only `games/cube/`** — the
  cleanest step by that measure, and Step 9 (swipe mode) is expected to stay
  inside it too. Nothing else in the app should move a pixel, and Step 1's whole
  design is to make that checkable.

## 5. Things that are easy to get wrong

- **A native stack animates any route you hand it, including a restore.** Step 2
  asserted that a `reset` had "nothing to animate" and Step 3a found out
  otherwise, on a device: a resume rebuilt the cube's stack and the solve slid in
  over itself. `react-native-screens` no-ops under `react-native-web`, so **no
  browser pass can see this class of bug** — and the answer was to stop rebuilding
  the stack rather than to fight the animation (§3.3's Step 3a).
- **The browser now has two holes in it, not one.** `react-native-screens`
  no-opping under `react-native-web` was the first; Step 3.5's gesture input
  degrading to orbit-only on web is the second, and it is the bigger one, because
  what a browser cannot check is now the *primary way a move gets written*. A
  step that says "verified in a browser" has to say **which** of its behaviours
  that covers.
- **A remount is a very big hammer for "re-read your state", and it resets any
  navigator inside it.** `App.js`'s `appKey` is fine for a game that is one
  screen and hydrates on mount; it was wrong for a game that owns a provider and
  a stack. `keepsStateOnResume` in `games/registry.js` is the opt-out.
- **A screen under a push stays mounted, so "read it on mount" stops being
  enough.** This is what the navigator changed about the app, and it cost Step 1
  a fix the brief had not predicted: the hub read its Continue badges on mount
  and nothing refreshed them once a game was pushed over it rather than
  replacing it. **Step 2 inherits the same trap** — anything `CubeHome` computes
  once at mount is stale the moment a solve is pushed and backed out of. The
  answer is either state that lives above both screens (which is what
  `CubeContext` is for) or an explicit remount on a blur→focus round trip, as
  `HubRoute` does. It is never "it worked before".
- **`editOpen` is the only edit funnel and must stay so.** Two writers to the
  solve list is how the file and the screen learn to disagree.
- **Drawing a move and storing it are two concerns — keep them apart (§8.10).**
  Step 3.5 learned this the hard way, three times. The renderer keys every polygon
  by where a move *sends* it, so a move that changes its `amount` while it is
  animating — a quarter promoted to a half, an original swapped for its inverse —
  remounts the layer and flashes. So a move is **drawn once, as the one quarter
  the finger (or key) turned**, and any tidy to the stored string — the fold to
  `F2`, the drop of a cancelled pair — runs **after the turn settles**, on a cube
  at rest where the rewrite is the same permutation and redraws as nothing. The
  transport carries an `afterSettle` hook for exactly this. Any new move-entry
  path this epic adds obeys the same rule, and the standing renderer prerequisite
  (a polygon key that survives a changing sweep) is the only thing that would
  lift it.
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
- **The device is the only evidence that counts for feel.** Every flash and
  double-draw this epic fought was invisible in the browser and to `npm test` —
  a hook and a renderer the node runner cannot mount. Steps 1, 3.5, 6, 7 and 9
  touch animation, gesture or layout; each needs a device pass, and **write down
  when a finding came from a device.** Gesture input made this rule sharper: it is
  now the *primary* input, and it is orbit-only on web, so a browser pass no
  longer covers the main path at all.
- **There is no lint and no typecheck in this repo.** `npm test` and the operator
  are the whole net, which is why every derivation that could be wrong belongs in
  a pure module with its own suite rather than inside a component the runner
  cannot render.

## 6. Open questions for the operator

1. ~~**Does the rail want a "no method" option?**~~ **Answered: yes** (operator,
   2026-08-18, before Step 4 was written). The sheet offers **Freeform** beside
   Roux and CFOP, and it stores `method: null` — the same value a pre-Step-4
   solve carries, so it costs no branch that did not have to exist anyway. Open
   only to being *withdrawn* if a drilling session finds nobody reaches for it.
2. ~~**Where does Compare belong now?**~~ **Answered by building it** (Step 3):
   the home header was full at four controls, so Compare is a button beside
   `+ New solve` — this question's own alternative. Also on the solve screen, in
   the notebook button's old slot. Open only to being moved, not to being decided.
3. ~~**Is long-press the right home for rename / duplicate / delete?**~~
   **Answered: no** (operator, device pass 2026-08-17 — *"the long press honestly
   I'm not even sure what you're talking about"*). Step 3b gave the card a `⋯`
   button, which is the middle of the three options this question listed. The
   long-press remains as a shortcut. **The lesson generalizes and the next
   invisible-gesture proposal should cite it:** discoverability is not "will they
   find it if they look", it is "is there anything giving them a reason to look".
4. **Should the rail lock automatically?** Tapping to lock is explicit and cheap,
   but the app knows the stage is finished the moment the cube reaches that
   stage's goal state — V1's untaken analysis step is exactly the machinery that
   would know. Deliberately not assumed here.
5. **Does the tick track come back once the rail exists?** Decided *out* for this
   epic on V1's evidence. The design redraws it grouped by phase, which is the
   version that was never tried. One drilling session with the rail settles it.
6. **How many variations is too many?** No cap is specified. `MAX_PHASES` is 40
   and `MAX_SOLVES` 100; variations need a number before the file finds one.
7. ~~**Does the scramble screen miss `Reset the view`?**~~ **Answered: no**
   (operator, 2026-08-17 — *"I don't miss the reset view"*). Step 3's
   four-control header stands; the solve screen keeps its own `Back to the
   starting view`, which is the one pointing at a place the operator chose.
8. ~~**Should a card's recency be when the solve was *started* or when it was
   *last written to*?**~~ **Answered: both, as two fields** (operator,
   2026-08-18). `savedAt` keeps meaning *created* — nothing already in a save
   file was redefined — and `editedAt` joins it meaning *last written to*, which
   is what the card reads through `lastTouched`, falling back to `savedAt` for
   every record that predates it. Landed in Step 4. **Nothing sorts by it**, so
   the list still does not reshuffle under a thumb that is writing.
9. ~~**Should folds and cancels be undoable?**~~ **Closed with Step 6.** There is
   no history ring. Folds remain settled storage tidies; an immediate inverse
   remains a fumble that disappears. Backspace removes the last stored move.
10. **Does the pad auto-hide, or only toggle?** Step 9 ships a toggle and asks
    whether the pad should hide itself the first time a finger writes a move and
    return on the first pad tap. It is invisible, which is the standing objection
    (question 3); the counter is that a solver who has started swiping has already
    shown their hand. One session with swipe mode settles it.
11. ~~**Is the method tag worth 34 points of the solve header at 320?**~~
    **Answered: yes for Step 4** (operator, device pass 2026-08-19). The narrow
    title and subtitle were acceptable in the hand. It remains a stopgap by
    construction: from Step 5 the rail *is* the method, so Step 5 may drop the
    tag rather than paying twice to say the same thing.
12. **New in Step 4: should the sheet remember the last method, rather than
    deriving it?** `defaultMethod` opens the sheet on the method of the newest
    solve *for this scramble* — derived, stored nowhere, and right for the common
    case of trying the same scramble again. A *remembered* pick would be a
    preference, which is question 13's problem, and inventing a store for it here
    is how two of them come to exist.
13. **Where do the preferences live, and are they offered together?** Three
    settings now want a home: the gesture profile (§8.4), the tuning numbers, and
    the swipe-mode toggle (Step 9). None is authored work or view state, so §7.1
    does not rule on them — they are *preferences*, and the app has no settings
    store. Decide the store once, and whether these are one screen or scattered
    controls, before the second one invents its own.

**Three things Step 3's device pass settled by silence**, and they are closed
rather than carried: the 14-point list peek reads as "more below"; a 182-point
cube at 320×568 is enough; and the cold-start slide — the one path that still
rebuilds the stack — is not worth the animation race Step 3a declined. All three
are cheap to revisit if a fortnight of drilling changes the verdict.
