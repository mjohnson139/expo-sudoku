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

import { algError, moveCount, parseMove, tokenize, tryTokenize } from './moves';

/**
 * The pad, as a **spatial cross** (docs/cube-plan.md §8.8, Step 8).
 *
 * Six columns by three rows. The left three columns are a cube net, so the
 * faces sit where they *are* — `B` top-left carrying a `far` tag because the
 * back face is the one a net cannot show in place, `U` `F` `D` down the spine,
 * `L` and `R` either side of `F`. Then the slices in column 4, the wides in
 * column 5 and the rotations in column 6.
 *
 * ### Why there is room for `E` and `S`
 *
 * Step 3's pad was twelve keys and two of the eighteen cells went on the armed
 * `'` and `2`. A half turn is a second tap now and prime is a hold, so both
 * modifier keys came off and the notation nobody could fit — `E` and `S` — took
 * their place. The Roux argument for leaving them off was always a space
 * argument rather than a notation one.
 *
 * ### Column 3 row 1 was the cross's gap, and now it is the prime key
 *
 * The design left that cell **deliberately empty** — "it is what makes the cross
 * read as a cross" — and shipping it that way is what found the problem. From
 * the operator, using it on a phone (2026-08-05): *"it's hard to see the prime
 * symbols when your finger is on the button and holding."* Which is exactly
 * right, and is the one thing a browser at three viewport widths cannot show
 * you — **the finger is part of the interface and the screenshots do not have
 * one.** The hold's confirmation is drawn under the thumb that is causing it.
 *
 * So prime is now **both**: hold a key, or tap `′` and then the key. The hold is
 * untouched for the people it already suits; the tap is a second route whose
 * feedback is somewhere the hand is not. It sits directly above `R`, which is
 * the cell the gap was in and the most prime-heavy key on a Roux pad.
 *
 * Row-major, six to a row, so the screen can slice it without knowing the shape.
 */
export const PAD_LAYOUT = [
  { key: 'B', tone: 'face', tag: 'far' },
  { key: 'U', tone: 'face' },
  { tool: 'prime', tone: 'tool' },
  { key: 'M', tone: 'slice' },
  { key: 'l', tone: 'wide' },
  { key: 'x', tone: 'rot' },

  { key: 'L', tone: 'face' },
  { key: 'F', tone: 'face' },
  { key: 'R', tone: 'face' },
  { key: 'E', tone: 'slice' },
  { key: 'r', tone: 'wide' },
  { key: 'y', tone: 'rot' },

  { tool: 'backspace', tone: 'tool' },
  { key: 'D', tone: 'face' },
  { tool: 'flag', tone: 'accent' },
  { key: 'S', tone: 'slice' },
  { tool: 'keyboard', tone: 'tool' },
  { key: 'z', tone: 'rot' },
];

/** Every move key on the pad, in layout order. Derived rather than listed: two
 *  places to add a key is one place to forget one. */
export const PAD_KEYS = PAD_LAYOUT.filter((cell) => cell.key).map((cell) => cell.key);

/** How many cells go on a row. */
export const PAD_COLUMNS = 6;

/** How many rows the pad has. Fixed — the pad's height is a constant the cube's
 *  budget is measured against (plan §8.6). */
export const PAD_ROWS = 3;

/**
 * How long a key must be held before it means a prime (plan §8.8).
 *
 * **180ms was too short in use** (operator, 2026-08-06): *"I'm getting a lot of
 * prime moves when I want a regular turn."* This is handoff open question 8's
 * remaining half — whether the threshold is right — answered by drilling on it,
 * and it fails in the one direction that matters. A tap that reads as a prime
 * turns the cube **the wrong way** and costs an undo; a prime that needs another
 * 120ms of thumb costs nothing but the wait. So the threshold moves to the far
 * end of the design's range rather than splitting the difference.
 *
 * 300ms is where the platforms already put a long press (RN's `delayLongPress`
 * defaults to 500), so a hold that reads as deliberate anywhere else on a phone
 * reads as deliberate here. The design shipped the threshold configurable across
 * 120–320 and those bounds are kept, so this stays inside what was designed.
 */
