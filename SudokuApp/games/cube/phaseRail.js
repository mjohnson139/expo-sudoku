import { stagesOf } from './methods';
import { moveCount } from './moves';
import { phaseSpans } from './solveList';

/** Presentation and editability for the scrubber-positioned method rail. */
export const railStates = (method, phases, alg, cursor = moveCount(alg)) => {
  const stages = stagesOf(method);
  const total = moveCount(alg);
  const spans = phaseSpans(phases, total);
  const byLabel = new Map(spans.filter((span) => span.label).map((span) => [span.label, span]));

  let markedPrefix = 0;
  while (markedPrefix < stages.length && byLabel.has(stages[markedPrefix])) markedPrefix += 1;

  return stages.map((stage, index) => {
    const span = byLabel.get(stage);
    const predecessor = index === 0 ? 0 : byLabel.get(stages[index - 1])?.end;
    const successor = byLabel.get(stages[index + 1])?.end;
    const available =
      index <= markedPrefix &&
      predecessor != null &&
      Number.isInteger(cursor) &&
      cursor > predecessor &&
      cursor <= total &&
      (successor == null || cursor < successor);

    return {
      stage,
      state: span ? 'marked' : available ? 'unmarked' : 'unavailable',
      count: span ? span.count : null,
      atCursor: Boolean(span && span.end === cursor),
      available,
    };
  });
};

export default { railStates };
