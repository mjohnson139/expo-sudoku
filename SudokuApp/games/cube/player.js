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
import { tryScanAlg } from './moves';

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
 * The speeds the tempo control cycles through.
 *
 * Three, not five: the control is a chip you tap to advance, and a cycle you
 * have to go round four times to get back where you were is a control nobody
 * uses twice. Half speed is for reading one move, double for getting somewhere.
 * Faster than double stops being a turn you can watch, which is the whole point
 * of this screen, so there is deliberately no 4×.
 */
export const SPEEDS = [0.5, 1, 2];

/** The speed a scramble opens at. */
export const DEFAULT_SPEED = 1;

/** The next speed round the cycle. An unrecognized rate lands back at 1×. */
export const nextSpeed = (rate) => {
  const at = SPEEDS.indexOf(rate);
  return at === -1 ? DEFAULT_SPEED : SPEEDS[(at + 1) % SPEEDS.length];
};

/** `"1×"` — what the chip says. Trailing `.0` never appears, so 2 reads as
 *  `2×` rather than `2.0×` while 0.5 keeps its half. */
export const describeSpeed = (rate) => `${rate}×`;

/**
 * Everything a scrubber needs for one algorithm.
 *
 * Unparseable text yields no moves and a single starting state rather than
 * throwing: this feeds a screen whose whole job is to show a cube, and every
 * algorithm that reaches it has already been validated twice over.
 *
 * ### `from`, and why a solve needs it
 *
 * A scramble starts from a solved cube. A **solve** starts from the scrambled
 * one — that is the cube you would be holding — so the starting position is an
 * argument rather than a constant. Everything else about playback is the same:
 * a solve is a list of moves like any other, which is why Step 3 drives this
 * rather than growing a second transport (plan §8.2).
 *
 * `tokens[i]` is the token as it was *written* and `moves[i]` is what it does,
 * so a screen can print `r` while the model turns `Rw` (plan §4).
 *
 * @param {string} alg notation, e.g. `R U2 F' D`
 * @param {{from?: {cubies: Array}}} [options] `from` is the cube move 1 starts on;
 *   omitted means solved
 * @returns {{moves: Array<Object>, tokens: string[], states: Array<{cubies: Array}>}}
 *   `states[i]` is the cube after `i` moves, so `states.length === moves.length + 1`
 */
export const buildPlayback = (alg, { from } = {}) => {
  const { tokens, moves } = tryScanAlg(alg || '') || { tokens: [], moves: [] };
  const states = [from || solvedCube()];

  moves.forEach((move) => {
    states.push(applyMove(states[states.length - 1], move));
  });

  return { moves, tokens, states };
};

/**
 * Whether `after` is `before` with moves added after position `from`.
 *
 * The one question the transport has to answer when the algorithm underneath it
 * changes. A scramble being *replaced* should reset the cube to the end of the
 * new one; a solve being *added to* should turn the new moves, because appending
 * a move you cannot see happen is the whole thing the solve pad exists to do.
 * Told apart by this, and pure so it is testable rather than a feeling in an
 * effect.
 *
 * `from` defaults to the whole of `before`, which is the plain reading: *is this
 * the same algorithm with more on the end*. The transport passes **where the
 * cube actually is** instead, which is the same question asked more usefully —
 * the moves past that point have not been played yet, so whether they changed
 * cannot matter. That is what makes undo-then-type animate: by the time the new
 * move arrives the cube has already turned back, and the algorithm agrees with
 * the old one everywhere the cube has been.
 *
 * Compared on the parsed moves rather than the raw text, so respelling `r` as
 * `Rw` mid-solve is still the same prefix — the cubes are identical either way,
 * which is what "walk forward from here" actually depends on. Text neither side
 * can parse is not an extension of anything.
 *
 * @param {string} before the algorithm the cube is currently playing
 * @param {string} after the one it is about to play
 * @param {number} [from] how many moves in the cube is; defaults to all of
 *   `before`
 */
export const extendsAlg = (before, after, from) => {
  const first = tryScanAlg(before || '');
  const second = tryScanAlg(after || '');
  if (!first || !second) return false;

  const at = from === undefined ? first.moves.length : from;
  if (!Number.isInteger(at) || at < 0) return false;
  // Past the end of either one there is nothing to agree about — and a cube
  // sitting further in than the new algorithm reaches has nowhere to walk to.
  if (at > first.moves.length || at > second.moves.length) return false;

  for (let i = 0; i < at; i += 1) {
    if (first.moves[i].token !== second.moves[i].token) return false;
  }
  return true;
};

