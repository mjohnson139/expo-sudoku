/**
 * The notebook — every solve the operator has written, and the rules for
 * keeping them (docs/cube-plan.md §7.1, Step 4).
 *
 * `solve.js` is one page: the text of a single solve and every way of editing
 * it. This is the book it lives in — several named solves per scramble, the
 * shape they take in the save file, and the sanitizing that has to survive a
 * file written by a build that did not know about any of this.
 *
 * Pure, and importing nothing from React Native, for the reason `favorites.js`
 * gives: the test runner is a plain node environment and this is exactly the
 * part worth testing.
 *
 * ### A solve
 *
 * ```js
 * { id, scramble, name, orientation, alg, phases, savedAt }
 * ```
 *
 * - **`scramble`** is the scramble it was written against, as normalized
 *   algorithm text. Plan §7 identifies a favorite by its algorithm rather than
 *   by a generated id, and a solve names its scramble the same way — which also
 *   means **a solve does not need its scramble to be favourited**. Forcing a
 *   star before you are allowed to keep work is a rule nobody asked for.
 * - **`id`** is generated, and that is a deliberate departure from the rule
 *   above rather than a lapse from it. Two saves of the same scramble are the
 *   same favorite, which is what a player means; two solves with the same moves
 *   are **two solves**, which is the entire point of Duplicate — "same first
 *   block, try the second block differently" starts life as a copy. So a solve
 *   has no natural key and is given one. It is minted by counting rather than
 *   by clock or dice, so the file is deterministic and so are the tests.
 * - **`orientation`** is the hold, as a rotation prefix — `null` while it is
 *   still being inspected, `''` for the reference hold, otherwise notation.
 * - **`phases`** is Step 6's slot (plan §8.5), and **nothing writes one yet**.
 *   It is in the file now because the alternative is reshaping the file twice
 *   and writing two migrations.
 */

import { isValidAlg, moveCount, normalizeAlg } from './moves';

/**
 * Enough solves for a long drilling habit without the file becoming an archive.
 * The cap is across all scrambles rather than per scramble: the thing worth
 * bounding is the blob AsyncStorage has to write, and nobody is going to write
 * a hundred solves against one scramble before they write one against a second.
 */
export const MAX_SOLVES = 100;

/** Long enough for "second block, M-slice first" and short enough to fit a row. */
export const MAX_SOLVE_NAME = 40;

/** Ceiling on the annotations a single solve may carry, so a corrupt file cannot
 *  hand Step 6 an unbounded list. */
const MAX_PHASES = 40;

/** A name, as it is kept: single-spaced, trimmed, and bounded. */
export const normalizeName = (name) =>
  String(name == null ? '' : name)
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, MAX_SOLVE_NAME);

/** The solves written against one scramble, newest first (the order the list is
 *  already in). */
export const solvesFor = (solves, scramble) => {
  const key = normalizeAlg(scramble);
  if (key.length === 0) return [];
  return (solves || []).filter((solve) => solve.scramble === key);
};

/** A solve by id, or null. */
export const findSolve = (solves, id) =>
  (solves || []).find((solve) => solve.id === id) || null;

/**
 * A fresh id, by counting rather than by clock or dice.
 *
 * `s1`, `s2`, … one past the highest already in the file, so the same sequence
 * of actions always produces the same file. Ids are never reused within a
 * session even after a delete, because the highest is what is counted from, not
 * the length.
 */
export const nextSolveId = (solves) => {
  let highest = 0;
  (solves || []).forEach((solve) => {
    const match = /^s(\d+)$/.exec((solve && solve.id) || '');
    if (match) highest = Math.max(highest, Number(match[1]));
  });
  return `s${highest + 1}`;
};

/**
 * Make `name` unique among `taken`, by adding ` 2`, ` 3`, …
 *
 * The suffix is made room for rather than appended: a name already at
 * `MAX_SOLVE_NAME` would otherwise come back from the cap unchanged, still
 * clash, and be tried again forever.
 */
