/**
 * Small color-math helpers, used to keep the Fungiku region palette honestly
 * distinguishable rather than distinguishable-looking-in-one-screenshot.
 *
 * Why this exists: the region fills are pastel tints of the Okabe–Ito palette,
 * and tinting every hue toward white by the same amount compressed them toward a
 * common light gray — at 8×8, sky blue and blue read as the same color. Judging
 * that by eye is how the bug got in, so `deltaE` gives it a number and a unit
 * test puts a floor under it (see utils/__tests__/color.test.js and
 * symbolSets.js).
 *
 * Pure JS, no dependencies, no React — runs in the node-env test runner.
 */

/** '#rrggbb' → { r, g, b } in 0–255. */
export const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

/** { r, g, b } in 0–255 → '#rrggbb'. */
export const rgbToHex = ({ r, g, b }) => {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${((1 << 24) | (clamp(r) << 16) | (clamp(g) << 8) | clamp(b)).toString(16).slice(1)}`;
};

/**
 * Blend `hex` toward `target` by `weight` (0 = unchanged, 1 = fully target).
 *
 * This generalizes the old `mixWithWhite`: region fills tint toward white on a
 * light theme and toward the theme's dark surface on a dark one, so the same
 * hues work on both.
 */
export const mix = (hex, target, weight) => {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  const w = Math.max(0, Math.min(1, weight));
  return rgbToHex({
    r: a.r + (b.r - a.r) * w,
    g: a.g + (b.g - a.g) * w,
    b: a.b + (b.b - a.b) * w,
  });
};

const srgbToLinear = (channel) => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance, 0 (black) to 1 (white). */
export const relativeLuminance = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  return (
    0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
  );
};

/** WCAG contrast ratio between two colors, 1 (identical) to 21 (black/white). */
export const contrastRatio = (a, b) => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Pick whichever of `dark`/`light` reads better on `background`. Used so a
 * glyph drawn on a region fill stays legible in every theme instead of being
 * hardcoded for the pastel ones.
 */
export const readableOn = (background, dark = '#1a1a1a', light = '#ffffff') =>
  contrastRatio(background, dark) >= contrastRatio(background, light) ? dark : light;

// D65 white point, matching sRGB.
const WHITE_X = 95.047;
const WHITE_Y = 100.0;
const WHITE_Z = 108.883;

/** sRGB hex → CIELAB { L, a, b }. */
export const hexToLab = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  const rl = srgbToLinear(r) * 100;
  const gl = srgbToLinear(g) * 100;
  const bl = srgbToLinear(b) * 100;

  // sRGB → XYZ (D65)
  const x = (rl * 0.4124 + gl * 0.3576 + bl * 0.1805) / WHITE_X;
  const y = (rl * 0.2126 + gl * 0.7152 + bl * 0.0722) / WHITE_Y;
  const z = (rl * 0.0193 + gl * 0.1192 + bl * 0.9505) / WHITE_Z;

  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
};

const deg = (rad) => (rad * 180) / Math.PI;
const rad = (d) => (d * Math.PI) / 180;

/**
 * CIEDE2000 perceptual difference between two colors.
 *
 * Worth the extra algebra over the simpler CIE76: CIE76 *overstates* how
 * different saturated blues are, and blues are exactly the pair this palette
 * was failing on — so the simpler formula would have happily passed the bug.
 *
 * Rule of thumb: ~1 is the just-noticeable threshold, ~10 reads as "clearly a
 * different color" at a glance.
 *
 * Implementation follows Sharma, Wu & Dalal (2005); the published test vectors
 * are pinned in utils/__tests__/color.test.js.
 */
export const deltaE = (hexA, hexB) => {
  const { L: L1, a: a1, b: b1 } = hexToLab(hexA);
  const { L: L2, a: a2, b: b2 } = hexToLab(hexB);

  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cbar = (C1 + C2) / 2;

  const Cbar7 = Cbar ** 7;
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + 25 ** 7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;

  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);

  const hp = (ap, bp) => {
    if (ap === 0 && bp === 0) return 0;
    const h = deg(Math.atan2(bp, ap));
    return h >= 0 ? h : h + 360;
  };
  const h1p = hp(a1p, b1);
  const h2p = hp(a2p, b2);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp;
  if (C1p * C2p === 0) {
    dhp = 0;
  } else if (Math.abs(h2p - h1p) <= 180) {
    dhp = h2p - h1p;
  } else if (h2p - h1p > 180) {
    dhp = h2p - h1p - 360;
  } else {
    dhp = h2p - h1p + 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp) / 2);

  const Lbarp = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;

  let hbarp;
  if (C1p * C2p === 0) {
    hbarp = h1p + h2p;
  } else if (Math.abs(h1p - h2p) <= 180) {
    hbarp = (h1p + h2p) / 2;
  } else if (h1p + h2p < 360) {
    hbarp = (h1p + h2p + 360) / 2;
  } else {
    hbarp = (h1p + h2p - 360) / 2;
  }

  const T =
    1 -
    0.17 * Math.cos(rad(hbarp - 30)) +
    0.24 * Math.cos(rad(2 * hbarp)) +
    0.32 * Math.cos(rad(3 * hbarp + 6)) -
    0.2 * Math.cos(rad(4 * hbarp - 63));

  const dTheta = 30 * Math.exp(-(((hbarp - 275) / 25) ** 2));
  const Cbarp7 = Cbarp ** 7;
  const RC = 2 * Math.sqrt(Cbarp7 / (Cbarp7 + 25 ** 7));
  const RT = -RC * Math.sin(rad(2 * dTheta));

  const SL = 1 + (0.015 * (Lbarp - 50) ** 2) / Math.sqrt(20 + (Lbarp - 50) ** 2);
  const SC = 1 + 0.045 * Cbarp;
  const SH = 1 + 0.015 * Cbarp * T;

  return Math.sqrt(
    (dLp / SL) ** 2 +
      (dCp / SC) ** 2 +
      (dHp / SH) ** 2 +
      RT * (dCp / SC) * (dHp / SH)
  );
};

/**
 * Dichromat simulation matrices (Viénot, Brettel & Mollon 1999) in the form
 * composed for sRGB primaries, applied in **linear** sRGB. `protan` and `deutan`
 * are the common red-green types; `tritan` is the rare blue-yellow one.
 *
 * Every row sums to 1, which is the property to check these against: it means a
 * neutral stays neutral, because a gray has no hue for a dichromat to lose. The
 * *other* well-known form of these matrices — `[0, 2.02344, -2.52581]` and
 * friends — operates on LMS cone responses, not on RGB. Applying that one
 * directly to linear RGB is a common shortcut and it is wrong: it turns mid-gray
 * into teal, which is how this version got caught.
 */
const CVD_MATRICES = {
  protan: [
    [0.11238, 0.88762, 0],
    [0.11238, 0.88762, 0],
    [0.00401, -0.00401, 1],
  ],
  deutan: [
    [0.29275, 0.70725, 0],
    [0.29275, 0.70725, 0],
    [-0.02234, 0.02234, 1],
  ],
  tritan: [
    [1, 0.14461, -0.14461],
    [0, 1, 0],
    [0, 0.15117, 0.84883],
  ],
};

/** The colour-vision deficiencies the palette is checked against. */
export const CVD_TYPES = Object.keys(CVD_MATRICES);

const linearToSrgb = (v) => {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, c * 255));
};

/**
 * `hex` as a dichromat sees it.
 *
 * This exists because **ΔE and colourblind safety are different properties**, and
 * the region palette needs both. Okabe–Ito was chosen for hues that survive the
 * common CVD types — but the board tints those hues toward the theme surface, and
 * tinting spends exactly the separation the palette was picked for. A tenth fill
 * chosen only to maximize ΔE for normal vision can sit right on top of an
 * existing one under deutan, and nothing else in the suite would notice.
 *
 * Simulation is a model, not a measurement: treat the numbers as a *relative*
 * bar ("no worse than what already ships") rather than an absolute threshold.
 * That is how `utils/__tests__/symbolSets.test.js` uses them.
 */
export const simulateCvd = (hex, type) => {
  const m = CVD_MATRICES[type];
  if (!m) return hex;

  const { r, g, b } = hexToRgb(hex);
  const v = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
  const out = m.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);

  return rgbToHex({
    r: linearToSrgb(out[0]),
    g: linearToSrgb(out[1]),
    b: linearToSrgb(out[2]),
  });
};

/**
 * The closest pair in a list of colors, as `{ a, b, distance }`. The palette
 * test asserts on this: a palette is only as readable as its worst pair.
 */
export const closestPair = (hexes) => {
  let worst = { a: null, b: null, distance: Infinity };
  for (let i = 0; i < hexes.length; i++) {
    for (let j = i + 1; j < hexes.length; j++) {
      const distance = deltaE(hexes[i], hexes[j]);
      if (distance < worst.distance) {
        worst = { a: hexes[i], b: hexes[j], distance };
      }
    }
  }
  return worst;
};

export default {
  hexToRgb,
  rgbToHex,
  mix,
  relativeLuminance,
  contrastRatio,
  readableOn,
  hexToLab,
  deltaE,
  simulateCvd,
  CVD_TYPES,
  closestPair,
};
