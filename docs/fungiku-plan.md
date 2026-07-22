# Fungiku — Feature Plan

**Fungiku is a display mode for Sudoku, not a new game.** The board, the
generator, the reducer, undo/redo, notes, feedback, and win detection all stay
exactly as they are. What changes is *how a cell's value is drawn*: instead of
the digits 1–9, a puzzle shows **8 color swatches plus one mushroom character**.
It's the family "meowdoku" concept — one symbol is a creature, the rest are
colors — dropped in as a symbol set the player can switch on.

## 1. Why this belongs in expo-sudoku (and not as its own game)

The mechanic *is* Sudoku. Everything that makes Sudoku work already lives here:
`sudoku-gen` generation, the `GameContext` reducer, notes, undo/redo, the timer,
win detection, feedback mode, seven themes. A creature-and-swatches skin is a
**rendering concern over the existing numeric board** — the cell values stay
`1..9` internally; only their glyphs change. Building it as a standalone game
would mean re-implementing all of the above to gain nothing.

This also rides the grain of the app's existing **theme system**: Fungiku is
essentially "a theme that swaps glyphs for swatches," selected the same way
themes are today.

## 2. The rendering seam

A cell's value is drawn in exactly two components — that's the entire surface:

| Where | Today | Fungiku mode |
|-------|-------|--------------|
| `components/Cell.js` | `<Text>{value}</Text>` | `<Symbol value={value} />` |
| `components/NumberPad.js` | digit label per button | swatch / mushroom per button |
| `components/Cell.js` notes 3×3 grid | mini digit per note | mini swatch / mushroom |

A new `components/Symbol.js` owns the mapping `value → glyph` for the active
symbol set. Number mode returns the digit `<Text>` (today's behavior verbatim),
so the default path is unchanged and low-risk.

## 3. Symbol set design

- **8 swatches + 1 mushroom** for a 9×9 board. Which value is the mushroom is
  fixed per game (e.g. always `1`, or chosen at game start) — logically it's
  just another symbol; cosmetically it's the star.
- **Swatch palette** lives in a new `utils/symbolSets.js`, colorblind-checked:
  distinct hues *and* distinct lightness, plus a subtle per-swatch shape/corner
  treatment so color isn't the only channel. Eight highly-distinct swatches is
  the main design risk — see §6 open questions.
- **The mushroom**, staged so nothing blocks on art:
  1. **Placeholder (ships first):** the `mushroom` glyph from
     `react-native-vector-icons/MaterialCommunityIcons` — already a dependency,
     zero new assets. It renders in a cell and on a number-pad button as-is.
  2. **Art swap (later):** a single static transparent PNG in
     `SudokuApp/assets/mushrooms/` behind the same `<Symbol>` seam — a pure
     asset change, no logic touched. Sprite-sheet / frame animation is
     deliberately out of scope; any liveliness comes from container-level
     `Animated` transforms if we want it (placement pop, win wiggle),
     consistent with the app's existing animation direction.

## 4. Where the toggle lives + persistence

- Add a **symbol-set selector** next to `ThemeSelector` in the top strip (same
  pattern: an icon button that cycles `Numbers → Fungiku`), or a row in the game
  menu — pick one in review. `GameContext` gains `symbolSet` state and a
  `cycleSymbolSet`/`setSymbolSet` action, mirroring `currentThemeName` /
  `cycleTheme`.
- Persist it the same way the theme is persisted (AsyncStorage via the existing
  `usePersistentReducer`), so the family's choice survives relaunch.
- Symbol set is **orthogonal to theme and difficulty** — any theme, any
  difficulty, numbers or Fungiku.

## 5. Edge cases to get right (cheap, but easy to miss)

- **Feedback mode can't use text color.** Correct/incorrect today are conveyed
  by *text* color (`correctValueText` / `incorrectValueText`). A swatch already
  owns its color, so feedback needs a non-color channel in Fungiku mode: a
  cell-border tint or a small ✓/✗ corner overlay. This is the one real UI
  design decision in the feature.
- **Notes** render as the 3×3 mini-grid — in Fungiku they become mini-swatches
  (and a mini-mushroom). Legibility at that size needs a quick device check;
  falling back to keeping notes as digits is an acceptable v1 if mini-swatches
  read poorly.
- **Accessibility:** `Cell.js` sets `accessibilityLabel={`Cell value: ${value}`}`.
  Keep a stable label per symbol (e.g. "teal" / "mushroom") so screen readers
  and tests still work — don't drop the numeric identity underneath.
- **NumberPad "used-up" dimming** already counts value usage on the board; it's
  value-based, not glyph-based, so it keeps working untouched.

## 6. Delivery steps (small, one branch per step per dev-process.md)

1. `components/Symbol.js` + `utils/symbolSets.js` (numbers set + Fungiku set with
   MCI mushroom placeholder). Wire `Cell.js` to render through `<Symbol>` — with
   `symbolSet` hardcoded to `numbers` first, proving zero visual change.
2. Add `symbolSet` to `GameContext` (state, action, persistence) + the selector
   control. Now toggleable end-to-end on the board.
3. Route `NumberPad.js` and the notes mini-grid through `<Symbol>`.
4. Feedback-in-color-mode treatment (border/overlay) — the §5 design decision.
5. Static-PNG art swap when mushroom art lands (floating; asset-only).

## 7. Open questions for the operator

1. **What's shown in the UI** — call the mode "Fungiku" (fun, on-brand with the
   family name) or something plain like "Colors"? The internal name can stay
   `fungiku` either way.
2. **8-swatch legibility** at 9×9. If eight distinct swatches prove too busy for
   kids, the faithful "simplified" fix is **smaller boards (4×4 / 6×6)** — but
   `sudoku-gen` is 9×9-only, so that needs a size-generic generator and is a
   separate, larger piece of work. Flagged, not assumed.
3. **Feedback channel** in color mode (border tint vs. ✓/✗ overlay) — §5.
