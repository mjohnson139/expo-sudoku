import {
  algError,
  axisOf,
  formatAlg,
  invertAlg,
  isValidAlg,
  moveCount,
  normalizeAlg,
  parseAlg,
  parseMove,
  scanAlg,
  tokenize,
  tryInvertAlg,
  tryParseAlg,
  tryTokenize,
} from '../moves';
import { AXIS } from '../geometry';
import { cubeFromAlg, isSolved } from '../cubeState';

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

describe('invertAlg', () => {
  /** Real algorithms, in the notation their own methods are written in. */
  const CORPUS = [
    "R U R' U R U2 R'",
    "R U2 R' U' R U' R'",
    "R U R' U' R' F R2 U' R' U' R U R' F'",
    "M' U' M U2 M' U' M",
    "r U R' U' r' F R F'",
    "F R U R' U' F' f R U R' U' f'",
    "x R' U R' D2 R U' R' D2 R2",
    "R2 D R' U2 R D' R' U2 R'",
  ];

  it('reverses the order and flips each turn', () => {
    expect(invertAlg("R U R' U R U2 R'")).toBe("R U2 R' U' R U' R'");
    expect(invertAlg('R')).toBe("R'");
    expect(invertAlg("R'")).toBe('R');
  });

  it('leaves half turns alone — a half turn undoes itself', () => {
    expect(invertAlg('R2')).toBe('R2');
    expect(invertAlg("R2 U2")).toBe('U2 R2');
  });

  it('keeps the notation it was given, rather than the parser\'s', () => {
    // The trap this function exists to avoid (plan §3.2, `scanAlg`'s comment):
    // `parseMove` normalizes `r` to `Rw`, so inverting through the moves would
    // answer a Roux user in notation their method does not use.
    expect(invertAlg("r U r'")).toBe("r U' r'");
    expect(invertAlg("Rw U Rw'")).toBe("Rw U' Rw'");
    expect(invertAlg("M' U M")).toBe("M' U' M");
  });

  it('is its own inverse over real algorithms', () => {
    CORPUS.forEach((alg) => {
      expect(invertAlg(invertAlg(alg))).toBe(normalizeAlg(alg));
    });
  });

  it('actually undoes the cube, not just the text', () => {
    CORPUS.forEach((alg) => {
      expect(isSolved(cubeFromAlg(`${alg} ${invertAlg(alg)}`))).toBe(true);
      expect(isSolved(cubeFromAlg(`${invertAlg(alg)} ${alg}`))).toBe(true);
    });
  });

  it('undoes the solved cube into the solved cube', () => {
    expect(invertAlg('')).toBe('');
    expect(invertAlg('   ')).toBe('');
  });

  it('reads the curly apostrophe a phone produces, and answers with a straight one', () => {
    // The one input it is not character-for-character its own inverse over. It
    // is still its own inverse over the cube, which is what it is for.
    expect(invertAlg('R\u2019 U')).toBe("U' R");
    expect(isSolved(cubeFromAlg(`R\u2019 U ${invertAlg('R\u2019 U')}`))).toBe(true);
  });

  it('refuses text that is not an algorithm', () => {
    expect(() => invertAlg('R Q U')).toThrow(/Q/);
    expect(tryInvertAlg('R Q U')).toBeNull();
    expect(tryInvertAlg("R U R'")).toBe("R U' R'");
  });
});
