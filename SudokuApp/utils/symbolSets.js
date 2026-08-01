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
 * Colorblind-awareness (plan §3/§8): the swatch palette is the Okabe–Ito
 * colorblind-safe set, so hues stay distinct under the common CVD types, and it
 * spans a range of lightness. On top of color, each swatch carries a distinct
 * corner/shape cue (`corners`) so color is never the only channel of identity.
 */

import { mix, readableOn } from './color';

export const SYMBOL_SET_IDS = { NUMBERS: 'numbers', FUNGIKU: 'fungiku' };

// Which cell value is drawn as the mushroom (the "star"). Fixed per game — it's
// logically just another symbol. Plan §3: "e.g. always 1".
//
// **Exported so the Fungiku board can ask `Symbol` for the mushroom instead of
// naming a glyph itself.** Fungiku's board has no cell *values* — a cell holds a
// mark, not a digit — so without this constant the board had the icon name
// `'mushroom'` written into it, and an art swap would have had to edit the board
// as well as this file. That is exactly the seam Step 1 built and Step 12 exists
// to use: the mushroom's identity lives here, in one place.
export const MUSHROOM_VALUE = 1;

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
 * The tenth region color (docs/fungiku-plan.md §12.2).
 *
 * **Region-only, and deliberately not a swatch.** The eight swatches above are
 * Sudoku cell *values*, and there is no tenth value — this hue exists solely so
 * a 10×10 Fungiku board has one fill per region. Adding it to FUNGIKU_SWATCHES
 * would invent a symbol nothing can draw.
 *
 * It was searched for, not chosen: see the palette note below for the objective
 * and what it had to beat.
 */
const REGION_ONLY = { color: '#96C115', name: 'lime' };

/**
 * Region colors for the Fungiku board (docs/fungiku-plan.md §3). Regions reuse
 * the same colorblind-safe palette as the swatches above so there is exactly one
 * source of color truth; the mushroom's own red and the region-only lime round
 * the list out to ten — one per region for boards up to 10×10, which is the
 * engine's MAX_SIZE.
 *
 * Each entry carries the saturated `color` (borders, labels, emphasis), a
 * `background` that fills a whole cell, an `ink` color guaranteed to be legible
 * on that background, and the `conflictInk` used to flag a rule-breaking
 * mushroom. `name` stays the stable, non-visual identity used for accessibility
 * labels.
 *
 * ### Why the fills are tuned per hue rather than tinted uniformly
 *
 * The first version tinted every hue toward white by the same 0.62. That reads
 * fine at 5×5 with four regions, and falls apart at 8×8: **sky blue and blue
 * came out only ΔE 6.67 apart** (roughly "the same color, slightly different"),
 * with orange/yellow and several others close behind — 7 of 36 pairs under
 * ΔE 15. Okabe–Ito is colorblind-safe at full saturation, but a uniform tint
 * pulls every hue toward a common light gray and throws that away.
 *
 * The fix is to vary **lightness as well as hue**: each hue gets its own tint
 * weight, chosen by maximizing the worst pairwise CIEDE2000 distance subject to
 * every fill staying inside a lightness band (so the board is still a soft grid,
 * not ten saturated blocks), and clearing the contrast floors below.
 *
 * ### The tenth color, and why ΔE was not the objective that chose it
 *
 * Nine fills covered boards to 9×9. At ten regions the old lookup wrapped and
 * drew region 9 exactly like region 0, so the ceiling moving to 10×10 (§12)
 * needed a tenth hue. Searching hue space for the one that maximized worst-pair
 * ΔE produced palettes that scored *better* than today for normal vision and
 * **worse than today under dichromat simulation** — the exact failure §12.2
 * warned about. Okabe–Ito's colorblind safety lives at full saturation, and
 * tinting toward the theme surface spends it.
 *
 * So the search was reframed: normal-vision separation is a **constraint** (may
 * not fall below what the nine achieved) and colorblind separation is the
 * **objective** maximized underneath it, over all three dichromacies and both
 * themes. Every tint was re-tuned around the new hue. The result adds a color
 * and improves all eight measured axes:
 *
 *              worst-pair ΔE      nine colors  →  ten colors
 *   light      normal                   17.11  →  17.21
 *              protan / deutan / tritan  4.13 / 5.44 / 14.85 → 6.73 / 5.80 / 16.21
 *   dark       normal                   18.55  →  18.69
 *              protan / deutan / tritan  5.80 / 6.38 / 18.52 → 6.31 / 6.79 / 19.21
 *
 * with 0 of 45 pairs under ΔE 15 in both themes.
 *
 * `utils/__tests__/symbolSets.test.js` pins a floor under all of it — the ΔE
 * floor, the lightness band, the contrast ratios, and now the per-dichromacy
 * baselines — so a future "let's soften the palette" tweak fails a test instead
 * of quietly reintroducing the bug. **Re-tune with the same objective rather
 * than by eye**, and remember that a swatch which looks distinct on your screen
 * is not evidence about either property.
 */
