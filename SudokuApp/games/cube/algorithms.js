/**
 * The algorithm library (docs/cube-methods-plan.md §3.1, Step 1).
 *
 * Until this step an algorithm existed only as **moves the operator typed**:
 * `R U R' U R U2 R'` was seven tokens inside a solve's `alg` and nothing else —
 * not a thing with a name, not a thing that could be looked up, not a thing that
 * could be found again next week. The library the operator actually keeps was on
 * paper or in their head, and the one place they *did* write those moves down
 * threw the structure away the moment the solve scrolled past.
 *
 * This is the book those moves live in. It is modelled on `solveList.js` line
 * for line — the bounds, the injected clocks, the name-uniqueness rule, the
 * sanitize-by-shape — because it is the same kind of file and there is no reason
 * for two collections in one blob to have two personalities.
 *
 * Pure, and importing nothing from React Native, for the reason `favorites.js`
 * gives: the test runner is `testEnvironment: "node"` with no renderer, and this
 * is exactly the part worth testing.
 *
 * ### An entry
 *
 * ```js
 * { id, name, moves, setup: '', case: null, assignments: [], notes: '', savedAt, editedAt }
 * ```
 *
 * - **`moves`** is the algorithm, as normalized notation, and it is the one
 *   **required** field: an entry whose moves do not parse is not an entry, it is
 *   a typo, and it is refused on the way in and dropped on the way back
 *   (`isValidAlg` from `moves.js`, the same validator the alg input modal
 *   already shows a message from).
 * - **`setup`** is optional notation from solved to the authored starting
 *   position. Older and pasted entries keep `''` and derive that position from
 *   the inverse of `moves`; workbench entries preserve the start the operator
 *   chose on the cube.
 * - **`id`** is generated and minted by counting — `a1`, `a2`, … — for the
 *   reason `nextSolveId` is: the same sequence of actions produces the same
 *   file, so the tests are deterministic. Two entries with the same moves are
 *   two entries (one is your CMLL alg, the other is the one you are trying to
 *   replace it with), so an entry has no natural key and is given one.
 * - **`name`** is unique across the whole library, not scoped the way a solve's
 *   name is scoped to its scramble: there is one library, and two rows in it
 *   that read the same is a row you cannot ask for.
 * - **`case`** is nine characters of the U face (`algCase.js`), and it is stored
 *   only when a hand has overruled the arithmetic: `null` means derive it from
 *   the authored setup, falling back to the moves' inverse for older entries.
 * - **`assignments`** is `[{ method, stage }]` — zero or more, so one entry can
 *   serve Roux CMLL and CFOP OLL at once and an unassigned entry stays findable.
 *   Both halves are checked against the catalogue in `methods.js` on the way in
 *   and are **never trusted**: an assignment naming a method or a stage this
 *   build does not ship is dropped, which is the same answer `sanitizeMethodId`
 *   gives a solve.
 * - **`notes`** is finger tricks and personal cues. **It is never shown on the
 *   solve screen** (plan §3.1) — the design says so, and it is worth obeying
 *   from the first line.
 * - **`savedAt` is when the entry was written and `editedAt` when it was last
 *   changed**, with the same split and the same fallback `solveList.js` settled
 *   on (docs/cube-flow-plan.md §6 question 8).
 *
 * ### The catalogue is still a module-level constant here, deliberately
 *
 * This file imports `METHODS`, `findMethod` and `stagesOf` directly, the way
 * `solveList.js` imports `sanitizeMethodId`. **Threading a catalogue parameter
 * through is Step 4**, quarantined on its own precisely because it is a
 * signature refactor with no visible change (plan §3). Inventing half of it here
 * would spread that refactor across two steps and make neither reviewable.
 *
 * ### Migration is by shape, and `_v: 3` is a label
 *
 * `storage.js` is explicit that nothing branches on `_v` — `readCubeSave` reads
 * every version by shape, because a key that is absent and a key that is corrupt
 * want the same answer anyway. A file written before this step has no
 * `algorithms` key and `sanitizeAlgorithms(undefined)` is the empty list, which
 * is the truth: that build could not keep an algorithm.
 */

import { EMPTY_CASE, caseOfAlgorithm, caseOfSetup, sanitizeCase } from './algCase';
import { cubeFromAlg, solvedCube } from './cubeState';
import { METHODS, findMethod, stagesOf } from './methods';
import { invertAlg, isValidAlg, moveCount, normalizeAlg } from './moves';

