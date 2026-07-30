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

> **Superseded in part on 2026-07-26 — see §14.2.** The tap *cycle* below is
> replaced by **tap = ✕, double-tap = 🍄, tap-a-filled-cell = clear**. Everything
> else in this section still holds: the three marks, X's being a player aid with
> no bearing on the win, drag-to-sweep, and the rule-out button.

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
| 9 | ~~**Difficulty menu**~~ ✅ (§14.1) — rungs mapped *into* `SIZES`, size picked from the seed, menu modal matching Sudoku's, free play + seed field behind one flag, a real v1→v2 save migration, hub badge names the rung | **Pick a difficulty like you do in Sudoku**, instead of picking a raw board size |
| 10 | ~~**Lives & mistakes**~~ ✅ (§14.2, §14.3) — tap ✕ / double-tap 🍄, wrong guess costs a life, three lives then the board restarts | **A wrong mushroom turns red and costs you a life**; run out and the board resets |
| 11 | ~~**Earned assists**~~ ✅ (§14.4) — a wallet under its own key, hints and rule-out metered, a reveal dearer than a nudge, earning on solve, a daily floor | **Hints and Rule out can run out**, and solving boards earns more |
| 12 | ~~**Art swap**~~ ✅ (§12.7) — **the operator kept the glyph and asked for motion instead.** The seam made true (the board goes through `Symbol` rather than naming an icon), the placement pop grown into a sprout, and a staggered win wave across the whole board | **Mushrooms sprout into their cells**, and the whole board ripples when you solve it |

> **Steps 9–12 were replanned on 2026-07-26** (§14). The old Step 9 was a training
> ladder with per-level star thresholds; the operator asked instead for the
> difficulty menu the platform's other game already has. §13 keeps the ladder
> research for the day it is wanted on top of difficulty.

**Why bigger boards come before difficulty:** difficulty is now *denominated* in
board size (§14.1), so the size range had to be settled first. §12.1 measured it —
generation cost goes off a cliff between 10×10 and 11×11, which is what set the
ceiling at 10. Building the menu against a 5–8 range would have meant reworking it.

**Why feedback and hints come before lives and assists:** both of the new
mechanics are priced in things Step 7 built. A life is spent by
`selectMistakes`'s notion of a wrong placement, and the wallet meters the hint
ladder. Building either first would have meant guessing at the currency.

**Why lives and the new input model are one step:** double-tap-to-place and
"a wrong guess costs a life" are the same surface. Shipping the gesture without
the consequence would put a mushroom-placing tap in the game with nothing
attached to it, then immediately rework it.

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
4. ~~**Ladder shape**~~ — **answered 2026-07-26, and not with a ladder** (§14.1).
   Top end decided 2026-07-25: **10×10** (§12) — the operator asked for 12×12
   first; measuring showed it takes seven seconds to generate, and 10×10 (284 ms)
   is the last affordable size. Size is then **neither** a free choice nor
   progression-gated: it is what **difficulty** means. Easy 5–6, Medium 7,
   Hard 8–9, Expert 10, with free play kept as an escape hatch.
5. ~~**Assist defaults**~~ — **moot as of 2026-07-25.** The rule-out assist became
   a button you tap rather than a mode with a setting, so there is no default to
   choose. (§2)
6. **How strong should hints go?** (§11) The hint ladder ends at *reveal a correct
   mushroom*, which solves a cell outright. For a family game that may be exactly
   right — or it may feel like cheating and want capping at a nudge. Needs a
   judgement call once hints are playable.
7. ~~**Should correctness feedback default on for younger players?**~~ —
   **answered by deletion, 2026-07-26** (§14.3). Correctness feedback is no longer
   optional: a wrong guess is flagged immediately and costs a life, so the "Show
   Mistakes" toggle goes away. The trial-and-error worry that made it opt-in is
   answered by making guesses expensive rather than by hiding the answer.
8. **Should metering Rule out survive contact with a child?** (§14.4) Decided
   metered, but rule-out saves tedium rather than insight — worth re-checking
   after a family play session.

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
2. **Correctness feedback — opt-in.** *(Superseded 2026-07-26 — §14.3 makes this
   always-on and punitive. The reasoning below is why it was opt-in, and §14.3
   explains what removed the premise. Read both; do not re-derive this.)* Flag a mushroom that is not where the
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
tenth. This was the one item on the list that could not be settled anywhere but a
device — web renders a 10×10 cell at 45px, *larger* than a native 5×5 cell, so
the browser is structurally incapable of showing the problem.

**Settled on device (operator, 2026-07-26): 6px holds at 10×10.** The reasoning
above was right — the threshold is about finger travel, not cell size — so it
needs no per-size treatment. Leave it alone unless a *smaller* cell than 32px
ever ships.

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

