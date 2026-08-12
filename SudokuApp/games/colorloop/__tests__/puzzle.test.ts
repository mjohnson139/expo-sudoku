import { REGION_COLORS } from '../../../utils/symbolSets';
import { COLORS, PALETTE_SIZE } from '../colors';
import {
  Grid,
  defaultScramble,
  effectiveMoves,
  encodeCode,
  isSolved,
  makeScrambled,
  maxN,
  parseCode,
  rotateLine,
} from '../puzzle';

/**
 * ⚠️ **The palette is part of the code freeze, and this is the pin.**
 *
 * `maxN()` is derived from `COLORS.length` and `parseCode` clamps `n` to it, so
 * the number of colours Color Loop can see decides **which board a code
 * produces**. Step 2 retired the sibling app's seven hand-picked hues for the
 * platform's Okabe–Ito palette, which holds **ten** — and had Color Loop been
 * given all ten, `maxN('diag')` would have gone from 4 to 5 and the code
 * `5-ABC-D`, which has always meant a 4×4 board, would silently have started
 * producing a 5×5 one. Every code anyone has ever shared would decode to a
 * different puzzle.
 *
 * Nothing else in either suite would have failed. That is what this block is
 * for, and why it lands in the same commit as the palette swap rather than
 * after it (docs/colorloop-merge-plan.md §4.2, §10).
 */
describe('the palette Color Loop is allowed to see', () => {
  it('is seven entries, whatever the platform palette grows to', () => {
    expect(PALETTE_SIZE).toBe(7);
    expect(COLORS).toHaveLength(7);
  });

  it('is the platform palette, sliced — not a palette of its own', () => {
    expect(COLORS.map((entry) => entry.c)).toEqual(
      REGION_COLORS.slice(0, 7).map((entry) => entry.color)
    );
    expect(REGION_COLORS.length).toBeGreaterThan(7); // the slice is doing work
  });

  it('gives every hue its own glyph — the non-colour channel of identity', () => {
    expect(new Set(COLORS.map((entry) => entry.g)).size).toBe(COLORS.length);
    expect(COLORS.every((entry) => entry.g.length > 0 && entry.name.length > 0)).toBe(true);
  });

  it('holds maxN where every shared code expects it', () => {
    // Seven colours ⇒ floor((7+1)/2) = 4. Ten would make it 5.
    expect(maxN('diag')).toBe(4);
    expect(maxN('rows')).toBe(6);
    expect(maxN('ordered')).toBe(6);
  });

  it('still clamps the code that would have moved', () => {
    expect(parseCode('5-ABC-D')).toEqual({ n: 4, seed: parseInt('ABC', 36), mode: 'diag' });
  });
});

describe('makeScrambled', () => {
  it('is deterministic per (seed, n, mode)', () => {
    expect(makeScrambled(42, 4, 'rows')).toEqual(makeScrambled(42, 4, 'rows'));
    expect(makeScrambled(42, 4, 'diag')).toEqual(makeScrambled(42, 4, 'diag'));
  });

  it('defaults to the historical scramble depth (shared codes stay identical)', () => {
    for (const n of [3, 4, 5, 6]) {
      expect(makeScrambled(42, n, 'rows')).toEqual(
        makeScrambled(42, n, 'rows', defaultScramble(n))
      );
    }
  });

  it('honors an explicit scramble depth deterministically', () => {
    expect(makeScrambled(42, 3, 'rows', 2)).toEqual(makeScrambled(42, 3, 'rows', 2));
    expect(makeScrambled(42, 3, 'rows', 2)).not.toEqual(makeScrambled(42, 3, 'rows'));
  });

  it('never returns a solved board even at tiny depths', () => {
    for (const seed of [0, 1, 42, 999]) {
      expect(isSolved(makeScrambled(seed, 3, 'rows', 1), 'rows')).toBe(false);
      expect(isSolved(makeScrambled(seed, 3, 'diag', 2), 'diag')).toBe(false);
    }
  });

  it('preserves the color multiset (rows mode: n of each color)', () => {
    const n = 4;
    const grid = makeScrambled(7, n, 'rows');
    const counts = new Map<number, number>();
    for (const v of grid.flat()) counts.set(v, (counts.get(v) ?? 0) + 1);
    for (let color = 0; color < n; color++) expect(counts.get(color)).toBe(n);
  });

  it('never returns an already-solved board', () => {
    for (const seed of [0, 1, 42, 999]) {
      expect(isSolved(makeScrambled(seed, 4, 'rows'), 'rows')).toBe(false);
    }
  });
});

