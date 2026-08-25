import { MAX_ALGORITHMS } from './algorithms';
import { moveCount, normalizeAlg, parseAlg } from './moves';
import { clampAlgorithmRuns, phaseSpans } from './solveList';

/** Normalize two tapped, zero-based token indexes into an inclusive range. */
export const normalizeRunRange = (first, last, count) => {
  if (!Number.isInteger(first) || !Number.isInteger(last) || count <= 0) return null;
  const start = Math.max(0, Math.min(first, last));
  const end = Math.min(count - 1, Math.max(first, last));
  return start <= end ? { start, end } : null;
};

/** Derive the library record represented by a selected run. */
export const tagRun = ({ alg, phases, method, scramble, orientation, first, last }) => {
  const tokens = parseAlg(alg || '').map((move) => move.token);
  const range = normalizeRunRange(first, last, tokens.length);
  if (!range) return { error: 'Choose a first and last move.' };

  const spans = phaseSpans(phases, tokens.length);
  const span = spans.find(({ at, end }) => range.start >= at && range.end < end);
  if (spans.length > 0 && !span) {
    return { error: 'Choose moves from one phase only.' };
  }

  const prefix = tokens.slice(0, range.start).join(' ');
  return {
    range,
    moves: normalizeAlg(tokens.slice(range.start, range.end + 1).join(' ')),
    setup: normalizeAlg([scramble, orientation, prefix].filter(Boolean).join(' ')),
    assignments: method && span && span.label ? [{ method, stage: span.label }] : [],
  };
};

/** Append only performed moves. An entry's setup is intentionally ignored. */
export const applyAlgorithm = (solveAlg, entry) =>
  normalizeAlg([solveAlg, entry && entry.moves].filter(Boolean).join(' '));

/** Put current method/stage matches first without hiding anything else. */
export const orderAlgorithmPicker = (algorithms, method, stage) => {
  const matches = (entry) => Boolean(method && stage && (entry.assignments || [])
    .some((assignment) => assignment.method === method && assignment.stage === stage));
  return [...(algorithms || [])].sort((a, b) => Number(matches(b)) - Number(matches(a)));
};

export const libraryState = (algorithms) => ({
  empty: !algorithms || algorithms.length === 0,
  full: Boolean(algorithms && algorithms.length >= MAX_ALGORITHMS),
  canApply: Boolean(algorithms && algorithms.length > 0),
  canSave: !algorithms || algorithms.length < MAX_ALGORITHMS,
});

/** Add a named, persisted annotation without changing one move of the solve. */
export const addAlgorithmRun = (solve, entry, at, end) => ({
  algorithmRuns: clampAlgorithmRuns([
    ...((solve && solve.algorithmRuns) || []),
    { at, end, algorithmId: entry.id || null, name: entry.name },
  ], moveCount((solve && solve.alg) || '')),
});