> ### ⚠️ Superseded 2026-07-29 — **the board has no lines at all any more.**
>
> The operator asked for the look Meowdoku uses: **rounded tiles with a gap
> between them, no grid, no region strokes, no frame.** `FungikuGridLines.js` is
> **deleted** (recoverable at `389eb46`), and with it the whole apparatus below —
> the run merging, the half-stroke extension, the pixel snapping, the two widths.
>
> **What survives is the reasoning, and one hard rule:** the gap lives *inside*
> the cell box. The cell pitch and the board's box are unchanged, so
> `cellFromPoint` needs to know nothing about it and a finger landing in a gap
> still belongs to the nearest cell. Anything that changes the pitch has to change
> the touch geometry with it.
>
> **What was lost, and it is a real loss:** the region-boundary stroke was the
> second channel for colourblind players — see the section below, which is the
> record of that decision being made *and reversed once already*. Colour is now
> the only thing that says where a region ends. `corners` in `utils/symbolSets.js`
> is still there as a third channel if it turns out to be needed; §8 #16 carries
> the question.
>
> **What was gained beyond the look:** the frame is gone, and with it the bug that
> prompted this — see §12.6.

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

### 12.6 The board was never quite the width it was given (device report, 2026-07-29)

*"The border is cut off on the sides."*

A cell is a whole number of pixels — `Math.floor(available / size)` — so a 324pt
allowance at 7×7 makes 46pt cells and a **322pt board**. The counter row above the
board is width-matched to it, deliberately and load-bearingly (§14.3's device
fix), but it was matched to the **allowance**: 324. Two pixels proud on each side,
at every size where the division is not exact, which is most of them. On device
that reads as the board's frame being clipped by the box above it.

**And there was a second one, in the tiles.** The only thing outside an edge tile
was its own half-gap — half the space between two interior tiles. At 10×10 that is
about a pixel, so the outer columns looked shaved while the interior ones did not,
which is what the second device report was about. The board now sits inside a
**card**: a band of gutter, `pad`, wide enough to read as a frame at every size.

`boardExtent(available, size)` in `games/fungiku/geometry.js` is the one place
both are worked out. It returns `pad`, `cell`, `board` and `outer` — and `board`
and `outer` are **not the same number**: the board is the tiles' bounding box and
the touch geometry, the card is what the player reads as the board's edge, and the
counter row lines up with the *card*. `pad` comes off the available width rather
than the cell, which would be circular and would also resize the frame every time
the board size changed.

**The card is a parent, never padding on the board.** The board's box is the touch
geometry and may not carry padding or a border — but a parent that does is fine,
because `measureInWindow` reads the board's own position and that already accounts
for it. Verified by tapping cell centres at 5×5 and 10×10, corner included.

**And a third one, which was the biggest: the board was never asking for the
width in the first place.** `useBoardSize` returned a **fixed 324pt** on native —
Sudoku's number, inherited when the hook was extracted — while a modern phone is
393pt wide and the header's buttons ran nearly edge to edge. About 35pt of dead
margin on each side, on every board. It reads as *compressed*, and it gets worse
the bigger the board: at 10×10 it is the difference between a **31pt cell and a
38pt one**, which is squarely in the range §12.3 spent a step making legible.

`useBoardSize({ fill: true })` takes the width the screen actually offers,
capped so a tablet does not produce a board nobody can reach across.
**Fungiku asks for it; Sudoku does not** — Sudoku's screen is laid out around 324
(the number pad, the notes toggle, the timer) and widening its grid underneath is
not this change's call to make. The same rule runs on web and native so a browser
check and a device see the same layout.

Everything in Fungiku's column is now that width — counter row, hint banner, win
banner, the priced buttons, the puzzle/difficulty row. **Nothing may exceed it**:
the column sits in a ScrollView that centres its children, so anything wider
widens the content container and pushes every sibling sideways (§14.3's device
bug).

**Anything else that ever claims to be board-width must come from there too.**

### 12.7 The art swap, answered with motion (operator call, 2026-07-29)

§7 always called Step 12 *"floating, gated on artwork rather than code"*, and the
step's first act was to ask the operator which of three routes to take. **The
answer was route 1 with a rider:** *"We don't have any art work at this point so
we will stick with what we have but anyway to add some fun animations for when
they appear?"*

So the mushroom stays the MaterialCommunityIcons glyph, and the step spends
itself on two things instead: **making the seam true**, and **making a mushroom
arrive like something worth arriving.**

#### The seam was one file short of real

`Symbol.js` and `symbolSets.js` (Step 1) exist so that swapping the art touches
one file. `FungikuBoard` was not going through them. It rendered
`<MaterialCommunityIcons name="mushroom" …>` directly, so the icon's identity was
written in **two** places and an asset-only change would not have been asset-only.

The reason it drifted is worth recording, because it will be true of anything
else Fungiku draws: **`Symbol` is keyed on a cell *value*, and Fungiku's cells
hold marks, not values.** There was no `value` to hand it, so the board named the
glyph itself. The fix is to export `MUSHROOM_VALUE` — the constant that already
decided which digit is the mushroom — and let the board ask for *that* symbol.
The board now says "draw the fungiku set's mushroom", not "draw this icon".

The ✕ is deliberately **not** routed the same way. It is a mark, not a value: no
symbol set has an entry for it, and inventing one to satisfy the rule would put a
non-symbol in the value table. If real art ever includes an ✕, that is the moment
to add a mark table beside the value table — not before.

#### A mushroom grows; it does not appear

The placement pop was a scale spring, 0.45 → 1. It is now the same single spring
read four ways: the mushroom **rises into the cell from below, tilted and
squashed flat, and stretches upright as it lands**, overshooting slightly because
the spring is loose enough to. No extra `Animated.Value`, no extra animation, no
extra state — four interpolations of the value that was already there, and every
output range ends on the identity pose, so a mushroom at rest is pixel-identical
to the one the plain scale drew.