export const HOLD_MS = 300;

/** The range the threshold may be tuned across, if it is ever exposed. */
export const HOLD_MS_MIN = 120;
export const HOLD_MS_MAX = 320;

/** How fast a held backspace repeats. */
export const BACKSPACE_REPEAT_MS = 120;

/**
 * How long a key stays "the last key" for the second-tap promotion.
 *
 * **The design did not put a number on this one** — it models `lastKeyAt` and
 * says "within the repeat window", so a window is intended, but the value was
 * left open. 1200ms is a deliberate choice rather than a found one: comfortably
 * longer than a double tap, comfortably shorter than looking away and coming
 * back, so a promotion is always something the operator just did rather than
 * something they did a while ago.
 *
 * It is a backstop rather than the rule. What actually guards a promotion is the
 * *text* — see `promoteLastToken`.
 */
export const PROMOTE_MS = 1200;

/** How far through the hold a press is, 0 → 1. What the key's fill draws. */
export const holdProgress = (elapsed, threshold = HOLD_MS) => {
  if (!(threshold > 0)) return 1;
  return Math.max(0, Math.min(1, (elapsed || 0) / threshold));
};

/** Whether a press has been held long enough to mean a prime. */
export const isHold = (elapsed, threshold = HOLD_MS) => (elapsed || 0) >= threshold;

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

/**
 * Promote the token already written to a half turn — `… R` becomes `… R2`.
 *
 * Returns `null` when there is nothing to promote, which the caller reads as
 * "append instead".
 *
 * ### The guard is the text, not the timer
 *
 * The screen also tracks which key was last pressed and when, but **this
 * function refuses on anything except a last token that is exactly `key`** — and
 * that is what makes the promotion safe rather than merely usually right.
 *
 * Undo is two things that cannot happen at once (plan §5): the cube turns
 * backwards for 260ms and the move is dropped at the end of it. A promotion
 * landing inside that window used to be the shape of the bug Step 3 shipped
 * twice — and a promotion is worse than an append, because it *rewrites* the
 * last token rather than adding one, so a stale one would resurrect a move that
 * had been deleted. Checking the token is still there closes that by
 * construction: if the drop has landed, the last token is not `R` any more and
 * this returns `null`.
 *
 * A third tap is a fresh move for the same reason and with no extra rule — the
 * last token is `R2` by then, which is not `R`, so there is nothing to promote.
 */
export const promoteLastToken = (alg, key) => {
  const tokens = tryTokenize(alg);
  if (!tokens || tokens.length === 0) return null;
  if (tokens[tokens.length - 1] !== key) return null;
  return [...tokens.slice(0, -1), `${key}2`].join(' ');
};