describe('maxN', () => {
  it('caps diagonal at 4x4 (7-color palette needs 2n−1) and other modes at 6', () => {
    expect(maxN('diag')).toBe(4);
    expect(maxN('rows')).toBe(6);
    expect(maxN('ordered')).toBe(6);
  });
});

describe('puzzle codes', () => {
  it('round-trips through encode/parse for every mode', () => {
    const seed = parseInt('K7P2Q', 36);
    expect(encodeCode(4, seed, 'rows')).toBe('4-K7P2Q');
    expect(parseCode('4-K7P2Q')).toEqual({ n: 4, seed, mode: 'rows' });
    expect(parseCode(encodeCode(5, seed, 'ordered'))).toEqual({ n: 5, seed, mode: 'ordered' });
    expect(parseCode(encodeCode(3, seed, 'diag'))).toEqual({ n: 3, seed, mode: 'diag' });
  });

  it('clamps diagonal mode to 4x4', () => {
    const parsed = parseCode('5-ABC-D');
    expect(parsed).not.toBeNull();
    expect(parsed!.n).toBe(4);
    expect(parsed!.mode).toBe('diag');
  });

  it('normalizes lowercase input', () => {
    expect(parseCode('4-k7p2q')).toEqual({ n: 4, seed: parseInt('K7P2Q', 36), mode: 'rows' });
  });

  it('rejects malformed codes', () => {
    expect(parseCode('garbage')).toBeNull();
    expect(parseCode('7-ABC')).toBeNull(); // n out of range
    expect(parseCode('4-')).toBeNull();
    expect(parseCode('')).toBeNull();
  });
});

describe('rotateLine', () => {
  const grid: Grid = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
  ];

  it('shifts a row right by one, wrapping the last cell around', () => {
    expect(rotateLine(grid, 'row', 0, 1)[0]).toEqual([2, 0, 1]);
  });

  it('shifts a column down by one, wrapping the last cell around', () => {
    const next = rotateLine(grid, 'col', 1, 1);
    expect(next.map(row => row[1])).toEqual([7, 1, 4]);
  });

  it('returns to the original after n single-step rotations', () => {
    let g = grid;
    for (let i = 0; i < 3; i++) g = rotateLine(g, 'row', 1, 1);
    expect(g).toEqual(grid);
  });

  it('treats opposite rotations as inverses', () => {
    expect(rotateLine(rotateLine(grid, 'col', 2, 1), 'col', 2, -1)).toEqual(grid);
  });
});

describe('effectiveMoves', () => {
  it('takes the shorter way around the loop', () => {
    expect(effectiveMoves(0, 4)).toBe(0);
    expect(effectiveMoves(1, 4)).toBe(1);
    expect(effectiveMoves(2, 4)).toBe(2);
    expect(effectiveMoves(3, 4)).toBe(1); // 3 forward = 1 back
    expect(effectiveMoves(4, 4)).toBe(0);
    expect(effectiveMoves(-1, 4)).toBe(1);
  });
});

describe('isSolved', () => {
  it('rows mode: every row a single color, any order', () => {
    expect(
      isSolved(
        [
          [2, 2, 2],
          [0, 0, 0],
          [1, 1, 1],
        ],
        'rows'
      )
    ).toBe(true);
    expect(
      isSolved(
        [
          [2, 2, 1],
          [0, 0, 0],
          [1, 1, 1],
        ],
        'rows'
      )
    ).toBe(false);
  });

  it('ordered mode: row r must be color r exactly', () => {
    expect(
      isSolved(
        [
          [0, 0, 0],
          [1, 1, 1],
          [2, 2, 2],
        ],
        'ordered'
      )
    ).toBe(true);
    // uniform rows but wrong order — solved for rows, not for ordered
    expect(
      isSolved(
        [
          [1, 1, 1],
          [0, 0, 0],
          [2, 2, 2],
        ],
        'ordered'
      )
    ).toBe(false);
  });

  it('diag mode: accepts either diagonal direction', () => {
    // anti-diagonals (/) uniform: value = r + c
    expect(
      isSolved(
        [
          [0, 1, 2],
          [1, 2, 3],
          [2, 3, 4],
        ],
        'diag'
      )
    ).toBe(true);
    // main diagonals (\) uniform: value = r - c + 2
    expect(
      isSolved(
        [
          [2, 1, 0],
          [3, 2, 1],
          [4, 3, 2],
        ],
        'diag'
      )
    ).toBe(true);
    // break a middle cell so both directions fail
    expect(
      isSolved(
        [
          [0, 1, 2],
          [1, 9, 3],
          [2, 3, 4],
        ],
        'diag'
      )
    ).toBe(false);
  });
});