That last property is not decoration. It is what lets the sprout be free: a
resting pose that is exactly the identity means nothing downstream — the win
lift, the measured box, the tap geometry — can tell the difference.

#### The win wave, and the exception to the per-cell rule

When the board is solved, **every mushroom hops, one diagonal at a time, from the
top-left corner to the bottom-right**. It lands between the board's own lift
(300 ms) and the banner's spring-in (220 ms delay), so the win reads as
board → mushrooms → banner rather than as three things moving at once.

The standing rule from §2 is *one `Animated.Value` per cell, never one shared
value pointed at "the current cell"* — and the wave is a **single value read by
every cell at once**, which is not the same shape and is not the rule breaking.
The rule is about a value that gets **re-pointed**: re-pointing is a React state
update while resetting is immediate, so for a frame the value is still attached
to the previous cell (that is the bug that made an earlier mushroom visibly
shrink). Nothing is re-pointed here. Each cell interpolates the same 0→1 progress
through **its own fixed window**, so the stagger is geometry rather than
scheduling, and no cell ever hands the value to another.

Which is also what buys the wave the **native driver**: one animation, no
`setValue`, a hundred cells. The sprout stays JS-driven because it *is*
`setValue`d, and §2's rule is that the two must never be mixed **on one value**.
They are on separate values — and, necessarily, on **separate `Animated.View`s**,
because once any value in a style has been moved to native, a JS-driven animation
on that same props node throws. The mushroom is therefore two nested views: wave
outside, sprout inside. That nesting is load-bearing, not tidiness.

`games/fungiku/celebration.js` owns the window math and is **pure**, so the part
that is easy to get wrong is the part that is tested — the Jest environment is
plain node with no React Native in it, which is exactly why the geometry lives
outside the component.

Two constraints the windows have to satisfy, both pinned by tests:

- **Every keyframe lands strictly inside the progress**, because
  `Animated.interpolate` needs a monotonically increasing input range and a window
  touching either end would collide with the resting keyframe there.
- **Both ends of the progress are the resting pose.** `solved` is a *condition*,
  not an event (§14.4) — it goes false on an undo across the win line and true
  again on a redo or a relaunch — so the wave has to be cancellable by jumping to
  the nearer end. A mushroom stranded mid-hop is a permanent visual defect, not a
  glitch, and this game has shipped that bug twice already.

#### A trap worth naming: `easing` does not survive the native driver

The hop's arc is spelled out as extra keyframes rather than expressed as an
easing curve, and that is not a style preference. `Animated.interpolate` accepts
an `easing`, but **`__getNativeConfig` does not send it** — it forwards only the
ranges and the extrapolation. A natively-driven eased interpolation animates as a
straight line, so the hop would have been a mechanical zigzag on device while
looking correct in a browser (react-native-web ignores `useNativeDriver` and
animates everything in JS, easing included). RN warns about it in a dev build and
says nothing in a release one. **Same family as §2's other native-only bugs: the
browser cannot see it.**

#### What the browser could and could not settle

Verified in Chromium against the exported web build, by tracing every mushroom
wrapper's inline transform frame by frame rather than by looking at screenshots:
the sprout starts at `translateY(18.8px) rotate(-15.8deg) scaleX(0.51)
scaleY(0.29)` and lands on the identity; the wave's peaks arrive in strict
anti-diagonal order, ~70–85 ms apart, and every mushroom is back at rest when it
ends. Undo mid-wave, redo back across the win line, and a reload onto a finished
board all leave nothing stranded.

None of that is evidence about how it *feels*, and — because web ignores the
native driver entirely — none of it exercises the one thing the two-view nesting
exists to satisfy. That needs a device.

### 12.8 Nothing above the board any more (operator device report, 2026-07-29)

The Step 12 device pass passed the animations — *"I like the animations!!"* — and
found something else:

> One thing that I would like to change is the board solved banner. I don't like
> where it appears… where it is right now moves the board and I don't like that.
> Same for the hints — it kind of appears right above the board and it pushes it
> down and then it messes up the position of things. I think it should be an
> overlay or possibly a dialogue in front of the board.

Both banners sat **in the column**, between the counter row and the board. So
winning moved the board down, and asking for a hint moved it down, and dismissing
the hint moved it back up.

#### This was never only cosmetic

It is the same fact this document has been working around since Step 7. **A view
that mounts above the board invalidates the origin every tap is resolved
against** — `onLayout` does not save you, because on web it is backed by a
ResizeObserver that watches size and not position, so a board that merely *moves*
never fires it. That is why `FungikuBoard` carries a re-measure effect keyed on
`[hint, solved, …]`, and it is why the constraint spread outward:

