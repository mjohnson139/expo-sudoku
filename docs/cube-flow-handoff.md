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
  had); and **Step 3a** (`keepsStateOnResume` in `games/registry.js` plus the one
  line in `App.js` that reads it, so the cube opts out of the resume remount —
  Sudoku and Fungiku keep theirs). **Step 4 needed no fourth** — the method
  sheet, the card's method segment and the solve header's method tag are all
  inside `games/cube/`. A step that needs one should say why in its PR. **`utils/buildNotes.js` does not count** — the release entry is mandated
  by the plan, and every step extends `3.2.0`'s.
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

## What landed in Steps 1–3 (still current)

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
- **The card's management menu is a `⋯` button, and the long-press is only a
  shortcut** (Step 3b). Step 3 shipped long-press alone and the device pass killed
  it: *"the long press honestly I'm not even sure what you're talking about"*.
  Two things to preserve if you touch the card — **the body and the `⋯` are
  siblings inside a plain `View`, never nested Touchables** (RN gives the inner
  one the responder, `react-native-web` bubbles and would fire both), and **the
  body owns the chevron**, so there is no dead strip at the right edge. The card's
  height did not change, so the list's cap is untouched.
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

**Step 3a — the resume remount is gone, and this is the one to read twice.** The
operator found it on a device against `pr-111`: backgrounding the app on the solve
screen and coming back showed the solve, then **slid it in over itself**. A resume
was remounting the whole cube screen (`appKey` in `App.js`), which reset the
cube's own navigator, which made `CubeHome` dispatch a `reset` to put the solve
back — and **a native stack animates a route it is handed.** Step 2's comment
claimed a `reset` had nothing to animate; it was wrong, and `react-native-screens`
no-ops under `react-native-web`, so **no browser pass can ever catch this class of
bug.**

What Step 4 needs to know about the result:

- **The cube does not remount on resume.** `keepsStateOnResume` on its
  `games/registry.js` entry; `App.js` keys `appKey` only onto games without it.
  So anything a cube screen or hook computes at mount now survives a background —
  the same trap as "a screen under a push stays mounted", one level up. If Step 4
  adds state that must not survive the app leaving, `useAppBackground` is where
  that goes, not a remount.
- **`useScramblePlayer.rewind`** is §7.1's right-hand column made executable: on
  `background` the transport goes back to stopped, fully applied, 1×. It used to
  be true only because the hook was being thrown away.
- **`background`, not `inactive`.** `CubeProvider`'s flush keeps `inactive`
  because flushing early is free; discarding where the operator was standing is
  not, and iOS reports `inactive` for a glance at Control Centre.
- **`CubeHome`'s restore effect is now cold-start only** — and all of Step 2's
  warnings about it still stand. **Do not move it.** A cold start may still show
  the slide; that was judged an acceptable one-off against racing a
  `stackAnimation` prop change.

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

**Device pass: passed, 2026-08-17** (operator, `pr-111` preview), over **two
rounds**. The first found both of the things above — the resume animation (3a)
and the invisible long-press (3b) — and the second confirmed the fixes with
nothing further.

**Both findings were device-only, and that is the point worth carrying.** One was
an animation `react-native-screens` does not run under `react-native-web`; the
other was a gesture whose whole defect was that nothing on screen advertised it.
Neither is visible to a browser pass, however thorough — three of them across two
steps saw neither. The layout numbers in this file are still browser numbers, and
the web container's padding is not a phone's safe area.

---

## What landed in Step 3.5 (still current)

**Turning the cube by dragging it** — an unplanned step that grew into the epic's
primary input. A finger writes every layer, every wide, and the face pointing at
you — landing on its corner and dragging round (§3.3d), or drawing a right angle
(§3.3c). Two same-direction spins tidy to `F2`; a move and its inverse leave no
trace. A finger on or at the cube always turns; only two fingers (or a finger
clearly off it) orbit. `docs/cube-flow-plan.md` §3.3.5 is the epic view with the
full landed note; the design brief is `docs/cube-touch-exploration.md`, whose
**§8 is the part to read first** — §8.7–§8.10 are the flash saga and its
resolution. All under `games/cube/` (`CubeSolve.js`, `CubeView.js`,
`geometry.js`, `useCubeTouch.js`, `useScramblePlayer.js`, `touchTurn.js`,
`solve.js`, plus new files) — **none of what Step 4 touches.**

