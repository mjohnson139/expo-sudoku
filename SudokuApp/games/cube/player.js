/**
 * Playing a scramble back, one move at a time (docs/cube-plan.md §8, Step 2).
 *
 * The pure half of the scrubber: what the cube looks like at every point in an
 * algorithm, how long a turn should take, and how to say where you are. The
 * React half — the clock, the buttons — is `useScramblePlayer`, and it is thin
 * on purpose so that everything worth a test lives here, where the node test
 * runner can import it.
 *
 * ### Every state up front, not a cube per frame
 *
 * A 20-move scramble is 21 cubes of 26 cubies. Building all of them once, when
 * the scramble changes, makes scrubbing a lookup: dragging back and forth
 * through a scramble never re-derives anything, and stepping backwards needs no
 * inverse move — it is the previous cube, which is already on the shelf.
 */

import { applyMove, solvedCube } from './cubeState';
import { shortWay } from './geometry';
import { tryParseAlg } from './moves';

/** A quarter turn, in milliseconds. Slow enough to read as a turn rather than a
 *  cut, quick enough that twenty of them is not a wait. */
export const TURN_MS = 260;

/** A half turn goes twice as far; making it take twice as long makes playback
 *  lurch, so it is stretched rather than doubled. */
export const HALF_TURN_SCALE = 1.45;

/** The beat between moves while playing. Without it a scramble is one
 *  continuous blur; the point of this screen is to see each move land. */
export const MOVE_GAP_MS = 80;

/**
 * Everything a scrubber needs for one algorithm.
 *
 * Unparseable text yields no moves and a single solved state rather than
 * throwing: this feeds a screen whose whole job is to show a cube, and every
 * algorithm that reaches it has already been validated twice over.
 *
 * @param {string} alg notation, e.g. `R U2 F' D`
 * @returns {{moves: Array<Object>, states: Array<{cubies: Array}>}}
 *   `states[i]` is the cube after `i` moves, so `states.length === moves.length + 1`
 */
export const buildPlayback = (alg) => {
  const moves = tryParseAlg(alg || '') || [];
  const states = [solvedCube()];

  moves.forEach((move) => {
    states.push(applyMove(states[states.length - 1], move));
  });

  return { moves, states };
};

/** How long one move's animation runs. */
export const turnDuration = (move) =>
  Math.round(TURN_MS * (Math.abs(shortWay(move.amount)) === 2 ? HALF_TURN_SCALE : 1));

/**
 * Ease in and out of a turn.
 *
 * A cube turned by hand does not start and stop at full speed, and a linear
 * turn reads as a machine. It is exact at both ends — `ease(0)` is 0 and
 * `ease(1)` is 1, not 0.9999999 — because those are the two frames the
 * renderer draws with integer arithmetic.
 */
export const ease = (p) => {
  const t = p <= 0 ? 0 : p >= 1 ? 1 : p;
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
};

/** Keep a requested position inside the algorithm. Nonsense lands at the
 *  start rather than propagating a `NaN` into the renderer. */
export const clampIndex = (index, count) => {
  const n = Number.isFinite(index) ? Math.round(index) : 0;
  return Math.max(0, Math.min(count, n));
};

/** `"7 / 20"` — the scrubber's own label, where the space matters more than the
 *  words because it sits between two buttons. */
export const describePosition = (index, count) => `${index} / ${count}`;

/** The same thing said out loud, for a screen reader. */
export const announcePosition = (index, count) => {
  if (count === 0) return 'No moves to play';
  if (index === 0) return `Solved cube, before move 1 of ${count}`;
  if (index >= count) return `End of the scramble, all ${count} moves played`;
  return `After move ${index} of ${count}`;
};

export default { buildPlayback, turnDuration, ease, clampIndex, describePosition };