- the counter row may not size itself from its contents (§14.3's device bug);
- the win banner's **height** could never change, so the payout had to *replace*
  a line rather than add one — three reasons could never be on screen together
  (§14.4);
- the difficulty went into the header's subtitle rather than a banner (§14.1).

**Taking both out of the layout deletes the class, not the instance.** An overlay
takes no layout space, so there is no origin to invalidate and no height rule to
keep. The re-measure effect stays as insurance — it is cheap, `measure()` is
idempotent, and it is still the right home for the next thing anyone mounts above
the board — but nothing depends on it any more.

#### One is a dialog, the other is not, and the difference is the point

The operator offered both words — *"an overlay or possibly a dialogue"* — and the
two banners want different ones:

- **The win is a dialog** (`FungikuWinModal`). The puzzle is over; there is
  nothing left to do to the board, so a modal may take the screen. This is the
  Sudoku inspiration the operator asked for: Sudoku's win has always been a
  `Modal`, not an inline banner.
- **The hint is an overlay** (`FungikuHintOverlay`), and it *may not* be a
  dialog. Its whole job is to point at cells — the board draws a dashed outline
  on the ones it names — and the player has to look at those cells and tap them
  **while it is showing**. A modal would black out the thing it is talking about.
  So it is an absolutely-positioned view with **`pointerEvents="box-none"`**: it
  draws over the screen, takes no layout space, and every touch that misses the
  card falls through to the board.

Both sit **low, over the controls**, matching `FungikuOutOfLivesModal`. Sudoku's
`WinModal` centres itself, and where the two conventions disagree Fungiku's own
precedent wins — the complaint that produced this change was about covering and
moving the board, so a centred dialog would answer half of it and reintroduce the
other half.

#### The dialog waits, and the timing chain is derived

The win is now a **sequence**: the board lifts (300 ms), the mushrooms ripple
(§12.7), the dialog springs in, and only then do the coins count. A dialog that
arrived on the winning tap would cover the celebration it is part of.

Three timings therefore have to stay in order, and none of them is typed twice:
`WIN_DIALOG_DELAY_MS` is computed from the wave's own duration, `AWARD_START_MS`
from the dialog's, and `useCoinAward` imports the last one rather than keeping a
start delay of its own. **The failure this prevents is silent** — a dialog that
opens 200 ms early just covers a ripple nobody notices is missing.

#### What the dialog can do that the banner could not

The payout **stacks**. Each reason lands as its own row and stays, so the finished
dialog shows the whole account — *Easy board +3 · 3 lives left +3 · **Coins
earned +6*** — where the banner could only ever show the reason that was landing
right now. The total is **summed from the rows on screen** (`shownAwardTotal`),
not read from `reward.total`, so the dialog cannot contradict itself mid-count.

The scrim is light (0.35) on purpose: the balance in the counter row is still
counting up behind it, and the payout is meant to be watched.

`winPresentation.js` holds the timing and the row arithmetic and is **pure**, for
the same reason `celebration.js` is — Jest here is plain node, so the only way
this gets tested is if it lives outside the component.

#### Verified

The check is the one the change is *for*, and it is exact rather than visual:
**cell (0,0)'s screen position, sampled across every transition.** It is
byte-identical before and after a hint appears, after it is dismissed, on
solving, when the dialog opens, as the payout grows from one row to four, and
after Close — at 5×5 and 10×10, light and dark. A tap made while the hint overlay
is up still lands in the cell it aimed at, which is the bug the re-measure effect
was written for.

One sampling subtlety worth keeping: measuring *during* the win lift reads a 1px
shift, because the lift is a 1.03 scale on the card. That is the celebration
working, not a layout move — the lift rests at exactly 1 (§12.7). The check
samples the window after it settles.

### 12.9 The hint points at the cell, and costs what it is worth (operator, 2026-07-29)

Second device report on the overlays:

> As of a hint. I think that it should animate to the cell and show the hint. And
> hints should cost 20 coins if we are revealing a mushroom and 5 if it's a simple
> thing. And this hint isn't helpful. It should highlight the specific cell.

Three changes, and they are the same change.

#### The nudge contradicted itself

§11.2 designed the nudge to name the row/column/region and outline **every cell
in it**, on the theory that making the player find the cell is the version that
teaches. On device that produced a message reading **"One color region has only
one cell left that can hold a mushroom"** beside **seven outlined cells**. The
words said *one*; the board said *seven*. And the player still had to do the
search they had just paid to skip.

`findForcedDeduction` has always returned `{kind, index, cell}` — the deduction
*and* the cell it forces. The old code threw the cell away and called
`cellsOfGroup`. It now highlights `[forced.cell]`, and `cellsOfGroup` is deleted
rather than left for someone to reintroduce.

**The teaching survives in the message, not in the search.** The hint still says
*why* — "Row 10 has only one cell left that can hold a mushroom — this one" — so
the deduction is still explained; what it no longer does is make the player
re-derive an answer it already knows. And it is still not a reveal: the mushroom
is not placed, and committing it is a double-tap the player makes themselves.
There is a test pinning exactly that, because the difference between the two
rungs is now one line of reducer.

#### A hint that appears where you are not looking has not pointed at anything

The other half of "isn't helpful" is that a dashed 2px outline arriving on one of
a hundred 32pt tiles is not a signal — it is a change you find by looking for it.
So a ring now **starts nearly three cells wide and closes onto the target**,
twice, before leaving the outline behind as the marker that persists. Motion
toward a point is what an eye follows.

Two things that had to be got right, both found by measuring rather than looking:

- **`Animated.loop({iterations: 2})` silently did nothing.** `resetBeforeIteration`
  resets by calling `resetAnimation()`, which snaps the value back to the one it
  was **constructed with** — not to the start of the animation being looped. The
  ring's value is constructed at 1 because 1 is its *resting* pose (converged,
  transparent), so `loop` reset it to 1 and animated it from 1 to 1. Both
  iterations ran, ~75 frames of nothing, **no error and no warning**. It is
  written out as an explicit sequence with a zero-duration timing for the reset,
  which stops with the sequence in a way `setValue` would not.
