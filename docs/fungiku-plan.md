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
> See §9 for exactly what carried over from the old plan and what was dropped.

## For the implementer (start here)

- **Repo:** `mjohnson139/expo-sudoku`. The app code is in the `SudokuApp/`
  subdirectory (Expo · React Native · JavaScript).
- **This document is the source of truth** for scope and approach — read it end
  to end before writing code.
- **Process:** follow `.github/dev-process.md` — the tracker is issue #65, work
  **one delivery step per branch**, commit after each step, and **prompt the
  operator to test after each step.**
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
(§6) starting at **5×5** — matching the reference's Level 1 → 10 progression.

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

## 6. Delivery steps (one branch per step, per dev-process.md)

0. ~~**Pre-step — upgrade Expo to the latest SDK.**~~ ✅ merged (#66) — SDK 54.
1. ~~**Rendering seam** — `Symbol.js` + `symbolSets.js`.~~ ✅ merged (#67). The
   mushroom glyph and the swatch palette carry into this plan as the placed
   marker and the region colors.
2. **Engine** — `games/fungiku/engine.js`: seeded generator, solver, uniqueness,
   plus the shared `findConflicts` / `isSolved` helpers. Jest unit tests. No UI.
3. **State** — Fungiku reducer + context: mark cycling, live conflict
   validation, win detection, undo/redo, AsyncStorage persistence.
4. **Board UI** — region-colored grid with region-boundary borders,
   tap-to-cycle X/🍄, conflict highlighting, `🍄 X/N` counter, win flow.
5. **Mode entry** — how the player gets into Fungiku (mode selector alongside
   classic Sudoku) plus size/level selection.
6. **Assists & polish** — optional auto-X, win animation, level ladder, scoring.
7. **Art swap** (floating, asset-only) — static mushroom PNG behind the
   `<Symbol>` seam.

## 7. Open questions for the operator

1. **Mode name in the UI** — **decided: "Fungiku"** (internal id `fungiku`).
2. **Ladder shape** — v1 ships **5×5 → 8×8**. Where should it top out, and
   should size be a free choice or unlocked by progression?
3. **Assist defaults** — should auto-X be on by default for younger players?

## 8. Edge cases to get right

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

## 9. Disposition of the pre-replan work

- **Step 0 (#66, merged)** — SDK 54 upgrade. Unaffected, keep.
- **Step 1 (#67, merged)** — `Symbol.js` + `utils/symbolSets.js`. **Kept**; the
  palette becomes the region colors and the mushroom glyph is the placed marker.
  The "numbers ↔ fungiku glyph swap" framing is obsolete.
- **Old Step 2 (PR #68, closed unmerged)** — a numbers↔Fungiku toggle *on the
  Sudoku board*. Built on the superseded "display mode" model: Fungiku is a
  separate mode with its own board, so a symbol-set toggle over the 9×9 numeric
  grid has no place. Closed rather than merged.