/** A token split into the letter it turns and the modifiers on it. */
const TOKEN_PARTS = /^([UDLRFBMESudlrfbxyz]w?)([2'’]*)$/;

/**
 * Fold a move into the one already written when they are the same turn twice —
 * `… R` plus another `R` becomes `… R2`.
 *
 * The sibling of `promoteLastToken`, for moves that arrive by **gesture** rather
 * than by a second tap on a key. It cannot reuse that one: the pad knows it was
 * pressed twice and can work on the key's name, while a turned layer knows only
 * what it is, so this has to compare the *moves* — same axis, same layers — and
 * then spell the result. That also makes it right about the things a pad key
 * cannot say: `r` folds into `r2`, and `R'` twice is `R2` rather than the `R'2`
 * a string concatenation would produce.
 *
 * Returns `null` when there is nothing to fold, which the caller reads as
 * "append instead".
 *
 * ### Only two quarters, and only into a half
 *
 * A quarter turn either side, and nothing else. Three in a row leaves `R2 R`
 * rather than becoming `R'`, which is what the pad's third tap does and keeps
 * the two routes telling the same story; and a quarter followed by its own
 * inverse is left as `R R'` rather than cancelling to nothing, because silently
 * eating both halves of a move the operator can still see is a worse surprise
 * than a redundant pair they can undo.
 *
 * **The guard is the text**, as it is for `promoteLastToken` and for the same
 * reason: an undo in flight has not removed its token yet, and a fold that
 * rewrote a move which was about to be dropped would resurrect it.
 */
export const condenseRepeat = (alg, token) => {
  const tokens = tryTokenize(alg);
  if (!tokens || tokens.length === 0) return null;

  const last = tokens[tokens.length - 1];
  const before = parseMove(last);
  const added = parseMove(token);
  if (!before || !added) return null;

  if (before.axis !== added.axis) return null;
  if (before.layers.length !== added.layers.length) return null;
  if (before.layers.some((layer, i) => layer !== added.layers[i])) return null;

  // Quarters only. A half turn on either side is a third move, not a second.
  if (before.amount === 2 || added.amount === 2) return null;
  // The two undo each other. Leave them both and let the operator decide.
  if ((before.amount + added.amount) % 4 !== 2) return null;

  const parts = TOKEN_PARTS.exec(last);
  if (!parts) return null;

  return [...tokens.slice(0, -1), `${parts[1]}2`].join(' ');
};

/**
 * What a press on a move key does to the solve — the whole of the core loop
 * (plan §8.8).
 *
 * @param {string} alg the solve as it stands
 * @param {string} key the key that was pressed
 * @param {{held?: boolean, repeat?: boolean, primed?: boolean}} gesture `held` is
 *   "past the hold threshold at touch-up"; `primed` is "the `′` key was armed
 *   before this press"; `repeat` is "this was the last key pressed, recently
 *   enough to count"
 * @returns {string} the solve after the press
 *
 * ### The three cases are ordered, and the order is the rule
 *
 * **An armed prime beats a promotion**, because arming is a deliberate act: you
 * tapped `′` and then this key, and the only thing that can mean is `R'`.
 *
 * **A hold does not.** `R2'` is `R2`, so a hold landing on a promoting tap is
 * treated as a plain promotion rather than an error — a finger resting a moment
 * too long on the second tap is the likeliest way to reach this, and it should
 * do the harmless thing.
 *
 * That asymmetry is the whole difference between the two routes to a prime: one
 * is a statement, the other is a duration.
 */
export const applyPadPress = (
  alg,
  key,
  { held = false, repeat = false, primed = false } = {}
) => {
  if (primed) return appendToken(alg, `${key}'`);
  if (repeat) {
    const promoted = promoteLastToken(alg, key);
    if (promoted !== null) return promoted;
  }
  return appendToken(alg, held ? `${key}'` : key);
};

/** Why the text field rejected what was typed, or null. */
export const solveError = (text) => (text.trim() === '' ? null : algError(text));

/** `"8 moves"` — what the solve card says under itself. */
export const describeSolve = (alg) => {
  const count = moveCount(alg);
  if (count === 0) return 'No moves yet';
  return count === 1 ? '1 move' : `${count} moves`;
};

/**
 * How a key reads out loud. `R'` is "R prime", not "R apostrophe", and `r` is a
 * wide turn rather than the letter R said quietly.
 *
 * **A second list of the pad's keys, and it cannot be derived from the first**
 * — `PAD_LAYOUT` says where a key sits and this says how it sounds, and the
 * domain here is wider besides: a solve typed into the text field can hold `Rw`
 * or `u`, which are notation the pad has no key for. So the two are pinned
 * against each other in `solve.test.js` instead: every pad key must have a
 * spoken form, or a key added to the cross reads out as a bare letter with
 * nothing failing. Exported for exactly that test.
 */
export const SPOKEN_KEY = {
  U: 'U',
  D: 'D',
  L: 'L',
  R: 'R',
  F: 'F',
  B: 'B',
  M: 'M slice',
  E: 'E slice',
  S: 'S slice',
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
  PAD_LAYOUT,
  PAD_KEYS,
  PAD_COLUMNS,
  PAD_ROWS,
  HOLD_MS,
  PROMOTE_MS,
  BACKSPACE_REPEAT_MS,
  holdProgress,
  isHold,
  appendToken,
  appendAlg,
  dropLastToken,
  promoteLastToken,
  applyPadPress,
  solveError,
  describeSolve,
  describeToken,
};
