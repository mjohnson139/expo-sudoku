import {
  DEFAULT_SEED,
  FUNGIKU_ACTIONS,
  HINT_KINDS,
  MAX_LIVES,
  PAINT_MODES,
  buildPuzzleState,
  createInitialFungikuState,
  fungikuReducer,
  selectCanRedo,
  selectCanUndo,
  selectHintIsChargeable,
  selectIsSolved,
  selectLives,
  selectMistakeCells,
  selectMushroomCount,
  selectRevealCell,
  selectRuleOutCells,
  resolvePuzzleIdentity,
} from '../reducer';
import { MARKS, MIN_SIZE, createEmptyMarks, findConflicts } from '../engine';
import { DEFAULT_DIFFICULTY, sizesForDifficulty } from '../difficulty';

/** One tap: rule a blank cell out, or clear a filled one (plan §14.2). */
const tap = (state, cell) =>
  fungikuReducer(state, { type: FUNGIKU_ACTIONS.TAP_CELL, payload: { cell } });

/** The second half of a double-tap on its own — also the accessibility path. */
const place = (state, cell) =>
  fungikuReducer(state, { type: FUNGIKU_ACTIONS.PLACE_MUSHROOM, payload: { cell } });

/** A real double-tap, as the board dispatches it: a tap, then the upgrade. */
const doubleTap = (state, cell) => place(tap(state, cell), cell);

const undo = (state) => fungikuReducer(state, { type: FUNGIKU_ACTIONS.UNDO });
const redo = (state) => fungikuReducer(state, { type: FUNGIKU_ACTIONS.REDO });

/** Where the solution has row `row`'s mushroom. */
const solutionCellOf = (state, row) => row * state.size + state.solution[row];

/** A cell in `row` that is *not* the solution's — a guaranteed wrong guess. */
const wrongCellOf = (state, row) =>
  row * state.size + (state.solution[row] === 0 ? 1 : 0);

/** Place the puzzle's own solution, so the board is legally complete. */
const solve = (state) =>
  state.solution.reduce((acc, col, row) => doubleTap(acc, row * state.size + col), state);

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
    const base = buildPuzzleState({ size: 5, seed: 1 });
    const marks = createEmptyMarks(5);
    marks[solutionCellOf(base, 1)] = MARKS.MUSHROOM;

    const restored = buildPuzzleState({ size: 5, seed: 1, marks });
    expect(restored.marks[solutionCellOf(base, 1)]).toBe(MARKS.MUSHROOM);
  });

  it('discards restored marks of the wrong length rather than rendering them', () => {
    const state = buildPuzzleState({ size: 5, seed: 1, marks: [MARKS.MUSHROOM, MARKS.X] });

    expect(state.marks).toHaveLength(25);
    expect(state.marks.every((mark) => mark === MARKS.EMPTY)).toBe(true);
  });

  it('rejects a board smaller than the engine supports', () => {
    expect(() => buildPuzzleState({ size: 4, seed: 1 })).toThrow(/size/i);
  });

  it('starts with a full complement of lives and no red marks', () => {
    const state = buildPuzzleState({ size: 5, seed: 1 });

    expect(state.lives).toBe(MAX_LIVES);
    expect(state.mistakeCells).toEqual([]);
    expect(selectLives(state)).toEqual({ left: MAX_LIVES, of: MAX_LIVES });
  });

  it('carries a restored life count and its red marks back onto the board', () => {
    const base = buildPuzzleState({ size: 5, seed: 1 });
    const wrong = wrongCellOf(base, 0);
    const marks = createEmptyMarks(5);
    marks[wrong] = MARKS.X;

    const restored = buildPuzzleState({
      size: 5,
      seed: 1,
      marks,
      lives: 1,
      mistakeCells: [wrong],
    });

    expect(restored.lives).toBe(1);
    expect([...selectMistakeCells(restored)]).toEqual([wrong]);
  });

  it('clamps a corrupt life count rather than drawing a heart row it cannot', () => {
    expect(buildPuzzleState({ size: 5, seed: 1, lives: 99 }).lives).toBe(MAX_LIVES);
    expect(buildPuzzleState({ size: 5, seed: 1, lives: -4 }).lives).toBe(0);
    expect(buildPuzzleState({ size: 5, seed: 1, lives: 'lots' }).lives).toBe(MAX_LIVES);
  });

  it('drops restored mistake records that are not on the board', () => {
    const state = buildPuzzleState({ size: 5, seed: 1, mistakeCells: [3, -1, 999, 'x'] });

    // 3 holds no X, and the rest are not cells at all.
    expect(state.mistakeCells).toEqual([]);
  });

  /**
   * The invariant the whole step rests on, applied on the way in. A v1/v2 save
   * can hold mushrooms guessed when guessing was free.
   */
  describe('a mushroom restored from an older save', () => {
    const base = buildPuzzleState({ size: 5, seed: 1 });

    const restoreWith = (cells) => {
      const marks = createEmptyMarks(5);
      cells.forEach((cell) => {
        marks[cell] = MARKS.MUSHROOM;
      });
      return buildPuzzleState({ size: 5, seed: 1, marks });
    };

    it('survives when it is where the solution has it', () => {
      const cell = solutionCellOf(base, 2);
      const restored = restoreWith([cell]);

      expect(restored.marks[cell]).toBe(MARKS.MUSHROOM);
      expect(restored.mistakeCells).toEqual([]);
    });

    it('becomes a red X when it is not', () => {
      const cell = wrongCellOf(base, 2);
      const restored = restoreWith([cell]);

      expect(restored.marks[cell]).toBe(MARKS.X);
      expect([...selectMistakeCells(restored)]).toEqual([cell]);
    });

    it('costs nothing — those guesses were made when guessing was free', () => {
      expect(restoreWith([wrongCellOf(base, 0), wrongCellOf(base, 1)]).lives).toBe(MAX_LIVES);
    });

    it('leaves no board that a mushroom conflict could exist on', () => {
      // Two mushrooms in one row is the shape a v2 save could hold and the new
      // rules cannot produce. Both are wrong, so both convert.
      const restored = restoreWith([0, 3]);

      expect(findConflicts(restored.marks, restored.regions, restored.size).size).toBe(0);
    });
  });
});

