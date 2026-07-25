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
- **Optional assist (later step):** auto-place X's in a placed mushroom's row,
  column, region, and neighbors. A setting, off by default.

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
| 6 | **Input ergonomics & assists** (§2) — **drag to sweep X's**, then optional auto-X | **Swipe a finger across cells to rule them out**; assist toggle |
| 7 | **Ladder & scoring** — training ladder, size progression, scoring | Level progression and a score |
| 8 | **Art swap** (floating, asset-only — gated on artwork, not on code) | Static mushroom art replaces the icon glyph |

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
4. **Ladder shape** — v1 ships **5×5 → 8×8**. Where should it top out, and
   should size be a free choice or unlocked by progression?
5. **Assist defaults** — should auto-X be on by default for younger players?

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
