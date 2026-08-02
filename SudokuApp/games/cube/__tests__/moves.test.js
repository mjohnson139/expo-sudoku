import {
  algError,
  axisOf,
  formatAlg,
  isValidAlg,
  moveCount,
  parseAlg,
  parseMove,
  scanAlg,
  tokenize,
  tryParseAlg,
  tryTokenize,
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

describe('tokenize', () => {
  it('keeps the spelling that was written, not the one the model uses', () => {
    // The whole reason this exists (plan §4). A Roux notebook that echoes
    // `Rw U Rw'` at someone who typed `r U r'` is correcting them in notation
    // their own method does not use.
    expect(tokenize("r U r'")).toEqual(['r', 'U', "r'"]);
    expect(tokenize("Rw U Rw'")).toEqual(['Rw', 'U', "Rw'"]);
    expect(tokenize('M2')).toEqual(['M2']);
  });

  it('splits an unspaced algorithm the same way a spaced one splits', () => {
    expect(tokenize("RUR'U'")).toEqual(tokenize("R U R' U'"));
  });

  it('lines up one-for-one with the moves, from the same scan', () => {
    // The property the screen leans on: `tokens[i]` is displayed and `moves[i]`
    // is animated, so they cannot be two lists that drift.
    const { tokens, moves } = scanAlg("r U R' M2 y");
    expect(tokens).toHaveLength(moves.length);
    expect(tokens).toEqual(['r', 'U', "R'", 'M2', 'y']);
    expect(moves.map((move) => move.token)).toEqual(['Rw', 'U', "R'", 'M2', 'y']);
  });

  it('refuses the whole string when one token is bad, like parseAlg', () => {
    expect(() => tokenize('R Q U')).toThrow();
    expect(tryTokenize('R Q U')).toBeNull();
    expect(tryTokenize("R U R'")).toEqual(['R', 'U', "R'"]);
  });

  it('is empty for the empty algorithm', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('   ')).toEqual([]);
  });
});

describe('algError', () => {
  it('names the token it choked on, so a field can say why', () => {
    expect(algError('R Q U')).toMatch(/Q/);
    expect(algError('Mw')).toMatch(/Mw/);
  });

  it('is null for notation it can read', () => {
    expect(algError("R U R' U'")).toBeNull();
    expect(algError('')).toBeNull();
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
