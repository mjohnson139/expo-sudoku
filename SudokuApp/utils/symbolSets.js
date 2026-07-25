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
 * Region colors for the Fungiku board (docs/fungiku-plan.md §3). Regions reuse
 * the same colorblind-safe palette as the swatches above so there is exactly one
 * source of color truth; the mushroom's own red rounds the list out to nine, one
 * per region for boards up to 9×9.
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
 * not nine saturated blocks). That search gives:
 *
 *   light theme: worst pair ΔE 17.11, **0 of 36 pairs under 15**
 *   dark theme:  worst pair ΔE 18.55, 0 of 36 pairs under 15
 *
 * `utils/__tests__/symbolSets.test.js` pins a floor under those numbers, so a
 * future "let's soften the palette" tweak fails a test instead of quietly
 * reintroducing the bug. Re-tune with the same objective rather than by eye.
 */
const HUE_ORDER = [
  ...Object.keys(FUNGIKU_SWATCHES)
    .map(Number)
    .sort((a, b) => a - b)
    .map((value) => FUNGIKU_SWATCHES[value]),
  MUSHROOM,
];

// Order matches HUE_ORDER: orange, sky blue, green, yellow, blue, red, pink,
// gray, mushroom-red. Tuned, not picked by hand — see the note above.
const LIGHT_TINTS = [0.1, 0.76, 0.62, 0.1, 0.46, 0.62, 0.7, 0.44, 0.54];
const DARK_TINTS = [0.7, 0.38, 0.55, 0.55, 0.54, 0.12, 0.24, 0.18, 0.55];

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

/** The palette entry for a region id, wrapping around if ids exceed the palette. */
export function getRegionColor(regionId, isDark = false) {
  const palette = getRegionPalette(isDark);
  return palette[regionId % palette.length];
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
