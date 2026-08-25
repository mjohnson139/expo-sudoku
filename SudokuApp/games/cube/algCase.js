/**
 * The case an algorithm is *for* (docs/cube-methods-plan.md §3.2, Step 2).
 *
 * ### Nobody draws a case by hand
 *
 * A case is what the cube looks like when the algorithm is the right thing to
 * do. The obvious way to get one is to ask for it: a nine-cell grid on the entry
 * screen and a finger. That is a form to fill in for every entry, and it is a
 * form the operator can fill in *wrong*, which is worse than not having it.
 *
 * There is arithmetic instead, and it is one line: **if `A` takes case `C` to
 * solved, then `A⁻¹` takes solved to `C`.** So an algorithm already carries its
 * own case and there is nothing to ask for. For a last-layer algorithm — one
 * that preserves F2L, so its inverse does too — `A⁻¹(solved)` is precisely a
 * solved cube with a scrambled top layer, which is the class this epic is scoped
 * to (§4). That inverse remains the migration-free fallback for pasted and older entries.
 * The workbench also supports an authored `setup`, because device feedback made
 * clear that deriving a possible case is not the same as letting the operator
 * define where their algorithm begins.
 *
 * ### What a case is
 *
 * Nine characters of the U face in `facelets` reading order — back row first,
 * left to right — `y` where the sticker matches the U **centre** and `.` where
 * it does not:
 *
 * ```
 *   0 1 2      back-left   back    back-right
 *   3 4 5      left       CENTRE   right
 *   6 7 8      front-left  front   front-right
 * ```
 *
 * **Against the centre rather than against yellow.** `facelets` returns face
 * letters, not colours, and a cube that has been rotated as a whole is still a
 * cube: `isSolved` is checked the same way, one face at a time against its own
 * first sticker. A capture that compared against a fixed colour would call a
 * solved cube held green-up a scrambled one.
 *
 * The centre is therefore always `y` — it is the thing the other eight are
 * measured against. It is drawn because a 3 × 3 with a hole in the middle is not
 * what a case looks like, and it is left out of `describeCase` because it never
 * says anything.
 *
 * ### What it is not enough for
 *
 * Every PLL captures as nine `y`: permutation leaves every sticker oriented, so
 * a T-perm and a J-perm draw the same tile. That is the design's picture and
 * this epic ships it (§6 question 8); the evidence for going further is the
 * first time two entries in a real library show the same tile, and
 * `algCase.test.js` pins the T-perm so that nobody "fixes" it before then.
 *
 * Pure, and importing nothing from React Native — the test runner is
 * `testEnvironment: "node"`, and this is the part worth testing.
 */

import { cubeFromAlg, facelets } from './cubeState';
import { normalizeAlg, tryInvertAlg } from './moves';

/** A case is the U face, so it is nine cells. */
export const CASE_CELLS = 9;

/** The centre's index, which is also the sticker every other one is compared to. */
export const CASE_CENTRE = 4;

/** A sticker that matches the U centre. */
export const ORIENTED = 'y';

/** One that does not. */
export const UNORIENTED = '.';

/** Nothing oriented — what an unknown case draws as, and the floor a hand
 *  correction starts from. */
export const EMPTY_CASE = UNORIENTED.repeat(CASE_CELLS);

/** Every sticker oriented: a solved cube, and also every PLL. */
export const SOLVED_CASE = ORIENTED.repeat(CASE_CELLS);

/** An explicitly authored starting position. Unlike `caseOfAlgorithm`, this
 * applies the text forward: these are setup moves from solved. */
export const caseOfSetup = (setup) => {
  const alg = normalizeAlg(setup);
  if (!alg) return SOLVED_CASE;
  try {
    return captureCase(cubeFromAlg(alg));
  } catch (error) {
    return null;
  }
};

/** The one shape a case can have, used by the sanitizer and by nothing else. */
const CASE_RE = /^[y.]{9}$/;

/**
 * A cube → its case: the U face, `y` where a sticker matches the U centre.
 *
 * @param {Object} cube
 * @returns {string} nine characters
 */
export const captureCase = (cube) => {
  const face = facelets(cube).U;
  const centre = face[CASE_CENTRE];
  return face.map((sticker) => (sticker === centre ? ORIENTED : UNORIENTED)).join('');
};

/**
 * A case as it is kept, or **null** when there is not one.
 *
 * This is `sanitizeCaseShape` from `algorithms.js` grown up — Step 1 put a
 * by-shape keeper there precisely so a file written by this build and read by
 * that one would not lose its cases, and this is the one it was holding the
 * place for. There is deliberately still only one.
 *
 * **`null` rather than `EMPTY_CASE` for a corrupt value**, which is a departure
 * from the plan's line about it (§3.2's test list) and matters: `null` is what
 * `algorithmCase` reads as *"nothing stored, derive it from the moves"*, while
 * `EMPTY_CASE` is a real answer meaning *"no sticker is oriented"* — a cube in
 * that state exists, and a hand correction can say so. Sanitizing corruption to
 * `EMPTY_CASE` would turn a garbled field into a permanent blank tile on an
 * entry whose moves could have said exactly what the case was.
 */
