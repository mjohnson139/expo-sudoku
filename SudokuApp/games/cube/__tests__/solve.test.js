/**
 * Writing a solve down.
 *
 * The pad is twelve buttons and a modifier; what a tap *means* — and what the
 * text it edits ends up saying — is all here, where the node test runner can
 * reach it without a renderer.
 */

import {
  MODIFIERS,
  PAD_COLUMNS,
  PAD_KEYS,
  appendAlg,
  appendToken,
  describeSolve,
  describeToken,
  dropLastToken,
  nextModifier,
  padToken,
  solveError,
} from '../solve';
import { cubeFromAlg } from '../cubeState';
import { isValidAlg, parseMove, tokenize } from '../moves';

describe('PAD_KEYS', () => {
  it('is the Roux set, and every key is notation the parser takes', () => {
    expect(PAD_KEYS).toHaveLength(12);
    PAD_KEYS.forEach((key) => {
      expect(parseMove(key)).not.toBeNull();
    });
  });

  it('covers what a Roux solve is actually written in', () => {
    // First block is faces plus M and r; LSE is very nearly just M and U;
    // x and y are how the cube gets turned over during inspection.
    ['U', 'D', 'L', 'R', 'F', 'B', 'M', 'r', 'x', 'y'].forEach((key) => {
      expect(PAD_KEYS).toContain(key);
    });
  });

  it('leaves the notation nobody writes a solve in off the pad', () => {
    // Real notation, and still reachable through the text field — just not
    // worth six more keys on a phone.
    ['E', 'S', 'Uw', 'u', 'f', 'b'].forEach((key) => {
      expect(PAD_KEYS).not.toContain(key);
    });
  });

  it('lays out in whole rows', () => {
    expect(PAD_KEYS.length % PAD_COLUMNS).toBe(0);
  });
});

describe('nextModifier', () => {
  it('arms a modifier, and disarms the one already armed', () => {
    // Otherwise the only way out of a mis-tapped `'` is to spend a move on it.
    expect(nextModifier('', "'")).toBe("'");
    expect(nextModifier("'", "'")).toBe('');
    expect(nextModifier('2', '2')).toBe('');
  });

  it('swaps rather than stacking when the other one is tapped', () => {
    expect(nextModifier("'", '2')).toBe('2');
    expect(nextModifier('2', "'")).toBe("'");
  });

  it('only ever holds one of the two, or nothing', () => {
    let armed = '';
    ["'", '2', "'", "'", '2'].forEach((tap) => {
      armed = nextModifier(armed, tap);
      expect(['', ...MODIFIERS]).toContain(armed);
    });
  });
});

describe('padToken', () => {
  it('is the key plus whatever is armed', () => {
    expect(padToken('R', '')).toBe('R');
    expect(padToken('R', "'")).toBe("R'");
    expect(padToken('R', '2')).toBe('R2');
    expect(padToken('M', "'")).toBe("M'");
  });

  it('makes a real move out of every key and modifier there is', () => {
    PAD_KEYS.forEach((key) => {
      ['', ...MODIFIERS].forEach((modifier) => {
        expect(parseMove(padToken(key, modifier))).not.toBeNull();
      });
    });
  });
});

describe('appendToken', () => {
  it('single-spaces, and does not open with a space', () => {
    expect(appendToken('', 'R')).toBe('R');
    expect(appendToken('R', 'U')).toBe('R U');
    expect(appendToken("R U", "R'")).toBe("R U R'");
  });

  it('builds an algorithm the parser can read, key by key', () => {
    const alg = ['r', 'U', "r'", 'M2', "y'"].reduce(appendToken, '');
    expect(alg).toBe("r U r' M2 y'");
    expect(isValidAlg(alg)).toBe(true);
  });
});

describe('appendAlg', () => {
  it('adds to the end rather than replacing', () => {
    expect(appendAlg('r U', "R U R' U'")).toBe("r U R U R' U'");
    expect(appendAlg('', "R U R'")).toBe("R U R'");
  });

  it('takes an unspaced algorithm and spaces it out', () => {
    expect(appendAlg('', "RUR'U'")).toBe("R U R' U'");
  });

  it('keeps the spelling that was pasted', () => {
    // `r` is not rewritten to `Rw` on the way in any more than on the way out.
    expect(appendAlg('', "r U r'")).toBe("r U r'");
  });

  it('refuses the whole thing, naming the token, rather than dropping it', () => {
    // A solve that silently lost a move would show a cube that is not the cube
    // in the operator's hands.
    expect(() => appendAlg('R', 'U Q F')).toThrow(/Q/);
  });

  it('is a no-op for nothing at all', () => {
    expect(appendAlg('R U', '')).toBe('R U');
    expect(appendAlg('R U', '   ')).toBe('R U');
  });
});