**Device pass: passed, 2026-08-18** (operator, `pr-114` preview), over several
rounds — the only evidence that counts here, because this is gesture and
animation and the browser and `npm test` see almost none of it. Each round found
something a browser could not and it was fixed on the same build: the facing-face
**flash** on repeated spins (a promotion re-keying the layer mid-turn), the same
flash on a **cancel** (`L L'`, sometimes delayed), and a **corner grab that
panned** instead of turning. The last build the operator signed off carried all
three fixes.

**What it changed for the steps below — the plan is updated, this is the index:**

- **The drawing/storage seam is now a rule for everyone (§5, §8.10).** A move is
  *drawn* as the one quarter the finger turned; any *storage* tidy (the `F2`
  fold, the cancelled-pair drop) runs after the turn settles, on the transport's
  new `afterSettle` hook — because rewriting a move's `amount` mid-animation
  remounts the layer and flashes. Any new move-entry path obeys it.
- **Step 6 was dropped after device testing PR #119.** Session history stranded
  persisted moves; complete persisted history had no honest migration from flat
  algorithms. Backspace remains the direct recovery tool. Fold/cancel still run
  after settle for drawing correctness, but there is no history to coalesce.
- **Step 8 / new Step 9.** The pad can now be *hidden*, not just shrunk — the
  swipe mode of **Step 9**, the concrete answer to V1's open question 13. Step 3.5
  did not touch `PAD_LAYOUT`, so Steps 5 and 8 are unchanged as written.
- **A browser pass no longer covers the primary input path** — gesture is
  orbit-only on web, so what a browser cannot see is now the main way a move gets
  written. Say which behaviours a browser pass actually covered.

**Two things it deferred, both designed and both waiting:** configurable gesture
profiles (`cube-touch-exploration.md` §8.4 — the `recognize(...)` seam, tuning
already an argument everywhere) and swipe mode (Step 9). And a mistake counter was
built and taken back out — `cancelInverse`/`cancelTail` stay, the `mistakes` field
does not.

---

## What landed in Step 4 (read this before Step 5)

**Method as data.** `PHASE_METHODS` was a chip vocabulary in `solveList.js`; it
is `METHODS` in the new **`games/cube/methods.js`** now, as `{ id, name, stages }`
for Roux and CFOP, and **a solve stores a method id**. `docs/cube-flow-plan.md`
§3.4 carries the full landed note; this is what Step 5 has to know.

New files: `methods.js` (`METHODS`, `findMethod`, `stagesOf`, `methodName`,
`sanitizeMethodId`, `defaultMethod`, `FREEFORM_NAME`, `FREEFORM_BLURB`) and
`CubeNewSolveSheet.js`. `PHASE_METHODS` is **deleted**; `CubePhaseModal` reads
`METHODS` and `method.stages`.

**Two operator decisions were taken before a line was written**, and both are
load-bearing for Step 5:

- **Open question 1 answered: yes, there is a "no method" option.** The sheet is
  **Roux · CFOP · Freeform**, and Freeform stores `method: null` — *the same
  value* every pre-Step-4 solve carries. **So `null` is two things at once on
  purpose**, and Step 5 must not try to tell them apart: what it means is "there
  is no stage list to build a rail from", which is equally true of a legacy
  record and a deliberate scratch attempt. Both keep `CubePhaseStrip`.
- **Open question 8 answered: `savedAt` keeps its meaning and `editedAt` joins
  it.** `savedAt` is still *when the solve was started*; `editedAt` is *when it
  was last written to*; **`lastTouched(solve)` is the one reader** and falls back
  to `savedAt` for every record that predates the field. The card reads it and
  **nothing sorts by it** — a list that re-sorted on every keystroke would
  reshuffle under the thumb that was writing.

