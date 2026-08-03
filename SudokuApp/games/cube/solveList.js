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
 * - **`phases`** is the annotation on the move groups (plan §8.5) — *"these
 *   moves solve first block, this set solves second block"*. Step 4 put the
 *   field in the file and Step 6 filled it in, which is the whole point of
 *   deciding the shape once.
 *
 * ### Phases are markers, not ranges (plan §8.5)
 *
 * A phase is `{ at, label }` — **the move index the group starts at** — and the
 * spans fall out of consecutive markers. Storing a start *and* an end invites
 * the two to disagree, and every edit would have to keep both honest; storing a
 * count alongside would be the same mistake, which is why `phaseSpans` derives
 * one by subtraction and nothing writes one down.
 *
 * The one invariant is that **a marker points at a move index the solve
 * actually reaches**. Moves are still being written while markers exist — undo
 * takes one away, clear takes them all — so `clampPhases` is the single answer
 * to "what happens to the markers when the moves change", and both the screen
 * (live, via `withMoves`) and storage (on the way back in, via `sanitizeSolves`)
 * go through it. Two answers to that question is two ways for the file and the
 * screen to disagree.
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
 *  hand the screen an unbounded list. A solve with forty groups in it is not a
 *  solve anyone is annotating. */
export const MAX_PHASES = 40;

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

// ——— Phases: annotating the move groups (plan §8.5) ————————————————————————

/**
 * The method's own vocabulary, offered a tap at a time.
 *
 * *"These moves solve first block. This set solves second block."* Those are the
 * names, and typing them on a phone is the thing that would stop anyone doing
 * it — so the two methods this app is likely to see are spelled out and a label
 * is one tap. Free text is the escape hatch, not the primary route.
 *
 * Roux comes first because it is what the operator is drilling (plan §8.2).
 */
export const PHASE_METHODS = [
  { name: 'Roux', labels: ['First block', 'Second block', 'CMLL', 'LSE'] },
  { name: 'CFOP', labels: ['Cross', 'F2L', 'OLL', 'PLL'] },
];

/** What a group with no name yet is called — the moves written since the last
 *  marker, which is a real span with a real count and simply has not been
 *  closed. */
export const UNNAMED_PHASE = 'In progress';

/**
 * Markers, brought into shape against a solve of `count` moves.
 *
 * **The one place the invariant lives.** A marker past the end of the solve
 * points at nothing, so it goes; two markers at one index are one boundary, so
 * they merge; and the list comes back sorted, because every reader downstream
 * assumes consecutive markers bound consecutive spans.
 *
 * Undo is what makes this a live concern rather than a storage one: the marker
 * that closed the first block sits at the index of a move that an undo has just
 * removed. Dropping it is the honest answer — the move that ended the group is
 * gone, so the group is open again — and it is the same answer the file gives
 * when it is read back, which is the point of there being one function.
 */
export const clampPhases = (phases, count) => {
  const limit = Number.isInteger(count) && count > 0 ? count : 0;
  const byIndex = new Map();

  (phases || []).forEach((phase) => {
    if (!phase || typeof phase !== 'object') return;
    if (!Number.isInteger(phase.at) || phase.at < 0 || phase.at > limit) return;
    if (byIndex.has(phase.at)) return;
    byIndex.set(phase.at, { at: phase.at, label: normalizeName(phase.label) });
  });

  return [...byIndex.values()].sort((a, b) => a.at - b.at).slice(0, MAX_PHASES);
};

/**
 * Where the group of moves that *ends* at `at` begins.
 *
 * The last boundary strictly before `at`, or the start of the solve. This is
 * what makes "end the phase here" a one-control interaction: the start is
 * already known, so all the operator supplies is the name.
 *
 * **Strictly before, and that is what makes a mis-tap fixable.** With a boundary
 * already sitting exactly where the cube is — the one the last "end the phase"
 * left — this still answers with the group behind it, so naming again *renames*
 * that group rather than refusing. The alternative reading dead-ends: bin a
 * marker, and the group it left behind could never be named again without
 * writing another move.
 */
export const openPhaseStart = (phases, at) => {
  let start = 0;
  (phases || []).forEach((phase) => {
    if (phase && Number.isInteger(phase.at) && phase.at < at && phase.at > start) {
      start = phase.at;
    }
  });
  return start;
};

/** Whether a boundary already sits at `at` — so naming is a rename of the group
 *  ending there rather than the closing of a new one. The screen says which of
 *  the two it is doing rather than leaving the operator to infer it. */
export const isPhaseBoundary = (phases, at) =>
  (phases || []).some((phase) => phase && phase.at === at);

