/**
 * Cube notation: text in, moves out (docs/cube-plan.md §4).
 *
 * A move is `{ token, axis, layers, amount }` — which axis it spins, which
 * layers of that axis come with it, and how many quarter turns clockwise as seen
 * from the positive end of that axis. That is all `cubeState.applyMove` needs,
 * and it is why slice moves, wide moves and whole-cube rotations cost nothing
 * extra: they differ from a face turn only in `layers`.
 *
 * The full set is here even though a scramble only ever uses the six outer face
 * turns. Solve methods are the point of this epic and CFOP and Roux both speak
 * in slices, wides and rotations (M, r, U in Roux; y, R U R' in CFOP), so the
 * notation is worth having complete and tested from the start rather than grown
 * one letter at a time.
 */

import { AXIS } from './geometry';

const { x, y, z } = AXIS;

/**
 * Every base token, before modifiers.
 *
 * `amount: 1` always means "clockwise looking at that face from outside", which
 * is why D, L and B carry −1: their faces look down the *negative* axis.
 * Slices follow the neighbour they are named for (M follows L, E follows D,
 * S follows F) — the convention every solve method assumes.
 */
const BASE_MOVES = {
  U: { axis: y, layers: [1], amount: 1 },
  D: { axis: y, layers: [-1], amount: -1 },
  R: { axis: x, layers: [1], amount: 1 },
  L: { axis: x, layers: [-1], amount: -1 },
  F: { axis: z, layers: [1], amount: 1 },
  B: { axis: z, layers: [-1], amount: -1 },

  M: { axis: x, layers: [0], amount: -1 },
  E: { axis: y, layers: [0], amount: -1 },
  S: { axis: z, layers: [0], amount: 1 },

  x: { axis: x, layers: [-1, 0, 1], amount: 1 },
  y: { axis: y, layers: [-1, 0, 1], amount: 1 },
  z: { axis: z, layers: [-1, 0, 1], amount: 1 },
};

/** Wide turns: the face plus the slice behind it. */
const WIDE_MOVES = {
  U: { axis: y, layers: [1, 0], amount: 1 },
  D: { axis: y, layers: [-1, 0], amount: -1 },
  R: { axis: x, layers: [1, 0], amount: 1 },
  L: { axis: x, layers: [-1, 0], amount: -1 },
  F: { axis: z, layers: [1, 0], amount: 1 },
  B: { axis: z, layers: [-1, 0], amount: -1 },
};

/** The six outer faces, in the order a scramble picker walks them. */
export const FACE_MOVES = ['U', 'D', 'L', 'R', 'F', 'B'];

/** Opposite faces — the pairs whose turns commute, which the scrambler cares
 *  about and `axisOf` collapses. */
export const OPPOSITE_FACE = { U: 'D', D: 'U', L: 'R', R: 'L', F: 'B', B: 'F' };

// One token: a letter, an optional `w`, then any run of `2` and `'`. The
// curly apostrophe is accepted because phone keyboards produce it.
const TOKEN_SOURCE = "([UDLRFBMESudlrfbxyz])(w?)([2'’]*)";
const TOKEN_RE = new RegExp(`^${TOKEN_SOURCE}$`);
const SCAN_RE = new RegExp(TOKEN_SOURCE, 'g');

/** Lowercase face letters are the older spelling of a wide turn. `x`, `y` and
 *  `z` are rotations and are *not* in this map — they are base moves. */
const LOWERCASE_WIDE = { u: 'U', d: 'D', l: 'L', r: 'R', f: 'F', b: 'B' };

const normalizeAmount = (amount) => ((amount % 4) + 4) % 4;

/**
 * One token → a move, or null if the token isn't notation.
 *
 * @param {string} token e.g. `R`, `U'`, `Fw2`, `M'`, `y`
 */