Seven things Step 5 inherits and should not rediscover:

- **`editSolve` is the stamping funnel, and `editOpen` is built on it.**
  `editSolve(solves, id, patch, { editedAt })` is `updateSolve` plus the stamp;
  `CubeContext.editOpen` and `clearSolveById` both go through it, so every
  authored change is stamped in one place. **`renameSolve` deliberately does
  not** — a name is not the work. A new write path in Step 5 goes through
  `editOpen`, which means it is stamped for free.
- **The migration is `sanitizeSolves` and nothing else, and there is no `_v`
  bump.** An absent or unknown `method` is `null`; an absent `editedAt` is the
  record's own `savedAt`; **nothing else on a pre-existing record changes.** That
  is the property to protect, because the failure is silent — a solve whose
  markers came back subtly different would still look like a solve.
  `solveList.test.js` has a *damages nothing else* test that spreads a literal
  pre-Step-4 record; keep it passing.
- **`methods.test.js` pins the promotion against a literal copy of the old
  `PHASE_METHODS`**, not against an import of it. If Step 5 changes a stage
  string, that test is what tells you a marker in somebody's file just became
  unresolvable. **Do not "fix" it by editing the copy.**
- **`stagesOf(null)` is a shared frozen `[]`.** So the rail over a legacy solve
  is *no rail*, with no branch to write and no memo churn. `METHODS` and every
  stage list are frozen — a screen that pushed onto one would be editing every
  solve that ever used it.
- **`comparePhases` is seeded by the method now** (`methodOrders`): one extra
  sequence per distinct method in play, **filtered to labels some attempt
  actually marked**, fed to `mergeLabelOrder` *first*. The method orders its own
  stages, the solves' own sequences place anything it has never heard of, and no
  column is invented for a stage nobody reached. With no methods stored the seed
  is empty and the behaviour is exactly what it was.
- **`defaultMethod(mySolves)` opens the sheet on the newest solve's method**,
  Roux when there is none. Derived, stored nowhere — a remembered preference
  would be the first entry in a settings store this epic has not decided on
  (§6 question 13).
- **The method tag on the solve header is a Step 4 stopgap and Step 5 may remove
  it.** It is a plain `<Text>` in the header's `actions`
  (`cubeChrome.headerTag`), costing **34 points of the title column at every
  width** and zero rows. At 320×568 that takes the title column 141 → 107 and
  truncates a 13-character solve name by about two characters. **From Step 5 the
  rail *is* the method**, so the honest thing may be to delete the tag — see §6
  question 11. On the card the method is an accented span on the meta line;
  `CARD_HEIGHT` is untouched, so the list's cap and its 14-point peek are too.

**Layout, in points (§8.6): the cube pays nothing on either screen.** The sheet
is a modal, and the method rides on rows that already existed.

**Verified in a browser** (Playwright against the web build, three viewports,
zero console errors at each): the sheet from `+ New solve`; all three picks and
their stage lists; Start solve creating and pushing; the tag in the solve header
through inspection and writing; `9 moves · Roux · in progress` on the card; **a
seeded pre-Step-4 save opening with every marker intact** (free-text ones
included), no method segment on its cards, no tag in its header, and the sheet
defaulting to Freeform after it; **two same-method attempts whose label orders
disagree comparing as `First block · Second block · LSE`** where before this step
they compared as `First block · LSE · Second block`; and the page still not
scrolling while the list does.

**What the browser pass could not cover:** the sheet's feel on iOS (it is the
fifth `Modal` on the scramble screen, and they are opened one at a time on
purpose), whether the tag's 34 points are worth it in the hand at 320, and
whether the card's nested `<Text>` renders the same on a phone. Colour and weight
only, no font size, is the reason to expect it does.

