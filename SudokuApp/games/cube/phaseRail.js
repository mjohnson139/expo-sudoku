import { stagesOf } from './methods';
import { moveCount } from './moves';
import { openPhaseStart, phaseSpans } from './solveList';

/**
 * Derive the method rail from the solve itself. Nothing displayed here is
 * stored: markers remain the phase source of truth and the live count follows
 * the current algorithm, including a deferred gesture fold or cancellation.
 */
export const railStates = (method, phases, alg) => {
  const stages = stagesOf(method);
  const total = moveCount(alg);
  const spans = phaseSpans(phases, total);
  const locked = new Map(
    spans.filter((span) => span.label.length > 0).map((span) => [span.label, span.count])
  );
  const firstOpen = stages.findIndex((stage) => !locked.has(stage));
  const liveCount = Math.max(0, total - openPhaseStart(phases, total));

  return stages.map((stage, index) => {
    if (locked.has(stage)) return { stage, state: 'locked', count: locked.get(stage) };
    if (index === firstOpen) return { stage, state: 'open', count: liveCount };
    return { stage, state: 'upcoming', count: null };
  });
};

export default { railStates };
