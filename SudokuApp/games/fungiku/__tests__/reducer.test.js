import {
  DEFAULT_SEED,
  FUNGIKU_ACTIONS,
  buildPuzzleState,
  createInitialFungikuState,
  fungikuReducer,
  selectCanRedo,
  selectCanUndo,
  selectConflicts,
  selectIsSolved,
  selectMushroomCount,
} from '../reducer';
import { MARKS, MIN_SIZE, createEmptyMarks } from '../engine';

const cycle = (state, cell) =>
  fungikuReducer(state, { type: FUNGIKU_ACTIONS.CYCLE_CELL, payload: { cell } });

/** Tap a cell twice: empty -> X -> mushroom. */
const placeMushroom = (state, cell) => cycle(cycle(state, cell), cell);

/** Place the puzzle's own solution, so the board is legally complete. */
const solve = (state) =>
  state.solution.reduce((acc, col, row) => placeMushroom(acc, row * state.size + col), state);

describe('buildPuzzleState', () => {
  it('starts an empty board of the right shape', () => {
    const state = buildPuzzleState({ size: 5, seed: 1 });

    expect(state.size).toBe(5);
    expect(state.seed).toBe(1);
    expect(state.marks).toHaveLength(25);
    expect(state.marks.every((mark) => mark === MARKS.EMPTY)).toBe(true);
    expect(state.regions).toHaveLength(25);
    expect(state.solution).toHaveLength(5);
    expect(state.undoStack).toEqual([]);
    expect(state.redoStack).toEqual([]);
  });

  it('defaults to the smallest board', () => {
    const state = createInitialFungikuState();
    expect(state.size).toBe(MIN_SIZE);
    expect(state.seed).toBe(DEFAULT_SEED);
  });

  it('is deterministic: same size and seed rebuilds the same puzzle', () => {
    const a = buildPuzzleState({ size: 6, seed: 42 });
    const b = buildPuzzleState({ size: 6, seed: 42 });

    expect(b.regions).toEqual(a.regions);
    expect(b.solution).toEqual(a.solution);
  });

  it('adopts restored marks that match the board', () => {
    const marks = createEmptyMarks(5);
    marks[7] = MARKS.MUSHROOM;

    expect(buildPuzzleState({ size: 5, seed: 1, marks }).marks[7]).toBe(MARKS.MUSHROOM);
  });

  it('discards restored marks of the wrong length rather than rendering them', () => {
    const state = buildPuzzleState({ size: 5, seed: 1, marks: [MARKS.MUSHROOM, MARKS.X] });

    expect(state.marks).toHaveLength(25);
    expect(state.marks.every((mark) => mark === MARKS.EMPTY)).toBe(true);
  });

  it('rejects a board smaller than the engine supports', () => {
    expect(() => buildPuzzleState({ size: 4, seed: 1 })).toThrow(/size/i);
  });
});

describe('cycling marks', () => {
  const initial = buildPuzzleState({ size: 5, seed: 1 });

  it('cycles empty -> X -> mushroom -> empty', () => {
    const afterOne = cycle(initial, 0);
    expect(afterOne.marks[0]).toBe(MARKS.X);

    const afterTwo = cycle(afterOne, 0);
    expect(afterTwo.marks[0]).toBe(MARKS.MUSHROOM);

    const afterThree = cycle(afterTwo, 0);
    expect(afterThree.marks[0]).toBe(MARKS.EMPTY);
  });

  it('does not mutate the previous state', () => {
    const next = cycle(initial, 3);

    expect(initial.marks[3]).toBe(MARKS.EMPTY);
    expect(next.marks[3]).toBe(MARKS.X);
  });

  it('ignores taps outside the board', () => {
    expect(cycle(initial, -1)).toBe(initial);
    expect(cycle(initial, 25)).toBe(initial);
    expect(cycle(initial, 1.5)).toBe(initial);
  });

  it('allows a conflicting placement and reports the conflict', () => {
    // Two mushrooms in row 0 break one-per-row.
    const state = placeMushroom(placeMushroom(initial, 0), 3);

    expect(state.marks[0]).toBe(MARKS.MUSHROOM);
    expect(state.marks[3]).toBe(MARKS.MUSHROOM);
    expect([...selectConflicts(state)].sort((a, b) => a - b)).toEqual([0, 3]);
  });
});

describe('the mushroom counter', () => {
  const initial = buildPuzzleState({ size: 5, seed: 1 });

  it('counts only mushrooms, never X marks', () => {
    const withXs = cycle(cycle(initial, 1), 2); // two cells left on X
    expect(selectMushroomCount(withXs)).toBe(0);

    const withOne = placeMushroom(withXs, 10);
    expect(selectMushroomCount(withOne)).toBe(1);
  });
});