**Device pass: passed, 2026-08-19** (operator, `pr-115` preview), with nothing
further found. The three device-only questions above are retired: the sheet felt
right on iOS, the 34-point header tag was worth its narrow-screen cost, and the
nested method text rendered correctly on the card. The operator also opened the
pre-Step-4 save and confirmed its old markers remained intact.

---

## What landed in Step 5 (still current)

**The method rail replaced the flag flow.** A method solve permanently shows
its stages in `CubePhaseRail`; the pure `railStates(method, phases, alg)` derives
locked, open and upcoming pills. Tapping the one open pill writes the familiar
two-marker transition through `endPhase`, at `moveCount(alg)` rather than the
scrubber position. `CubePhaseModal`, the flag key, `canPhase` and `onPhase` are
gone. The empty pad cell is deliberate; preserve it until a real control earns it. A Freeform or
legacy (`method: null`) solve keeps its old `CubePhaseStrip`, read-only.

**The rail is a sequence, never a checklist.** Only a consecutive prefix whose
labels match `method.stages` is locked; the next stage alone is open and every
later stage is upcoming and disabled. This was fixed after the first device
pass found that an out-of-order Second block marker could appear complete before
First block. Keep `phaseRail.test.js`'s literal out-of-order case.

**The open count starts at the preceding locked span's `end`.** Do not replace
that with `openPhaseStart`: its strict-before-boundary semantics are correct for
the retired modal's rename case and wrong for the rail. The first build made a
new Second block briefly show First block's whole count until another move was
written. It now shows `0` on the same render that First block locks, then `1` on
the first new move. The count remains `moveCount(alg)` arithmetic, so settled
gesture folds and cancellations update it without a second counter.

**Layout, in points (§8.6).** A method solve always pays the rail's fixed **28
points** from the stage; it scrolls horizontally and never wraps. Freeform and
legacy solves still pay the old strip's 28 points only when markers exist. The
Step 4 method header tag retired because the rail spells the method out, giving
the solve title **34 horizontal points back** and costing the cube no extra row.

**Device pass: passed, 2026-08-19** (operator, `pr-118` preview), after the two
findings above were fixed. The operator called the final ordered progression and
zero-count handoff *"pretty dang good"*. This is also the evidence for the
phone-only input path: finger moves accrue to the open stage and the displayed
count follows the settled algorithm tidy. Browser gesture input remains
orbit-only and could not establish that.

---

## Dropped step — Step 6: undo and redo of whole actions

**Dropped 2026-08-19 after device testing PR #119; the PR was closed unmerged.**
Do not reimplement or revert its code on the epic branch — none of it landed
there. The device pass exposed the model problem: a session-only history stops at
the solve's opening snapshot and strands persisted moves; making Backspace a
fallback changed it back to Undo after one deletion; three separate pad controls
displaced the keyboard. Persisting only the session moves the same boundary
across cold start, while persisting complete authored history cannot migrate old
flat algorithms honestly.

**Settled replacement:** Backspace keeps its existing `retract` animation and
`withMoves` marker clamping. It stays on the move pad while shown and gets a
compact button in the transport card while hidden; both call the same path. The
retired flag cell stays empty.

---

## Dropped step — Step 7: variations per phase

**Dropped 2026-08-20 after device testing PR #121; the PR was closed unmerged.**
Retrying an earlier stage proved to be a branch of the whole remaining solve,
not one replaceable phase span. The branch-tree revision preserved the data but
made the rail and the path back to a complete attempt confusing. The scramble
screen already has the clearer model: duplicate the solve card, Backspace the
copy to the boundary, and continue; the original card remains complete. No Step
7 code or save shape lands on the epic branch.

---

## What landed in Step 8 (still current)

**The scrubber is the method-marker cursor.** Every method stage is now an edit
control: place the scrubber where that stage ends and tap its pill to create or
move the boundary. `CubeSolve` passes `player.index` to the pure
`placeMethodBoundary`; marker arithmetic still never lives in the component.
The ordinary live path is unchanged in cost because the player stands at the
algorithm end while moves are being entered.