describe('dropLastToken', () => {
  it('takes the last move off', () => {
    expect(dropLastToken("R U R'")).toBe('R U');
    expect(dropLastToken('R')).toBe('');
    expect(dropLastToken('')).toBe('');
  });

  it('takes a whole token off, not a character', () => {
    expect(dropLastToken("R U R2")).toBe('R U');
    expect(dropLastToken("R U Rw'")).toBe('R U');
  });

  it('undoes exactly what appendToken did, however many times', () => {
    const tokens = ['r', 'U', "R'", 'M2', 'x'];
    let alg = tokens.reduce(appendToken, '');
    for (let i = tokens.length - 1; i >= 0; i -= 1) {
      alg = dropLastToken(alg);
      expect(alg).toBe(tokens.slice(0, i).join(' '));
    }
    expect(alg).toBe('');
  });

  it('leaves text it cannot read alone rather than cutting it somewhere', () => {
    expect(dropLastToken('not notation')).toBe('not notation');
  });
});

describe('a solve edited by the pad', () => {
  it('lands the same cube as the algorithm read straight through', () => {
    // The round trip the whole screen rests on: what the pad writes is
    // notation, and notation is what the model turns.
    const scramble = "R U2 F' D L B'";
    const typed = ["r", 'U', "r'", "U'", 'M2'].reduce(appendToken, '');
    expect(cubeFromAlg(`${scramble} ${typed}`)).toEqual(
      cubeFromAlg(`${scramble} Rw U Rw' U' M2`)
    );
  });

  it('keeps `r` as `r` through a write, an undo and a rewrite', () => {
    // The one that would be easy to lose: any of these steps rewriting the
    // token is the notebook correcting the operator's own notation (plan §4).
    let alg = '';
    alg = appendToken(alg, padToken('r', ''));
    alg = appendToken(alg, padToken('U', "'"));
    alg = appendAlg(alg, "M' U2 M");
    alg = dropLastToken(alg);
    expect(alg).toBe("r U' M' U2");
    expect(tokenize(alg)).toEqual(['r', "U'", "M'", 'U2']);
  });
});

describe('solveError', () => {
  it('names the offending token', () => {
    expect(solveError('R Q U')).toMatch(/Q/);
  });

  it('has nothing to say about an empty field', () => {
    expect(solveError('')).toBeNull();
    expect(solveError('   ')).toBeNull();
  });

  it('has nothing to say about notation it can read', () => {
    expect(solveError("RUR'U'")).toBeNull();
    expect(solveError("r U' M2 y")).toBeNull();
  });
});

describe('describeSolve', () => {
  it('counts the moves, in words that fit under a card', () => {
    expect(describeSolve('')).toBe('No moves yet');
    expect(describeSolve('R')).toBe('1 move');
    expect(describeSolve("r U r' U'")).toBe('4 moves');
  });
});

describe('describeToken', () => {
  it('reads a token out loud rather than spelling it', () => {
    expect(describeToken('R')).toBe('R');
    expect(describeToken("R'")).toBe('R prime');
    expect(describeToken('R2')).toBe('R double');
    expect(describeToken('M')).toBe('M slice');
    expect(describeToken("M'")).toBe('M slice prime');
  });

  it('does not say a wide turn the same way as its face', () => {
    expect(describeToken('r')).toBe('wide R');
    expect(describeToken('r')).not.toBe(describeToken('R'));
    expect(describeToken("y'")).toBe('y rotation prime');
  });

  it('says the curly apostrophe a phone keyboard produces', () => {
    expect(describeToken('R’')).toBe('R prime');
  });

  it('says something for every token the pad can make', () => {
    PAD_KEYS.forEach((key) => {
      ['', ...MODIFIERS].forEach((modifier) => {
        expect(describeToken(padToken(key, modifier))).toBeTruthy();
      });
    });
  });
});
