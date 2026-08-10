import {
  NS_SIZES,
  NSState,
  nsCellAt,
  nsIsSolved,
  nsMoveDir,
  nsParseCode,
  nsSeedCode,
  nsShuffle,
  nsSlideAt,
  nsSolvedBoard,
} from '../logic';

const solvedState = (size = 3): NSState => ({
  board: nsSolvedBoard(size),
  empty: { r: size - 1, c: size - 1 },
});

describe('nsSolvedBoard', () => {
  it('lays out 1..n²-1 with the gap last', () => {
    expect(nsSolvedBoard(3)).toEqual([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 0],
    ]);
    expect(nsSolvedBoard(4)).toEqual([
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, 0],
    ]);
  });
});

describe('nsShuffle', () => {
  it.each(NS_SIZES)('is deterministic for the same seed (%i×%i)', size => {
    const a = nsShuffle(1, size);
    const b = nsShuffle(1, size);
    expect(a.board).toEqual(b.board);
    expect(a.empty).toEqual(b.empty);
  });

  it.each(NS_SIZES)('never returns a solved board (%i×%i)', size => {
    for (const seed of [0, 1, 42, 60466175]) {
      expect(nsIsSolved(nsShuffle(seed, size).board)).toBe(false);
    }
  });

  it.each(NS_SIZES)('returns a permutation of 0..n²-1 with empty tracking the gap (%i×%i)', size => {
    const { board, empty } = nsShuffle(7, size);
    expect(board.flat().sort((x, y) => x - y)).toEqual(
      Array.from({ length: size * size }, (_, i) => i)
    );
    expect(board[empty.r][empty.c]).toBe(0);
  });

  // Shared 3×3 codes must keep producing the exact boards they always have.
  // These boards were captured from the 3×3-only implementation; if this
  // test breaks, old shared codes no longer reproduce the same puzzle.
  it('3×3 boards are pinned byte-identical to the pre-size-param implementation', () => {
    expect(nsShuffle(1).board).toEqual([
      [6, 7, 4],
      [3, 1, 2],
      [8, 5, 0],
    ]);
    expect(nsShuffle(42).board).toEqual([
      [0, 8, 5],
      [4, 6, 2],
      [3, 7, 1],
    ]);
    expect(nsShuffle(12345).board).toEqual([
      [2, 6, 0],
      [1, 4, 3],
      [7, 8, 5],
    ]);
  });
});

describe('nsSlideAt', () => {
  it('slides a whole line of tiles toward the gap', () => {
    // gap at (2,2); tapping (0,2) pulls 6 then 3 down the column
    const res = nsSlideAt(solvedState(), 0, 2)!;
    expect(res.state.board).toEqual([
      [1, 2, 0],
      [4, 5, 3],
      [7, 8, 6],
    ]);
    expect(res.state.empty).toEqual({ r: 0, c: 2 });
    expect(res.moved).toEqual([6, 3]);
  });

  it('slides a full row on a 4×4 board', () => {
    // gap at (3,3); tapping (3,0) pulls 15, 14, 13 across the bottom row
    const res = nsSlideAt(solvedState(4), 3, 0)!;
    expect(res.state.board[3]).toEqual([0, 13, 14, 15]);
    expect(res.state.empty).toEqual({ r: 3, c: 0 });
    expect(res.moved).toEqual([15, 14, 13]);
  });

  it('returns null for a tap not in line with the gap', () => {
    expect(nsSlideAt(solvedState(), 0, 0)).toBeNull();
  });

  it('returns null when tapping the gap itself', () => {
    expect(nsSlideAt(solvedState(), 2, 2)).toBeNull();
  });
});

describe('nsMoveDir', () => {
  // gap at (2,2): the tile that moves comes from the opposite side of the gap
  it('moves the tile above the gap on "down"', () => {
    const res = nsMoveDir(solvedState(), 'down')!;
    expect(res.state.board[2][2]).toBe(6);
    expect(res.state.empty).toEqual({ r: 1, c: 2 });
    expect(res.moved).toEqual([6]);
  });

  it('moves the tile left of the gap on "right"', () => {
    const res = nsMoveDir(solvedState(), 'right')!;
    expect(res.state.board[2][2]).toBe(8);
    expect(res.state.empty).toEqual({ r: 2, c: 1 });
    expect(res.moved).toEqual([8]);
  });

  it('is a no-op when the move is blocked by the edge', () => {
    expect(nsMoveDir(solvedState(), 'up')).toBeNull();
    expect(nsMoveDir(solvedState(), 'left')).toBeNull();
  });

  it('respects the edges of a 5×5 board', () => {
    // gap at (4,4): tiles exist above and to the left, so down/right work
    const res = nsMoveDir(solvedState(5), 'down')!;
    expect(res.state.board[4][4]).toBe(20);
    expect(res.state.empty).toEqual({ r: 3, c: 4 });
    expect(nsMoveDir(solvedState(5), 'up')).toBeNull();
  });
});

describe('nsIsSolved', () => {
  it.each(NS_SIZES)('is true only for the ordered board (%i×%i)', size => {
    const board = nsSolvedBoard(size);
    expect(nsIsSolved(board)).toBe(true);
    [board[size - 1][0], board[size - 1][1]] = [board[size - 1][1], board[size - 1][0]];
    expect(nsIsSolved(board)).toBe(false);
  });
});

describe('seed codes', () => {
  it('keeps the bare five-character format for 3×3', () => {
    expect(nsSeedCode(0)).toBe('00000');
    expect(nsSeedCode(0, 3)).toBe('00000');
  });

  it('prefixes the size for bigger boards', () => {
    expect(nsSeedCode(0, 4)).toBe('4-00000');
    expect(nsSeedCode(12345, 5)).toBe('5-009IX');
  });

  it.each(NS_SIZES)('round-trips through parse (%i×%i)', size => {
    for (const seed of [0, 1, 12345, 60466175]) {
      expect(nsParseCode(nsSeedCode(seed, size))).toEqual({ seed, size });
    }
  });

  it('parses legacy bare codes as 3×3', () => {
    expect(nsParseCode('zzzzz')).toEqual({ seed: 60466175, size: 3 });
  });

  it('rejects garbage and unknown sizes', () => {
    expect(nsParseCode('!!!')).toBeNull();
    expect(nsParseCode('')).toBeNull();
    expect(nsParseCode('7-00000')).toBeNull();
    expect(nsParseCode('4-')).toBeNull();
  });
});

describe('nsCellAt', () => {
  const pad = 20;
  const step = 100;
  const origin = { x: 10, y: 50 };

  it.each(NS_SIZES)('resolves the center of every cell (%i×%i)', size => {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const px = origin.x + pad + c * step + step / 2;
        const py = origin.y + pad + r * step + step / 2;
        expect(nsCellAt(px, py, origin.x, origin.y, pad, step, size)).toEqual({ r, c });
      }
    }
  });

  it.each(NS_SIZES)('clamps taps beyond the right/bottom edges (%i×%i)', size => {
    const px = origin.x + pad + size * step + 50;
    const py = origin.y + pad + size * step + 50;
    expect(nsCellAt(px, py, origin.x, origin.y, pad, step, size)).toEqual({
      r: size - 1,
      c: size - 1,
    });
  });

  it('clamps taps before the left/top edges to 0', () => {
    expect(nsCellAt(0, 0, origin.x, origin.y, pad, step)).toEqual({ r: 0, c: 0 });
  });
});