**Markers remain boundaries, never ranges.** A stage label is stored at its
span's start and the following marker is its end. Moving First block moves the
marker carrying Second block, so only those two adjacent counts change; CMLL,
LSE and every later position remain fixed. A final boundary before the end opens
an unnamed tail. Edits before a predecessor, across a successor, out of method
order or against a legacy label are refused by `placeMethodBoundary`.

**The rail has four explicit states to preserve.** A marked pill has its derived
count; a boundary exactly at `player.index` gains the selected treatment; a
valid edit position is enabled; and a position that would cross a neighbour is
dashed, muted and disabled. The accessibility state and hint say the same thing.
Do not make the component infer validity separately from `railStates`.

**Layout, in points (§8.6).** The rail is still one horizontally scrolling,
non-wrapping **28-point** row. Step 8 added no row and did not bring back the flag
key or phase modal, so its cost to the cube versus Step 5 is **0 points**.
Freeform and legacy solves still use their read-only phase strip.

**Device pass: passed, 2026-08-20** (operator, PR #124 preview). The operator
reported that it was *"working great"*. This clean pass covers the things the
browser could not establish: pill target feel, scrubber-to-marker feel, the live
finger-entry workflow and the small-phone rail/cube layout. No device-only
finding or follow-up fix was needed.

---

## Next step — Cube Flow epic closeout

Step 9 passed its iterative device review and merged to `epic/cube-flow` on
2026-08-23 as PR #125. All planned delivery steps are now closed. Prepare the
accumulated epic for its final regression and merge to `main`.

### Scope

- Run the complete Cube Flow regression before proposing `epic/cube-flow` to
  `main`. Resolve every remaining open question below or carry it explicitly;
  do not invent another delivery feature during closeout.
- Confirm the 3.2.0 build notes and app version, and account for the outstanding
  preview/production native rebuild required by Step 1's navigator dependency.
- Open the epic PR from `epic/cube-flow` to `main` only after the accumulated
  device regression passes.

### Files to read first

- This handoff and `docs/cube-flow-plan.md`, especially §§3.9, 5 and 6.
- `games/cube/CubeSolve.js`, `swipeMode.js`, `CubeMovePad.js`,
  `useCubeTouch.js`, and `useCubeStage.js` for Step 9.
- `.github/dev-process.md` and the landed notes for Steps 1–8 before the final
  regression.

### Easy to get wrong

1. Browser gestures are orbit-only. A browser cannot prove either commit or
   cancellation behaviour; only Expo Go can pass Step 9.
2. The 44-point handle row is built into the transport card. Tap toggles; a
   downward drag hides and an upward drag shows. It has no directional arrow to
   compete with the grabber.
3. Pad visibility is not authored work. Never put it on a solve record.
4. The handle costs **44 points** in both states; the shown pad costs another
   152 points before any tall-phone legend. Verify measured
   device sizes rather than treating that arithmetic as a result.
5. Regression means Sudoku and Fungiku too. This epic's few sanctioned shared
   edits must not change either game's navigation, resume or layout behaviour.

### What must be visible in Expo Go

With the pad initially shown, orbit, cancel and commit finger turns without
hiding it. Tap or pull the handle in the
transport card up to show the pad and down to hide it; type an algorithm and use
Backspace in both states.
Verify route round trips, background/resume and
a cold start, then run the full cube flow from scramble cards through methods,
rail editing, Compare and persistence. Smoke-test Sudoku and Fungiku.

### How to verify

- `npm test` from `SudokuApp/`.
- Browser screenshots and measurements for shown and hidden states at 320×568,
  375×667 and 393×852, including horizontal and page-overflow checks.
- An Expo Go device pass for manual drawer feel, discoverability, Backspace,
  transition feel, persistence and the small-phone layout.
- A final device regression of the accumulated epic before opening its PR to
  `main`. Record which findings came from a device.

### Then rewrite this file

Once the device pass and final regression are complete, replace this handoff
with a closed-epic record: merged PRs, final test evidence, resolved/carried open
questions, release/build notes, and the exact operational steps needed to merge
`epic/cube-flow` to `main` and rebuild channels if still outstanding.

## Open questions being carried forward

From `docs/cube-flow-plan.md` §6 — none of these block Step 9, and all of them
want a drilling session rather than an opinion:

1. ~~Does the rail want a "no method" option for a scratch attempt?~~
   **Answered: yes** (operator, 2026-08-18). The sheet offers **Freeform**, which
   stores `method: null` and so costs no branch that did not have to exist for
   legacy solves anyway. Open only to being *withdrawn* if nobody reaches for it.
2. ~~Where does the Compare table belong now?~~ **Shipped as a button beside
   `+ New solve`, not a header button** — the header was full at four controls.
   Still worth the operator's opinion, but it is built, not open.
3. ~~Is long-press the right home for rename / duplicate / delete?~~ **Answered:
   no.** The device pass found the operator did not know the gesture existed, so
   Step 3b put a `⋯` on the card and kept the long-press as a shortcut. **Cite
   this before proposing another invisible gesture:** the test is not "will they
   find it if they look", it is "is anything giving them a reason to look".
4. ~~Should the rail lock automatically?~~ **No for this epic.** Step 8 makes
   stage boundaries explicit scrubber-positioned edits; automatic recognition is future analysis.
5. Does the phase-split tick track come back once the rail exists?
6. ~~How many variations per phase is too many?~~ **Closed with dropped Step 7.**
   Alternate attempts are duplicated solves and share the existing 100-solve cap.
7. ~~**Does the scramble screen miss `Reset the view`?**~~ **Answered: no**
   (operator, 2026-08-17 — *"I don't miss the reset view"*). The four-control
   header stands, and the solve screen keeps its own `Back to the starting view`,
   which is the one that points at a place the operator chose.
8. ~~Should a card's recency be when the solve was *started* or when it was
   *last written to*?~~ **Answered: both, as two fields** (operator, 2026-08-18),
   and landed in Step 4. `savedAt` keeps meaning *created* — nothing already in a
   save file was redefined — and `editedAt` joins it meaning *last written to*,
   read through `lastTouched` with a fallback to `savedAt`. Nothing sorts by it.
9. ~~**Should a fold or cancel be undoable?**~~ **Closed with dropped Step 6.**
   There is no history ring. Folds tidy after settle, immediate inverses disappear,
   and Backspace removes the last stored move.
10. ~~**Does auto-hide survive Step 9's device pass?**~~ **No** (operator,
    2026-08-23). The drawer is manual-only; writing a move never hides it.
