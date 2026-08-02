/**
 * Writing a solve down (docs/cube-plan.md §8.2, Step 3).
 *
 * A solve is a string of notation the operator types, one token at a time on the
 * pad or in whole algorithms in the text field. Everything about editing that
 * string is here — pure, so the node test runner can hold it — and the screen
 * above it is a pad, a field and a transport it already had.
 *
 * **The text the operator entered is the text that is kept** (plan §4). Every
 * function here works on the *raw* tokens `tokenize` hands back, so a solve
 * written `r U r'` stays written that way however many times it is edited. The
 * canonical `Rw` spelling stays an implementation detail of the move.
 */

import { algError, moveCount, tokenize, tryTokenize } from './moves';

/**
 * The pad's twelve keys — the **Roux set** (operator, 2026-08-01).
 *
 * Not the full notation the parser takes. A Roux first block is the faces plus
 * `M` and `r`; LSE is very nearly just `M` and `U`; `x` and `y` are how the cube
 * gets turned over during inspection. `E`, `S` and the other three wides are
 * real notation that nobody writes a Roux solve in, and eighteen keys on a phone
 * is a worse pad than twelve. The text field takes anything the parser does, so
 * nothing is out of reach — it is just not on the pad.
 *
 * Two rows of six, in the order they are laid out.
 */
export const PAD_KEYS = ['U', 'D', 'L', 'R', 'F', 'B', 'M', 'r', 'l', 'x', 'y', 'z'];

/** How many keys go on a row. Twelve in two rows of six is the widest the
 *  narrowest supported phone takes without the keys becoming unhittable. */
export const PAD_COLUMNS = 6;

/** The two modifiers, armed before the key they apply to. */
export const MODIFIERS = ["'", '2'];

/**
 * Arming a modifier, or disarming the one already armed.
 *
 * Tapping the armed modifier again clears it — otherwise the only way out of a
 * mis-tapped `'` is to spend a move on it. Tapping the *other* one swaps, which
 * is what someone who meant `2` and hit `'` is trying to say.
 */
export const nextModifier = (current, tapped) => (current === tapped ? '' : tapped);

/** The token a key press means, with whatever is armed. */
export const padToken = (key, modifier) => `${key}${modifier || ''}`;

/**
 * Add one token to a solve.
 *
 * Single-spaced, because that is what `tokenize` gives back and a solve that
 * grows one token at a time should not accumulate the spacing of however it was
 * pasted.
 */
export const appendToken = (alg, token) => (alg ? `${alg} ${token}` : token);

/**
 * Add a whole algorithm to a solve — what the text field does.
 *
 * Appends rather than replaces: the field is for a CMLL alg or a sequence off a
 * tutorial dropped into the middle of a solve being written, not for retyping
 * the solve so far.
 *
 * @throws {Error} if `text` is not notation this app can read; the message names
 *   the offending token, which is the only thing that makes it actionable
 */
export const appendAlg = (alg, text) => {
  const tokens = tokenize(text);
  if (tokens.length === 0) return alg;
  return alg ? `${alg} ${tokens.join(' ')}` : tokens.join(' ');
};

/** Drop the last move. Text that does not parse has no last move to drop, so it
 *  is left alone rather than truncated at some arbitrary character. */
export const dropLastToken = (alg) => {
  const tokens = tryTokenize(alg);
  if (!tokens || tokens.length === 0) return alg || '';
  return tokens.slice(0, -1).join(' ');
};

/** Why the text field rejected what was typed, or null. */
export const solveError = (text) => (text.trim() === '' ? null : algError(text));

/** `"8 moves"` — what the solve card says under itself. */
export const describeSolve = (alg) => {
  const count = moveCount(alg);
  if (count === 0) return 'No moves yet';
  return count === 1 ? '1 move' : `${count} moves`;
};

/** How a key reads out loud. `R'` is "R prime", not "R apostrophe", and `r` is a
 *  wide turn rather than the letter R said quietly. */
const SPOKEN_KEY = {
  U: 'U',
  D: 'D',
  L: 'L',
  R: 'R',
  F: 'F',
  B: 'B',
  M: 'M slice',
  r: 'wide R',
  l: 'wide L',
  x: 'x rotation',
  y: 'y rotation',
  z: 'z rotation',
};

/** A token said out loud. */
export const describeToken = (token) => {
  const match = /^(.*?)(2|['’])?$/.exec(token || '');
  const [, key, modifier] = match;
  const base = SPOKEN_KEY[key] || key;
  if (modifier === '2') return `${base} double`;
  if (modifier) return `${base} prime`;
  return base;
};

export default {
  PAD_KEYS,
  MODIFIERS,
  nextModifier,
  padToken,
  appendToken,
  appendAlg,
  dropLastToken,
  solveError,
  describeSolve,
  describeToken,
};
