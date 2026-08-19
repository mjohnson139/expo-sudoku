import { stagesOf } from './methods';
import { moveCount } from './moves';
import { phaseSpans } from './solveList';

/**
 * Derive the method rail from the solve itself. Nothing displayed here is
 * stored: markers remain the phase source of truth and the live count follows
 * the current algorithm, including a deferred gesture fold or cancellation.
 */
export const railStates = (method, phases, alg) => {
  const stages = stagesOf(method);
  const total = moveCount(alg);
  const named = phaseSpans(phases, total).filter((span) => span.label.length > 0);

  // A method is a sequence, not a checklist. Only the consecutive prefix of
  // markers that matches its stages is complete: an old/out-of-order marker
  // for Second block must never unlock it ahead of First block.
  let lockedCount = 0;
  while (
    lockedCount < stages.length &&
    lockedCount < named.length &&
    named[lockedCount].label === stages[lockedCount]
  ) {
    lockedCount += 1;
  }

  // The previous locked span ends at the divider `endPhase` wrote. Measuring
  // from that boundary makes the newly opened stage start at 0 immediately,
  // before its first move, rather than briefly inheriting the prior count.
  const openStart = lockedCount > 0 ? named[lockedCount - 1].end : 0;
  const liveCount = Math.max(0, total - openStart);

  return stages.map((stage, index) => {
    if (index < lockedCount) {
      return { stage, state: 'locked', count: named[index].count, at: named[index].at };
    }
    if (index === lockedCount) return { stage, state: 'open', count: liveCount, at: openStart };
    return { stage, state: 'upcoming', count: null };
  });
};

export default { railStates };
