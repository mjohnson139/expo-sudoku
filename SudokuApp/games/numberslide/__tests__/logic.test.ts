import {
  NS_SOLVED,
  NSState,
  nsCellAt,
  nsIsSolved,
  nsMoveDir,
  nsParseCode,
  nsSeedCode,
  nsShuffle,
  nsSlideAt,
} from '../logic';

const solvedState = (): NSState => ({
  board: NS_SOLVED.map(row => [...row]),
  empty: { r: 2, c: 2 },
});

describe('nsShuffle', () => {
  it('is deterministic for the same seed', () => {
    const a = nsShuffle(1);
    const b = nsShuffle(1);
    expect(a.board).toEqual(b.board);
    expect(a.empty).toEqual(b.empty);
  });

  it('never returns a solved board', () => {
    for (const seed of [0, 1, 42, 60466175]) {
      expect(nsIsSolved(nsShuffle(seed).board)).toBe(false);
    }
  });

  it('returns a permutation of 0..8 with empty tracking the gap', () => {
    const { board, empty } = nsShuffle(7);
    expect(board.flat().sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(board[empty.r][empty.c]).toBe(0);
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
});

describe('nsIsSolved', () => {
  it('is true only for the ordered board', () => {
    expect(nsIsSolved(NS_SOLVED)).toBe(true);
    const off = NS_SOLVED.map(row => [...row]);
    [off[2][0], off[2][1]] = [off[2][1], off[2][0]];
    expect(nsIsSolved(off)).toBe(false);
  });
});

describe('seed codes', () => {
  it('pads to five characters', () => {
    expect(nsSeedCode(0)).toBe('00000');
  });

  it('round-trips through parse', () => {
    for (const seed of [0, 1, 12345, 60466175]) {
      expect(nsParseCode(nsSeedCode(seed))).toBe(seed);
    }
  });

  it('parses lowercase input', () => {
    expect(nsParseCode('zzzzz')).toBe(60466175);
  });

  it('rejects garbage', () => {
    expect(nsParseCode('!!!')).toBeNull();
    expect(nsParseCode('')).toBeNull();
  });
});

describe('nsCellAt', () => {
  const pad = 20;
  const step = 100;
  const origin = { x: 10, y: 50 };

  it('resolves the center of every cell', () => {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const px = origin.x + pad + c * step + step / 2;
        const py = origin.y + pad + r * step + step / 2;
        expect(nsCellAt(px, py, origin.x, origin.y, pad, step)).toEqual({ r, c });
      }
    }
  });

  it('clamps taps beyond the right/bottom edges to 2', () => {
    const px = origin.x + pad + 3 * step + 50;
    const py = origin.y + pad + 3 * step + 50;
    expect(nsCellAt(px, py, origin.x, origin.y, pad, step)).toEqual({ r: 2, c: 2 });
  });

  it('clamps taps before the left/top edges to 0', () => {
    expect(nsCellAt(0, 0, origin.x, origin.y, pad, step)).toEqual({ r: 0, c: 0 });
  });
});
