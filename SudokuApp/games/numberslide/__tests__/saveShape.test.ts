import { NSSize, nsShuffle } from '../logic';
import { describeNumberSlideProgress, readNumberSlideSave } from '../saveShape';

/**
 * The save is read **by shape**, not by version — a key that is absent and a
 * key that is corrupt want the same answer anyway (plan §4.4). These are the
 * shapes that would otherwise reach the screen as a board it cannot play.
 */

const boardFor = (size: NSSize) => {
  const { board, empty } = nsShuffle(7, size);
  return { size, seed: 7, board, empty, moves: 12, secs: 84 };
};

describe('readNumberSlideSave', () => {
  it('reads a well-formed save at every size', () => {
    for (const size of [3, 4, 5] as NSSize[]) {
      const save = boardFor(size);
      expect(readNumberSlideSave({ _v: 1, ...save })).toEqual(save);
    }
  });

  it('copies the board rather than aliasing the parsed JSON', () => {
    const save = boardFor(3);
    const read = readNumberSlideSave({ _v: 1, ...save })!;
    read.board[0][0] = 99;
    expect(save.board[0][0]).not.toBe(99);
  });

  it('has one answer for nothing stored and for garbage stored', () => {
    expect(readNumberSlideSave(null)).toBeNull();
    expect(readNumberSlideSave(undefined)).toBeNull();
    expect(readNumberSlideSave('not an object')).toBeNull();
    expect(readNumberSlideSave({})).toBeNull();
  });

  it('rejects a size this build does not offer', () => {
    // A save written by a future version that added 6×6 must not half-render.
    expect(readNumberSlideSave({ ...boardFor(3), size: 6 })).toBeNull();
    expect(readNumberSlideSave({ ...boardFor(3), size: 2 })).toBeNull();
  });

  it('rejects a board whose dimensions disagree with its size', () => {
    expect(readNumberSlideSave({ ...boardFor(4), size: 3 })).toBeNull();
    const ragged = boardFor(3);
    ragged.board[1] = [1, 2];
    expect(readNumberSlideSave(ragged)).toBeNull();
  });

  /**
   * The assertion that matters most. A grid of the right shape whose values are
   * not a permutation of 0…n²-1 is a puzzle with two 7s and no 3 — unsolvable,
   * and it renders perfectly happily.
   */
  it('rejects a board that is not a permutation of 0..n²-1', () => {
    const dupe = boardFor(3);
    dupe.board[0][0] = dupe.board[0][1];
    expect(readNumberSlideSave(dupe)).toBeNull();

    const outOfRange = boardFor(3);
    outOfRange.board[0][0] = 99;
    expect(readNumberSlideSave(outOfRange)).toBeNull();

    const fractional = boardFor(3);
    fractional.board[0][0] = 1.5;
    expect(readNumberSlideSave(fractional)).toBeNull();
  });

  it('rejects a gap pointer that does not point at the gap', () => {
    const save = boardFor(3);
    const wrong = { ...save, empty: { r: (save.empty.r + 1) % 3, c: save.empty.c } };
    // Only fails when the moved pointer actually lands off the 0.
    if (wrong.board[wrong.empty.r][wrong.empty.c] !== 0) {
      expect(readNumberSlideSave(wrong)).toBeNull();
    }
    expect(readNumberSlideSave({ ...save, empty: { r: -1, c: 0 } })).toBeNull();
    expect(readNumberSlideSave({ ...save, empty: { r: 0, c: 3 } })).toBeNull();
    expect(readNumberSlideSave({ ...save, empty: null })).toBeNull();
  });

  it('rejects counters that are not counts', () => {
    expect(readNumberSlideSave({ ...boardFor(3), moves: NaN })).toBeNull();
    expect(readNumberSlideSave({ ...boardFor(3), secs: -1 })).toBeNull();
    expect(readNumberSlideSave({ ...boardFor(3), seed: 'abc' })).toBeNull();
  });

  it('floors fractional counters so the readout cannot show a decimal', () => {
    const read = readNumberSlideSave({ ...boardFor(3), moves: 12.9, secs: 84.7 })!;
    expect(read.moves).toBe(12);
    expect(read.secs).toBe(84);
  });
});

describe('describeNumberSlideProgress', () => {
  it('names the size and the clock, and counts the moves', () => {
    expect(describeNumberSlideProgress({ ...boardFor(4), moves: 12, secs: 84 })).toEqual({
      label: '4×4 · 01:24',
      detail: '12 moves',
    });
  });

  it('does not say "1 moves"', () => {
    expect(describeNumberSlideProgress({ ...boardFor(3), moves: 1 })?.detail).toBe('1 move');
  });

  /**
   * Every visit deals a board, so a card that offered to continue an untouched
   * one would say Continue permanently and mean nothing by it — the line
   * `describeFungikuProgress` draws in the same place.
   */
  it('is null for an untouched board, and for nothing at all', () => {
    expect(describeNumberSlideProgress({ ...boardFor(3), moves: 0 })).toBeNull();
    expect(describeNumberSlideProgress(null)).toBeNull();
  });
});