const HUE_ORDER = [
  ...Object.keys(FUNGIKU_SWATCHES)
    .map(Number)
    .sort((a, b) => a - b)
    .map((value) => FUNGIKU_SWATCHES[value]),
  MUSHROOM,
  REGION_ONLY,
];

// Order matches HUE_ORDER: orange, sky blue, green, yellow, blue, red, pink,
// gray, mushroom-red, lime. Tuned, not picked by hand — see the note above.
const LIGHT_TINTS = [0, 0, 0.2, 0.75, 0.77, 0.63, 0.49, 0.38, 0.44, 0.25];
const DARK_TINTS = [0.38, 0.37, 0.18, 0.95, 0.53, 0.65, 0.24, 0.15, 0.04, 0.58];

// What the fills are blended toward. Dark themes blend toward a dark surface
// instead of white — pastel fills on a near-black background were the untested
// case, and they glared.
const LIGHT_SURFACE = '#ffffff';
const DARK_SURFACE = '#1e1e1e';

/**
 * Conflict colors, one per mode. Both clear WCAG's 3:1 floor for non-text
 * graphics against *every* fill in their palette (light 5.64:1, dark 3.10:1) —
 * the obvious `#C1272D` only managed 2.55:1 on the warmer fills, which is why
 * the conflict marker is not simply "the mushroom, but red".
 */
const CONFLICT_INK = { light: '#6B0000', dark: '#FFC9C9' };

const buildRegionPalette = (surface, tints, conflictInk) =>
  HUE_ORDER.map(({ color, name }, index) => {
    const background = mix(color, surface, tints[index]);
    return {
      color,
      name,
      background,
      // Guaranteed-legible glyph color for this fill, rather than the region's
      // own hue: at these tints a saturated orange mushroom on an orange fill
      // would be nearly invisible.
      ink: readableOn(background),
      conflictInk,
    };
  });

export const REGION_PALETTES = {
  light: buildRegionPalette(LIGHT_SURFACE, LIGHT_TINTS, CONFLICT_INK.light),
  dark: buildRegionPalette(DARK_SURFACE, DARK_TINTS, CONFLICT_INK.dark),
};

/** The light palette, kept as a name for the default set. */
export const REGION_COLORS = REGION_PALETTES.light;

/** The whole palette for a mode. */
export function getRegionPalette(isDark = false) {
  return isDark ? REGION_PALETTES.dark : REGION_PALETTES.light;
}

/**
 * A fill that is unmistakably not part of the palette, returned when a region id
 * has no colour of its own. It exists so that failure is *loud* — see below.
 */
const UNKNOWN_REGION = {
  color: '#FF00FF',
  name: 'unknown region',
  background: '#FF00FF',
  ink: '#000000',
  conflictInk: '#000000',
};

// One report per bad id, not one per cell: a 10×10 board would otherwise log a
// hundred identical lines and bury everything else.
const reportedRegionIds = new Set();

/**
 * The palette entry for a region id.
 *
 * **This used to wrap** — `palette[regionId % palette.length]` — which was fine
 * while boards held at most 9 regions and silently wrong the moment they held
 * 10: region 9 came out the same colour as region 0, and region colour is how a
 * player tells one region from another. A wrapping lookup does not fail, it just
 * draws the wrong board.
 *
 * So there are now two lines of defence, and neither of them is a modulo:
 *
 * 1. **Impossible by construction.** The palette holds one fill per region up to
 *    the engine's `MAX_SIZE`, and `generate()` rejects anything larger, so a
 *    region id outside the palette cannot arise from a board this app built.
 *    `utils/__tests__/symbolSets.test.js` pins that relationship.
 * 2. **Loud if it happens anyway** — a corrupt save, or a future size increase
 *    that forgets the palette. A magenta cell and a console error are both
 *    impossible to miss, and unlike throwing they do not take the screen down
 *    mid-render for what is a cosmetic failure.
 */
export function getRegionColor(regionId, isDark = false) {
  const palette = getRegionPalette(isDark);
  const entry = palette[regionId];

  if (!entry) {
    if (!reportedRegionIds.has(regionId)) {
      reportedRegionIds.add(regionId);
      console.error(
        `symbolSets: no colour for region ${regionId} — the palette holds ${palette.length}. ` +
          'Boards with more regions than that are not supported; see MAX_SIZE in games/fungiku/engine.js.'
      );
    }
    return UNKNOWN_REGION;
  }

  return entry;
}

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
