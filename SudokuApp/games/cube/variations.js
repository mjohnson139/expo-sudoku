import { moveCount, tokenize } from './moves';
import { clampPhases, phaseSpans, withMoves } from './solveList';

const join = (tokens) => tokens.join(' ');

export const nextVariationId = (variations) => {
  let highest = 0;
  (variations || []).forEach(({ id } = {}) => {
    const match = /^v(\d+)$/.exec(id || '');
    if (match) highest = Math.max(highest, Number(match[1]));
  });
  return `v${highest + 1}`;
};

export const variationsAt = (variations, phaseAt) =>
  (variations || []).filter((variation) => variation.phaseAt === phaseAt);

const spanAt = (solve, phaseAt) =>
  phaseSpans(solve.phases, moveCount(solve.alg)).find((span) => span.at === phaseAt) || null;

const rebaseVariations = (variations, from, delta) =>
  (variations || []).map((variation) => ({
    ...variation,
    phaseAt: variation.phaseAt > from ? variation.phaseAt + delta : variation.phaseAt,
  }));

/** Stash the selected stage and remove it from the flat active algorithm. */
export const fork = (solve, phaseAt, { savedAt = Date.now() } = {}) => {
  const span = spanAt(solve, phaseAt);
  if (!span || !span.label || span.count <= 0) return null;
  const tokens = tokenize(solve.alg);
  const run = join(tokens.slice(span.at, span.end));
  const alg = join([...tokens.slice(0, span.at), ...tokens.slice(span.end)]);
  const delta = -span.count;
  const phases = clampPhases(
    solve.phases.map((phase) => ({
      at: phase.at > span.at ? Math.max(span.at, phase.at + delta) : phase.at,
      label: phase.at === span.at ? '' : phase.label,
    })),
    moveCount(alg)
  );
  const existing = solve.variations || [];
  const variations = rebaseVariations(existing, span.at, delta).concat({
    id: nextVariationId(existing), phaseAt: span.at, alg: run, savedAt,
  });
  return { ...withMoves({ ...solve, phases }, alg), variations };
};

/** Replace the active run at a marker with a stored one, keeping the displaced run. */
export const switchVariation = (
  solve,
  variationId,
  { label = '', savedAt = Date.now() } = {}
) => {
  const target = (solve.variations || []).find((item) => item.id === variationId);
  if (!target) return null;
  const span = spanAt(solve, target.phaseAt);
  if (!span) return null;
  const tokens = tokenize(solve.alg);
  const chosen = tokenize(target.alg);
  const active = join(tokens.slice(span.at, span.end));
  const alg = join([...tokens.slice(0, span.at), ...chosen, ...tokens.slice(span.end)]);
  const delta = chosen.length - span.count;
  const shiftedPhases = solve.phases.map((phase) => ({
      at: phase.at > span.at ? phase.at + delta : phase.at,
      label: phase.at === span.at && label ? label : phase.label,
    }));
  const chosenEnd = span.at + chosen.length;
  if (label && !shiftedPhases.some((phase) => phase.at === chosenEnd)) {
    shiftedPhases.push({ at: chosenEnd, label: '' });
  }
  const phases = clampPhases(
    shiftedPhases,
    moveCount(alg)
  );
  let variations = (solve.variations || [])
    .filter((item) => item.id !== variationId)
    .map((item) => ({ ...item, phaseAt: item.phaseAt > span.at ? item.phaseAt + delta : item.phaseAt }));
  if (active) {
    variations = variations.concat({
      id: nextVariationId(solve.variations), phaseAt: span.at, alg: active, savedAt,
    });
  }
  return { ...withMoves({ ...solve, phases }, alg), variations };
};

/** Shortest stored run; creation order, then id, is the deterministic tie break. */
export const best = (variations, phaseAt) =>
  variationsAt(variations, phaseAt).reduce((winner, item) => {
    if (!winner) return item;
    const count = moveCount(item.alg);
    const winningCount = moveCount(winner.alg);
    if (count !== winningCount) return count < winningCount ? item : winner;
    if (item.savedAt !== winner.savedAt) return item.savedAt < winner.savedAt ? item : winner;
    return item.id < winner.id ? item : winner;
  }, null);

export default { best, fork, switchVariation, variationsAt };