/**
 * The input model (plan §14.2): tap rules out, double-tap commits a mushroom.
 * The three-state cycle it replaced is gone from the engine entirely.
 */
describe('tapping a cell', () => {
  const initial = buildPuzzleState({ size: 5, seed: 1 });

  it('rules an empty cell out', () => {
    expect(tap(initial, 0).marks[0]).toBe(MARKS.X);
  });

  it('clears a cell that is ruled out', () => {
    expect(tap(tap(initial, 0), 0).marks[0]).toBe(MARKS.EMPTY);
  });

  it('clears a cell holding a mushroom — which is what keeps every state reachable', () => {
    const cell = solutionCellOf(initial, 0);
    const placed = doubleTap(initial, cell);
    expect(placed.marks[cell]).toBe(MARKS.MUSHROOM);

    expect(tap(placed, cell).marks[cell]).toBe(MARKS.EMPTY);
  });

  it('does not mutate the previous state', () => {
    const next = tap(initial, 3);

    expect(initial.marks[3]).toBe(MARKS.EMPTY);
    expect(next.marks[3]).toBe(MARKS.X);
  });

  it('ignores taps outside the board', () => {
    expect(tap(initial, -1)).toBe(initial);
    expect(tap(initial, 25)).toBe(initial);
    expect(tap(initial, 1.5)).toBe(initial);
    expect(place(initial, 25)).toBe(initial);
  });
});

describe('double-tapping to place a mushroom', () => {
  const initial = buildPuzzleState({ size: 5, seed: 1 });

  it('places one when the cell is where the solution has it', () => {
    const cell = solutionCellOf(initial, 0);
    const state = doubleTap(initial, cell);

    expect(state.marks[cell]).toBe(MARKS.MUSHROOM);
    expect(state.lives).toBe(MAX_LIVES);
    expect(state.mistakeCells).toEqual([]);
  });

  it('is one undo entry, not two — undo never strands the first tap’s ✕', () => {
    const cell = solutionCellOf(initial, 0);
    const state = doubleTap(initial, cell);

    expect(state.undoStack).toHaveLength(1);
    expect(undo(state).marks).toEqual(initial.marks);
  });

  it('upgrades a cell the first tap had just cleared, still as one entry', () => {
    // Double-tapping a ruled-out cell: tap clears it, the second tap commits.
    const cell = solutionCellOf(initial, 0);
    const ruledOut = tap(initial, cell);
    const state = doubleTap(ruledOut, cell);

    expect(state.marks[cell]).toBe(MARKS.MUSHROOM);
    expect(state.undoStack).toHaveLength(ruledOut.undoStack.length + 1);
    expect(undo(state).marks).toEqual(ruledOut.marks);
  });

  it('leaves no dead undo entry when it lands back on the mushroom already there', () => {
    // Double-tapping a placed mushroom clears it and puts it straight back, so
    // the board is unchanged — and an undo entry that undoes nothing would be a
    // dead press of the Undo button.
    const cell = solutionCellOf(initial, 0);
    const placed = doubleTap(initial, cell);
    const again = doubleTap(placed, cell);

    expect(again.marks).toEqual(placed.marks);
    expect(again.undoStack).toHaveLength(placed.undoStack.length);
  });

  it('stands alone when no tap preceded it (the accessibility action)', () => {
    const cell = solutionCellOf(initial, 0);
    const state = place(initial, cell);

    expect(state.marks[cell]).toBe(MARKS.MUSHROOM);
    expect(state.undoStack).toHaveLength(1);
    expect(undo(state).marks).toEqual(initial.marks);
  });

  it('does not let the upgrade window cross to another cell', () => {
    const first = solutionCellOf(initial, 0);
    const second = solutionCellOf(initial, 1);

    // Tap one cell, then double-tap a different one: two separate actions.
    const state = doubleTap(tap(initial, first), second);

    expect(state.marks[first]).toBe(MARKS.X);
    expect(state.marks[second]).toBe(MARKS.MUSHROOM);
    expect(state.undoStack).toHaveLength(2);
  });
});

