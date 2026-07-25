import { describeFungikuProgress, describeSudokuProgress, formatElapsed } from '../gameProgress';
import { MARKS, createEmptyMarks } from '../../games/fungiku/engine';

describe('formatElapsed', () => {
  it('formats seconds as mm:ss', () => {
    expect(formatElapsed(0)).toBe('00:00');
    expect(formatElapsed(9)).toBe('00:09');
    expect(formatElapsed(75)).toBe('01:15');
    expect(formatElapsed(600)).toBe('10:00');
  });

  it('rolls hours into the minutes field rather than truncating', () => {
    expect(formatElapsed(3661)).toBe('61:01');
  });

  it('treats missing or nonsense values as zero', () => {
    expect(formatElapsed(undefined)).toBe('00:00');
    expect(formatElapsed(null)).toBe('00:00');
    expect(formatElapsed(-5)).toBe('00:00');
    expect(formatElapsed(NaN)).toBe('00:00');
  });
});

describe('describeSudokuProgress', () => {
  const inProgress = {
    gameStarted: true,
    gameCompleted: false,
    difficulty: 'medium',
    elapsedSeconds: 95,
    filledCount: 41,
  };

  it('summarizes a game in progress', () => {
    expect(describeSudokuProgress(inProgress)).toEqual({
      label: 'Medium · 01:35',
      detail: '40 left',
    });
  });

  it('returns null when there is nothing to continue', () => {
    expect(describeSudokuProgress(null)).toBeNull();
    expect(describeSudokuProgress(undefined)).toBeNull();
    expect(describeSudokuProgress({ ...inProgress, gameStarted: false })).toBeNull();
  });

  it('does not offer to continue a finished game', () => {
    expect(describeSudokuProgress({ ...inProgress, gameCompleted: true })).toBeNull();
  });

  it('never reports a negative number of remaining cells', () => {
    expect(describeSudokuProgress({ ...inProgress, filledCount: 81 }).detail).toBe('0 left');
    expect(describeSudokuProgress({ ...inProgress, filledCount: 99 }).detail).toBe('0 left');
  });

  it('copes with a save that is missing counters', () => {
    expect(describeSudokuProgress({ gameStarted: true, difficulty: 'expert' })).toEqual({
      label: 'Expert · 00:00',
      detail: '81 left',
    });
  });

  it('omits the difficulty rather than showing an empty separator', () => {
    expect(describeSudokuProgress({ gameStarted: true, elapsedSeconds: 30 }).label).toBe('00:30');
  });
});

describe('describeFungikuProgress', () => {
  const saveWith = (mutate) => {
    const marks = createEmptyMarks(5);
    mutate(marks);
    return { size: 5, seed: 3, marks };
  };

  it('summarizes a board in progress', () => {
    const saved = saveWith((marks) => {
      marks[0] = MARKS.MUSHROOM;
      marks[7] = MARKS.MUSHROOM;
      marks[9] = MARKS.X;
    });

    expect(describeFungikuProgress(saved)).toEqual({
      label: '5×5',
      detail: '2 of 5 placed',
    });
  });

  it('counts a board marked only with Xs as worth continuing', () => {
    const saved = saveWith((marks) => {
      marks[4] = MARKS.X;
    });

    expect(describeFungikuProgress(saved)).toEqual({
      label: '5×5',
      detail: '0 of 5 placed',
    });
  });

  it('returns null for an untouched board', () => {
    expect(describeFungikuProgress(saveWith(() => {}))).toBeNull();
  });

  it('returns null for a missing or malformed save', () => {
    expect(describeFungikuProgress(null)).toBeNull();
    expect(describeFungikuProgress(undefined)).toBeNull();
    expect(describeFungikuProgress({ size: 5 })).toBeNull();
    expect(describeFungikuProgress({ marks: [MARKS.MUSHROOM] })).toBeNull();
  });
});