/**
 * The **promotion**: the pad's second tap growing `R` into `R2` in place
 * (plan §8.8).
 *
 * It is the one edit that rewrites a move the cube has *already played*, which
 * makes it invisible to `extendsAlg` — the token at the cube's own position
 * changed, so that function correctly calls it a replacement, and a replacement
 * resets. The result was a half turn whose second quarter never animated: the
 * cube simply appeared in its new position (operator, 2026-08-05).
 *
 * @returns {{at: number, turns: number}|null} the move to carry on turning, and
 *   the **signed** quarter-turn sweep to carry it round by, or `null` if this
 *   was not a promotion.
 *
 * ### Why the sweep has to be signed
 *
 * A half turn has no direction of its own — `shortWay(2)` is `+2` whichever way
 * you came — but this one does, because the cube is already a quarter of the way
 * through it. `D` carries `amount: 3` and turns **anticlockwise**; `D2` carries
 * `2` and would animate clockwise, so continuing it naively would snap the layer
 * 180° and then turn. The sweep is therefore two quarters *in the direction the
 * first quarter went*, and the animation runs the back half of it. Landing is
 * unaffected: ±2 quarter turns are the same permutation.
 */
export const promotedTurn = (before, after, from) => {
  const first = tryScanAlg(before || '');
  const second = tryScanAlg(after || '');
  if (!first || !second) return null;

  const at = from === undefined ? first.moves.length : from;
  if (!Number.isInteger(at) || at < 1) return null;
  if (at > first.moves.length || at > second.moves.length) return null;

  // Everything the cube went through *before* the last move must be untouched;
  // anything after where it is standing has not been played and cannot matter.
  for (let i = 0; i < at - 1; i += 1) {
    if (first.moves[i].token !== second.moves[i].token) return null;
  }

  const was = first.moves[at - 1];
  const now = second.moves[at - 1];
  if (was.axis !== now.axis) return null;
  if (was.layers.length !== now.layers.length) return null;
  if (was.layers.some((layer, i) => layer !== now.layers[i])) return null;

  const from90 = shortWay(was.amount);
  if (Math.abs(from90) !== 1) return null;
  if (Math.abs(shortWay(now.amount)) !== 2) return null;

  return { at: at - 1, turns: 2 * from90 };
};

/**
 * How long one move's animation runs, at `rate` times normal speed.
 *
 * The rate divides rather than multiplies, so 2× is twice as *quick*, which is
 * what the chip's label promises. It scales single steps as well as playback:
 * half speed is for reading one move, and a step button is exactly that.
 */
export const turnDuration = (move, rate = DEFAULT_SPEED) =>
  Math.round(
    (TURN_MS * (Math.abs(shortWay(move.amount)) === 2 ? HALF_TURN_SCALE : 1)) /
      (rate > 0 ? rate : DEFAULT_SPEED)
  );

/** The beat between moves, at `rate`. The pause between turns is part of the
 *  tempo, so it stretches and shrinks with them rather than staying put and
 *  turning double speed into a stutter. */
export const gapDuration = (rate = DEFAULT_SPEED) =>
  Math.round(MOVE_GAP_MS / (rate > 0 ? rate : DEFAULT_SPEED));

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

/**
 * The same thing said out loud, for a screen reader.
 *
 * `noun` is what is being played. It matters at position 0: the start of a
 * scramble is a solved cube, and the start of a *solve* is the scrambled one —
 * announcing "solved cube" there would be a lie in the one place a screen reader
 * user has nothing else to go on.
 */
export const announcePosition = (index, count, noun = 'scramble') => {
  const solve = noun === 'solve';
  if (count === 0) return solve ? 'No moves entered yet' : 'No moves to play';
  if (index === 0) {
    return solve
      ? `The scrambled cube, before move 1 of ${count}`
      : `Solved cube, before move 1 of ${count}`;
  }
  if (index >= count) return `End of the ${noun}, all ${count} moves played`;
  return `After move ${index} of ${count}`;
};

/**
 * The turn the **renderer** gets: the move being played, plus how far through it
 * is and which way round it is going.
 *
 * One line of object-spread, pulled out of `useScramblePlayer` and put here for
 * the reason the rest of this file is here — **it was the one part of the
 * transport a test could not reach, and it was wrong** (operator, 2026-08-07:
 * *"double tapping for moves like L and D, the animation seems to reverse the
 * direction"*).
 *
 * `promotedTurn` computed the signed sweep, `animate` carried it and `turnAngle`
 * honoured it; the value was then dropped on the way out to `CubeView`, so
 * `buildScene` fell back to `shortWay(amount)` — always `+2` for a half turn.
 * `L`, `D` and `B` carry `amount: 3` and turn anticlockwise, so their promotions
 * snapped 180° and travelled backwards, while `R`, `U` and `F` were fine. Every
 * unit test passed throughout, because none of them could see this line.
 *
 * `turns` is `undefined` for every ordinary turn, and that is a value rather
 * than a gap: it is what `turnAngle` reads as "go the short way".
 *
 * @param {Object|undefined} move the move being played
 * @param {{at: number, t: number, turns?: number}|null} live the clock's turn
 * @returns {Object|null} what `CubeView` draws, or null when nothing is turning
 */
export const renderTurn = (move, live) =>
  live && move ? { ...move, t: live.t, turns: live.turns } : null;

export default {
  buildPlayback,
  extendsAlg,
  promotedTurn,
  renderTurn,
  turnDuration,
  gapDuration,
  nextSpeed,
  describeSpeed,
  ease,
  clampIndex,
  describePosition,
};