/** Plan §14.3 — the cost of getting it wrong. */
describe('a wrong mushroom', () => {
  const initial = buildPuzzleState({ size: 5, seed: 1 });
  const wrong = wrongCellOf(initial, 0);

  it('never reaches the board: it is flagged immediately and left as a red ✕', () => {
    const state = doubleTap(initial, wrong);

    expect(state.marks[wrong]).toBe(MARKS.X);
    expect(selectMushroomCount(state)).toBe(0);
    expect([...selectMistakeCells(state)]).toEqual([wrong]);
  });

  it('costs exactly one life', () => {
    expect(doubleTap(initial, wrong).lives).toBe(MAX_LIVES - 1);
  });

  it('costs another life every time, even in the same cell', () => {
    const once = doubleTap(initial, wrong);
    expect(doubleTap(once, wrong).lives).toBe(MAX_LIVES - 2);
  });

  it('reports itself, so the cell can shake and the counter can say what it cost', () => {
    const state = doubleTap(initial, wrong);
    expect(state.lastMistake).toEqual({ cell: wrong, seq: 1 });
  });

  it('reports a *new* event when the same cell goes wrong twice', () => {
    // Without the sequence number the second mistake would be an unchanged
    // object, and the shake would not re-fire.
    const twice = doubleTap(doubleTap(initial, wrong), wrong);
    expect(twice.lastMistake.seq).toBe(2);
  });

  it('stops being reported as soon as the player does something else', () => {
    const state = doubleTap(initial, wrong);
    expect(tap(state, 12).lastMistake).toBeNull();
    expect(undo(state).lastMistake).toBeNull();
  });

  it('does not charge for a correct placement', () => {
    expect(doubleTap(initial, solutionCellOf(initial, 0)).lives).toBe(MAX_LIVES);
  });

  it('leaves a ✕ a later tap can clear, like any other', () => {
    const state = tap(doubleTap(initial, wrong), wrong);

    expect(state.marks[wrong]).toBe(MARKS.EMPTY);
    // The record goes with the mark it was describing.
    expect(selectMistakeCells(state).size).toBe(0);
  });

  it('is retracted by undo — but the life is not refunded', () => {
    // "You don't get lives with info." The mistake already told the player
    // something true about the board; taking the mark back cannot take that back.
    const state = doubleTap(initial, wrong);
    const back = undo(state);

    expect(back.marks).toEqual(initial.marks);
    expect(back.lives).toBe(MAX_LIVES - 1);
    expect(selectMistakeCells(back).size).toBe(0);
  });

  it('does not get its life back through redo either', () => {
    const state = redo(undo(doubleTap(initial, wrong)));
    expect(state.lives).toBe(MAX_LIVES - 1);
  });
});

describe('running out of lives', () => {
  const initial = buildPuzzleState({ size: 5, seed: 1 });
  const restart = (state) => fungikuReducer(state, { type: FUNGIKU_ACTIONS.RESTART_BOARD });

  /** Spend `n` lives on wrong guesses in distinct rows. */
  const spend = (state, n) =>
    Array.from({ length: n }).reduce(
      (acc, _, i) => doubleTap(acc, wrongCellOf(acc, i)),
      state
    );

  /**
   * The board is **not** wiped by the third mistake. It waits at zero lives,
   * still showing the mark that killed it, until the player acknowledges the
   * modal. Wiping in the same breath was the first version, and on device it
   * read as the board emptying for no visible reason.
   */
  it('leaves the losing board on screen at zero lives', () => {
    const lost = spend(initial, MAX_LIVES);

    expect(lost.lives).toBe(0);
    expect(lost.marks.some((mark) => mark !== MARKS.EMPTY)).toBe(true);
    expect(selectMistakeCells(lost).size).toBeGreaterThan(0);
  });

  it('freezes the board while the restart is pending', () => {
    const lost = spend(initial, MAX_LIVES);

    // The modal is over the board, but the reducer does not rely on that.
    expect(place(lost, solutionCellOf(initial, 0))).toBe(lost);
    expect(doubleTap(lost, solutionCellOf(initial, 0)).marks).toEqual(
      tap(lost, solutionCellOf(initial, 0)).marks
    );
  });

  it('reports the mistake that ended it, so the shake and the message have something to fire on', () => {
    const lost = spend(initial, MAX_LIVES);
    expect(lost.lastMistake).toMatchObject({ cell: expect.any(Number) });
  });

  it('restarts the same board — same seed, same regions, same solution', () => {
    const restarted = restart(spend(initial, MAX_LIVES));

    expect(restarted.seed).toBe(initial.seed);
    expect(restarted.size).toBe(initial.size);
    expect(restarted.regions).toEqual(initial.regions);
    expect(restarted.solution).toEqual(initial.solution);
  });

  it('clears the marks and hands the lives back', () => {
    const restarted = restart(spend(initial, MAX_LIVES));

    expect(restarted.marks.every((mark) => mark === MARKS.EMPTY)).toBe(true);
    expect(restarted.lives).toBe(MAX_LIVES);
    expect(restarted.mistakeCells).toEqual([]);
    expect(restarted.lastMistake).toBeNull();
  });

  it('leaves nothing to undo back into — the restart is not a move', () => {
    const restarted = restart(spend(initial, MAX_LIVES));

    expect(selectCanUndo(restarted)).toBe(false);
    expect(selectCanRedo(restarted)).toBe(false);
    expect(undo(restarted)).toBe(restarted);
  });

  /**
   * `lives === 0` *is* "a restart is pending" — that is what the modal is driven
   * by. Because lives are persisted, a player who quits to the hub mid-dialog and
   * comes back must land back on it rather than on a board with no lives and no
   * way to start it over.
   */
  it('survives a round trip through storage as a pending restart', () => {
    const lost = spend(initial, MAX_LIVES);
    const reopened = buildPuzzleState({
      size: lost.size,
      seed: lost.seed,
      marks: lost.marks,
      lives: lost.lives,
      mistakeCells: lost.mistakeCells,
    });

    expect(reopened.lives).toBe(0);
    expect(restart(reopened).lives).toBe(MAX_LIVES);
  });
});

