import { moveCount, tokenize } from './moves';
import { clampPhases, phaseSpans, withMoves } from './solveList';

const join = (tokens) => tokens.join(' ');

const walkIds = (variations, visit) =>
  (variations || []).forEach((variation) => {
    visit(variation.id);
    walkIds(variation.variations, visit);
  });

export const nextVariationId = (variations) => {
  let highest = 0;
  walkIds(variations, (id) => {
    const match = /^v(\d+)$/.exec(id || '');
    if (match) highest = Math.max(highest, Number(match[1]));
  });
  return `v${highest + 1}`;
};

export const variationsAt = (variations, phaseAt) =>
  (variations || []).filter((variation) => variation.phaseAt === phaseAt);

/** A branch stores its continuation and all of the markers below the fork. */
const branchFrom = (solve, phaseAt) => ({
  alg: join(tokenize(solve.alg).slice(phaseAt)),
  phases: (solve.phases || [])
    .filter((phase) => phase.at >= phaseAt)
    .map((phase) => ({ ...phase, at: phase.at - phaseAt })),
  variations: (solve.variations || [])
    .filter((variation) => variation.phaseAt > phaseAt)
    .map((variation) => ({ ...variation, phaseAt: variation.phaseAt - phaseAt })),
});

const stageCount = (variation) => {
  const total = moveCount(variation.alg);
  const phases = variation.phases || [];
  const next = phases.find((phase) => phase.at > 0);
  return next ? next.at : total;
};

/**
 * Start a new branch at a locked stage.
 *
 * Everything from the selected marker onward belongs to the old branch. The
 * active solve is truncated to the shared prefix, rather than deleting one span
 * and accidentally leaving later-stage moves behind as the retry's first moves.
 */
export const fork = (solve, phaseAt, { savedAt = Date.now() } = {}) => {
  const span = phaseSpans(solve.phases, moveCount(solve.alg)).find(
    (candidate) => candidate.at === phaseAt
  );
  if (!span || !span.label || span.count <= 0) return null;

  const snapshot = branchFrom(solve, phaseAt);
  const existing = solve.variations || [];
  const prefixVariations = existing.filter((variation) => variation.phaseAt <= phaseAt);
  const alg = join(tokenize(solve.alg).slice(0, phaseAt));
  const phases = clampPhases(
    [
      ...(solve.phases || []).filter((phase) => phase.at < phaseAt),
      { at: phaseAt, label: '' },
    ],
    moveCount(alg)
  );
  const variations = prefixVariations.concat({
    id: nextVariationId(existing),
    phaseAt,
    ...snapshot,
    savedAt,
  });
  return { ...withMoves({ ...solve, phases }, alg), variations };
};

/** Select a branch, stashing the entire displaced continuation beside it. */
export const switchVariation = (
  solve,
  variationId,
  { label = '', savedAt = Date.now() } = {}
) => {
  const existing = solve.variations || [];
  const target = existing.find((variation) => variation.id === variationId);
  if (!target) return null;
  const phaseAt = target.phaseAt;
  if (!(solve.phases || []).some((phase) => phase.at === phaseAt)) return null;

  const active = branchFrom(solve, phaseAt);
  const prefix = tokenize(solve.alg).slice(0, phaseAt);
  const chosen = tokenize(target.alg);
  const alg = join([...prefix, ...chosen]);
  const restoredPhases = (target.phases && target.phases.length > 0
    ? target.phases
    : [{ at: 0, label }, { at: chosen.length, label: '' }]
  ).map((phase) => ({ ...phase, at: phase.at + phaseAt }));
  const phases = clampPhases(
    [
      ...(solve.phases || []).filter((phase) => phase.at < phaseAt),
      ...restoredPhases,
    ],
    moveCount(alg)
  );

  const siblings = existing.filter(
    (variation) => variation.id !== variationId && variation.phaseAt <= phaseAt
  );
  let variations = siblings.concat(
    (target.variations || []).map((variation) => ({
      ...variation,
      phaseAt: variation.phaseAt + phaseAt,
    }))
  );
  if (active.alg) {
    variations.push({
      id: nextVariationId(existing),
      phaseAt,
      ...active,
      savedAt,
    });
  }
  return { ...withMoves({ ...solve, phases }, alg), variations };
};

/** Shortest stage run; creation time, then id, is the deterministic tie break. */
export const best = (variations, phaseAt) =>
  variationsAt(variations, phaseAt).reduce((winner, item) => {
    if (!winner) return item;
    const count = stageCount(item);
    const winningCount = stageCount(winner);
    if (count !== winningCount) return count < winningCount ? item : winner;
    if (item.savedAt !== winner.savedAt) return item.savedAt < winner.savedAt ? item : winner;
    return item.id < winner.id ? item : winner;
  }, null);

export const variationStageCount = stageCount;

export default { best, fork, switchVariation, variationStageCount, variationsAt };