const uniqueName = (name, taken) => {
  if (!taken.has(name)) return name;

  for (let n = 2; n <= MAX_SOLVES + 2; n += 1) {
    const suffix = ` ${n}`;
    const candidate = `${name.slice(0, MAX_SOLVE_NAME - suffix.length).trim()}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }

  // Unreachable: there are never more than MAX_SOLVES names to collide with.
  return name;
};

/**
 * The name a new solve gets: `Solve 1`, `Solve 2`, … counting within the
 * scramble, because "my third attempt at *this*" is what the number means.
 */
export const defaultSolveName = (solves, scramble) => {
  const mine = solvesFor(solves, scramble);
  const taken = new Set(mine.map((solve) => solve.name));
  return uniqueName(normalizeName(`Solve ${mine.length + 1}`), taken);
};

/**
 * Start a new solve against `scramble`.
 *
 * Returns both the list and the solve, because the caller has to open what it
 * just made and looking it back up by name would be the one lookup that can be
 * wrong.
 *
 * @returns {{solves: Array, solve: Object|null}} `solve` is null — and the list
 *   unchanged — when `scramble` is not an algorithm to solve.
 */
export const createSolve = (solves, scramble, { name, savedAt = Date.now() } = {}) => {
  const key = normalizeAlg(scramble);
  const list = solves || [];
  if (key.length === 0 || !isValidAlg(key)) return { solves: list, solve: null };

  const taken = new Set(solvesFor(list, key).map((solve) => solve.name));
  const wanted = normalizeName(name);

  const solve = {
    id: nextSolveId(list),
    scramble: key,
    name: wanted.length > 0 ? uniqueName(wanted, taken) : defaultSolveName(list, key),
    orientation: null,
    alg: '',
    phases: [],
    savedAt,
  };

  return { solves: [solve, ...list].slice(0, MAX_SOLVES), solve };
};

/**
 * Copy a solve, moves and hold and all.
 *
 * **This is the one that matters for drilling**: "same first block, try the
 * second block differently" is how the practice actually goes, and it starts by
 * keeping what you already had.
 */
export const duplicateSolve = (solves, id, { savedAt = Date.now() } = {}) => {
  const list = solves || [];
  const source = findSolve(list, id);
  if (!source) return { solves: list, solve: null };

  const taken = new Set(solvesFor(list, source.scramble).map((solve) => solve.name));

  const solve = {
    ...source,
    id: nextSolveId(list),
    name: uniqueName(normalizeName(`${source.name} copy`), taken),
    phases: [...source.phases],
    savedAt,
  };

  return { solves: [solve, ...list].slice(0, MAX_SOLVES), solve };
};

/** Forget a solve. An unknown id leaves the list alone — and identical. */
export const removeSolve = (solves, id) => {
  const list = solves || [];
  const next = list.filter((solve) => solve.id !== id);
  return next.length === list.length ? list : next;
};

/**
 * Change a solve in place, keeping its position in the list.
 *
 * `patch` is either the fields to change or a function of the solve. The list
 * order is creation order and stays that way: a solve that jumped to the top
 * every time a move was entered would reshuffle the picker under the operator's
 * thumb while they were writing.
 */
export const updateSolve = (solves, id, patch) => {
  const list = solves || [];
  let changed = false;

  const next = list.map((solve) => {
    if (solve.id !== id) return solve;
    const fields = typeof patch === 'function' ? patch(solve) : patch;
    const grown = { ...solve, ...fields, id: solve.id, scramble: solve.scramble };
    changed = true;
    return grown;
  });

  return changed ? next : list;
};

/** Rename a solve, keeping names distinct within their scramble so the picker
 *  never shows two rows that read the same. An empty name is refused rather
 *  than kept — a row with no name is a row you cannot ask for. */
export const renameSolve = (solves, id, name) => {
  const list = solves || [];
  const solve = findSolve(list, id);
  if (!solve) return list;

  const wanted = normalizeName(name);
  if (wanted.length === 0 || wanted === solve.name) return list;

  const taken = new Set(
    solvesFor(list, solve.scramble)
      .filter((other) => other.id !== id)
      .map((other) => other.name)
  );

  return updateSolve(list, id, { name: uniqueName(wanted, taken) });
};

/**
 * A stored phase list, brought into shape (plan §8.5).
 *
 * Nothing writes one yet, and it is sanitized anyway: the slot exists precisely
 * so that the first build which *does* write phases finds the field already
 * there, and the first build to read one written by a later version has to
 * survive it.
 */
const sanitizePhases = (raw, count) => {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(
      (phase) =>
        phase &&
        typeof phase === 'object' &&
        Number.isInteger(phase.at) &&
        phase.at >= 0 &&
        phase.at <= count
    )
    .map((phase) => ({ at: phase.at, label: normalizeName(phase.label) }))
    .slice(0, MAX_PHASES);
};

/**
 * A hold, brought into shape.
 *
 * `null` is "not picked yet", which is the inspection phase and a perfectly good
 * thing to have been in when the app was backgrounded. Anything else is
 * notation, and notation that no longer parses falls back to the **reference
 * hold** rather than to null: the solve may already have moves written against
 * it, and dropping back into inspection under written moves is the one thing
 * plan §8.3 says never to do.
 */
const sanitizeOrientation = (raw) => {
  if (raw === null || raw === undefined) return null;
  const alg = normalizeAlg(raw);
  return isValidAlg(alg) ? alg : '';
};

/**
 * Drop anything that is not a solve, and make what is left safe to open.
 *
 * Storage is the boundary where a file written by an older build — or a newer
 * one, or a corrupt one — comes back in, so this filters rather than trusts. A
 * solve whose moves no longer parse gets the same treatment as a favorite that
 * no longer parses: it goes, because there is nothing left to show. A solve
 * whose *hold* no longer parses does not, because the moves are still the
 * operator's work.
 *
 * Ids are repaired rather than trusted too — a missing or duplicated one is
 * re-minted, since two rows with one id is a picker that opens the wrong solve.
 */
export const sanitizeSolves = (raw) => {
  if (!Array.isArray(raw)) return [];

  const clean = [];
  const usedIds = new Set();
  const namesByScramble = new Map();

  raw.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;

    const scramble = normalizeAlg(entry.scramble);
    if (scramble.length === 0 || !isValidAlg(scramble)) return;

    const alg = normalizeAlg(entry.alg);
    if (!isValidAlg(alg)) return;

    if (!namesByScramble.has(scramble)) namesByScramble.set(scramble, new Set());
    const taken = namesByScramble.get(scramble);

    const wanted = normalizeName(entry.name);
    const name = uniqueName(
      wanted.length > 0 ? wanted : normalizeName(`Solve ${taken.size + 1}`),
      taken
    );
    taken.add(name);

    const id =
      typeof entry.id === 'string' && entry.id.length > 0 && !usedIds.has(entry.id)
        ? entry.id
        : nextSolveId([...usedIds].map((used) => ({ id: used })));
    usedIds.add(id);

    clean.push({
      id,
      scramble,
      name,
      orientation: sanitizeOrientation(entry.orientation),
      alg,
      phases: sanitizePhases(entry.phases, moveCount(alg)),
      savedAt: Number.isFinite(entry.savedAt) ? entry.savedAt : 0,
    });
  });

  return clean.slice(0, MAX_SOLVES);
};

/**
 * Where the operator was standing, brought into shape.
 *
 * This is the other half of "come back to what you left" (plan §7.1): the data
 * is the solves, and this is the *workspace* — which solve was open, and whether
 * solve mode was open at all. What is deliberately **not** here is the scrub
 * position, the view angle and the speed, which are where you are standing
 * rather than what you wrote.
 *
 * Both fields are cross-checked against what actually survived sanitizing: an
 * open solve has to exist and has to belong to the scramble on screen, and solve
 * mode with nothing open is not a state this screen has.
 */
export const sanitizeWorkspace = (raw, { solves, scramble }) => {
  const wanted = raw && typeof raw === 'object' ? raw : {};
  const open = findSolve(solves, wanted.solveId);
  const solveId = open && open.scramble === normalizeAlg(scramble) ? open.id : null;

  return { solving: solveId !== null && wanted.solving === true, solveId };
};

/** `"8 moves"`, or `"empty"` — what a row in the picker says about itself. */
export const describeSolveSize = (solve) => {
  const count = moveCount(solve && solve.alg);
  if (count === 0) return 'empty';
  return count === 1 ? '1 move' : `${count} moves`;
};

export default {
  MAX_SOLVES,
  createSolve,
  duplicateSolve,
  removeSolve,
  updateSolve,
  renameSolve,
  findSolve,
  solvesFor,
  sanitizeSolves,
  sanitizeWorkspace,
  describeSolveSize,
};
