/**
 * confetti.js — the burst that greets a solved board (docs/fungiku-plan.md
 * §12.11).
 *
 * Pure, and separate from the dialog that draws it, for the same reason
 * `celebration.js` and `hintPlacement.js` are: Jest here is plain node with no
 * React Native, so the only way this geometry gets tested is if it lives out
 * here.
 *
 * ### Deterministic, not random
 *
 * Every piece's angle, distance, spin and size come from a hash of its index.
 * `Math.random()` would have been shorter and is the wrong tool twice over:
 *
 * - **A component re-renders.** Rolling fresh values on each render would make
 *   the burst twitch every time the coin balance ticked or the theme changed,
 *   because each piece would jump to a new trajectory mid-flight.
 * - **A test cannot check a coin flip.** "The pieces go in all directions" is a
 *   property worth pinning — a burst where every piece happened to fly left is a
 *   real failure — and it is only checkable if the answer is the same twice.
 *
 * The hash is the standard `sin(x) * 43758.5453` fract trick: cheap, no state,
 * and well-spread for the small integer inputs used here.
 *
 * ### One value, many pieces
 *
 * Every piece reads the same 0→1 progress and differs only in its **output**
 * ranges, so the whole burst is one native-driven animation rather than twenty.
 * That is the same shape as the win wave (`celebration.js`) and the same reason:
 * nothing is ever re-pointed at a different piece, so the per-cell rule that
 * governs the board's own animations does not apply.
 */

/** Deterministic pseudo-random in [0, 1) from an integer. */
const hash = (n) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

/** How many pieces. Enough to read as a burst, few enough to stay cheap. */
export const CONFETTI_COUNT = 18;

/** How long the burst takes, start to gone. */
export const CONFETTI_DURATION_MS = 1500;

/** How far pieces drift down after the outward burst has spent itself. */
export const CONFETTI_FALL = 170;

/**
 * The colours a piece can be. Deliberately **not** the region palette: those are
 * tuned for dichromat separation *as fills behind a glyph* (§12.2), and reusing
 * them here would tie a decorative choice to a load-bearing one — retuning the
 * board's legibility would silently restyle the confetti, and vice versa.
 */
export const CONFETTI_COLORS = [
  '#E5533D',
  '#F2B035',
  '#4CA98C',
  '#3D8BD6',
  '#9B6BC4',
  '#E87BA6',
];

/**
 * The fixed trajectory of every piece.
 *
 * Angles are spread evenly around the circle and then jittered, rather than
 * being drawn at random: an even spread with a wobble looks like a burst, while
 * pure randomness clumps and leaves gaps at this count.
 *
 * @returns {Array<{dx: number, dy: number, spin: number, size: number,
 *   color: string}>} `dx`/`dy` are where the piece ends up horizontally and at
 *   the top of its arc; the fall is added by the keyframes below.
 */
export function confettiPieces(count = CONFETTI_COUNT) {
  return Array.from({ length: count }, (_, i) => {
    const evenly = (i / count) * Math.PI * 2;
    const angle = evenly + (hash(i) - 0.5) * 0.55;
    const distance = 70 + hash(i + 101) * 85;

    return {
      dx: Math.round(Math.cos(angle) * distance),
      dy: Math.round(Math.sin(angle) * distance),
      // Alternating direction so the burst does not appear to rotate as a whole.
      spin: Math.round((240 + hash(i + 211) * 700) * (i % 2 ? 1 : -1)),
      size: 5 + Math.round(hash(i + 307) * 4),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    };
  });
}

/**
 * Where in the run a piece is at its furthest out, before gravity takes it.
 * Shared by every piece, so the burst peaks together and disperses together.
 */
export const CONFETTI_PEAK = 0.42;

/** Input range for every piece's interpolations. Strictly increasing. */
export const CONFETTI_INPUT = [0, 0.08, CONFETTI_PEAK, 1];

/** How a piece travels sideways: straight out, then holds. */
export function confettiX(dx) {
  return [0, dx * 0.35, dx, dx * 1.1];
}

/** Up and out, then down past where it started — the arc gravity would give. */
export function confettiY(dy) {
  return [0, dy * 0.4, dy, dy + CONFETTI_FALL];
}

/** In fast, gone by the end. Nothing may be left on screen at rest. */
export const CONFETTI_OPACITY = [0, 1, 1, 0];