export const sanitizeCase = (raw) => (typeof raw === 'string' && CASE_RE.test(raw) ? raw : null);

/**
 * Flip one cell — what a tap on the correction grid means.
 *
 * Not built into a screen yet, deliberately: the design draws a tap-a-sticker
 * editor and derivation removed its main use, so §3.2 says build it when the
 * tile turns out to be wrong for something real. The rule is cheap to write and
 * to test now, and having it means that day is a screen and not a screen plus a
 * decision.
 *
 * **The centre does not toggle.** It is the reference the other eight are
 * measured against, so a cube whose centre sticker does not match its centre
 * does not exist, and a grid that let you draw one would let you draw a case no
 * capture could ever produce.
 *
 * An unknown pattern starts from `EMPTY_CASE` rather than refusing: the point of
 * the editor is to say what the case is when nothing else knows.
 */
export const toggleCaseCell = (pattern, index) => {
  const base = sanitizeCase(pattern) || EMPTY_CASE;
  if (!Number.isInteger(index) || index < 0 || index >= CASE_CELLS) return base;
  if (index === CASE_CENTRE) return base;

  const cell = base[index] === ORIENTED ? UNORIENTED : ORIENTED;
  return `${base.slice(0, index)}${cell}${base.slice(index + 1)}`;
};

/**
 * Remembered captures, keyed by the algorithm text.
 *
 * A capture is about a twentieth of a millisecond in node and some multiple of
 * that in Hermes, which is nothing once and a hundred times per render on a
 * library that is being searched a keystroke at a time. Deriving on read (rather
 * than migrating the save file, §3.2) is what makes every entry Step 1 wrote
 * show a case without being touched — and it is only affordable if reading is
 * cheap the second time.
 *
 * A memo rather than state: same text, same nine characters, forever. Bounded
 * because Step 2.5 recomputes on **every move** as an algorithm is written, so
 * the keys are a stream of prefixes rather than a fixed set; the oldest goes
 * when it overflows, which is enough because a whole library is 100 entries and
 * the cap is more than twice that.
 */
const CASE_MEMO = new Map();
const MEMO_LIMIT = 256;

const remember = (key, value) => {
  if (CASE_MEMO.size >= MEMO_LIMIT) CASE_MEMO.delete(CASE_MEMO.keys().next().value);
  CASE_MEMO.set(key, value);
  return value;
};

/**
 * **The one that matters**: the case an algorithm solves.
 *
 * `captureCase(cubeFromAlg(invertAlg(moves)))`, and the reasoning is the line at
 * the top of this file. Empty moves are the solved cube undone, which is the
 * solved cube — `SOLVED_CASE`, honestly, rather than a special case.
 *
 * @param {string} moves
 * @returns {string|null} nine characters, or null if the moves do not parse.
 *   A *stored* entry's moves always parse (`sanitizeAlgorithms` drops one whose
 *   do not), so null is only ever reachable from something being typed.
 */
export const caseOfAlgorithm = (moves) => {
  const text = normalizeAlg(moves);
  if (CASE_MEMO.has(text)) return CASE_MEMO.get(text);

  const inverse = tryInvertAlg(text);
  return remember(text, inverse === null ? null : captureCase(cubeFromAlg(inverse)));
};

/** The nine cells, named the way somebody holding the cube would name them. */
const CELL_NAMES = [
  'back-left corner',
  'back edge',
  'back-right corner',
  'left edge',
  'centre',
  'right edge',
  'front-left corner',
  'front edge',
  'front-right corner',
];

/** `a, b and c` — the list as a sentence rather than as a row of commas. */
const andList = (parts) =>
  parts.length <= 1
    ? parts.join('')
    : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;

/**
 * A case, in words — because a 40-point tile of two colours is unreadable to a
 * screen reader **by construction**.
 *
 * §3.2's rule is "never colour alone", and the thing that satisfies it is not a
 * label saying "a case": it is which cells are oriented. So this names them, and
 * says the shorter of the two lists — five oriented cells is a sentence, and
 * "every sticker except the back-left corner" is the same fact in half of it.
 *
 * The centre is never mentioned: it is the reference, always `y`, and reading it
 * out on every tile would be nine words that never change.
 */
export const describeCase = (pattern) => {
  const clean = sanitizeCase(pattern);
  if (!clean) return 'Case: unknown';

  const oriented = [];
  const flat = [];
  CELL_NAMES.forEach((name, index) => {
    if (index === CASE_CENTRE) return;
    if (clean[index] === ORIENTED) oriented.push(name);
    else flat.push(name);
  });

  if (flat.length === 0) return 'Case: every sticker oriented';
  if (oriented.length === 0) return 'Case: no stickers oriented';

  return oriented.length <= flat.length
    ? `Case: ${andList(oriented)} oriented`
    : `Case: every sticker oriented except the ${andList(flat)}`;
};

export default {
  CASE_CELLS,
  CASE_CENTRE,
  ORIENTED,
  UNORIENTED,
  EMPTY_CASE,
  SOLVED_CASE,
  captureCase,
  sanitizeCase,
  toggleCaseCell,
  caseOfAlgorithm,
  describeCase,
};
