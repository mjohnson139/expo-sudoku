# Fungiku — Feature Plan

**Fungiku is a mushroom logic puzzle: place one mushroom per row, per column,
and per color region, with no two mushrooms touching.** The board is a grid of
contiguous **color regions**, and the *only* thing the player places is a
**mushroom** (plus an "X" eliminate-mark as a thinking aid). There is no number
pad, no digits, and no notes grid.

This is the **Queens / Star-Battle** genre — the same ruleset as LinkedIn's
*Queens* and the family-tested "meowdoku" reference, which states its rules on
the board: *1 Cat per column & row · 1 Cat per color · Cats cannot touch*.

> **Replan note (2026-07-25).** An earlier version of this document described
> Fungiku as a *display mode for Sudoku* — a rendering skin that swapped the
> digits 1–9 for swatches over the existing numeric 9×9 board. The reference
> screenshots the operator supplied show that is **not** the target game: the
> real mechanic merges the symbols into **color regions** and makes the mushroom
> the **only input**. That is a different puzzle with a different generator,
> different rules, a different win condition, and a different input model, so it
> cannot be a skin over Sudoku. This document is the replanned source of truth.
> See §10 for exactly what carried over from the old plan and what was dropped.

## For the implementer (start here)

- **Repo:** `mjohnson139/expo-sudoku`. The app code is in the `SudokuApp/`
  subdirectory (Expo · React Native · JavaScript).
- **This document is the source of truth** for scope and approach — read it end
  to end before writing code.
- **Start here if you are a new session:** **`docs/fungiku-handoff.md`** always
  describes *the next step only*, so a session can start from a one-line prompt
  instead of a pasted brief. **Rewriting it for the following step is part of
  every step's definition of done** — a step that leaves it describing finished
  work has broken the chain for the next session.
- **Process:** follow `.github/dev-process.md` — the tracker is issue #65, work
  **one delivery step per branch**, commit after each step, and **prompt the
  operator to test after each step.**
- **Branching: this feature lands on an epic branch, not `main`.** Every step
  PR targets **`epic/fungiku`**. The epic branch merges to `main` once Fungiku
  is playable end to end, so `main` never carries a half-built game mode.

  ```
  main ─── epic/fungiku ─── feature/fungiku-<step>   (PRs target the epic)
  ```

- **Every step must ship something the operator can look at in Expo Go.** Even
  the pure-logic steps: if a step has no natural UI, it carries a small preview
  or debug surface so progress is visually verifiable on a device, and direction
  can be corrected early instead of after the whole mode is built. A step whose
  only evidence is a passing test suite is not done. Preview scaffolding is
  explicitly temporary — it is replaced by the real UI as later steps land.
- **Fungiku is a separate game mode, not a change to classic Sudoku.** Classic
  Sudoku keeps working exactly as it does today. Do **not** modify the Sudoku
  generator (`sudoku-gen` / `boardFactory`), the Sudoku reducer logic, the
  number pad, or Sudoku's notes / feedback / win detection. Fungiku's logic
  lives in its own module tree under `SudokuApp/games/fungiku/`.

## 1. The rules (exactly)

For an **N×N** grid partitioned into **N contiguous color regions**:

1. **One mushroom per row.**
2. **One mushroom per column.**
3. **One mushroom per color region.**
4. **No two mushrooms touch** — not orthogonally, not diagonally.
5. Every generated puzzle has **exactly one solution**.

N mushrooms are placed in total. The puzzle is won when all N are placed legally
— there is no "fill every cell" step. The header shows a **`🍄 X/N`** counter, as
the reference does.

### A useful consequence (drives the whole engine)

Rules 1 and 2 mean the solution is a **permutation**: let `col[r]` be the column
of the mushroom in row `r`; every column is used exactly once. Because no two
mushrooms share a row, the only way two can touch is if they sit in **adjacent
rows**. So rule 4 collapses to one cheap condition:

```
|col[r] − col[r+1]| ≥ 2   for every r
```

Region membership (rule 3) is then a separate per-region-once constraint. This
makes both generation and solving small, fast, and easy to test.

## 2. Input model — mushrooms only

A cell is in exactly one of three **marks**, and a tap cycles them:

```
empty → X (eliminated) → 🍄 (mushroom) → empty
```

- **X** is a player aid only. It has **no** effect on win detection and is never
  required — the equivalent of the reference's X's, and of pencil marks.
- **🍄** is the real placement.
- **Conflicts show live:** any two mushrooms sharing a row, column, or region,
  or touching each other, are highlighted (the reference glows them). Conflicts
  do not block placement — the player fixes them.
- **The rule-out assist is a button, not a mode** (operator decision,
  2026-07-25): one tap marks every cell the mushrooms already on the board
  forbid — their rows, columns, regions and neighbors. It is an action the player
  asks for, never something that fires behind them as they place. It only fills
  blanks, never disturbs a mushroom (not even a conflicting one), and undoes as a
  single action. Being explicit is what keeps it an aid rather than a mode that
  quietly does the deduction for you.
- **Feedback and hints have their own requirements — see §11.**

No number pad. No 3×3 notes mini-grid. No digit feedback.

### Drag to sweep X's across a run of cells (operator request, 2026-07-25)

Tapping each cell to rule it out is the most repetitive thing about playing
Fungiku: once you know a mushroom can't be anywhere in a row, a region edge or a
mushroom's neighborhood, you want to **swipe a finger across those cells and have
them all become X**, not tap eight times. This is the paint gesture every
Star-Battle app has, and it is what makes X's cheap enough to actually use for
reasoning.

Behavior, so it stays predictable:

- **Drag paints X, it does not cycle.** A tap keeps the full
  `empty → X → 🍄 → empty` cycle; a drag only ever writes X. Cycling under a
  moving finger would scatter mushrooms across the board.
- **The first cell of the drag decides the whole stroke.** Starting on an empty
  cell paints X; starting on an X **erases** back to empty (the same
  paint/erase convention as a drawing app). Either way the mode is fixed for the
  stroke, so dragging back over your own path doesn't flip cells twice.
