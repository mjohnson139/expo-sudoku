import {
  HISTORY_LIMIT,
  canRedo,
  canUndo,
  createHistory,
  historyKeyMode,
  pushHistory,
  redoHistory,
  replaceHistory,
  undoHistory,
} from '../history';

const snap = (alg, phases = []) => ({ alg, phases });

describe('solve history', () => {
  test('undo and redo restore alg and phases atomically', () => {
    const start = createHistory(snap('R'));
    const marked = pushHistory(start, snap('R U', [{ at: 2, label: 'First block' }]));
    expect(undoHistory(marked).present).toEqual(snap('R'));
    expect(redoHistory(undoHistory(marked)).present).toEqual(marked.present);
  });

  test('a fresh edit after undo drops redo', () => {
    const history = pushHistory(pushHistory(createHistory(snap('')), snap('R')), snap('R U'));
    const undone = undoHistory(history);
    expect(canRedo(undone)).toBe(true);
    const branched = pushHistory(undone, snap('R F'));
    expect(canRedo(branched)).toBe(false);
    expect(branched.present.alg).toBe('R F');
  });

  test('the ring is bounded', () => {
    let history = createHistory(snap('0'));
    for (let index = 1; index <= HISTORY_LIMIT + 8; index += 1) {
      history = pushHistory(history, snap(String(index)));
    }
    expect(history.past).toHaveLength(HISTORY_LIMIT);
    expect(history.past[0]).toEqual(snap('8'));
  });

  test('a settled gesture tidy replaces its raw action', () => {
    const first = pushHistory(createHistory(snap('')), snap('F'));
    const folded = replaceHistory(first, snap('F2'));
    expect(canUndo(folded)).toBe(true);
    expect(undoHistory(folded).present).toEqual(snap(''));

    const cancelled = replaceHistory(first, snap(''));
    expect(canUndo(cancelled)).toBe(false);
    expect(canRedo(cancelled)).toBe(false);
  });
});

describe('the pad history key', () => {
  test.each([
    [{ undo: true, moves: true }, 'undo'],
    [{ undo: false, moves: true }, 'backspace'],
    [{ undo: false, moves: false }, 'disabled'],
  ])('chooses %s as %s', (state, expected) => {
    expect(historyKeyMode(state)).toBe(expected);
  });
});
