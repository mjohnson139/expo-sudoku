/**
 * symbolSets.js — the source of truth for how a Sudoku cell value (1..9) maps
 * to a drawable "symbol". Fungiku is a *rendering* skin (docs/fungiku-plan.md
 * §2–§3): the board stays numeric internally; only the glyph a value is drawn
 * with changes. Nothing here touches the generator, reducer, notes, undo/redo,
 * feedback, or win detection.
 *
 * Two sets:
 *   - "numbers": the digit itself — today's behavior, verbatim.
 *   - "fungiku": 8 color swatches + 1 mushroom character. The mushroom uses the
 *     MaterialCommunityIcons "mushroom" glyph as a placeholder until static art
 *     lands behind this same seam (plan §3, Step 5).
 *
 * Colorblind-awareness (plan §3/§6): the swatch palette is the Okabe–Ito
 * colorblind-safe set, so hues stay distinct under the common CVD types, and it
 * spans a range of lightness. On top of color, each swatch carries a distinct
 * corner/shape cue (`corners`) so color is never the only channel of identity.
 */

export const SYMBOL_SET_IDS = { NUMBERS: 'numbers', FUNGIKU: 'fungiku' };

// Which cell value is drawn as the mushroom (the "star"). Fixed per game — it's
// logically just another symbol. Plan §3: "e.g. always 1".
const MUSHROOM_VALUE = 1;

// The mushroom placeholder: MaterialCommunityIcons glyph + a spotlight color and
// a stable screen-reader name. Swapped for a static PNG later (plan Step 5).
const MUSHROOM = { icon: 'mushroom', color: '#C1272D', name: 'mushroom' };

// Okabe–Ito colorblind-safe palette assigned to the 8 non-mushroom values.
// Each entry:
//   color   — distinct hue (colorblind-safe under deutan/protan/tritan)
//   name    — human name used as the stable accessibilityLabel (plan §5)
//   corners — a non-color shape cue: [topLeft, topRight, bottomRight, bottomLeft]
//             border-radius fractions of the swatch size. Every value gets a
//             distinct silhouette (circle, rounded, square, leaf, teardrop) so
//             identity survives even if two colors read alike.
const FUNGIKU_SWATCHES = {
  2: { color: '#E69F00', name: 'orange',   corners: [0.5, 0.5, 0.5, 0.5] },  // circle
  3: { color: '#56B4E9', name: 'sky blue', corners: [0.28, 0.28, 0.28, 0.28] }, // rounded square
  4: { color: '#009E73', name: 'green',    corners: [0.06, 0.06, 0.06, 0.06] }, // square
  5: { color: '#F0E442', name: 'yellow',   corners: [0.5, 0.06, 0.5, 0.06] }, // leaf ╱
  6: { color: '#0072B2', name: 'blue',     corners: [0.06, 0.5, 0.06, 0.5] }, // leaf ╲
  7: { color: '#D55E00', name: 'red',      corners: [0.06, 0.5, 0.5, 0.5] }, // teardrop ◤
  8: { color: '#CC79A7', name: 'pink',     corners: [0.5, 0.06, 0.5, 0.5] }, // teardrop ◥
  9: { color: '#6E6E6E', name: 'gray',     corners: [0.5, 0.5, 0.06, 0.5] }, // teardrop ◢
};

/**
 * resolveSymbol(setId, value) → a plain descriptor Symbol.js knows how to draw:
 *   { kind: 'text',   value, text,  label }               // numbers
 *   { kind: 'swatch', value, color, corners, label }      // fungiku color
 *   { kind: 'icon',   value, icon,  color,   label }       // fungiku mushroom
 *
 * Any unknown set or unexpected value falls back to the numeric digit, so the
 * default path is always safe and visually unchanged.
 */
export function resolveSymbol(setId, value) {
  if (setId === SYMBOL_SET_IDS.FUNGIKU) {
    if (value === MUSHROOM_VALUE) {
      return { kind: 'icon', value, icon: MUSHROOM.icon, color: MUSHROOM.color, label: MUSHROOM.name };
    }
    const swatch = FUNGIKU_SWATCHES[value];
    if (swatch) {
      return { kind: 'swatch', value, color: swatch.color, corners: swatch.corners, label: swatch.name };
    }
    // Unexpected value — fall through to the numeric digit.
  }
  return { kind: 'text', value, text: String(value), label: String(value) };
}

/**
 * The stable, non-visual name for a value in a symbol set — used for
 * accessibilityLabel so screen readers and tests keep working (plan §5). In
 * "numbers" mode this is just the digit string, so today's labels are unchanged.
 */
export function getSymbolLabel(setId, value) {
  return resolveSymbol(setId, value).label;
}