- **Mushrooms are never overwritten by a drag.** A stroke passing over a placed
  mushroom skips it. Losing a deduced placement to a stray swipe would be the
  worst possible failure here.
- **One undo entry per stroke, not per cell.** The reducer already snapshots
  `marks`, so a stroke is a single snapshot taken at gesture start — undo takes
  back the whole sweep.
- **Diagonal and fast strokes must fill every cell crossed**, not just the ones
  a move event happened to land in.

Two hazards worth knowing before writing the gesture:

1. **`locationX`/`locationY` are unreliable on the new architecture** — in a
   `PanResponder` they are relative to the touched *child* view, not the
   responder. Resolve the cell from `pageX`/`pageY` minus the board's measured
   origin, and re-measure at gesture grant rather than only on layout, because a
   flex-centered board shifts when banners appear. (The sibling color-loop app
   was bitten by exactly this on the SDK 54 upgrade, in both its games *and* a
   slider.)
2. **A drag gesture cannot be verified in simulation.** Playwright can fake a
   mouse drag on the web build, and that is worth having, but touch feel — does
   it fight the ScrollView, does it fire on a tap-with-jitter — is a device
   question. This one needs an Expo Go pass before it merges.

### The ScrollView race, and how it was settled (device finding, 2026-07-25)

The first implementation claimed the responder on **movement**, past a small
threshold. On device that lost to the enclosing `ScrollView`: **a vertical drag
scrolled the page instead of painting.** The ScrollView is tracking the same
touch, and once vertical movement passes *its* slop it takes the gesture — via
`onInterceptTouchEvent` on Android, and on iOS because `canCancelContentTouches`
defaults to letting a scroll view cancel a child's touch. Claiming later than the
scroll view decides is a race you lose.

**The board must claim the touch at touch-down**, in the capture phase, so there
is no window in which the gesture can be read as a scroll. Three parts, all
required:

1. `onStartShouldSetPanResponderCapture` **and** `onStartShouldSetPanResponder`
   both return true. The capture claim is what pre-empts the ScrollView on
   native; register the bubble-phase one too, because react-native-web does not
   reliably honour a capture-phase claim on touch start and taps die without it.
2. `scrollEnabled={false}` on the ScrollView while a finger is down on the board.
   This is the part that reliably stops Android. Plus
   `canCancelContentTouches={false}` on iOS, and
   `onShouldBlockNativeResponder: () => true` in the responder config.
3. Because the board owns the touch from the start, **a per-cell `Touchable`
   never sees a press** — taps have to be recognized by the responder itself
   (release under the drag threshold = tap) and dispatched from there. Cells
   become plain `View`s that keep their accessibility labels plus
   `onAccessibilityTap`.

**Accepted trade-off:** you cannot scroll this screen by dragging on the board.
Drag anywhere else. The content fits without scrolling on a normal phone even at
8×8, so the ScrollView is really insurance for small or landscape screens.

**Known regression from part 3:** on web, cells were focusable buttons and are
now plain views, so keyboard tabbing to a cell is gone. Nobody asked for keyboard
play and the labels (the accessibility channel that matters here) are intact, but
it is a real loss — revisit if web keyboard play ever matters.

**None of this is verifiable in a browser.** The web build never reproduced the
bug: react-native-web uses ordinary overflow scrolling, so even synthetic touch
drags painted correctly before the fix. What a browser *can* check is that taps,
strokes, and jittery taps all still behave — do that, then confirm the scroll
behavior on device.

### A pattern worth knowing: native-only gesture and animation bugs

**Both bugs the operator has found were invisible in the web build**, and for the
same underlying reason — react-native-web substitutes browser behavior for the
native machinery:

| Bug | Why the browser could not show it |
|-----|-----------------------------------|
| Vertical drag scrolled instead of painting (Step 6) | RNW uses ordinary overflow scrolling, not a native `ScrollView` with touch interception |
| Placing a mushroom shrank the previously placed one (Step 7) | `useNativeDriver: true` is a no-op on RNW, and React commits the re-render inside the same frame, so the bad intermediate state is never painted |

The second one is worth dwelling on, because it produced a **false pass**: a
per-frame `requestAnimationFrame` probe of the buggy build reported the earlier
mushroom never shrinking. The check was not wrong about what it measured; it was
measuring a platform where the bug does not exist.

So when a fix targets `PanResponder`, a native `ScrollView`, or an `Animated`
value driven with `useNativeDriver`:

- **Use the browser to prove you have not broken anything** — taps, strokes,
  labels, no page errors. That is real value and it has caught real regressions.
- **Do not present a passing browser check as evidence the native bug is fixed.**
  Say which platform the evidence comes from, and ask for a device pass.
- Prefer fixes that remove the *class* of problem over fixes that reorder
  operations, precisely because you cannot test the ordering locally. Per-cell
  animation values instead of one shared value; claiming a touch at touch-down
  instead of racing for it.

#### Never mix `setValue()` with `useNativeDriver: true`

The concrete rule that came out of the second bug, worth stating on its own
because it is easy to write by accident and impossible to see on web.

With `useNativeDriver: true` the animation runs on the native side and **the
JS-side `Animated.Value` is not kept in step**. So a value that is reset with
`setValue()` and then animated natively can end up with its JS copy stranded at
the reset value. Anything that later initializes from the JS value renders the
stranded number — permanently, not for a frame.

The operator caught exactly that: on a **solved** 8×8, five of eight mushrooms sat
noticeably smaller than the rest, each one stuck at the pop animation's start
scale. A solved board is stationary, which is what made it obvious that these were
resting values and not animation frames.

So:

- **If a value is reset with `setValue()`, drive it with `useNativeDriver: false`.**
  The JS value is then the single source of truth and lands exactly on the target.
  A one-cell scale on the JS driver costs nothing worth measuring.
- **`stopAnimation()` before restarting** a value, or a fast place/remove/place
  leaves two animations driving it.
- **Finish with an explicit rest**: `.start(() => value.setValue(1))`, so an
  interrupted animation cannot leave a permanent visual defect.
- Values animated only with `timing`/`spring` to an explicit `toValue` in *both*
  directions, and never `setValue()`d, are safe on the native driver — the win
  banner's entrance and the board's win lift both qualify and stay native.

