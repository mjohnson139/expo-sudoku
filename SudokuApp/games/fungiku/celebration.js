/**
 * celebration.js — the *timing* of the win wave, kept pure and separate from the
 * board that draws it (docs/fungiku-plan.md §12.7).
 *
 * When a board is solved every mushroom on it hops, one after another, in a
 * diagonal ripple from the top-left corner to the bottom-right. This module owns
 * the only tricky part of that: **when each cell's hop happens**.
 *
 * ### Why one shared Animated.Value and not one per cell
 *
 * The handoff's standing rule is "one `Animated.Value` per cell, never one shared
 * value pointed at *the current cell*" — and it still holds, because it is about a
 * value that gets **re-pointed**. Resetting a shared value happens immediately
 * while re-pointing it is a React state update, so for a frame it is still
 * attached to the previous cell; that is the bug that made a previously-placed
 * mushroom visibly shrink.
 *
 * The wave is the opposite shape. It is **one value that every cell reads at
 * once**, and no cell ever hands it to another: each one interpolates the same
 * 0→1 progress through its own fixed window, so the stagger is geometry rather
 * than scheduling. Nothing is re-pointed, nothing is `setValue`d, and one
 * animation drives a hundred cells — which is what lets the wave run on the
 * **native driver** while the placement pop (which *is* per-cell, and *is*
 * `setValue`d) stays on the JS driver, per plan §2's rule that the two must never
 * be mixed on one value.
 *
 * ### The shape of a window
 *
 * Progress runs 0→1 once. Each cell's hop occupies a `BUMP`-wide slice of it,
 * and the slices are staggered across `SPREAD`:
 *
 *     0    start        peak         end                     1
 *     |------|------------|------------|---------------------|
 *     rest   lifts        top of hop   back down             rest
 *
 * **Both ends of the progress are the resting pose**, which is what makes the
 * wave cancellable: the board can jump the value to either end at any time and
 * every mushroom is left exactly where it started. That matters because `solved`
 * is a condition rather than an event — an undo across the win line stops the
 * celebration mid-flight, and a mushroom stranded mid-hop is a permanent visual
 * defect, not a glitch.
 *
 * ### Why the arc is keyframes and not an easing curve
 *
 * `Animated.interpolate` takes an `easing`, and it would express this hop in one
 * line — but **the native driver silently drops it**. `__getNativeConfig` sends
 * only the ranges and the extrapolation, so an eased interpolation animates
 * natively as a straight line, and a hop with linear ramps is a mechanical
 * zigzag rather than a bounce. (In dev RN warns about it; in a release build it
 * just looks wrong.) So the arc is spelled out as extra stops instead, which
 * survives the trip to native, is the same in both drivers, and — unlike a curve
 * buried in a component — can be tested.
 */

/**
 * How much of the run is spent *starting* cells off, versus how long any one
 * cell's hop lasts. They overlap heavily on purpose: a stagger long enough for
 * each hop to finish before the next begins reads as a queue, not a wave.
 *
 * `LEAD_IN + SPREAD + BUMP` must stay **below 1**, so that every keyframe lands
 * strictly inside the progress range. `Animated.interpolate` requires a
 * monotonically increasing input range, and a window touching either end would
 * collide with the resting keyframe there.
 */
const LEAD_IN = 0.02;
const SPREAD = 0.55;
const BUMP = 0.4;

/** How long the whole ripple takes, and how long after the win it starts. */
export const WAVE_DURATION_MS = 1100;

/**
 * The board's own lift (a 300 ms pop) is the first thing that happens on a win,
 * and the banner springs in at 220 ms. The wave starts between them so the
 * sequence reads board → mushrooms → banner rather than everything at once.
 */
export const WAVE_DELAY_MS = 140;

/**
 * Where a cell sits in the ripple, 0 (first) to 1 (last).
 *
 * Keyed on `row + col` — the anti-diagonal — so the wave sweeps across the board
 * corner to corner. Row-major order would read as the board being redrawn line by
 * line, which is what loading looks like, not what winning should.
 */
export function wavePhase(index, size) {
  // A 1×1 board has one cell and no diagonal to travel along. Guarding here
  // rather than at the call site keeps the divide-by-zero impossible instead of
  // merely unlikely.
  if (size <= 1) return 0;
  const row = Math.floor(index / size);
  const col = index % size;
  return (row + col) / (2 * (size - 1));
}

/**
 * The hop itself, as fractions of the bump window and of the peak offset.
 *
 * Sampled off a sine arc rather than spaced evenly: a mushroom leaves the tile
 * quickly, hangs at the top, and drops back. Evenly-spaced stops would give the
 * same peak with none of the weight.
 */
const BUMP_STOPS = [0, 0.3, 0.5, 0.72, 1];
const BUMP_LEVELS = [0, 0.72, 1, 0.72, 0];

/**
 * The interpolation input range for one cell's hop: strictly increasing stops,
 * the first and last of which are the ends of the progress itself.
 *
 * Pair it with `waveOutputRange`, which produces a matching output range for
 * whatever property is being hopped.
 */
export function waveKeyframes(index, size) {
  const start = LEAD_IN + wavePhase(index, size) * SPREAD;
  return [0, ...BUMP_STOPS.map((stop) => start + stop * BUMP), 1];
}

/**
 * The matching output range for a property that rests at `rest` and reaches
 * `peak` at the top of the hop.
 */
export function waveOutputRange(rest, peak) {
  return [rest, ...BUMP_LEVELS.map((level) => rest + level * (peak - rest)), rest];
}
