/**
 * Scramble generation (docs/cube-plan.md §6).
 *
 * These are **random-move** scrambles, not the random-state scrambles a WCA
 * competition uses. The difference is real and worth stating plainly: a
 * random-state scramble picks a cube position uniformly at random and then finds
 * a short algorithm to it, which needs a two-phase solver and a few megabytes of
 * pruning tables. A random-move scramble picks legal moves at random. For
 * practice and for looking at a cube it is what nearly every phone timer ships,
 * and it is indistinguishable to a solver — but it is *not* competition-legal,
 * and the plan tracks upgrading it as its own step rather than pretending
 * otherwise.
 *
 * Two rules keep a random walk from producing obvious redundancy:
 *
 *   1. **Never the same face twice running.** `R R'` is nothing and `R R2` is
 *      `R'` — either way the scramble is shorter than it claims to be.
 *   2. **Never `X Y X` on one axis.** Opposite faces commute, so `U D U` is
 *      just `U2 D` with an extra move written down.
 *
 * That is the standard pair; anything past it starts costing randomness for
 * cosmetics.
 */

import { FACE_MOVES, OPPOSITE_FACE, moveCount } from './moves';

/** WCA 3×3 scrambles land around 19–20 moves; 20 random moves is the usual
 *  phone-timer equivalent and is well past the point where a scramble is hard. */
export const DEFAULT_SCRAMBLE_LENGTH = 20;

const SUFFIXES = ['', "'", '2'];

/** `Math.random` can return values arbitrarily close to 1; this cannot return
 *  `count`. */
const pick = (random, count) => Math.min(count - 1, Math.floor(random() * count));

/**
 * The faces that may legally follow the last two.
 *
 * Choosing from this rather than drawing at random and retrying is what makes
 * the generator **terminate by construction**. Rejection sampling gives the same
 * distribution — every allowed face is still equally likely — but it loops
 * forever on a `random` that keeps proposing the same face, and a generator
 * whose termination depends on the quality of its randomness is a hang waiting
 * for a stubbed test or an unlucky seed. There are never fewer than four faces
 * in this list.
 */
const allowedFaces = (previous, beforePrevious) =>
  FACE_MOVES.filter((face) => {
    if (face === previous) return false;
    if (face === beforePrevious && previous === OPPOSITE_FACE[face]) return false;
    return true;
  });

/**
 * A random scramble.
 *
 * @param {Object} [options]
 * @param {number} [options.length] number of moves
 * @param {() => number} [options.random] source of randomness in [0, 1) —
 *   injectable so the tests can drive it deterministically
 * @returns {string} space-separated notation, e.g. `R U2 F' D ...`
 */
export const randomScramble = ({
  length = DEFAULT_SCRAMBLE_LENGTH,
  random = Math.random,
} = {}) => {
  const tokens = [];
  let previous = null;
  let beforePrevious = null;

  while (tokens.length < length) {
    const choices = allowedFaces(previous, beforePrevious);
    const face = choices[pick(random, choices.length)];

    tokens.push(`${face}${SUFFIXES[pick(random, SUFFIXES.length)]}`);
    beforePrevious = previous;
    previous = face;
  }

  return tokens.join(' ');
};

/**
 * Whether a scramble obeys the two rules above. Used by the tests, and worth
 * keeping exported: it is the check any future generator has to pass too.
 */
export const isWellFormedScramble = (alg) => {
  const faces = String(alg)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token[0]);

  if (faces.length === 0) return false;
  if (!faces.every((face) => FACE_MOVES.includes(face))) return false;

  for (let i = 1; i < faces.length; i += 1) {
    if (faces[i] === faces[i - 1]) return false;
    if (i >= 2 && faces[i] === faces[i - 2] && faces[i - 1] === OPPOSITE_FACE[faces[i]]) {
      return false;
    }
  }

  return true;
};

/** `"20 moves"` — the label under a scramble. */
export const describeScramble = (alg) => {
  const count = moveCount(alg);
  return `${count} move${count === 1 ? '' : 's'}`;
};

export default { randomScramble, isWellFormedScramble, describeScramble };