describe('the mushroom counter', () => {
  const initial = buildPuzzleState({ size: 5, seed: 1 });

  it('counts only mushrooms, never X marks', () => {
    const withXs = tap(tap(initial, 1), 2);
    expect(selectMushroomCount(withXs)).toBe(0);

    const withOne = doubleTap(withXs, solutionCellOf(initial, 2));
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
    expect(selectIsSolved(state)).toBe(true);
  });

  it('is won with a full complement of lives, because only correct guesses land', () => {
    expect(solve(initial).lives).toBe(MAX_LIVES);
  });

  it('is still won with X marks scattered around (X is only an aid)', () => {
    let state = solve(initial);
    const solutionCells = new Set(state.solution.map((col, row) => row * state.size + col));

    state.marks.forEach((_, cell) => {
      if (!solutionCells.has(cell)) state = tap(state, cell);
    });

    expect(state.marks.filter((mark) => mark === MARKS.X)).toHaveLength(20);
    expect(selectIsSolved(state)).toBe(true);
  });

  it('is not won by a board full of X marks and no mushrooms', () => {
    const state = initial.marks.reduce((acc, _, cell) => tap(acc, cell), initial);

    expect(state.marks.every((mark) => mark === MARKS.X)).toBe(true);
    expect(selectIsSolved(state)).toBe(false);
  });

  it('cannot be reached by double-tapping every cell — the wrong ones never land', () => {
    // Under the old cycle this filled the board with mushrooms. Now each wrong
    // guess converts, and the third one restarts the board.
    const state = initial.marks.reduce((acc, _, cell) => doubleTap(acc, cell), initial);

    expect(selectIsSolved(state)).toBe(false);
    expect(state.marks.filter((m) => m === MARKS.MUSHROOM).length).toBeLessThan(5);
  });

  it('stops being won as soon as a mushroom is removed', () => {
    const solved = solve(initial);
    const firstMushroom = solved.marks.findIndex((mark) => mark === MARKS.MUSHROOM);

    expect(selectIsSolved(tap(solved, firstMushroom))).toBe(false);
  });
});

/**
 * The consequence §14.3 calls out: with every placed mushroom at a solution cell,
 * and solution cells never sharing a row, column or region or touching, two
 * mushrooms on the board can no longer conflict. That is why the conflict
 * rendering and `selectConflicts` are gone.
 */
describe('conflicts, now unreachable by construction', () => {
  const initial = buildPuzzleState({ size: 5, seed: 1 });
  const conflictsOn = (state) => findConflicts(state.marks, state.regions, state.size);

  it('cannot be produced by two placements in the same row', () => {
    // The old test for this placed two mushrooms in row 0 and asserted both were
    // flagged. Now the wrong one never becomes a mushroom at all.
    const state = doubleTap(doubleTap(initial, solutionCellOf(initial, 0)), wrongCellOf(initial, 0));

    expect(state.marks.filter((m) => m === MARKS.MUSHROOM)).toHaveLength(1);
    expect(conflictsOn(state).size).toBe(0);
  });

  it('cannot be produced by any sequence of double-taps', () => {
    const state = initial.marks.reduce((acc, _, cell) => doubleTap(acc, cell), initial);
    expect(conflictsOn(state).size).toBe(0);
  });
});

describe('undo and redo', () => {
  const initial = buildPuzzleState({ size: 5, seed: 1 });

  it('does nothing on an empty history', () => {
    expect(selectCanUndo(initial)).toBe(false);
    expect(selectCanRedo(initial)).toBe(false);
    expect(undo(initial)).toBe(initial);
    expect(redo(initial)).toBe(initial);
  });

  it('walks back and forward through taps', () => {
    const cell = solutionCellOf(initial, 0);
    const placed = doubleTap(tap(initial, cell), cell);
    expect(placed.marks[cell]).toBe(MARKS.MUSHROOM);

    const back = undo(placed);
    expect(back.marks[cell]).toBe(MARKS.X);
    expect(selectCanRedo(back)).toBe(true);

    const backAgain = undo(back);
    expect(backAgain.marks[cell]).toBe(MARKS.EMPTY);
    expect(selectCanUndo(backAgain)).toBe(false);

    expect(redo(redo(backAgain)).marks[cell]).toBe(MARKS.MUSHROOM);
  });

  it('drops the redo stack once a new tap lands', () => {
    const back = undo(doubleTap(initial, solutionCellOf(initial, 0)));
    expect(selectCanRedo(back)).toBe(true);

    expect(selectCanRedo(tap(back, 9))).toBe(false);
  });

  it('undoes a win back to an unsolved board', () => {
    expect(selectIsSolved(undo(solve(initial)))).toBe(false);
  });
});

describe('clearing the board', () => {
  const initial = buildPuzzleState({ size: 5, seed: 1 });
  const clear = (state) => fungikuReducer(state, { type: FUNGIKU_ACTIONS.CLEAR_MARKS });

  it('empties every mark in one undoable step', () => {
    const played = doubleTap(tap(initial, 1), solutionCellOf(initial, 1));
    const cleared = clear(played);

    expect(cleared.marks.every((mark) => mark === MARKS.EMPTY)).toBe(true);
    expect(undo(cleared).marks).toEqual(played.marks);
  });

  it('is a no-op on an already empty board', () => {
    expect(clear(initial)).toBe(initial);
  });

  it('takes the red marks with it but not the lives spent earning them', () => {
    const played = doubleTap(initial, wrongCellOf(initial, 0));
    const cleared = clear(played);

    expect(cleared.mistakeCells).toEqual([]);
    expect(cleared.lives).toBe(MAX_LIVES - 1);
  });
});

