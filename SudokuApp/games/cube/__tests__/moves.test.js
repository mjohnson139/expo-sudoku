import {
  axisOf,
  formatAlg,
  isValidAlg,
  moveCount,
  parseAlg,
  parseMove,
  tryParseAlg,
} from '../moves';
import { AXIS } from '../geometry';

describe('parseMove', () => {
  it('reads a plain face turn', () => {
    expect(parseMove('R')).toEqual({ token: 'R', axis: AXIS.x, layers: [1], amount: 1 });
  });

  it('reads primes as three quarter turns, not as negatives', () => {
    // `amount` is fed straight to a rotation loop, so it has to be normalized.
    expect(parseMove("R'").amount).toBe(3);
    expect(parseMove('R2').amount).toBe(2);
  });

  it('turns D, L and B the right way — their faces look down the negative axis', () => {
    expect(parseMove('D').amount).toBe(3);
    expect(parseMove("D'").amount).toBe(1);
    expect(parseMove('L').amount).toBe(3);
    expect(parseMove('B').amount).toBe(3);
  });

  it('accepts both spellings of a wide turn', () => {
    expect(parseMove('r')).toEqual(parseMove('Rw'));
    expect(parseMove('Rw').layers).toEqual([1, 0]);
    expect(parseMove('Rw').token).toBe('Rw');
  });

  it('treats a half turn as directionless', () => {
    expect(parseMove("R2'")).toEqual(parseMove('R2'));
    expect(parseMove("R'2")).toEqual(parseMove('R2'));
  });

  it('accepts the curly apostrophe phone keyboards produce', () => {
    expect(parseMove('R’')).toEqual(parseMove("R'"));
  });

  it('turns slices with the neighbour they are named for', () => {
    // M follows L, E follows D, S follows F — the convention every method uses.
    expect(parseMove('M').amount).toBe(parseMove('L').amount);
    expect(parseMove('E').amount).toBe(parseMove('D').amount);
    expect(parseMove('S').amount).toBe(parseMove('F').amount);
    expect(parseMove('M').layers).toEqual([0]);
  });

  it('turns rotations with the face they follow, and take every layer', () => {
    expect(parseMove('x').amount).toBe(parseMove('R').amount);
    expect(parseMove('y').amount).toBe(parseMove('U').amount);
    expect(parseMove('z').amount).toBe(parseMove('F').amount);
    expect(parseMove('y').layers).toEqual([-1, 0, 1]);
  });

  it('rejects letters that are not moves, and wide forms that do not exist', () => {
    expect(parseMove('Q')).toBeNull();
    expect(parseMove('Mw')).toBeNull();
    expect(parseMove('xw')).toBeNull();
    expect(parseMove('RU')).toBeNull();
    expect(parseMove('')).toBeNull();
  });
});

describe('parseAlg', () => {
  it('reads a spaced algorithm', () => {
    expect(formatAlg(parseAlg("R U R' U'"))).toBe("R U R' U'");
  });

  it('reads an unspaced one the same way', () => {
    expect(formatAlg(parseAlg("RUR'U'"))).toBe("R U R' U'");
  });

  it('tolerates ragged whitespace and newlines', () => {
    expect(formatAlg(parseAlg("  R\n U2\tF'  "))).toBe("R U2 F'");
  });

  it('is empty for empty input — that is the solved cube, not an error', () => {
    expect(parseAlg('')).toEqual([]);
    expect(parseAlg('   ')).toEqual([]);
  });

  it('refuses an algorithm with anything unrecognized in it', () => {
    // Dropping the bad token and applying the rest would show a cube that is not
    // the one the scramble describes, which is worse than refusing.
    expect(() => parseAlg('R Q U')).toThrow(/Unrecognized/);
    expect(() => parseAlg('R U 3')).toThrow(/Unrecognized/);
    expect(() => parseAlg(null)).toThrow();
  });

  it('answers null instead of throwing, through tryParseAlg', () => {
    expect(tryParseAlg('R Q U')).toBeNull();
    expect(tryParseAlg("R U R'")).toHaveLength(3);
    expect(isValidAlg('R Q U')).toBe(false);
    expect(isValidAlg("R U R'")).toBe(true);
  });
});

describe('moveCount', () => {
  it('counts every turn once, half turns included', () => {
    expect(moveCount("R U2 F' D")).toBe(4);
    expect(moveCount('')).toBe(0);
  });

  it('is zero for text that is not an algorithm, rather than throwing', () => {
    expect(moveCount('hello')).toBe(0);
  });
});

describe('axisOf', () => {
  it('collapses opposite faces onto one axis', () => {
    expect(axisOf('U')).toBe(axisOf('D'));
    expect(axisOf('L')).toBe(axisOf('R'));
    expect(axisOf('F')).toBe(axisOf('B'));
    expect(axisOf('U')).not.toBe(axisOf('R'));
  });
});