/**
 * Close the group that ends at `at`, and name it.
 *
 * **Mark as you go** (plan §8.5): the moment you know the first block is done is
 * the moment you say so, and selecting a range afterwards is a second
 * interaction for the same information. So this writes *two* markers — the name
 * onto the boundary the group started at, and a fresh unnamed boundary at `at`
 * where the next group begins.
 *
 * The second one is not bookkeeping that could be left out. Without it the
 * named group's span would run to the end of the solve, and "First block · 8"
 * would quietly become "First block · 12" as the second block was written.
 *
 * **Naming a group that is already closed renames it**, because the boundary at
 * `at` is already there and only the label is left to write. That is the way out
 * of a mis-tapped name, and it is why the group ending at `at` is found by
 * looking strictly before it.
 *
 * Returns the markers unchanged when there is nothing to name — no moves in the
 * group, no name, or a position the solve does not reach. Unchanged in value
 * rather than in identity: what comes back is always the clamped list, because a
 * refusal is not a reason to hand back a marker that points at nothing.
 */
export const endPhase = (phases, at, label, count) => {
  const list = clampPhases(phases, count);
  const name = normalizeName(label);
  const total = Number.isInteger(count) && count > 0 ? count : 0;

  if (name.length === 0) return list;
  if (!Number.isInteger(at) || at <= 0 || at > total) return list;
  if (list.length >= MAX_PHASES) return list;

  const start = openPhaseStart(list, at);
  if (start === at) return list;

  const named = [...list.filter((phase) => phase.at !== start), { at: start, label: name }];
  const closed = named.some((phase) => phase.at === at)
    ? named
    : [...named, { at, label: '' }];

  return clampPhases(closed, total);
};

/**
 * Forget one marker.
 *
 * The two groups either side of it become one, which is what removing a boundary
 * means — and it is the way out of a mis-tapped name, since the alternative
 * would be clearing a solve to fix its annotation.
 */
export const removePhase = (phases, at) => {
  const list = phases || [];
  const next = list.filter((phase) => phase.at !== at);
  return next.length === list.length ? list : next;
};

/**
 * The spans the markers describe: `[{ at, end, label, count }]`.
 *
 * **The counts are a subtraction and must stay one** (plan §8.5) — "first block
 * in 8" versus "first block in 12" is exactly what a Roux learner is trying to
 * improve, and a count stored next to a marker would be a second thing to keep
 * honest on every edit.
 *
 * `end` is exclusive, so a span covers moves `at + 1` through `end` as the
 * operator counts them, and the last span runs to the end of the solve. A file
 * whose first marker is not at 0 gets an unnamed span in front of it rather than
 * a hole; nothing this screen writes can produce one, and a hole would be a
 * missing move count.
 */
export const phaseSpans = (phases, count) => {
  const total = Number.isInteger(count) && count > 0 ? count : 0;
  const marks = clampPhases(phases, total);
  if (marks.length === 0) return [];

  const starts = marks[0].at === 0 ? marks : [{ at: 0, label: '' }, ...marks];

  return starts.map((mark, i) => {
    const end = i + 1 < starts.length ? starts[i + 1].at : total;
    return { at: mark.at, end, label: mark.label, count: end - mark.at };
  });
};

/** Which span the cube is standing in, by index — the move just played belongs
 *  to it. `-1` when there are no spans. Position 0 is the first one: you are at
 *  the start of it rather than before everything. */
export const currentSpan = (spans, index) => {
  if (!spans || spans.length === 0) return -1;
  if (index <= 0) return 0;
  const found = spans.findIndex((span) => index > span.at && index <= span.end);
  return found === -1 ? spans.length - 1 : found;
};

/** `"First block · 8"` — a span on a chip. */
export const describePhaseSpan = (span) =>
  `${(span && span.label) || UNNAMED_PHASE} · ${(span && span.count) || 0}`;

/** The same span said out loud, with the moves it covers — which is the part a
 *  chip has no room for and a screen reader has all the room in the world for. */
export const announcePhaseSpan = (span) => {
  const name = (span && span.label) || UNNAMED_PHASE;
  const count = (span && span.count) || 0;
  if (count === 0) return `${name}, no moves yet`;
  if (count === 1) return `${name}, 1 move, move ${span.at + 1}`;
  return `${name}, ${count} moves, ${span.at + 1} to ${span.end}`;
};

/**
 * The patch that changes a solve's moves — **and the only way the screen should
 * change them.**
 *
 * Every edit to the text is also an edit to the markers, because a marker is an
 * index into the list being edited. Routing both through one patch is what keeps
 * the screen's answer and `sanitizeSolves`' answer the same answer.
 */
export const withMoves = (solve, alg) => ({
  alg,
  phases: clampPhases(solve && solve.phases, moveCount(alg)),
});

/**
 * A stored phase list, brought into shape (plan §8.5).
 *
 * Storage is the boundary where a file written by an older build — or a newer
 * one, or a corrupt one — comes back in, and this is `clampPhases` doing exactly
 * what it does live on the screen. Deliberately the same function: "the marker
 * survived the reload but not the undo" is the class of bug two implementations
 * of one rule produce.
 */
const sanitizePhases = (raw, count) => (Array.isArray(raw) ? clampPhases(raw, count) : []);

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
  MAX_PHASES,
  PHASE_METHODS,
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
  clampPhases,
  openPhaseStart,
  isPhaseBoundary,
  endPhase,
  removePhase,
  phaseSpans,
  currentSpan,
  describePhaseSpan,
  announcePhaseSpan,
  withMoves,
};