export const parseMove = (token) => {
  const match = TOKEN_RE.exec(token);
  if (!match) return null;

  const [, letter, w, mods] = match;

  const wide = w === 'w' || Object.prototype.hasOwnProperty.call(LOWERCASE_WIDE, letter);
  const base = LOWERCASE_WIDE[letter] || letter;

  const spec = wide ? WIDE_MOVES[base] : BASE_MOVES[base];
  if (!spec) return null; // `Mw`, `xw`, … — a letter that has no wide form.

  // `2'` is `2`: a half turn has no direction. Checked before the apostrophe so
  // the two can appear in either order, which is how people actually type it.
  const multiplier = mods.includes('2') ? 2 : /['’]/.test(mods) ? -1 : 1;
  const amount = normalizeAmount(spec.amount * multiplier);

  // A quarter turn either way is a real move; `R4` would not be, but the grammar
  // above cannot produce it.
  if (amount === 0) return null;

  const suffix = multiplier === 2 ? '2' : multiplier === -1 ? "'" : '';

  return {
    token: `${base}${wide ? 'w' : ''}${suffix}`,
    axis: spec.axis,
    layers: spec.layers,
    amount,
  };
};

/**
 * A whole algorithm → the tokens as they were written *and* the moves they mean,
 * in one pass.
 *
 * Spaces are optional: `R U R' U'` and `RUR'U'` both parse, because the scanner
 * matches tokens rather than splitting on whitespace. Anything the scanner
 * cannot account for makes the whole string invalid — a scramble that silently
 * dropped a move it didn't understand would show a cube that is not the cube the
 * player is holding, which is the one thing this screen must never do.
 *
 * ### Why both halves come back together
 *
 * `parseMove` normalizes — `r`, `Rw` and `rw` all become `{ token: 'Rw', … }` —
 * which is right for the model and wrong for anything the operator reads back:
 * Roux is written `r U r'`, and echoing `Rw U Rw'` corrects the person using the
 * tool in notation their own method does not use (plan §4). So `tokens[i]` is
 * exactly what was typed and `moves[i]` is what it does, built in the same loop
 * rather than as two lists hoped to line up.
 *
 * @param {string} text
 * @returns {{tokens: string[], moves: Array<Object>}}
 * @throws {Error} on anything that isn't a well-formed algorithm
 */
export const scanAlg = (text) => {
  if (typeof text !== 'string') throw new Error('Algorithm must be a string');

  const tokens = [];
  const moves = [];
  let consumed = 0;

  SCAN_RE.lastIndex = 0;
  let match = SCAN_RE.exec(text);
  while (match !== null) {
    const move = parseMove(match[0]);
    if (!move) throw new Error(`Unrecognized move: ${match[0]}`);
    tokens.push(match[0]);
    moves.push(move);
    consumed += match[0].length;
    match = SCAN_RE.exec(text);
  }

  // Everything the scanner skipped has to have been whitespace or a separator.
  const leftovers = text.replace(SCAN_RE, '').replace(/[\s\n\r\t.,/]/g, '');
  if (leftovers.length > 0) throw new Error(`Unrecognized notation: ${leftovers}`);
  if (consumed === 0 && text.trim().length > 0) throw new Error('No moves found');

  return { tokens, moves };
};

/**
 * A whole algorithm → moves.
 *
 * @param {string} text
 * @returns {Array<Object>} moves
 * @throws {Error} on anything that isn't a well-formed algorithm
 */
export const parseAlg = (text) => scanAlg(text).moves;

/**
 * A whole algorithm → its tokens, spelled the way they were written.
 *
 * The counterpart of `parseAlg`, and the reason anything can be redisplayed
 * without being silently rewritten. Validates exactly as strictly: a string with
 * one bad token has no tokens at all.
 */
export const tokenize = (text) => scanAlg(text).tokens;

/** One well-formed token, undone. Textual by design — see `invertAlg`. */
const invertToken = (token) => {
  if (token.includes('2')) return token;
  if (/['\u2019]/.test(token)) return token.replace(/['\u2019]/g, '');
  return `${token}'`;
};

/**
 * An algorithm undone: the tokens in reverse, each one flipped.
 *
 * The one line this is worth having for is Step 2's (plan §3.2): **if `A` takes
 * case `C` to solved, then `A⁻¹` takes solved to `C`** — so an algorithm carries
 * its own case and nobody has to author a starting state for it.
 *
 * ### It works on the tokens, never on the parsed moves
 *
 * This is the whole reason `scanAlg` hands back both halves (see its comment
 * above). `parseMove` normalizes: `r`, `rw` and `Rw` all come back as `Rw`. So
 * inverting through the parser would answer a Roux user's `r U r'` with
 * `Rw U' Rw'` — the right cube, spelled in notation their own method does not
 * use. Inverting the token text instead gives `r U' r'`, which is what they
 * wrote, backwards.
 *
 * Three rules, and they are all textual:
 *
 * - A half turn is its own inverse, so **the token comes back untouched** —
 *   `R2` stays `R2` and a typed `R2'` stays `R2'`, which is what makes this
 *   function its own inverse over the text rather than merely over the cube.
 * - A token with an apostrophe loses it (`R''` is `R'`, so *all* of them go).
 * - Anything else gains one.
 *
 * The curly apostrophe a phone keyboard produces is accepted on the way in and
 * comes back straight, because there is nothing to copy it from when the
 * apostrophe is being *added*. That is the one input this is not character-for-
 * character its own inverse over; it is still its own inverse over the cube.
 *
 * Empty text inverts to empty text: the solved cube undone is the solved cube.
 *
 * @param {string} text
 * @returns {string} the inverse, single-spaced
 * @throws {Error} on anything that isn't a well-formed algorithm
 */
export const invertAlg = (text) => tokenize(text).map(invertToken).reverse().join(' ');

/** `invertAlg` that answers null instead of throwing. */
export const tryInvertAlg = (text) => {
  const tokens = tryTokenize(text);
  return tokens ? tokens.map(invertToken).reverse().join(' ') : null;
};

/** `scanAlg` that answers null instead of throwing. */
export const tryScanAlg = (text) => {
  try {
    return scanAlg(text);
  } catch (error) {
    return null;
  }
};

/** `parseAlg` that answers null instead of throwing. */
export const tryParseAlg = (text) => {
  const scan = tryScanAlg(text);
  return scan ? scan.moves : null;
};

/** `tokenize` that answers null instead of throwing. */
export const tryTokenize = (text) => {
  const scan = tryScanAlg(text);
  return scan ? scan.tokens : null;
};

/** Why `text` was rejected, or null if it wasn't. The message names the offending
 *  token, which is the only thing that makes a rejection actionable. */
export const algError = (text) => {
  try {
    scanAlg(text);
    return null;
  } catch (error) {
    return error.message;
  }
};

/** Whether `text` is an algorithm this app can apply. Empty is valid: it's the
 *  solved cube. */
export const isValidAlg = (text) => tryParseAlg(text) !== null;

/** Moves → a canonical single-spaced string. */
export const formatAlg = (moves) => moves.map((move) => move.token).join(' ');

/**
 * Collapse whitespace so `R  U` and `R U` are one algorithm, not two.
 *
 * Lives here rather than in `favorites.js` — where it started, and from where it
 * is still re-exported — because more than one list is now keyed by algorithm
 * text: a favorite by the scramble it is, and a solve by the scramble it hangs
 * off. Two copies of this rule is two ways for those keys to disagree.
 */
export const normalizeAlg = (alg) => String(alg || '').trim().replace(/\s+/g, ' ');

/**
 * How many moves an algorithm is, by the count speedcubers use: every turn
 * counts as one, half turns included (HTM). Invalid text counts as zero rather
 * than throwing — this is used for labels, and a label is never worth a crash.
 */
export const moveCount = (text) => {
  const moves = tryParseAlg(text);
  return moves ? moves.length : 0;
};

/** Collapse a face to the axis it turns, so `U` and `D` compare equal. */
export const axisOf = (face) => BASE_MOVES[face]?.axis ?? null;

export default {
  parseMove,
  parseAlg,
  scanAlg,
  tokenize,
  tryParseAlg,
  tryTokenize,
  invertAlg,
  tryInvertAlg,
  isValidAlg,
  algError,
  formatAlg,
  moveCount,
  normalizeAlg,
};
