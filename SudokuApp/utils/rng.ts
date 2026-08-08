/**
 * `mulberry32` — a nine-line seeded PRNG, ported from the sibling color-loop app
 * (docs/colorloop-merge-plan.md §4.5).
 *
 * It is here in `utils/` rather than inside a game because the two incoming
 * games and Color Loop's match seeding already share it. That is promoting a
 * function with three callers, which is the opposite of building a framework —
 * the plan is explicit that this epic does **not** unify seeding with Fungiku's
 * own generator in `games/fungiku/engine.js`.
 *
 * The sequence is part of every shareable puzzle code: a Number Slide board is
 * `nsShuffle(seed)` and a Color Loop board is `makeScrambled(seed, n, mode)`, so
 * changing a line in here changes which puzzle a code produces, on every device,
 * forever. Treat it as frozen.
 */
export function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default mulberry32;