describe('starting another puzzle', () => {
  it('replaces the board and forgets the history', () => {
    const base = buildPuzzleState({ size: 5, seed: 1 });
    const played = doubleTap(base, solutionCellOf(base, 0));

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

  it('hands back a full complement of lives', () => {
    const base = buildPuzzleState({ size: 5, seed: 1 });
    const played = doubleTap(base, wrongCellOf(base, 0));
    expect(played.lives).toBe(MAX_LIVES - 1);

    const next = fungikuReducer(played, {
      type: FUNGIKU_ACTIONS.NEW_PUZZLE,
      payload: buildPuzzleState({ size: 6, seed: 2 }),
    });

    expect(next.lives).toBe(MAX_LIVES);
    expect(next.mistakeCells).toEqual([]);
  });

  it('restores a saved board through the same path', () => {
    const target = buildPuzzleState({ size: 5, seed: 9 });
    const marks = createEmptyMarks(5);
    marks[solutionCellOf(target, 2)] = MARKS.MUSHROOM;

    const restored = fungikuReducer(createInitialFungikuState(), {
      type: FUNGIKU_ACTIONS.RESTORE_SAVED_GAME,
      payload: buildPuzzleState({ size: 5, seed: 9, marks, lives: 2 }),
    });

    expect(restored.seed).toBe(9);
    expect(selectMushroomCount(restored)).toBe(1);
    // A round trip through the hub must not refund a mistake.
    expect(restored.lives).toBe(2);
  });
});

/**
 * The difficulty menu's half of the puzzle identity (plan §14.1). Everything
 * above the reducer speaks in rungs; `resolvePuzzleIdentity` is the one place a
 * rung becomes a size, and it has to resolve in both directions.
 */
describe('resolving a puzzle identity', () => {
  it('turns a rung into a size, deterministically from the seed', () => {
    const a = resolvePuzzleIdentity({ difficulty: 'expert', seed: 4 });
    expect(a).toEqual({ difficulty: 'expert', size: 10 });

    expect(resolvePuzzleIdentity({ difficulty: 'easy', seed: 3 })).toEqual(
      resolvePuzzleIdentity({ difficulty: 'easy', seed: 3 })
    );
  });

  it('lets an explicit size win, and names the rung it belongs to', () => {
    expect(resolvePuzzleIdentity({ size: 9, seed: 1 })).toEqual({ difficulty: 'hard', size: 9 });
  });

  it('keeps the caller’s rung when the size really is one of its sizes', () => {
    // 6×6 is an easy board even on the seed where easy would have generated 5×5.
    expect(resolvePuzzleIdentity({ difficulty: 'easy', size: 6, seed: 1 })).toEqual({
      difficulty: 'easy',
      size: 6,
    });
  });

  it('lets the size overrule a rung it does not belong to', () => {
    expect(resolvePuzzleIdentity({ difficulty: 'easy', size: 10, seed: 1 })).toEqual({
      difficulty: 'expert',
      size: 10,
    });
  });

  it('resolves from the rung only when no size was given', () => {
    const resolved = resolvePuzzleIdentity({ seed: 1 });
    expect(resolved.difficulty).toBe(DEFAULT_DIFFICULTY);
    expect(sizesForDifficulty(DEFAULT_DIFFICULTY)).toContain(resolved.size);
  });

  it('passes a bad size through rather than quietly rounding it into range', () => {
    // `generate()` throwing is how a caller with a bug finds out; a silently
    // substituted board would hide it. (buildPuzzleState's own test covers the
    // throw.)
    expect(resolvePuzzleIdentity({ size: 42, seed: 1 }).size).toBe(42);
  });
});

describe('difficulty on built state', () => {
  it('is carried on every board', () => {
    expect(buildPuzzleState({ difficulty: 'medium', seed: 1 })).toMatchObject({
      difficulty: 'medium',
      size: 7,
    });
  });

  it('is derived when only a size is given (the free-play chips)', () => {
    expect(buildPuzzleState({ size: 8, seed: 1 }).difficulty).toBe('hard');
  });

  it('boots on the smallest board, labelled easy', () => {
    // Pinned rather than resolved from the seed: this one generates at mount on
    // the main thread with no "Generating…" state to hide behind.
    const state = createInitialFungikuState();
    expect(state.size).toBe(MIN_SIZE);
    expect(state.difficulty).toBe(DEFAULT_DIFFICULTY);
  });

  it('reopens a restored board at its saved size, not at whatever the rung would pick', () => {
    const target = buildPuzzleState({ difficulty: 'easy', size: 6, seed: 1 });
    const marks = createEmptyMarks(6);
    marks[solutionCellOf(target, 0)] = MARKS.MUSHROOM;

    const restored = buildPuzzleState({ difficulty: 'easy', size: 6, seed: 1, marks });

    expect(restored.size).toBe(6);
    expect(restored.difficulty).toBe('easy');
    expect(restored.marks[solutionCellOf(target, 0)]).toBe(MARKS.MUSHROOM);
  });
});

describe('unknown actions', () => {
  it('leave state untouched', () => {
    const state = createInitialFungikuState();
    expect(fungikuReducer(state, { type: 'NOPE' })).toBe(state);
  });
});

describe('drag strokes', () => {
  const initial = buildPuzzleState({ size: 5, seed: 1 });
  const begin = (state) => fungikuReducer(state, { type: FUNGIKU_ACTIONS.BEGIN_STROKE });
  const end = (state) => fungikuReducer(state, { type: FUNGIKU_ACTIONS.END_STROKE });
  const paint = (state, cells, mode = PAINT_MODES.X) =>
    fungikuReducer(state, { type: FUNGIKU_ACTIONS.PAINT_CELLS, payload: { cells, mode } });

  /** A whole stroke, the way the gesture drives it. */
  const stroke = (state, batches, mode = PAINT_MODES.X) =>
    end(batches.reduce((acc, cells) => paint(acc, cells, mode), begin(state)));

  it('paints X across every cell of the stroke', () => {
    const state = stroke(initial, [[0], [1, 2], [3, 4]]);

    expect(state.marks.slice(0, 5)).toEqual([MARKS.X, MARKS.X, MARKS.X, MARKS.X, MARKS.X]);
  });

  it('records one undo entry for the whole stroke, not one per cell', () => {
    const state = stroke(initial, [[0], [1, 2], [3, 4]]);

    expect(state.undoStack).toHaveLength(1);
    expect(undo(state).marks).toEqual(initial.marks);
  });

  it('erases back to empty when the stroke is an erase', () => {
    const painted = stroke(initial, [[0, 1, 2]]);
    const erased = stroke(painted, [[0, 1, 2]], PAINT_MODES.ERASE);

    expect(erased.marks.slice(0, 3)).toEqual([MARKS.EMPTY, MARKS.EMPTY, MARKS.EMPTY]);
    expect(erased.undoStack).toHaveLength(2); // one per stroke
  });

  it('never overwrites a mushroom', () => {
    // Losing a deduced placement to a stray swipe is the worst failure here.
    const cell = solutionCellOf(initial, 0);
    const withMushroom = doubleTap(initial, cell);
    const swept = stroke(withMushroom, [[0, 1, 2, 3, 4]]);

    expect(swept.marks[cell]).toBe(MARKS.MUSHROOM);
    expect(swept.marks.filter((m) => m === MARKS.X)).toHaveLength(4);
  });

  it('does not overwrite a mushroom on an erase stroke either', () => {
    const cell = solutionCellOf(initial, 0);
    const swept = stroke(doubleTap(initial, cell), [[0, 1, 2, 3, 4]], PAINT_MODES.ERASE);

    expect(swept.marks[cell]).toBe(MARKS.MUSHROOM);
  });

  it('takes the red off an X it erases, without refunding the life', () => {
    const wrong = wrongCellOf(initial, 0);
    const played = doubleTap(initial, wrong);
    expect(selectMistakeCells(played).size).toBe(1);

    const swept = stroke(played, [[wrong]], PAINT_MODES.ERASE);

    expect(swept.marks[wrong]).toBe(MARKS.EMPTY);
    expect(selectMistakeCells(swept).size).toBe(0);
    expect(swept.lives).toBe(MAX_LIVES - 1);
  });

  it('is a no-op when the stroke changes nothing, leaving no undo entry', () => {
    const painted = stroke(initial, [[0, 1]]);
    const again = stroke(painted, [[0, 1]]);

    expect(again.marks).toEqual(painted.marks);
    expect(again.undoStack).toHaveLength(painted.undoStack.length);
  });

  it('still records one entry when the first cells of a stroke change nothing', () => {
    // The stroke starts over an existing X (no change), then reaches blanks —
    // the undo entry has to survive until the first cell that actually paints.
    const seeded = stroke(initial, [[0]]);
    const swept = stroke(seeded, [[0], [1], [2]]);

    expect(swept.marks.slice(0, 3)).toEqual([MARKS.X, MARKS.X, MARKS.X]);
    expect(swept.undoStack).toHaveLength(2);
    expect(undo(swept).marks).toEqual(seeded.marks);
  });

  it('ignores cells outside the board', () => {
    const state = stroke(initial, [[-1, 0, 25, 1.5]]);

    expect(state.marks[0]).toBe(MARKS.X);
    expect(state.marks).toHaveLength(25);
  });

  it('ignores an empty paint', () => {
    const opened = begin(initial);
    expect(paint(opened, [])).toBe(opened);
    expect(paint(opened, null)).toBe(opened);
  });

  it('keeps strokeOpen out of the way once spent', () => {
    const opened = begin(initial);
    expect(opened.strokeOpen).toBe(true);

    const painted = paint(opened, [0]);
    expect(painted.strokeOpen).toBe(false);
    expect(end(painted).strokeOpen).toBe(false);
  });

  it('cannot win the board by sweeping X everywhere', () => {
    const all = Array.from({ length: 25 }, (_, i) => i);
    const swept = stroke(initial, [all]);

    expect(selectIsSolved(swept)).toBe(false);
    expect(selectMushroomCount(swept)).toBe(0);
  });

  it('never costs a life — there is no such thing as a wrong ✕', () => {
    const all = Array.from({ length: 25 }, (_, i) => i);
    expect(stroke(initial, [all]).lives).toBe(MAX_LIVES);
  });
});

describe('the rule-out button', () => {
  const base = buildPuzzleState({ size: 5, seed: 1 });
  const ruleOut = (state) => fungikuReducer(state, { type: FUNGIKU_ACTIONS.RULE_OUT });

  it('does nothing on an empty board', () => {
    // Nothing is placed, so nothing is forbidden yet.
    expect(selectRuleOutCells(base).size).toBe(0);
    expect(ruleOut(base)).toBe(base);
  });

  it('marks the row, column, region and neighbours of a placed mushroom', () => {
    const row = 2;
    const cell = solutionCellOf(base, row);
    const col = base.solution[row];
    const after = ruleOut(doubleTap(base, cell));

    expect(after.marks[cell]).toBe(MARKS.MUSHROOM);

    for (let i = 0; i < 5; i++) {
      if (i !== col) expect(after.marks[row * 5 + i]).toBe(MARKS.X);
      if (i !== row) expect(after.marks[i * 5 + col]).toBe(MARKS.X);
    }

    const region = base.regions[cell];
    base.regions.forEach((r, i) => {
      if (r === region && i !== cell) expect(after.marks[i]).toBe(MARKS.X);
    });
  });

  it('accounts for every placed mushroom at once, not just the last', () => {
    const two = doubleTap(doubleTap(base, solutionCellOf(base, 0)), solutionCellOf(base, 2));
    const after = ruleOut(two);

    const blanks = after.marks.filter((m) => m === MARKS.EMPTY).length;
    expect(selectRuleOutCells(two).size).toBeGreaterThan(0);
    expect(blanks).toBeLessThan(base.marks.length);
  });

  it('is one undoable action however many cells it fills', () => {
    const placed = doubleTap(base, solutionCellOf(base, 2));
    const after = ruleOut(placed);

    expect(after.undoStack).toHaveLength(placed.undoStack.length + 1);
    expect(undo(after).marks).toEqual(placed.marks);
  });

  it('only fills blanks, leaving existing marks alone', () => {
    const after = ruleOut(doubleTap(base, solutionCellOf(base, 2)));

    // Second tap has nothing left to do, so it is a no-op with no undo entry.
    expect(ruleOut(after)).toBe(after);
    expect(selectRuleOutCells(after).size).toBe(0);
  });

  it('leaves its X marks behind when the mushroom is tapped away', () => {
    // Deliberate: they become ordinary X marks the moment they land. Retracting
    // them would need per-mark provenance, which is ambiguous as soon as two
    // mushrooms rule out the same cell. Undo is how you take the assist back.
    const cell = solutionCellOf(base, 2);
    const after = ruleOut(doubleTap(base, cell));
    const tappedAway = tap(after, cell);

    expect(tappedAway.marks[cell]).toBe(MARKS.EMPTY);
    expect(tappedAway.marks.filter((m) => m === MARKS.X).length).toBeGreaterThan(0);
  });

  it('cannot win a board on its own', () => {
    expect(selectIsSolved(ruleOut(doubleTap(base, solutionCellOf(base, 2))))).toBe(false);
  });

  it('costs no lives', () => {
    expect(ruleOut(doubleTap(base, solutionCellOf(base, 2))).lives).toBe(MAX_LIVES);
  });
});

describe('hints', () => {
  const base = buildPuzzleState({ size: 5, seed: 1 });
  const hintFor = (state) => fungikuReducer(state, { type: FUNGIKU_ACTIONS.REQUEST_HINT });
  const reveal = (state) => fungikuReducer(state, { type: FUNGIKU_ACTIONS.REVEAL_MUSHROOM });

  it('starts with no hint and none used', () => {
    expect(base.hint).toBeNull();
    expect(base.hintsUsed).toBe(0);
  });

  it('has no "one of your mushrooms is wrong" rung left to reach', () => {
    // The rung is gone because the board it described cannot exist: a wrong
    // mushroom is converted the instant it is placed.
    const guessed = doubleTap(base, wrongCellOf(base, 0));

    expect(Object.values(HINT_KINDS)).not.toContain('mistake');
    expect(hintFor(guessed).hint.kind).not.toBe('mistake');
  });

  it('nudges at the one forced cell, and says why it is forced', () => {
    // Four of five rows solved leaves the fifth forced.
    let state = base;
    for (let row = 0; row < 4; row++) state = doubleTap(state, solutionCellOf(state, row));

    const hinted = hintFor(state);
    expect(hinted.hint.kind).toBe(HINT_KINDS.NUDGE);

    // **Exactly one cell** (plan §12.9). It used to highlight the whole
    // row/column/region on the theory that finding the cell is what teaches —
    // which on device produced a message saying "only one cell" beside seven
    // outlined ones. The words and the board contradicted each other, and the
    // player still had to do the search the hint was bought to shortcut.
    expect(hinted.hint.cells).toEqual([solutionCellOf(base, 4)]);

    // The teaching survives in the *reason*: the message still names the group
    // that forces it, so a hint is an explanation and not just a pointer.
    expect(hinted.hint.message).toMatch(/only one cell/i);
    expect(hinted.hint.message).toMatch(/^(Row|Column|This colour region)/);
  });

  it('a nudge is still not a reveal — it points, it does not place', () => {
    let state = base;
    for (let row = 0; row < 4; row++) state = doubleTap(state, solutionCellOf(state, row));

    const before = state.marks.slice();
    const hinted = hintFor(state);

    // Naming the cell is the whole change; committing the mushroom is still a
    // deliberate double-tap the player makes themselves. If this ever fails, a
    // nudge has quietly become the dearest rung at the cheapest price.
    expect(hinted.marks).toEqual(before);
    expect(hinted.marks[hinted.hint.cells[0]]).not.toBe(MARKS.MUSHROOM);
  });

  it('says so honestly when nothing is forced, instead of quietly revealing', () => {
    // A synthetic layout where every region is a whole row, so every row, column
    // and region has five candidates and nothing is forced. (A generated puzzle
    // often *does* have a forced move on an empty board — a one-cell region is
    // forced by definition — so this branch needs a board built for it.)
    const bands = {
      size: 5,
      seed: 0,
      regions: Array.from({ length: 25 }, (_, i) => Math.floor(i / 5)),
      solution: [0, 2, 4, 1, 3],
      marks: createEmptyMarks(5),
      undoStack: [],
      redoStack: [],
      lives: MAX_LIVES,
      mistakeCells: [],
      hintsUsed: 0,
      hint: null,
      lastMistake: null,
      mistakeSeq: 0,
      strokeOpen: false,
      upgradableCell: -1,
    };

    const hinted = hintFor(bands);
    expect(hinted.hint.kind).toBe(HINT_KINDS.STUCK);
    expect(hinted.hint.offerReveal).toBe(true);
    expect(hinted.hint.cells).toEqual([]);
    // Nothing was given away, so it does not count against the player.
    expect(hinted.hintsUsed).toBe(0);
  });

  it('reveals a correct mushroom as a separate, counted action', () => {
    const revealed = reveal(base);
    const cell = revealed.hint.cells[0];

    expect(revealed.hint.kind).toBe(HINT_KINDS.REVEAL);
    expect(revealed.marks[cell]).toBe(MARKS.MUSHROOM);
    expect(revealed.hintsUsed).toBe(1);
  });

  it('never costs a life, however many it places', () => {
    let state = base;
    for (let i = 0; i < 5; i++) state = reveal(state);

    expect(selectIsSolved(state)).toBe(true);
    expect(state.lives).toBe(MAX_LIVES);
  });

  it('has nothing left to reveal once the board is solved', () => {
    const solved = solve(base);

    expect(selectRevealCell(solved)).toBe(-1);
    expect(reveal(solved)).toBe(solved);
  });

  it('is one undoable action', () => {
    expect(undo(reveal(base)).marks).toEqual(base.marks);
  });

  it('goes stale the moment the board changes', () => {
    const hinted = hintFor(base);
    expect(hinted.hint).not.toBeNull();

    expect(tap(hinted, 0).hint).toBeNull();

    // Only an action that *actually changes the board* clears it. A no-op
    // action leaves the advice alone, because it is still advice about the board
    // in front of you — so these use a board where each action does something.
    const played = hintFor(doubleTap(base, solutionCellOf(base, 0)));
    expect(fungikuReducer(played, { type: FUNGIKU_ACTIONS.RULE_OUT }).hint).toBeNull();
    expect(undo(played).hint).toBeNull();

    // ...and a no-op undo on a board with no history keeps it.
    expect(undo(hintFor(base)).hint).not.toBeNull();
  });

  it('is cleared by a placement, right or wrong', () => {
    expect(hintFor(base).hint).not.toBeNull();
    expect(doubleTap(hintFor(base), solutionCellOf(base, 0)).hint).toBeNull();
    expect(doubleTap(hintFor(base), wrongCellOf(base, 0)).hint).toBeNull();
  });

  it('can be dismissed', () => {
    const hinted = hintFor(base);
    expect(fungikuReducer(hinted, { type: FUNGIKU_ACTIONS.DISMISS_HINT }).hint).toBeNull();
  });

  it('keeps its count across a hint that follows', () => {
    expect(reveal(reveal(base)).hintsUsed).toBe(2);
  });

  it('resets the count for a new puzzle', () => {
    expect(buildPuzzleState({ size: 5, seed: 2, hintsUsed: 0 }).hintsUsed).toBe(0);
  });
});

/**
 * What the wallet charges a hint on (plan §14.4). It has to be answerable
 * *before* the action is dispatched, and it has to agree with the reducer's own
 * rule for `hintsUsed` — otherwise a player is billed for an answer that gave
 * nothing away, or gets a nudge for free.
 */
describe('selectHintIsChargeable', () => {
  const base = buildPuzzleState({ size: 5, seed: 1 });
  const hintFor = (state) => fungikuReducer(state, { type: FUNGIKU_ACTIONS.REQUEST_HINT });

  /** Every region is a whole row, so nothing anywhere is forced. */
  const bands = {
    ...base,
    seed: 0,
    regions: Array.from({ length: 25 }, (_, i) => Math.floor(i / 5)),
    solution: [0, 2, 4, 1, 3],
    marks: createEmptyMarks(5),
  };

  it('agrees with the reducer about what counts as a hint used', () => {
    [base, bands].forEach((state) => {
      const chargeable = selectHintIsChargeable(state);
      const after = hintFor(state);

      expect(chargeable).toBe(after.hintsUsed > state.hintsUsed);
      expect(chargeable).toBe(after.hint.kind === HINT_KINDS.NUDGE);
    });
  });

  it('is false when the only answer available is "nothing is forced"', () => {
    expect(selectHintIsChargeable(bands)).toBe(false);
    expect(hintFor(bands).hint.kind).toBe(HINT_KINDS.STUCK);
  });

  it('is false on a solved board — there is nothing left to be forced', () => {
    const solved = solve(base);

    expect(selectIsSolved(solved)).toBe(true);
    expect(selectHintIsChargeable(solved)).toBe(false);
  });
});