/**
 * Enough algorithms for a full method's worth of drilling without the blob
 * becoming an archive. Matches `MAX_SOLVES` because it is bounding the same
 * thing — what AsyncStorage has to write in one go.
 */
export const MAX_ALGORITHMS = 100;

/** Long enough for `Sune — the left-hand one` and short enough to fit a row.
 *  Matches `MAX_SOLVE_NAME`; a separate constant because they are separate
 *  collections and the day one of them wants a different cap should not be the
 *  day the other one silently changes. */
export const MAX_ALG_NAME = 40;

/**
 * A ceiling on the notes, so a corrupt file cannot hand the screen a novel.
 * Generous on purpose — notes are the one field with prose in them, and the
 * point of the cap is the blob's size rather than the operator's brevity.
 */
export const MAX_ALG_NOTES = 500;

/** More stages than the shipped presets have between them. A corrupt file
 *  cannot hand a card an unbounded row of tags. */
export const MAX_ASSIGNMENTS = 12;

/**
 * The filter chip that means *no assignments at all*.
 *
 * A string rather than a symbol because it is React state and a list key as well
 * as a filter, and `null` is already taken by the `All` chip. **Step 5 mints ids
 * for user methods and must not mint this one** — a method whose id were
 * `unassigned` would filter to the entries that are not assigned to it, which is
 * the only place in this file where the two vocabularies could collide.
 */
export const UNASSIGNED = 'unassigned';

/** The `All` chip's label, here rather than in the screen so the chip list is
 *  one derivation with one test. */
export const ALL_LABEL = 'All';

/** What the `UNASSIGNED` chip is called. */
export const UNASSIGNED_LABEL = 'Unassigned';

/** A name, as it is kept: single-spaced, trimmed, and bounded. */
export const normalizeAlgName = (name) =>
  String(name == null ? '' : name)
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, MAX_ALG_NAME);

/** A stage, as it is compared. Trimmed and single-spaced but **not** sliced:
 *  it has to match a catalogue string exactly or it is dropped, so a cap here
 *  would only ever turn a valid stage into an invalid one. */
const normalizeStage = (stage) =>
  String(stage == null ? '' : stage)
    .trim()
    .replace(/\s+/g, ' ');

/** Notes, as they are kept: coerced and bounded, and otherwise **untouched**.
 *  No trim and no whitespace collapse — the newlines in a note are the note. */
const normalizeNotes = (notes) =>
  typeof notes === 'string' ? notes.slice(0, MAX_ALG_NOTES) : '';

/**
 * The case an entry shows, and **a stored one always wins**.
 *
 * `case` is nine characters of the U face and it is `null` on every entry Step 1
 * wrote, because that build could not work one out. Step 2 can — an algorithm
 * carries its own case, `caseOfAlgorithm` (`algCase.js`) — so the null ones are
 * filled in **on read**, here, rather than by rewriting the save file.
 *
 * That is what makes every entry already in the library show a case the day this
 * build is installed, with nothing re-saved and no migration in either
 * direction. And the order is the point (plan §3.2): derivation is an *upgrade
 * path*, not a source of truth. The moment arithmetic overwrote a stored case,
 * an operator who had corrected one would have no way to keep an answer the app
 * disagrees with.
 *
 * `EMPTY_CASE` is the floor and is unreachable in practice: an entry whose moves
 * do not parse is not an entry (`sanitizeAlgorithms`), so the derivation only
 * fails for something that is not in the library.
 */
export const algorithmCase = (algorithm) => {
  if (!algorithm) return EMPTY_CASE;
  return sanitizeCase(algorithm.case) || (algorithm.setup ? caseOfSetup(algorithm.setup) : null) || caseOfAlgorithm(algorithm.moves) || EMPTY_CASE;
};

/**
 * The real cube an algorithm begins on, for the three-face preview.
 *
 * Authored setup wins. Older and pasted entries have none, so their existing
 * `A⁻¹(solved)` derivation remains their starting cube without a migration.
 * A corrupt record has already been sanitized before the UI sees it, but the
 * fallback keeps this read helper safe for direct callers and tests too.
 */
export const algorithmStartingCube = (algorithm) => {
  if (!algorithm) return solvedCube();
  const setup = normalizeAlg(algorithm.setup);
  const start = setup || invertAlg(algorithm.moves || '');
  try {
    return cubeFromAlg(start);
  } catch (error) {
    return solvedCube();
  }
};