## 3. The board

- **Region color = cell background**, filling the whole cell (the reference is a
  solid pastel grid). Colors come from the existing colorblind-aware palette in
  `utils/symbolSets.js` (Okabe–Ito hues, distinct in both hue and lightness).
- **Region borders are the structural lines** — a thick border between cells of
  *different* regions, a hairline between cells of the same region. This
  replaces Sudoku's fixed 3×3 box borders, whose geometry does not apply here.
- **The mushroom glyph** is the `MaterialCommunityIcons` `mushroom` placeholder
  from Step 1, swapped for static PNG art later behind the same `<Symbol>` seam.
- **Accessibility:** every cell keeps a stable label — region name + mark, e.g.
  *"blue region, mushroom"* / *"green region, eliminated"* — so the board is
  readable without relying on color.

## 4. The engine (the one genuinely new piece)

Pure JavaScript, no React, fully unit-tested, deterministic from a seed.

**`generate({ size, seed })` → `{ size, seed, regions, solution }`**

1. **Seeded RNG** so a puzzle is reproducible (and a seed is shareable).
2. **Place the N mushrooms:** randomized backtracking over a column permutation
   subject to `|col[r] − col[r+1]| ≥ 2` (§1).
3. **Grow the regions:** seed one region at each mushroom cell, then expand by
   randomized multi-source BFS until every cell is claimed. Contiguity holds by
   construction (a cell is only ever added adjacent to its own region), and each
   region contains exactly one solution mushroom, so the generated placement is
   always *a* valid solution.
4. **Force uniqueness:** count solutions with the solver; while more than one
   exists, perturb the regions (move a boundary cell to a neighboring region,
   preserving contiguity and the one-mushroom-per-region invariant) and
   re-count. Fall back to a full regenerate if the perturbation budget runs out.

**`countSolutions(regions, size, limit)`** — backtracking row by row, pruning on
column-used, region-used, and the adjacent-row column-gap rule; stops early at
`limit` (2 is enough to answer "is it unique?").

**Shared validation helpers** used by both the engine and the reducer, so the
rules live in exactly one place: `findConflicts(...)` and `isSolved(...)`.

**Difficulty** ≈ grid size + region-shape irregularity. Sizes ship as a ladder
(§7) starting at **5×5** — matching the reference's Level 1 → 10 progression.

## 5. What is reused vs. new

| Reused as-is | New for Fungiku |
|---|---|
| Theme system + header / top strip / timer chrome | Region+mushroom generator, solver, uniqueness |
| `usePersistentReducer` + `utils/storage.js` pattern | Mark-cycle reducer, conflict validation, win detection |
| Swatch palette in `utils/symbolSets.js` (→ region colors) | Region-colored board with region-boundary borders |
| `Symbol.js` mushroom glyph + the art-swap seam | `🍄 X/N` counter, mode entry point, level ladder |
| Undo/redo, scoring, win-modal patterns | |

**Not used by this mode:** `sudoku-gen` / `boardFactory`, `NumberPad.js`, the
notes mini-grid, digit correct/incorrect feedback. All of it stays in place and
untouched for classic Sudoku.

## 6. Menu, navigation, and the hub

**Today the app opens straight into Sudoku, and Fungiku is reached from a button
inside Sudoku's own game menu.** That structure says "Sudoku is the app and
Fungiku is a guest." With two games it needs a shell where both are peers —
otherwise every later step keeps building into the wrong shape.

### The shell

- **`App.js` owns a small screen router** — the route is `'hub'` or a game id.
  No navigation library: two or three games don't justify `react-navigation`'s
  native setup, and this matches the sibling **color-loop** app, whose hub lives
  in `App.tsx` with each game self-contained under `games/<name>/`. Revisit only
  if the app grows genuinely deep navigation.
- **Game registry — `games/registry.js`.** One entry per game:
  `{ id, title, tagline, icon, accent, Screen }`. The hub renders its cards from
  the registry, so adding a third game is a registry entry, not a UI edit.
- **Hub screen — `screens/HubScreen.js`.** App title, one card per game,
  theme-aware, with a **"Continue"** affordance when a game has saved progress.
- **Back to the hub** — every game screen gets a home affordance in its header.
- **`games/fungiku/FungikuScreen.js`** — Fungiku becomes a real screen reached
  from the hub. The menu-modal preview entry goes away.
- **Sudoku's files stay where they are** for now; the registry points at the
  existing `GameScreen`. Relocating Sudoku under `games/sudoku/` to match the
  convention is optional tidy-up, deliberately deferred to keep the step small.

### Behaviors to get right

- **Resume.** Sudoku restores a saved game on launch today. With a hub in front,
  the hub shows first and the card carries a *Continue* badge — predictable, and
  it keeps both games discoverable. (The alternative, auto-jumping into a game in
  progress, hides the other game; operator decision in §8.)
- **Timer.** Leaving Sudoku for the hub must **pause its timer** — today it only
  pauses on the menu and on backgrounding, so navigating away would leave it
  running while nobody is playing.
- **Difficulty.** Sudoku opens its difficulty menu when no game is in progress;
  entering from the hub must still land there.
- **Separate persistence keys per game**, so the two modes never clobber each
  other's saved state.
- **Leaving mid-game is not quitting** — navigating to the hub must not reset
  progress.

### App identity

The app is titled "Sudoku" but will host two games, so the hub needs a name of
its own. Flagged as an open question (§8) — it is a branding decision, not a
technical one.

## 7. Delivery steps (one branch per step, per dev-process.md)

Each step names **what the operator can see in Expo Go** when it lands — that is
the step's real acceptance test, alongside its automated checks.