11. ~~**Is the method tag worth 34 points of the solve header at 320?**~~
    **Answered: yes for Step 4** (operator, device pass 2026-08-19). The narrow
    title and subtitle were acceptable in the hand. It remains a stopgap:
    **Step 5 can simply delete it** once the rail itself says the method.
12. **New in Step 4:** should the sheet *remember* the last method rather than
    deriving it? `defaultMethod` opens on the method of the newest solve **for
    this scramble** — derived, stored nowhere, and right for "try that scramble
    again". A remembered pick is a preference, which is question 13.
13. **New in Step 3.5:** where do the three preferences live — the gesture profile
    (§8.4), the tuning numbers, the swipe-mode toggle? None is authored work or
    view state; decide the settings store once, before the second one invents its
    own. **Step 4 deliberately did not open one** (see question 12).

**Three things Step 3's device pass settled by silence rather than by answer**,
and none of them are open any more: the 14-point list peek reads as "more below",
a 182-point cube at 320×568 is enough, and the cold-start slide (the one path
that still rebuilds the stack) is not worth chasing. If any of them turns out to
grate after a fortnight of drilling, they are cheap to revisit — the peek is one
constant in `solveCards.js`, and the cold-start slide is the animation race Step
3a deliberately declined.

V1's own open questions (`docs/cube-handoff.md`) are unaffected and still stand.