- **`Easing.out` was too fast to watch.** An ease-out spends nearly all its
  progress in the first frames: the ring reached the cell inside 150 ms, which is
  the motion being over before the eye can follow it — the whole job. `inOut`
  holds it wide for a beat, travels visibly, and settles.

#### The prices, and the one consequence that had to move with them

`COIN_COSTS` is now **rule-out 1, hint 5, reveal 20**, as asked. Still a ladder
(§11.2), with the gap between the rungs widened sharply — and that goes with the
nudge getting *stronger*: a hint that hands you the answer's location should not
cost what a riddle cost.

**`DAILY_FLOOR_COINS` had to follow, and this is the one thing here that was not
literally requested.** It was a flat 4 while a hint cost 2. At a hint price of 5
it would have topped a stranded player up to **four coins — enough for nothing
but rule-outs**, which quietly repeals the floor's entire stated purpose: a
player stuck on a hard board does not need tedium saved, they need to be *told*
something. It is now defined as `COIN_COSTS.HINT`. That is not economy tuning by
the back door — it is the smallest number that keeps the promise the constant
already makes, and deriving it means the next reprice cannot break it silently
either. A test pins it. **A deliberate choice to make it something else is fine;
a stale constant that clears no price is not.**

**The earn rates were deliberately not touched**, and they are now the thing to
watch. `WIN_BASE` still pays 3–8, so a reveal is two or three whole boards' work
and a brand-new wallet (10 coins) cannot buy one at all. That may be exactly
right — help you have to save for is help you think about — but it is a real
change in the economy's shape, and it is a play question, not an arithmetic one
(§8 #14).

#### Verified

At 5×5 and 10×10, both themes, driven to a genuinely forced position first —
on an empty 10×10 nothing is forced and the hint correctly answers *"no single
forced step"* for free, which is a different branch. Exactly **one** cell is
hinted and it is the cell the engine's own solution names; the ring peaks at
2.80× and holds above 1.5× for **34 frames** (watchable, not a flash), makes
**two** converge passes, and settles at scale 1 / opacity 0 with nothing left on
the board; a hint costs **5**. The board's origin is unmoved throughout.

### 12.10 The hint becomes a popover, and the wave gets longer (operator, 2026-07-30)

> Was hoping the hint text would be a popover kind of thing. Also I like the win
> wave animation and want it to last longer.

#### The hint's third home

It has moved twice already: an inline banner above the board that pushed the
board down (§12.8), then a bar pinned to the bottom of the screen. The bar fixed
the layout problem and left a different one — **the message was at the far end of
the screen from the cell it described**, so the player had to look in two places
and join them up. A popover says *"this cell, and here is why"* in one glance.

**Where it lives in the tree is not arbitrary.** It is rendered inside
`FungikuBoard`'s card, as a **sibling of the touch box**:

- **Not inside the touch box.** The board claims every touch at touch-down in the
  capture phase to win the ScrollView race (§2), so a child of that view can
  never receive a press — Dismiss and Reveal would be dead buttons.
- **Not up in the screen.** It would then need the board's measured origin to
  place itself, and `measureInWindow` is asynchronous: the popover would arrive a
  frame late in the wrong place, on the one interaction whose entire value is
  pointing accurately.

As a sibling it is positioned in the board's **own coordinates** — the same space
`cellFromPoint` resolves taps in — so it points without measuring anything, and
it sits outside the capture path so its buttons work.

`hintPlacement.js` is pure and holds the two rules, both tested across every cell
of every playable size:

1. **Never cover the cell it points at.** Below a cell in the board's top half,
   above one in the bottom half — which also keeps it on the board, because a
   top-half cell always has half a board of room beneath it. It anchors from the
   *near* edge (`top` for below, `bottom` for above) so the placement never has to
   know its own height, which depends on how the message wraps.
2. **Never hang off the side.** Two separate clamps: the body against the board's
   width, and then the tail *within the body*. A cell in column 0 pushes the body
   against the left edge and the tail has to travel left inside it to keep
   pointing. One clamp without the other is a bubble that points at the wrong
   mushroom.

The bubble takes its own touches rather than passing them through — tapping
"somewhere in the message" must not silently rule out a cell hidden underneath —
while the layer around it is `pointerEvents="box-none"` so the rest of the board
stays live.

#### Longer, not slower

*"I like the win wave animation and want it to last longer."* The obvious change
— double `WAVE_DURATION_MS` and leave the ratios alone — would have doubled every
individual hop too, and a mushroom that takes most of a second to go up and come
down is not a hop, it is a wobble.

**What should get longer is the journey across the board, not the motion of any
one mushroom.** So `SPREAD` grew (0.55 → 0.76) and `BUMP` shrank (0.40 → 0.20)
alongside the longer run. Measured in the browser, frame by frame, on a 5×5:

|  | before | after |
|---|---|---|
| first diagonal peaks | 344 ms | 694 ms |
| last diagonal peaks | 644 ms | 1611 ms |
| **travel across the board** | **300 ms** | **917 ms** |
| gap between diagonals | ~75 ms | ~230 ms |
| hop height | 17 px | 17 px |

Three times the travel, the same hop. Two tests pin the distinction: one bounds a
single hop's duration (250–700 ms) whatever the wave's length, the other asserts
the travel is at least 2.5× a hop — so "make it longer" can never again be
implemented as "make it slower".

**Everything downstream moved with it and none of it was retyped.**
`WIN_DIALOG_DELAY_MS` is derived from the wave's duration and `AWARD_START_MS`
from the dialog's (§12.8), so the dialog now arrives at ~2.0 s and the coins start
at ~2.4 s without a single constant being edited. That is the whole reason those
were derived.

#### Verified

Both placements (above and below the cell), both themes, 5×5 and 10×10, driving
the board so the forced deduction lands in a chosen row. The tail sits within
5 px of the cell's centre and 3–15 px from its near edge; the bubble never
overlaps the cell it points at; Dismiss works, which is the proof it is outside
the board's touch capture; and **cell (0, 0) does not move by a pixel** through
the hint appearing, being dismissed, the win, the dialog, the payout growing and
Close.

## 13. Ladder & scoring — notes parked, now superseded

> **Superseded 2026-07-26 by §14.** The operator asked for a **difficulty menu**
> matching Sudoku's rather than a training ladder, so no session is currently
> building this. Kept because a ladder could still sit *on top of* difficulty
> later, and three of these notes are true regardless — the storage migration
> (Step 9 does it), the "assert every generated board really generates" rule, and
> "thresholds are guesses until played".

The ladder was briefed as Step 8 until the board-size work displaced it (§7, "Why
bigger boards come before difficulty"). The research done for that brief is kept
here so it does not have to be repeated.

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

## 14. Difficulty, lives, and earned assists (operator requirements, 2026-07-26)

Five requirements from the operator, refined in conversation and **decided**. They
replace the ladder briefed for Step 9 (§13) and change three things that earlier
steps built deliberately, so the reasoning is recorded here rather than left to be
rediscovered as a contradiction.

The framing behind all five: **the platform will host several games, and the
basics should work the same way in each.** Sudoku already has a difficulty menu
running easy → expert. Fungiku gets the same menu rather than a second, unlike
progression model.

### 14.1 Difficulty is a menu, not a ladder

**Decided.** Fungiku's entry point becomes a difficulty picker with the same rungs
and the same vocabulary as Sudoku's: **easy · medium · hard · expert**
(`components/modals/GameMenuModal.js` is the shape to match).

**Difficulty is denominated in board size, and only board size, for now.**

That is a deliberate narrowing, because the obvious reading — "size *and* how hard
the board is" — asks for something that does not exist. `generate({size, seed})`
produces whatever it produces; there is no rating, and no way to ask a generated
board how hard it is. Sudoku gets its difficulty from clue count in
`boardFactory`; Fungiku has no equivalent knob.

The honest measure for this genre is *how deep the forced-deduction chain runs
before the solver has to case-split*, which means leaning on `findForcedDeduction`
— and **§12.4 measured that propagator as shallow: 2 of 10 deductions from an
empty 10×10.** Rating boards with it today would score nearly everything
"expert". Strengthening it with pigeonhole reasoning is real work and its own
change.

**How this shipped (Step 9).** `games/fungiku/difficulty.js` is the seam: the
rungs declare a `share` — *how many of `SIZES` each claims*, walking up from the
bottom — rather than a size list, so the sizes come out of the engine's bounds and
a second list cannot drift. Shares of 2·1·2·1 over sizes 5-10 produce exactly the
table below. Everything above `sizeForDifficulty(difficulty, seed)` speaks in
rungs, so rated seeds slot in behind that one function with no UI change.

So the mapping ships as sizes, and the menu is built so rated seeds can slot in
behind it later **without a UI change**:

| Difficulty | Sizes |
|---|---|
| Easy | 5×5, 6×6 |
| Medium | 7×7 |
| Hard | 8×8, 9×9 |
| Expert | 10×10 |

Two consequences to respect:

- **Keep deriving sizes from the engine bounds.** `SIZES` exists so the UI cannot
  offer a size `generate()` rejects (§12). The difficulty table maps *into* that
  range; it does not become a second hand-written size list.
- **A difficulty spanning two sizes has to pick one per game.** Simplest rule that
  stays deterministic: derive it from the seed, so a given `{difficulty, seed}` is
  always the same board.

**Seeds move into the menu now** as a developer field, and get hidden once the
game is done. They are currently visible only in the "New puzzle (seed 3)" button
label and are not selectable. Put the field behind one flag — the same pattern
`BuildNotes` already uses — so hiding it later is a one-constant change rather
than a UI edit.

**Shipped as** `SHOW_DEVELOPER_CONTROLS` in `games/fungiku/FungikuMenuModal.js`,
covering both the seed input and the free-play size chips (which moved off the
game screen into the same section). Flip the constant and the menu is four
difficulty buttons.

**The migration shipped as its own pure module**,
`games/fungiku/saveMigration.js`: `FUNGIKU_STORAGE_VERSION` plus a `MIGRATIONS`
map keyed by the version each function upgrades *from*. Separate from
`storage.js` because that imports AsyncStorage and the Jest environment is plain
node. The rule for the next bump is **add an entry, never edit an existing one** —
an old entry describes a shape already on real devices. The v1→v2 step derives
`difficulty` **from** the saved `size` and leaves the size alone; re-resolving the
size from the new rung would hand the player a different board (easy spans 5-6)
and strand the deductions the save exists to preserve.

### 14.2 Tap places X, double-tap places a mushroom

**Decided.** This replaces the three-state cycle from §2
(`empty → X → 🍄 → empty`).

| Gesture | Cell state | Result |
|---|---|---|
| Tap | empty | ✕ |
| Tap | ✕ or 🍄 | empty |
| Double-tap | any | 🍄 (attempt — see §14.3) |

**A tap clears any filled cell** (operator's answer), which is what keeps every
state reachable once the cycle is gone. Drag-to-sweep is unchanged: a stroke still
only ever paints or erases ✕, and still never disturbs a mushroom (§2).

Three things that are easy to get wrong:

- **Do not make single taps wait for the double-tap window.** The naive detector
  delays every ✕ by ~250 ms, which is the most common gesture in the game. Place
  the ✕ immediately and **upgrade** the cell if a second tap lands inside the
  window.
- **The upgrade must be one undo entry, not two.** Otherwise undo after a
  double-tap strands a ✕ in the cell — the mark the player never asked for.
- **The detector belongs inside the existing gesture, not beside it.** The board
  claims every touch at touch-down to win the ScrollView race (§2, "The ScrollView
  race"), and there is a 6px tap-vs-drag threshold. A second `PanResponder` or a
  child `Touchable` will not see the second tap.

**Accessibility:** a screen reader cannot express a double tap. Cells currently
carry `onAccessibilityTap`; placing a mushroom needs an explicit alternative
action, named in the `accessibilityLabel` (`accessibilityState` does not survive
to the web — see the handoff notes).

**This is a device question.** Double-tap timing, and whether a child can produce
one reliably, cannot be answered in a browser (§2, "A pattern worth knowing").

### 14.3 A wrong guess costs a life; three lives, then the board restarts

**Decided.** Placing a mushroom on a cell that is not in the solution:

1. **immediately** shows it was wrong,
2. leaves a **red ✕** in that cell,
3. spends one of **three lives**.

At zero lives the **same board** restarts — same seed, marks cleared, lives reset.
A fresh board would punish twice and throw away the deduction already made.
**Three lives at every size** (operator's answer; not scaled per difficulty).

**Undo does not refund a life** — *"you don't get lives with info."* The mistake
already told the player something true about the board; taking the ✕ back cannot
take the information back, so the life stays spent. Undo can still retract the
mark.

#### This supersedes the opt-in correctness feedback of §11.1

§11.1 required correctness feedback to be **opt-in and default off**, because
"left on, it turns a deduction puzzle into trial-and-error." That reasoning is
sound and this requirement does not ignore it — it **removes its premise**. What
made always-on feedback corrosive was that guessing was *free*. Once a wrong guess
costs a life and a life is not refundable, guessing is the most expensive thing a
player can do. So:

- **The "Show Mistakes" toggle is deleted**, along with `TOGGLE_MISTAKES` and the
  `showMistakes` field. Open question §8 #7 is answered by deletion.
- **`selectMistakes` becomes vestigial.** It reports wrong mushrooms *sitting on
  the board*, and after this change none can.

#### The consequence that is easy to miss: conflicts become unreachable

If every mushroom that survives on the board is at a solution cell, then any two
mushrooms on the board are two distinct solution cells — and by construction
solution cells never share a row, column or region, and never touch. **Two placed
mushrooms can no longer conflict, ever.**

That makes the live conflict highlighting built in Steps 4–5 unreachable UI. It
is a real loss (the "these two are fighting" read) and it is the direct logical
consequence of immediate feedback, not an oversight. Whoever builds this should
**decide explicitly whether to remove the conflict rendering or leave it dormant**,
and say which in the PR — a future session finding highlighting that never fires
will otherwise assume it is broken.

`findConflicts` itself stays: the engine needs it for generation, solving, and the
reveal-safety check in `selectRevealCell`.

Two more paths go dead for the same reason and should be pruned together:

- **Hint cascade rung 1** (`HINT_KINDS.MISTAKE`) — "one of your mushrooms is in the
  wrong place" cannot happen.
- **`selectRevealCell` returning -1** — documented as "a wrongly-placed mushroom is
  in the way", which is now impossible.

**Unchanged: there is still no such thing as a wrong ✕.** X marks are a thinking
aid with no bearing on the win (§9, §11.1). Only mushroom placements cost lives.

**Open, and worth an on-device answer:** the auto-placed red ✕ is an ordinary ✕
by default, so a later tap clears it — consistent with rule-out and hint marks
(§2). That also lets a player erase the record of their own mistake. Ships
clearable; revisit if it reads wrong in play.

### 14.4 Assists are earned, spent, and can run out — **shipped, Step 11**

**What landed.** `games/fungiku/wallet.js` (pure: `grant` / `spend` / `balance`,
the rates, `rewardForWin`, `payOutWin`, `applyDailyFloor`) plus
`walletStorage.js` under **`@FungikuWallet`**, its own global key — the board save
gained no field and `FUNGIKU_STORAGE_VERSION` is still **3**. Hints and Rule out
are both metered. Earning is a base by difficulty plus a coin per life still
standing and a bonus for finishing without a hint. **Every rate is a guess** and
is flagged for on-device tuning, gathered at the top of `wallet.js` for exactly
that reason.

**One currency: coins.** The first cut of this shipped **two** token kinds — hint
tokens and rule-out tokens — and it failed on the device for a reason worth
recording, because it is not obvious from the design and is obvious the moment you
read the screen. The win banner said:

> **+2 hints · +1 rule-out — no hints**

*You earned two hints because you used no hints.* There is no reading of that
sentence that is not a contradiction, and it is not a wording problem: **a
currency named for what it buys collides with every message about spending it.**
Coins are named for what they *are*, so "you earned 8 coins, 2 of them for using
no hints" is sayable. It also gives the player one number to watch instead of two,
and prices anything added later in units that already exist rather than minting a
third kind. `normalizeWallet` converts an old two-balance wallet at the price
list, so the tokens are worth what they could have bought.

The prices are §11.2's ladder made real, which two currencies could never express:
**rule-out 1, hint 2, reveal 4.** Rule-out is cheapest because it reveals nothing
a player could not derive mechanically.

Five things it settled that the text below does not say:

- **A hint that gives nothing away costs nothing.** The reducer already declined
  to count the "nothing is forced from here" answer in `hintsUsed`; the wallet
  charges on the same side of that line, via `selectHintIsChargeable`, asked
  *before* the action is dispatched. Spending is on the action, not the tap.
- **The payout is watched, not reported.** `rewardForWin` returns a `total` **and
  the steps that make it up**, and the balance in the counter row counts up one
  reason at a time while the banner names each — *"Easy board +3", "3 lives left
  +3", "No hints used +2"*. A player who never sees a bonus named has no reason to
  play for it. The bonus for lives is **per life** rather than all-or-nothing so
  that a nearly-clean board has something true to say.
- **The win payout is idempotent per board.** `solved` is derived from `marks`, so
  it is a condition and not an event — undo/redo cross it freely and a restored
  save arrives already solved. `payOutWin` records *which* board it paid
  (`size:seed`) rather than setting a flag someone would have to clear. With the
  payout animated this stopped being only an accounting question: without it the
  celebration replays every time the line is re-crossed.
- **The floor is a daily top-up**, raising the balance *to* four if it is below
  (never adding), so idling is not an income and a player stranded at zero on a
  hard board always has a way forward. That is the answer to "can this game become
  unwinnable": no.
- **A price you cannot pay looks different from a disabled button.** The price and
  the border go red; "nothing to rule out" and "the board is finished" dim as
  before. Three reasons a button is dead, three readings. The **balance** is not
  repeated on the buttons — it is one number in the counter row, where the payout
  animation can count it up.

**Decided.** **Hints and Rule out both become metered consumables.** "Auto fill" is
the existing **Rule out** button (§2) — confirmed with the operator — and it is
metered too, not left free.

This inverts what exists. `hintsUsed` today is a **per-puzzle counter for
scoring**; this makes assists a **persistent balance that spans puzzles and
sessions**. Different data, different lifetime, different storage key.

Shape it as a **wallet** in its own module:

- `grant(kind, n)` / `spend(kind)` / `balance(kind)`, persisted under its own
  global key — the same shape as `@AppTheme`, not part of the per-puzzle save.
- **Earning** is denominated in what already exists: boards solved, and how
  cleanly (lives remaining, assists unspent). Draft the rates, **say in the PR
  that they are guesses**, and flag them for on-device tuning — color-loop's star
  thresholds were left the same way and are still on its backlog (§13).
- **Gifts** are just `grant()` from another source. Nothing special.
- **Purchases are also just `grant()`** — build the seam, not the store.

**Why the store is not in scope, stated once.** In-app purchase needs
`react-native-iap` or RevenueCat; **neither runs in Expo Go**, so it requires a
dev build — which breaks the epic's "every step must be visible in Expo Go"
rule. A kid-facing app taking payments also pulls in App Store Kids Category
rules and a parental gate. None of that blocks the economy itself. Build the
wallet, leave the store unbuilt behind `grant()`.

**A design note the operator should weigh after playing it:** §11.2 classes rule-out
as the rung that *reveals nothing the player could not derive mechanically* — it
saves tedium, not thinking. Metering it therefore mostly charges younger players
for finger work rather than for insight. Metering **hints** is the part that
prices actual help. Shipping both metered as decided; worth re-checking once a
child has played it.

### 14.5 What this does to the delivery plan

Comfortably more than one step, so §7 splits it:

- **Step 9 — difficulty menu.** §14.1, seeds into the menu, plus the storage
  migration (which §13 already established is unavoidable and must not wipe
  progress).
- **Step 10 — lives and mistakes.** §14.2 and §14.3 together: they are the same
  input surface, and building the double-tap without the life cost would ship a
  mushroom-placing gesture with no consequence attached.
- **Step 11 — earned assists.** §14.4.
- **Step 12 — art swap.** Unchanged, still floating on artwork rather than code.

**§13's ladder research is superseded, not deleted.** A difficulty menu is not a
level ladder, and if a ladder is ever wanted *on top of* difficulty, the
`{size, seed}` framing, the migration warning and the color-loop reference are all
still correct.
