export const HISTORY_LIMIT = 50;

const sameSnapshot = (left, right) =>
  left.alg === right.alg && JSON.stringify(left.phases) === JSON.stringify(right.phases);

export const snapshotOf = (solve) => ({
  alg: solve ? solve.alg : '',
  phases: solve ? solve.phases : [],
});

export const createHistory = (present) => ({ past: [], present, future: [] });

export const pushHistory = (history, next) => {
  if (sameSnapshot(history.present, next)) return history;
  return {
    past: [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: next,
    future: [],
  };
};

// Replace the last authored action. Gesture storage tidies use this so F F → F2
// is one action and L L' disappearing cannot be resurrected from redo.
export const replaceHistory = (history, next) => {
  if (sameSnapshot(history.present, next)) return history;
  const previous = history.past[history.past.length - 1];
  if (previous && sameSnapshot(previous, next)) {
    return { past: history.past.slice(0, -1), present: next, future: [] };
  }
  return { ...history, present: next, future: [] };
};

export const undoHistory = (history) => {
  if (history.past.length === 0) return history;
  return {
    past: history.past.slice(0, -1),
    present: history.past[history.past.length - 1],
    future: [history.present, ...history.future],
  };
};

export const redoHistory = (history) => {
  if (history.future.length === 0) return history;
  return {
    past: [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: history.future[0],
    future: history.future.slice(1),
  };
};

export const canUndo = (history) => history.past.length > 0;
export const canRedo = (history) => history.future.length > 0;
