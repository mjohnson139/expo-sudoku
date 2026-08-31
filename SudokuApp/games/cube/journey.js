import { METHODS } from './methods';

export const DEMOS_REQUIRED = 3;
export const PRESET_JOURNEY_ORDER = Object.freeze(['beginner-lbl', 'cfop', 'roux']);

/** Presets have an authored learning order. Variants remain beside the method
 * they came from; orphans are retained, honestly, at the end. */
export const orderJourneyMethods = (catalogue) => {
  const list = catalogue || [];
  const presets = PRESET_JOURNEY_ORDER.map((id) => list.find((method) => method.id === id)).filter(Boolean);
  const users = list.filter((method) => !METHODS.some((preset) => preset.id === method.id));
  const children = new Map();
  users.forEach((method) => {
    if (!children.has(method.from)) children.set(method.from, []);
    children.get(method.from).push(method);
  });
  const result = [];
  const placed = new Set();
  const append = (method) => {
    if (!method || placed.has(method.id)) return;
    placed.add(method.id);
    result.push(method);
    (children.get(method.id) || []).forEach(append);
  };
  presets.forEach(append);
  // Preserve any unknown presets and corrupt/missing-source variants rather
  // than silently losing authored work from the journey.
  list.forEach(append);
  return result;
};

/** One solve can demonstrate a stage only once, even if corrupt data contains
 * duplicate markers. `null` is an honest user-stage lock; `false` is a failed
 * shipped check. */
export const demonstrationCounts = (catalogue, checks) => {
  const ids = new Set((catalogue || []).map((method) => method.id));
  const counts = new Map();
  (checks || []).forEach((checked) => {
    if (!ids.has(checked.method)) return;
    const seen = new Set();
    (checked.results || []).forEach(({ label, result }) => {
      if (seen.has(label) || (result !== true && result !== null)) return;
      seen.add(label);
      const key = `${checked.method}\u0000${label}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
  });
  return counts;
};

const gateCopy = (target, prerequisite, count) => {
  const remaining = Math.max(0, DEMOS_REQUIRED - count);
  return `${target} unlocks after ${remaining} more ${prerequisite} ${remaining === 1 ? 'lock' : 'locks'} — ${count} of ${DEMOS_REQUIRED} done`;
};

export const projectJourney = (catalogue, checks) => {
  const ordered = orderJourneyMethods(catalogue);
  const counts = demonstrationCounts(ordered, checks);
  let priorMethodDone = true;
  return ordered.map((method) => {
    let priorStageDone = true;
    const stages = method.stages.map((name, index) => {
      const count = counts.get(`${method.id}\u0000${name}`) || 0;
      const done = count >= DEMOS_REQUIRED;
      const state = done ? 'done' : priorMethodDone && priorStageDone ? 'open' : 'locked';
      const prerequisite = index > 0 ? method.stages[index - 1] : null;
      const prerequisiteCount = prerequisite ? counts.get(`${method.id}\u0000${prerequisite}`) || 0 : 0;
      const gate = state === 'locked' && prerequisite
        ? gateCopy(name, prerequisite, prerequisiteCount)
        : null;
      priorStageDone = priorStageDone && done;
      return { name, count, state, gate };
    });
    const done = stages.length > 0 && stages.every((stage) => stage.state === 'done');
    const state = done ? 'done' : priorMethodDone ? 'open' : 'locked';
    let gate = stages.find((stage) => stage.gate)?.gate || null;
    if (state === 'locked') {
      const previous = ordered[ordered.indexOf(method) - 1];
      const last = previous && previous.stages[previous.stages.length - 1];
      const count = last ? counts.get(`${previous.id}\u0000${last}`) || 0 : 0;
      gate = previous && last ? gateCopy(method.name, `${previous.name} ${last}`, count) : null;
    }
    priorMethodDone = priorMethodDone && done;
    return { ...method, user: !METHODS.some((preset) => preset.id === method.id), state, stages, gate };
  });
};

export default { DEMOS_REQUIRED, orderJourneyMethods, demonstrationCounts, projectJourney };