describe('win detection', () => {
  const initial = buildPuzzleState({ size: 5, seed: 1 });

  it('is not won on an empty board', () => {
    expect(selectIsSolved(initial)).toBe(false);
  });

  it('is won when the solution is placed', () => {
    const state = solve(initial);

    expect(selectMushroomCount(state)).toBe(5);
    expect(selectConflicts(state).size).toBe(0);
    expect(selectIsSolved(state)).toBe(true);
  });

  it('is still won with X marks scattered around (X is only an aid)', () => {
    let state = solve(initial);
    const solutionCells = new Set(state.solution.map((col, row) => row * state.size + col));

    // Put an X on every cell that isn't holding a mushroom.
    state.marks.forEach((_, cell) => {
      if (!solutionCells.has(cell)) state = cycle(state, cell);
    });

    expect(state.marks.filter((mark) => mark === MARKS.X)).toHaveLength(20);
    expect(selectIsSolved(state)).toBe(true);
  });

  it('is not won by a board full of X marks and no mushrooms', () => {
    const state = initial.marks.reduce((acc, _, cell) => cycle(acc, cell), initial);

    expect(state.marks.every((mark) => mark === MARKS.X)).toBe(true);
    expect(selectIsSolved(state)).toBe(false);
  });

  it('is not won by N mushrooms placed illegally', () => {
    // Fill row 0 and row 2 badly: right count, wrong placement.
    let state = initial;
    for (let col = 0; col < 5; col++) {
      state = placeMushroom(state, col);
    }

    expect(selectMushroomCount(state)).toBe(5);
    expect(selectIsSolved(state)).toBe(false);
  });

  it('stops being won as soon as a mushroom is removed', () => {
    const solved = solve(initial);
    const firstMushroom = solved.marks.findIndex((mark) => mark === MARKS.MUSHROOM);

    expect(selectIsSolved(cycle(solved, firstMushroom))).toBe(false);
  });
});

describe('undo and redo', () => {
  const initial = buildPuzzleState({ size: 5, seed: 1 });
  const undo = (state) => fungikuReducer(state, { type: FUNGIKU_ACTIONS.UNDO });
  const redo = (state) => fungikuReducer(state, { type: FUNGIKU_ACTIONS.REDO });

  it('does nothing on an empty history', () => {
    expect(selectCanUndo(initial)).toBe(false);
    expect(selectCanRedo(initial)).toBe(false);
    expect(undo(initial)).toBe(initial);
    expect(redo(initial)).toBe(initial);
  });

  it('walks back and forward through taps', () => {
    const placed = placeMushroom(initial, 4);
    expect(placed.marks[4]).toBe(MARKS.MUSHROOM);

    const back = undo(placed);
    expect(back.marks[4]).toBe(MARKS.X);
    expect(selectCanRedo(back)).toBe(true);

    const backAgain = undo(back);
    expect(backAgain.marks[4]).toBe(MARKS.EMPTY);
    expect(selectCanUndo(backAgain)).toBe(false);

    expect(redo(redo(backAgain)).marks[4]).toBe(MARKS.MUSHROOM);
  });

  it('drops the redo stack once a new tap lands', () => {
    const back = undo(placeMushroom(initial, 4));
    expect(selectCanRedo(back)).toBe(true);

    expect(selectCanRedo(cycle(back, 9))).toBe(false);
  });

  it('keeps derived conflicts in step with an undo', () => {
    const conflicting = placeMushroom(placeMushroom(initial, 0), 3);
    expect(selectConflicts(conflicting).size).toBe(2);

    // Undo takes cell 3 back to X, so nothing conflicts any more.
    const back = undo(conflicting);
    expect(selectConflicts(back).size).toBe(0);
  });

  it('undoes a win back to an unsolved board', () => {
    const solved = solve(initial);
    expect(selectIsSolved(undo(solved))).toBe(false);
  });
});

describe('clearing the board', () => {
  const initial = buildPuzzleState({ size: 5, seed: 1 });
  const clear = (state) => fungikuReducer(state, { type: FUNGIKU_ACTIONS.CLEAR_MARKS });

  it('empties every mark in one undoable step', () => {
    const played = placeMushroom(cycle(initial, 1), 7);
    const cleared = clear(played);

    expect(cleared.marks.every((mark) => mark === MARKS.EMPTY)).toBe(true);

    const back = fungikuReducer(cleared, { type: FUNGIKU_ACTIONS.UNDO });
    expect(back.marks).toEqual(played.marks);
  });

  it('is a no-op on an already empty board', () => {
    expect(clear(initial)).toBe(initial);
  });
});

describe('starting another puzzle', () => {
  it('replaces the board and forgets the history', () => {
    const played = placeMushroom(buildPuzzleState({ size: 5, seed: 1 }), 0);

    const next = fungikuReducer(played, {
      type: FUNGIKU_ACTIONS.NEW_PUZZLE,
      payload: buildPuzzleState({ size: 6, seed: 2 }),
    });

    expect(next.size).toBe(6);
    expect(next.seed).toBe(2);
    expect(next.marks).toHaveLength(36);
    expect(next.marks.every((mark) => mark === MARKS.EMPTY)).toBe(true);
    expect(selectCanUndo(next)).toBe(false);
    expect(selectCanRedo(next)).toBe(false);
  });

  it('restores a saved board through the same path', () => {
    const marks = createEmptyMarks(5);
    marks[12] = MARKS.MUSHROOM;

    const restored = fungikuReducer(createInitialFungikuState(), {
      type: FUNGIKU_ACTIONS.RESTORE_SAVED_GAME,
      payload: buildPuzzleState({ size: 5, seed: 9, marks }),
    });

    expect(restored.seed).toBe(9);
    expect(restored.marks[12]).toBe(MARKS.MUSHROOM);
    expect(selectMushroomCount(restored)).toBe(1);
  });
});

describe('unknown actions', () => {
  it('leave state untouched', () => {
    const state = createInitialFungikuState();
    expect(fungikuReducer(state, { type: 'NOPE' })).toBe(state);
  });
});