/** An entry by id, or null. */
export const findAlgorithm = (algorithms, id) =>
  (algorithms || []).find((entry) => entry.id === id) || null;

/**
 * A fresh id, by counting rather than by clock or dice — `a1`, `a2`, … one past
 * the highest already in the file, so the same sequence of actions always
 * produces the same file. Ids are never reused within a session even after a
 * delete, because the highest is what is counted from, not the length.
 */
export const nextAlgorithmId = (algorithms) => {
  let highest = 0;
  (algorithms || []).forEach((entry) => {
    const match = /^a(\d+)$/.exec((entry && entry.id) || '');
    if (match) highest = Math.max(highest, Number(match[1]));
  });
  return `a${highest + 1}`;
};

/**
 * Make `name` unique among `taken`, by adding ` 2`, ` 3`, …
 *
 * Lifted from `solveList.js` rather than imported from it, because the cap it
 * makes room for is this file's cap. The suffix is made room for rather than
 * appended: a name already at `MAX_ALG_NAME` would otherwise come back from the
 * slice unchanged, still clash, and be tried again forever.
 */
const uniqueName = (name, taken) => {
  if (!taken.has(name)) return name;

  for (let n = 2; n <= MAX_ALGORITHMS + 2; n += 1) {
    const suffix = ` ${n}`;
    const candidate = `${name.slice(0, MAX_ALG_NAME - suffix.length).trim()}${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }

  // Unreachable: there are never more than MAX_ALGORITHMS names to collide with.
  return name;
};

/** Every name in the library except one entry's own, which is the set a rename
 *  has to stay clear of. */
const namesExcept = (algorithms, id) =>
  new Set((algorithms || []).filter((entry) => entry.id !== id).map((entry) => entry.name));

/** What an entry nobody named is called: `Algorithm 1`, `Algorithm 2`, …
 *  counting the library, because there is only one of those. */
export const defaultAlgorithmName = (algorithms) => {
  const list = algorithms || [];
  return uniqueName(
    normalizeAlgName(`Algorithm ${list.length + 1}`),
    new Set(list.map((entry) => entry.name))
  );
};

// ——— Assignments: which stage of which method this alg is for ———————————————

/**
 * Assignments, brought into shape **against the catalogue**.
 *
 * Neither half is trusted (plan §5): a method id this build does not ship is
 * dropped, and so is a stage that is not one of that method's. The alternative
 * is a tag on a card naming a method that does not exist and a filter chip that
 * can never be reached — and, worse, an assignment that looks like it means
 * something.
 *
 * **`null` is not a method here**, though it is a perfectly good value for a
 * *solve*: `null` means Freeform, Freeform has no stages, and an assignment to a
 * stage that cannot exist is not an assignment. So `findMethod` rather than
 * `sanitizeMethodId`, which would let `null` through.
 *
 * Duplicates collapse, the order is the file's, and the list is bounded.
 */
export const sanitizeAssignments = (raw) => {
  if (!Array.isArray(raw)) return [];

  const seen = new Set();
  const clean = [];

  raw.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    if (!findMethod(entry.method)) return;

    const stage = normalizeStage(entry.stage);
    if (!stagesOf(entry.method).includes(stage)) return;

    // A tab cannot appear in either half — a method id is a slug and a stage has
    // been whitespace-collapsed — so it is a separator neither can forge.
    const key = `${entry.method}\t${stage}`;
    if (seen.has(key)) return;
    seen.add(key);
    clean.push({ method: entry.method, stage });
  });

  return clean.slice(0, MAX_ASSIGNMENTS);
};

/** Is this alg already assigned to this stage of this method? */
export const hasAssignment = (assignments, method, stage) =>
  (assignments || []).some(
    (entry) => entry && entry.method === method && entry.stage === stage
  );

/**
 * Add or remove one assignment — what a tap on a stage chip means.
 *
 * Pure and here rather than in the entry screen, because "which chips are lit"
 * is a derivation and the test runner cannot render a screen. Removing is by
 * value rather than by index for the same reason the chips are drawn from the
 * catalogue: the screen never holds a position into this list.
 *
 * An unknown method or stage comes back unchanged, so a chip drawn from a
 * catalogue and an assignment written to the file cannot disagree.
 */
export const toggleAssignment = (assignments, method, stage) => {
  const list = assignments || [];
  if (hasAssignment(list, method, stage)) {
    return list.filter((entry) => !(entry.method === method && entry.stage === stage));
  }

  if (list.length >= MAX_ASSIGNMENTS) return list;
  return sanitizeAssignments([...list, { method, stage }]);
};

/** `"Roux · CMLL"` — one assignment on a tag. An assignment always names a
 *  method this build ships, because `sanitizeAssignments` is the only way one
 *  gets into the file. */
export const describeAssignment = (assignment) => {
  const method = findMethod(assignment && assignment.method);
  if (!method) return '';
  return `${method.name} · ${assignment.stage}`;
};

// ——— The list ————————————————————————————————————————————————————————————

/**
 * Write a new entry into the library.
 *
 * Returns both the list and the entry, because the caller has to open what it
 * just made and looking it back up by name would be the one lookup that can be
 * wrong — the same contract `createSolve` has.
 *
 * **A full library refuses rather than evicting**, and that is a deliberate
 * departure from `createSolve`, which prepends and slices. A solve list is a
 * rolling record of attempts and the hundred-and-first attempt pushing off the
 * first is a trade the operator would make; a *library* is the thing they have
 * been building for months, and silently dropping its oldest entry to make room
 * for a new one is the single worst thing this file could do. So it says no, and
 * the screen says so too (`CubeAlgorithms`).
 *
 * @returns {{algorithms: Array, algorithm: Object|null}} `algorithm` is null —
 *   and the list unchanged — when the moves do not parse, when there are none,
 *   or when the library is full.
 */
export const createAlgorithm = (
  algorithms,
  { name, moves, setup, assignments, notes, savedAt = Date.now() } = {}
) => {
  const list = algorithms || [];
  const alg = normalizeAlg(moves);

  if (alg.length === 0 || !isValidAlg(alg)) return { algorithms: list, algorithm: null };
  if (list.length >= MAX_ALGORITHMS) return { algorithms: list, algorithm: null };

  const wanted = normalizeAlgName(name);
  const taken = new Set(list.map((entry) => entry.name));

  const algorithm = {
    id: nextAlgorithmId(list),
    name: wanted.length > 0 ? uniqueName(wanted, taken) : defaultAlgorithmName(list),
    moves: alg,
    setup: isValidAlg(normalizeAlg(setup)) ? normalizeAlg(setup) : '',
    // Null, and **that is not a missing value**: it means nobody has corrected
    // this entry's case, so `algorithmCase` derives it from the moves on every
    // read. A case is only ever stored when a hand has overruled the arithmetic.
    case: null,
    assignments: sanitizeAssignments(assignments),
    notes: normalizeNotes(notes),
    savedAt,
    // An entry nobody has changed yet was last changed when it was written. The
    // alternative — null until the first edit — is a card that says nothing about
    // the entry you are looking at right now (`createSolve` makes the same call).
    editedAt: savedAt,
  };

  return { algorithms: [algorithm, ...list], algorithm };
};

/** Whether a sanitized patch would actually change the entry. `assignments` is
 *  the only field that is not a scalar, and comparing it by its rendered form is
 *  enough: the sanitizer has already put both sides in the same shape. */
const changesAnything = (entry, next) =>
  Object.keys(next).some((key) => {
    if (key !== 'assignments') return entry[key] !== next[key];
    const before = (entry.assignments || []).map(describeAssignment).join('\n');
    return before !== next.assignments.map(describeAssignment).join('\n');
  });

/**
 * **The one edit funnel** (plan §5), and every rule about an entry's fields is
 * inside it.
 *
 * `editOpen` is the only funnel for the open solve and `withMoves` the only
 * sanctioned moves patch; this epic adds exactly one more per collection, and
 * this is the algorithms' one. The moment there are two, the file and the screen
 * start to disagree — so the entry screen does not write a field itself, it
 * calls this with the field, including the ones it changes one keystroke at a
 * time.
 *
 * Which means **the rules live here rather than at the call site**:
 *
 * - `moves` that do not parse are a **refusal of the whole patch**, not a field
 *   quietly dropped. An entry's moves are the entry; a patch that would empty
 *   them is a patch that would delete it by accident.
 * - `name` is normalized and made unique among the *other* entries. An empty one
 *   keeps the name the entry already has, because a row with no name is a row
 *   you cannot ask for — and because a field being cleared on the way to being
 *   retyped must not cost the operator their name.
 * - `assignments`, `notes` and `case` go through their own sanitizers, so a
 *   screen cannot write a tag the catalogue does not recognise.
 * - `id` and `savedAt` are not patchable at all.
 *
 * **A patch that changes nothing returns the list itself**, identity and all,
 * and that is not an optimisation — the entry screen writes on every keystroke,
 * and a no-op that still stamped `editedAt` would make "when did I last change
 * this" mean "when did I last look at it".
 *
 * The clock is a parameter for the reason `createAlgorithm`'s is: a test that had
 * to reach `Date.now()` would be a stopwatch race. `CubeContext` reads the real
 * one, in the one place that knows what "now" means.
 */
export const editAlgorithm = (algorithms, id, patch, { editedAt = Date.now() } = {}) => {
  const list = algorithms || [];
  const entry = findAlgorithm(list, id);
  if (!entry) return list;

  const fields = typeof patch === 'function' ? patch(entry) : patch;
  if (!fields || typeof fields !== 'object') return list;

  const next = {};

  if ('moves' in fields) {
    const alg = normalizeAlg(fields.moves);
    if (alg.length === 0 || !isValidAlg(alg)) return list;
    next.moves = alg;
  }

  if ('setup' in fields) {
    const setup = normalizeAlg(fields.setup);
    if (setup && !isValidAlg(setup)) return list;
    next.setup = setup;
  }

  if ('name' in fields) {
    const wanted = normalizeAlgName(fields.name);
    next.name = wanted.length > 0 ? uniqueName(wanted, namesExcept(list, id)) : entry.name;
  }

  if ('assignments' in fields) next.assignments = sanitizeAssignments(fields.assignments);
  if ('notes' in fields) next.notes = normalizeNotes(fields.notes);
  if ('case' in fields) next.case = sanitizeCase(fields.case);

  if (!changesAnything(entry, next)) return list;

  return list.map((one) => (one.id === id ? { ...one, ...next, editedAt } : one));
};

/** Forget an entry. An unknown id leaves the list alone — and identical. */
export const removeAlgorithm = (algorithms, id) => {
  const list = algorithms || [];
  const next = list.filter((entry) => entry.id !== id);
  return next.length === list.length ? list : next;
};

// ——— Finding one again, which is the whole point of a library ————————————

/**
 * The entries matching `query`, over **both the name and the moves**.
 *
 * The moves are matched twice — as written and with the spaces taken out — so
 * that `RUR'` finds `R U R' U'`. That is not a nicety: notation is written with
 * spaces and remembered without them, and a search field that only matched the
 * spaced form would fail on exactly the query a cuber types fastest.
 *
 * An empty query returns the list itself, identity and all, because "no filter"
 * should not be a new array on every keystroke.
 */
export const searchAlgorithms = (algorithms, query) => {
  const list = algorithms || [];
  const wanted = String(query == null ? '' : query).trim().toLowerCase();
  if (wanted.length === 0) return list;

  const bare = wanted.replace(/\s+/g, '');

  return list.filter((entry) => {
    const name = (entry.name || '').toLowerCase();
    const moves = (entry.moves || '').toLowerCase();
    return (
      name.includes(wanted) ||
      moves.includes(wanted) ||
      moves.replace(/\s+/g, '').includes(bare)
    );
  });
};

/**
 * The entries under one filter chip.
 *
 * `null` is the `All` chip and returns the list itself; `UNASSIGNED` is the
 * entries with no assignments at all; anything else is a method id, and matches
 * an entry assigned to **any** stage of it — which is what the chip says, and
 * what makes one chip per method enough for a library that will mostly hold four
 * or five algorithms per stage.
 */
export const filterAlgorithms = (algorithms, methodId) => {
  const list = algorithms || [];
  if (methodId == null) return list;

  if (methodId === UNASSIGNED) {
    return list.filter((entry) => (entry.assignments || []).length === 0);
  }

  return list.filter((entry) =>
    (entry.assignments || []).some((assignment) => assignment.method === methodId)
  );
};

/**
 * The chips over a library: `All · N`, one per method that has anything assigned
 * to it, and `Unassigned` when there is anything unassigned.
 *
 * **A chip is only offered when it leads somewhere.** A `CFOP` chip over a
 * library with no CFOP algorithms in it is a control whose only outcome is an
 * empty list, and the operator has to tap it to find that out; the counts are on
 * the chips for the same reason, so the answer is readable before the tap.
 *
 * Derived on every render and stored nowhere, the same discipline `orderCards`
 * applies to "in progress" (`solveCards.js`). A count kept beside the library
 * would be a second thing to keep honest on every edit.
 *
 * Ordered by the catalogue rather than by count, so the chips do not reorder
 * themselves under the thumb as entries are assigned.
 *
 * @returns {Array<{id: string|null, label: string, count: number}>}
 */
export const algorithmFilters = (algorithms) => {
  const list = algorithms || [];
  const chips = [{ id: null, label: ALL_LABEL, count: list.length }];

  METHODS.forEach((method) => {
    const count = filterAlgorithms(list, method.id).length;
    if (count > 0) chips.push({ id: method.id, label: method.name, count });
  });

  const loose = filterAlgorithms(list, UNASSIGNED).length;
  if (loose > 0) chips.push({ id: UNASSIGNED, label: UNASSIGNED_LABEL, count: loose });

  return chips;
};

/** A filter that no longer has a chip is the `All` chip — the entry that was the
 *  only Roux one has just been unassigned, and a screen left holding a dead
 *  filter would show an empty library and no way out of it. */
export const liveFilter = (chips, methodId) =>
  (chips || []).some((chip) => chip.id === methodId) ? methodId : null;

/** `"8 moves"` — what the entry screen says under the moves. `describeSolve`
 *  says the same thing about a solve, and this one has no "no moves yet" branch
 *  because an entry with no moves does not exist. */
export const describeAlgorithmSize = (algorithm) => {
  const count = moveCount(algorithm && algorithm.moves);
  return count === 1 ? '1 move' : `${count} moves`;
};

// ——— Storage ————————————————————————————————————————————————————————————

/**
 * Drop anything that is not an algorithm, and make what is left safe to open.
 *
 * Storage is the boundary where a file written by an older build — or a newer
 * one, or a corrupt one — comes back in, so this filters rather than trusts.
 * **An entry whose moves no longer parse goes**, for the reason a favorite that
 * no longer parses goes: there is nothing left of it to show, and the moves are
 * the entry.
 *
 * Everything else is repaired rather than dropped, because everything else is
 * recoverable: an id that is missing or duplicated is re-minted (two rows with
 * one id is a list that opens the wrong entry), a name that clashes is
 * suffixed, an assignment naming an unknown method or stage is dropped while the
 * entry keeps the assignments that are real, and notes that are not a string
 * become none.
 *
 * A pre-Step-1 file has no `algorithms` key and this returns `[]`, which is the
 * truth rather than a migration.
 */
export const sanitizeAlgorithms = (raw) => {
  if (!Array.isArray(raw)) return [];

  const clean = [];
  const usedIds = new Set();
  const taken = new Set();

  raw.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;

    const moves = normalizeAlg(entry.moves);
    if (moves.length === 0 || !isValidAlg(moves)) return;

    const wanted = normalizeAlgName(entry.name);
    const name = uniqueName(
      wanted.length > 0 ? wanted : normalizeAlgName(`Algorithm ${taken.size + 1}`),
      taken
    );
    taken.add(name);

    const id =
      typeof entry.id === 'string' && entry.id.length > 0 && !usedIds.has(entry.id)
        ? entry.id
        : nextAlgorithmId([...usedIds].map((used) => ({ id: used })));
    usedIds.add(id);

    const savedAt = Number.isFinite(entry.savedAt) ? entry.savedAt : 0;

    clean.push({
      id,
      name,
      moves,
      setup: isValidAlg(normalizeAlg(entry.setup)) ? normalizeAlg(entry.setup) : '',
      case: sanitizeCase(entry.case),
      assignments: sanitizeAssignments(entry.assignments),
      notes: normalizeNotes(entry.notes),
      savedAt,
      editedAt: Number.isFinite(entry.editedAt) ? entry.editedAt : savedAt,
    });
  });

  return clean.slice(0, MAX_ALGORITHMS);
};

export default {
  MAX_ALGORITHMS,
  MAX_ALG_NAME,
  MAX_ALG_NOTES,
  MAX_ASSIGNMENTS,
  UNASSIGNED,
  normalizeAlgName,
  algorithmCase,
  findAlgorithm,
  nextAlgorithmId,
  defaultAlgorithmName,
  sanitizeAssignments,
  hasAssignment,
  toggleAssignment,
  describeAssignment,
  createAlgorithm,
  editAlgorithm,
  removeAlgorithm,
  searchAlgorithms,
  filterAlgorithms,
  algorithmFilters,
  liveFilter,
  describeAlgorithmSize,
  sanitizeAlgorithms,
};