| # | Step | Visible in Expo Go |
|---|------|--------------------|
| 0 | ~~Upgrade Expo SDK~~ ✅ merged (#66) — SDK 54 | App runs on the current SDK |
| 1 | ~~Rendering seam — `Symbol.js` + `symbolSets.js`~~ ✅ merged (#67) | Zero visual change (that was the point) |
| 2 | ~~**Engine**~~ ✅ merged (#69) — seeded generator, solver, uniqueness, shared `findConflicts` / `isSolved`, Jest tests | **Engine preview**: generated boards with their color regions and solution mushrooms; switch size 5–8, reseed, show/hide the solution |
| 3 | ~~**Game shell + hub**~~ ✅ (§6) — screen router, game registry, hub screen, back-to-hub, Fungiku's own screen | **The hub**: app opens on a home screen with **Sudoku and Fungiku side by side as peers**; Fungiku is a real destination, not a button in Sudoku's menu |
| 4 | ~~**State**~~ ✅ — reducer + context: mark cycling, live conflict validation, win detection, undo/redo, persistence | The Fungiku screen becomes **playable**: tap-to-cycle X/🍄, live conflict highlighting, `🍄 X/N` counter, win banner |
| 5 | ~~**Board UI**~~ ✅ — the real board component: region-boundary borders, themed styling, win flow, **palette tuning** | The **finished board**, styled to the app's themes, replacing the preview's rough grid |
| 6 | ~~**Input ergonomics & assists**~~ ✅ (§2) — **drag to sweep X's**, rule-out button | **Swipe a finger across cells to rule them out**; a *Rule out* button |
| 7 | ~~**Feedback & hints**~~ ✅ (§11) — correctness feedback on placements, and a hint ladder | **Optional "show mistakes" for mushrooms**, and a hint you can ask for when stuck |
| 8 | ~~**Bigger boards, up to 10×10**~~ ✅ (§12) — `MAX_SIZE`, a 10th region colour, legibility at 32px cells, a generation-cost bound | **A playable 10×10** that generates without a visible freeze |
| 9 | **Ladder & scoring** — training ladder, size progression, scoring | Level progression and a score |
| 10 | **Art swap** (floating, asset-only — gated on artwork, not on code) | Static mushroom art replaces the icon glyph |

**Why bigger boards come before the ladder:** the ladder has to know its own top
end. §12.1 measured it — generation cost goes off a cliff between 10×10 and 11×11,
which is what set the ceiling at 10 — and the ladder's whole table is denominated
in sizes. Building it against a 5–8 range first would mean reworking it.

**Why feedback and hints come before scoring:** scoring has to know what a
mistake and a hint are *worth*, so the ladder step needs both to already exist.
Building scoring first would mean guessing at the currency it is denominated in.

**Why drag-to-sweep sits at Step 6, not earlier:** it needs the real board's
touch and geometry layer, which Step 5 builds. Writing the gesture against the
preview grid's per-cell `TouchableOpacity` would mean throwing it away a step
later. It leads Step 6 because it is the ergonomic fix that makes X's worth
using, and auto-X (the other half of that step) is the same concern.

**Why the shell comes before the game logic:** Fungiku currently hangs off
Sudoku's menu, which is the wrong shape to keep building into. Doing the hub at
Step 3 means Step 4's playable board lands in a real Fungiku screen instead of a
modal nested inside another game — no throwaway work, and the two games read as
peers from the moment there is anything to play.

The preview was scaffolding, not the product: Step 2 built it read-only to judge
the engine's output, Step 3 gave it a real home, **Step 4 retired it** —
`FungikuPreview.js` is gone, replaced by the interactive `FungikuBoard.js` — and
Step 5 replaced that rough grid with the themed, responsive board.

## 8. Open questions for the operator

1. **Mode name in the UI** — **decided: "Fungiku"** (internal id `fungiku`).
2. **What is the app called now?** It ships as "Sudoku" but is about to host two
   games as peers (§6). The hub needs a title, and the app's name, icon and
   store listing follow from it. Options: keep "Sudoku" and treat Fungiku as a
   bonus (undersells it), rename to a neutral puzzle-collection brand, or lead
   with the family name. This is a branding call, not a technical one, and it
   blocks nothing. **Step 3 shipped the placeholder "Puzzle Box"** in
   `SudokuApp/utils/appIdentity.js`; a final answer changes those constants plus
   `app.json`, the icon and the store listing.
3. ~~**Hub vs. resume on launch**~~ — **decided in Step 3: hub-first.** The app
   opens on the hub and a game with saved progress carries a *Continue* badge, so
   both games stay discoverable. Revisit only if it grates on device.
4. **Ladder shape** — **top end decided 2026-07-25: 10×10** (§12). The operator
   asked for 12×12 first; measuring showed it takes seven seconds to generate, and
   10×10 (284 ms) is the last affordable size, so the ceiling moved there. Still
   open: **is size a free choice or unlocked by progression?**
5. ~~**Assist defaults**~~ — **moot as of 2026-07-25.** The rule-out assist became
   a button you tap rather than a mode with a setting, so there is no default to
   choose. (§2)
6. **How strong should hints go?** (§11) The hint ladder ends at *reveal a correct
   mushroom*, which solves a cell outright. For a family game that may be exactly
   right — or it may feel like cheating and want capping at a nudge. Needs a
   judgement call once hints are playable.
7. **Should correctness feedback default on for younger players?** (§11) It turns
   a deduction puzzle into trial-and-error for anyone who leaves it on, which is
   an argument for off — but "off" for a seven-year-old may just mean stuck.

## 9. Edge cases to get right

- **A 4×4 board is impossible** under these rules — with one mushroom per column
  and `|Δcol| ≥ 2` between adjacent rows, no arrangement exists for N=4 — so the
  ladder starts at **5×5**. The generator must reject sizes it cannot satisfy.
- **Region growth can starve** a region if BFS order is unlucky; expansion must
  keep every region non-empty (it always retains its seed mushroom cell).
- **Uniqueness is the expensive part** — cap the perturbation budget and fall
  back to regenerating rather than looping forever.
- **X marks must never affect win detection** — only mushrooms count.
- **Persistence** stores the seed + size + the player's marks, not the whole
  board; the puzzle is rebuilt deterministically from the seed on restore.

## 10. Disposition of the pre-replan work

- **Step 0 (#66, merged)** — SDK 54 upgrade. Unaffected, keep.
- **Step 1 (#67, merged)** — `Symbol.js` + `utils/symbolSets.js`. **Kept**; the
  palette becomes the region colors and the mushroom glyph is the placed marker.
  The "numbers ↔ fungiku glyph swap" framing is obsolete.
- **Old Step 2 (PR #68, closed unmerged)** — a numbers↔Fungiku toggle *on the
  Sudoku board*. Built on the superseded "display mode" model: Fungiku is a
  separate mode with its own board, so a symbol-set toggle over the 9×9 numeric
  grid has no place. Closed rather than merged.

## 11. Feedback on your moves, and hints (operator request, 2026-07-25)

Two related gaps. Today the board tells you when you have **broken a rule**, and
nothing else: it never tells you that a legal move was *wrong*, and when you are
genuinely stuck your only options are guess or walk away. Both need answering
before scoring exists, because scoring has to know what a mistake and a hint are
worth.

### 11.1 Feedback

Four kinds, in increasing intrusiveness. The first exists; the rest are this
requirement.

1. **Rule feedback — shipped, always on.** Any two mushrooms sharing a row,
   column or region, or touching, are ringed and recoloured. This is *local*
   consistency: it catches a move that contradicts another move.
2. **Correctness feedback — opt-in.** Flag a mushroom that is not where the
   puzzle's single solution has it, even though it breaks no rule yet. The
   engine already knows the answer (`generate()` returns `solution`, and
   `findSolutions` recovers it from `regions`), so this is cheap to compute. It
   must be **opt-in**: left on, it turns a deduction puzzle into trial-and-error.
   Mirror Sudoku's existing **"Show Mistakes"** switch — same words, same
   placement in the menu, so the app has one vocabulary for the idea.
3. **Positive confirmation.** A correct placement should *feel* correct, not
   merely fail to turn red. A small settle or pulse on the mushroom, in the app's
   motion language. This is the half of feedback that makes a game feel good and
   the half most often skipped.
4. **Progress feedback.** The `🍄 X/N` counter exists. Consider also surfacing
   *structure* solved — "3 of 5 regions settled" — which is what a player
   actually reasons about.

Two consequences of the rules worth writing down, because they shape the work:

- **X marks are never wrong.** They are a thinking aid with no bearing on the win
  (§9), so correctness feedback applies to **mushrooms only**. Flagging a
  "wrong" X would be telling the player how to think.
- **There is no such thing as a complete-but-wrong board.** Uniqueness (rule 5)
  means N mushrooms placed with no conflicts *is* the solution — so correctness
  feedback is purely a **mid-solve** aid. It can never be the thing that tells
  you a finished board is wrong, because a finished legal board cannot be.

### 11.2 Hints

A ladder of increasing strength. A hint is **always an explicit request** — never
automatic, never on a timer — and each rung should cost more than the last once
scoring exists.

| Rung | Hint | Strength | Cost to build |
|------|------|----------|---------------|
| 1 | **Rule out** — mark everything the placed mushrooms forbid | Reveals nothing the player could not derive mechanically | **Shipped** (§2) |
| 2 | **Nudge** — name a row, column or region where a deduction is available, without saying what it is | Preserves the "aha"; the best hint in a teaching game | Needs a **deductive** solver — constraint propagation, not the backtracking one. `findSolutions` can say *what* the answer is but not that a step is *forced*. This is the real work in the step. |
| 3 | **Reveal a mushroom** — place one correct mushroom from the solution | Solves a cell outright | Trivial: the solution is known |
| 4 | **Point out a mistake** — "one of your mushrooms is wrong", optionally which | Undoes a wrong branch without explaining | Trivial: compare against the solution |

Requirements on any hint:

- **Never place a conflicting mushroom.** A hint that creates a conflict is worse
  than no hint.
- **A revealing hint is one undoable action**, like the rule-out button.
- **Count hints used**, per puzzle — the ladder step will want that for scoring,
  and it is much easier to record from the start than to retrofit.
- **A hint must never be the only path forward.** If rung 2 cannot find a forced
  deduction, say so honestly rather than silently falling through to rung 3.

### 11.3 Open questions this raises

Carried into §8 as #6 and #7: how strong hints should go for a family game, and
whether correctness feedback should default on for younger players.

## 12. Board sizes up to 10×10 (operator request, 2026-07-25) — **shipped, Step 8**

**What landed.** `MAX_SIZE = 10` in the engine, with `SIZES` derived from the
bounds so the chips cannot offer a size `generate()` rejects; a tenth region
colour, searched for rather than picked; `getRegionColor` no longer wraps; a
"Generating…" state for the sizes where the hitch is visible; and a legibility
pass that steps down four constants below 40px cells. Details and measurements
are in the subsections below, updated with what was found rather than predicted.

**Three things turned out differently from this brief, and all three are worth
knowing before touching the palette again:**

1. **ΔE and colourblind safety did not merely differ — they pulled in opposite
   directions.** Maximizing worst-pair ΔE produced ten-colour palettes that beat
   the shipping nine for normal vision and were *worse than it* under dichromat
   simulation. §12.2 has the reframed objective that resolved it.
2. **The first simulation was wrong, and it was the palette's own test that
   caught it.** See §12.2, "The matrices are a trap".
3. **The contrast floors are part of the search space, not a check afterwards.**
   A palette optimized for separation alone failed three existing tests on dark
   fills; the floors are now constraints on which tints are candidates at all.

The operator first asked for the ladder to reach **12×12**. Measuring the cost
(§12.1) showed a 12×12 takes **7.3 seconds to generate, synchronously on the main
thread** — so the operator revised the target to **10×10** the same day. That is
the requirement: **the ladder tops out at 10×10.**

The measurements are kept below rather than deleted, because they are the reason
for the ceiling. If generation is ever made substantially cheaper, they are also
the evidence for raising it.

**`MIN_SIZE = 5` exists; there is no upper bound.** `generate()` will happily
accept size 20 and never return. Add a **`MAX_SIZE = 10`** and reject above it,
the same way 4×4 is rejected below.

### 12.1 Generation time — measured, not guessed

Twelve seeds per size, on this machine:

| Size | ok | median | p90 | max |
|------|----|--------|-----|-----|
| 8×8 | 12/12 | **6 ms** | 21 ms | 25 ms |
| 9×9 | 12/12 | 30 ms | 82 ms | 103 ms |
| 10×10 | 12/12 | **284 ms** | 519 ms | **584 ms** |
| 11×11 | 12/12 | 2,536 ms | 4,124 ms | 5,096 ms |
| 12×12 | 12/12 | 7,286 ms | 30,618 ms | 41,830 ms |

**Correctness is fine — nothing failed at any size.** The problem is purely cost,
and it goes off a cliff between 10 and 11: an order of magnitude per size, from
284 ms to 2.5 s to 7.3 s. **10×10 is the last size that is affordable without
re-engineering the generator**, which is exactly why the ceiling sits there.

The cost is in the uniqueness loop (`generate` → `findSolutions` → `breakSolution`,
up to `PERTURB_BUDGET` times). Each `findSolutions` call is a backtracking search,
re-run after every perturbation.

**At a 10×10 ceiling, none of that needs fixing** — 284 ms median is a hitch, not a
freeze. Two things it does need, and both shipped:

1. **A generation hitch you can see is worse than one you are told about.** The
   counter row shows **"Generating…"** with a spinner at sizes ≥ 9, and the board
   stops taking touches until the new puzzle arrives.

   Two details that are easy to get wrong. First, **setting the flag is not
   enough** — the state update only schedules a render, so generating in the same
   turn blocks the main thread before the spinner is ever drawn. `startPuzzle`
   hops through `requestAnimationFrame` *and then* a `setTimeout`, which puts the
   generator after the frame has been handed off. Second, the indicator lives
   **inside the always-mounted counter row**, not in a banner of its own,
   precisely because a view mounting above the board moves the board and
   invalidates the origin every touch is resolved against (§2).

   The threshold is 9, not 10, because a phone is slower than the machine these
   numbers came from and 9×9's 51 ms median has a 174 ms tail. Below it,
   generation finishes inside the frame and deferring would only add latency —
   verified in the browser: a 5×5 never shows the state, a 10×10 always does.

2. **A regression bound in the test suite.** `generate()` now returns the number
   of **perturbation rounds** it took, and the suite caps the total at the top
   size. Rounds rather than milliseconds is not a detail: the same generation
   that takes 0.4s in node takes ~3s under Jest's transform, so a millisecond
   bound would measure the runner. Rounds are identical everywhere.

   Sampling matters too. Six seeds at 10×10 put 20 seconds on a suite that
   otherwise runs in three — enough friction to stop people running it — so the
   top size runs the full battery against two seeds and the sizes below it keep
   six.

If the ceiling is ever to rise past 10, the generator has to get cheaper first,
and there are four directions worth trying, cheapest first:

1. **Profile before optimizing.** Is it the number of perturbation rounds, or the
   cost of each `findSolutions`? The fix differs completely. Instrument the loop
   and count.
2. **Bake the ladder's puzzles as data.** A level is a deterministic
   `{size, seed}` pair, so its `regions` array can be generated once at build
   time and shipped as JSON. That removes runtime cost for every ladder level —
   but not for free-play reseeding, so it is a partial answer.
3. **Generate off the main thread, with a loading state.** Honest and simple, and
   at 12×12 it would still feel bad at 40 seconds.
4. **Construct for uniqueness instead of perturbing toward it.** The current
   approach grows regions randomly and then hammers them until only one solution
   survives. Biasing region growth to produce tight constraints, or building
   region-by-region while tracking solution count, would attack the exponent
   rather than the constant. The most work and the most upside.

### 12.2 The palette needs 10 colours and has 9

`REGION_COLORS` holds nine entries — the eight Okabe–Ito swatches plus the
mushroom red — and `getRegionColor` wraps with `regionId % palette.length`. **At
10 regions, region 9 renders identically to region 0.** Region colour is how the
player sees region boundaries at all, so this is a correctness bug at the new top
size, not a cosmetic one.

The 10×10 ceiling makes this a **one-colour problem**, which is the cheapest
version of it. Sampling sRGB inside the light theme's L\* 65–97 band and picking
the farthest-apart set:

| Fills | Best achievable worst-pair ΔE |
|-------|-------------------------------|
| 9 | 24.50 |
| **10** | **23.78** |
| 11 | 21.90 |
| 12 | 21.80 |

For comparison the **shipped 9-colour palette manages ΔE 17.11**, so ten
well-chosen fills would be *better separated* than what ships today. The ΔE 15
floor in `utils/__tests__/symbolSets.test.js` is safe with room to spare.

Two constraints that the ΔE number does **not** capture, and which the work must
respect:

- **Colourblind safety is a separate property.** Okabe–Ito was chosen precisely
  because its hues survive the common CVD types. A tenth hue chosen only to
  maximize ΔE for normal vision may collide under deutan or protan. **Check the
  extended palette under CVD simulation, not just ΔE.** One new hue is a much
  smaller risk than three, but it is still a check, not an assumption.
- **The `corners` shape cue in `symbolSets.js` is still unused by the Fungiku
  board.** Ten regions is close to where colour alone starts carrying too much, so
  it is worth knowing the second channel already exists if the tenth colour proves
  hard to place.

#### What the search actually found (2026-07-25)

**The warning above understated it.** Maximizing ΔE and preserving colourblind
separation are not merely different properties — over this hue space they are in
direct conflict. The ΔE-optimal ten-colour palettes reached worst-pair ΔE 19-21
for normal vision (against the shipping 17.11) while scoring **below the
shipping nine** under simulation. Okabe–Ito's CVD robustness lives at full
saturation, and tinting every hue toward the theme surface is exactly what
spends it. A palette tuned on ΔE alone would have looked like an improvement in
every number anyone was checking.

So the objective was inverted. **Normal-vision separation became a constraint** —
may not fall below what the nine achieved — and **colourblind separation became
the thing maximized underneath it**, across protan, deutan and tritan in both
themes, with the contrast floors (§below) as feasibility constraints on which
tints are candidates at all. The search was a coordinate ascent over per-hue
tints with random restarts, run across a 288-point grid of candidate tenth hues.

The winner is a lime, **`#96C115`**, and it adds a colour while improving all
eight measured axes:

| | worst-pair ΔE | nine colours | ten colours |
|---|---|---|---|
| light | normal | 17.11 | **17.21** |
| | protan / deutan / tritan | 4.13 / 5.44 / 14.85 | **6.73 / 5.80 / 16.21** |
| dark | normal | 18.55 | **18.69** |
| | protan / deutan / tritan | 5.80 / 6.38 / 18.52 | **6.31 / 6.79 / 19.21** |

0 of 45 pairs under ΔE 15 in both themes. Those per-dichromacy numbers are now
floors in `utils/__tests__/symbolSets.test.js`.

Two notes on reading them. They are a **relative** bar — simulate, then measure
ΔE — and a CIEDE2000 distance between two simulated colours is not a calibrated
statement about what a dichromat can distinguish. It answers "did this get
worse?", which is the question being asked. And the tenth colour is region-only:
there is no tenth Sudoku cell value, so it is deliberately not a `FUNGIKU_SWATCHES`
entry.

**The re-tune changed every fill, not just the new one** — the whole point was
freedom to move the other nine. Two light fills (orange, sky blue) now sit at
full strength where they were tinted before. Both are inside the L\* 65-97 band
that encodes "a soft grid, not saturated blocks", but it is the most visible
difference and worth a look on device.

#### The matrices are a trap

The first CVD simulation used the Viénot–Brettel–Mollon matrices in their
**LMS-space** form applied directly to linear RGB — `[0, 2.02344, -2.52581]` and
friends. This is a common shortcut and it is wrong. It has no obvious symptom on
saturated colours, which is why it survived a whole tuning run and produced a
plausible-looking answer.

What exposed it was a one-line test asserting that **mid-gray survives
simulation** — a gray has no hue for a dichromat to lose. It came out teal. The
correct form for sRGB primaries has **every row summing to 1**, which is the
property to check any such matrix against:

```
protan [0.11238, 0.88762, 0]   deutan [0.29275, 0.70725, 0]   tritan [1, 0.14461, -0.14461]
       [0.11238, 0.88762, 0]          [0.29275, 0.70725, 0]          [0, 1, 0]
       [0.00401, -0.00401, 1]         [-0.02234, 0.02234, 1]         [0, 0.15117, 0.84883]
```

`simulateCvd` in `utils/color.js` is the one implementation, used by both the
tests and any future tuning, so this cannot diverge again.

### 12.3 Legibility at 32-pixel cells

`useBoardSize()` returns a fixed 324 on native, so a 10×10 cell is **32 px** (450
on web gives 45 px). At that size:

- the mushroom glyph lands around 19 px — probably fine, needs looking at;
- the **mistake badge is `cell * 0.28` ≈ 9 px, which is small enough to need
  checking on a real screen** rather than in a browser at 45 px;
- the conflict ring at `cell - 6` leaves a 26 px ring — tighter than at 5×5 but
  not tight;
- region-boundary borders at 2 px against 32 px cells are heavier than intended,
  though nothing like the 27 px case.

None of this is hard, but the top size needs a deliberate pass rather than
inheriting constants tuned for 5×5. The 6-pixel tap-vs-drag threshold deserves the
same scrutiny: it was tuned against roughly 40 px cells, and a 32 px cell means
less room to press without registering a stroke. **That is a device question, not
a browser one.**

#### What shipped

`FungikuBoard` derives three constants from a single `tightCells = cell < 40`
test, so the sizes that had already shipped keep them unchanged (5×5 through 8×8
are 64px down to 40px cells) and only 9×9 and 10×10 step down:

| | ≥ 40px cells | < 40px cells |
|---|---|---|
| conflict-ring inset | 6 | 4 |
| conflict-ring stroke | 2.5 | 2 |
| mistake badge | `cell × 0.28` | `max(11, cell × 0.28)` |

**The board's lines are the exception, and they changed at every size** — see
§12.5. The first cut of this pass treated the region border as one more constant
to step down, which was treating a symptom: the lines were drawn in a way that
was wrong at every size and merely most obvious at the smallest.

The mushroom glyph stays at `cell × 0.62` — 20px at the top size, which the plan
guessed was fine and nothing since has contradicted.

**The tap-vs-drag threshold was left at 6px**, deliberately: the risk it guards
against (a shaky tap registering as a stroke) is measured in absolute pixels of
finger travel and does not change with cell size. What *does* change is the cost
of being wrong, since 6px of travel now crosses a fifth of a cell rather than a
tenth. **This is the one item on the list that cannot be settled anywhere but a
device** — web renders a 10×10 cell at 45px, *larger* than a native 5×5 cell, so
the browser is structurally incapable of showing the problem.

### 12.4 A finding about hints on bigger boards

Measured while timing generation: the length of a pure forced-move chain from an
empty board, using the Step 7 propagator.

| Size | Average forced moves found |
|------|----------------------------|
| 8×8 | 1.2 of 8 |
| 10×10 | 2.0 of 10 |
| 12×12 | 1.1 of 12 |

**The nudge is shallow, and bigger boards make that more obvious.** It finds an
opening move and then runs dry, because `findForcedDeduction` only knows one rule:
a row, column or region with exactly one candidate. Human solvers also use
pigeonhole arguments — "every candidate for this region lies in one row, so that
row's mushroom is in this region" — which eliminate far more.

That is not a blocker for 10×10, but a hint that helps twice out of ten placements
will feel thin. Worth strengthening the propagator, or accepting that the reveal
rung carries more of the load on large boards (§8 #6).

### 12.5 The board's lines (operator device report, 2026-07-26)

> *"The grid lines could use some darker lines and a clean up of how lines come
> together."* — operator, on a 9×9 in the Pastel theme

Three defects, one cause. Every line on the board was drawn as a **per-cell
border**: each cell set its own four border widths and colours, thick where the
neighbouring cell belonged to a different region. That is the obvious way to do
it, and it is wrong in three ways that a desktop browser hides:

1. **Every interior region boundary was drawn twice** — once by the cell on each
   side — so it rendered at *double* width, while the frame around the board was
   drawn once. Interior boundaries were literally twice the weight of the border
   containing them.
2. **Corners notched.** React Native miters adjacent borders, so a cell with a
   thick top edge and a hairline left edge gets a diagonal seam where they meet;
   where four cells meet at a region corner, four independent miters fail to line
   up. This is the "how lines come together" half of the report.
3. **Borders draw *inside* the cell box**, so a boundary ate width off both
   neighbours' fills — at 32px cells, an eighth of the cell.

And the darkness half had its own cause: within-region grid lines used the
theme's `grid.cellBorder`, which is tuned for **Sudoku's white cells**. In the
Pastel theme that is `#d0d8e6`, which is invisible on a saturated orange or green
region fill.

**The fix is `FungikuGridLines`**, one memoized overlay of absolutely-positioned
rectangles drawn on top of the cells. Each edge is drawn exactly once at a width
that does not depend on how many cells touch it; lines are centred on the edge
rather than inside one cell; and region segments are extended by half a stroke at
each end so corners and T-junctions fill in by overlap instead of mitering.
Collinear runs are merged, so a boundary following a whole row is one View rather
than ten. Grid lines take their colour from the **fill they sit on** — the
contrast-picked ink at low alpha, the same rule the mushroom glyph already used —
so they are legible on every fill in the palette by construction.

**The boundary stroke was removed, and put back** (2026-07-26). The operator
asked *"Do we need extra grid lines for color shapes. Try it without"* — a fair
challenge: a region is a **colour**, the ten fills are tuned to a measured
separation floor (§12.2), and where two regions meet the change of fill already
marks the edge. For normal colour vision the stroke is the same information
twice. Removing it also deleted every special case in `FungikuGridLines` — the
run extension, the clamping, the two widths — 140 lines.

It was tried and **rejected on sight**, for colourblind players. That is exactly
the case colour alone does not cover: when two adjacent fills are hard to tell
apart, the stroke is what still says *the region ends here*. It is a second
channel, the same principle as signalling a conflict with a ring **and** a
colour, and the same reason the palette is checked under dichromat simulation
instead of by ΔE alone.

**Record it as decided.** The stroke is not redundant and not a simplification
opportunity; the experiment has been run. `corners` in `utils/symbolSets.js`
remains available as a *third* channel if region identity ever needs one.

**A fourth defect, found after the overlay landed.** The operator's next
screenshot still showed the grid "with misses" — some lines present, some not,
with no pattern. Auditing the rendered geometry rather than the screenshot
showed **every interior edge was covered**: nothing was missing. The problem was
sub-pixel.

A 1px line centered on a cell edge sits at `y = 35.5`, which on a 3× screen is
device rows **106.5 to 109.5**. Half pixels cannot be drawn, so the renderer
antialiases the line across four rows at 50/100/100/50 coverage — and multiplied
by the line's own 37% alpha, the result is a faint smear whose visibility then
depends on the fill behind it. Hence "misses": strong enough to see on a pale
yellow, invisible on a saturated orange.

Region boundaries never showed it because their width happened to put them on
integers at the sizes that had shipped. That accident is what made this look
like *some lines are missing* rather than *every thin line is half a pixel off*.

The fix is `PixelRatio.roundToNearestPixel` on both the position **and** the
thickness of every line, so each covers whole device pixels at full strength.
Verified by re-auditing: grid lines moved from device rows `106.5..109.5` to
`107.0..110.0`.

**The lesson is about method, not about pixels.** Two rounds were spent reading
screenshots for a defect that a twenty-line DOM audit located exactly. When a
rendering bug looks patternless, measure the geometry — "is every edge covered?"
and "where does each line land in device pixels?" are both cheap questions with
unambiguous answers.

Two constraints worth knowing if this is ever touched again:

- **The overlay may not change the board's box.** `cellFromPoint` resolves every
  tap against the board's measured origin, so the frame is inset fully inside the
  bounds rather than centred on the edge like the interior lines. A `borderWidth`
  on the board container would shift every cell out from under the player's
  finger.
- **`pointerEvents="none"`.** The board claims every touch at touch-down (§2); an
  overlay that swallowed one would break the whole gesture layer.

**This changed how every size looks, not just the new ones.** A single-drawn
2.5px boundary replaces a double-drawn 2px one, so boundaries are lighter and
even, and the grid inside a region is darker than it was.

## 13. Ladder & scoring — notes parked for Step 9

The ladder was briefed as Step 8 until the board-size work displaced it (§7, "Why
bigger boards come before the ladder"). The research done for that brief is kept here so the
Step 9 session does not repeat it.

- **A level is a `{size, seed}` pair.** Both are already deterministic, so the
  ladder is a data table in its own module and tuning it is editing data. Assert
  in a test that **every row actually generates** — `generate()` rejects sizes
  below 5, so a typo in the table becomes a crash for whoever reaches that level
  rather than a failing build.
- **`hintsUsed` is already counted and persisted per puzzle**, and
  `selectMistakes` already knows when a placement is wrong. That is the currency
  scoring is denominated in, and the reason feedback and hints shipped first.
- **Ladder progress forces the first storage schema change.** Today a version
  mismatch in `games/fungiku/storage.js` returns null and the board starts fresh.
  That is fine for a board and **not** fine for someone's progress: bump
  `FUNGIKU_STORAGE_VERSION` and write a migration for the existing
  `{size, seed, marks, showMistakes, hintsUsed}` shape.
- **Fungiku has no timer at all.** Sudoku scores on time with completion bonuses
  (`contexts/GameContext.js`). Whether Fungiku gets a clock is a decision to make
  deliberately, not to inherit — a family puzzle that times you plays differently.
- **The sibling color-loop app already solved this problem**: a training ladder
  with per-level star thresholds in `games/colorloop/levels.ts`, and the
  progression thinking in its `docs/game-design.md`. Read it before designing a
  second one.
- **Thresholds and difficulty curves are guesses until played.** Draft them, say
  so in the PR, and flag them for on-device tuning — color-loop's were left the
  same way and are still on its backlog.
- **Keep a free-play route** whatever the ladder does. The size chips are how
  regression cases at a given size get checked by hand.
- **The hub's Continue badge** (`utils/gameProgress.js` → `describeFungikuProgress`)
  probably wants to name the *level* rather than the board size once a ladder
  exists.
