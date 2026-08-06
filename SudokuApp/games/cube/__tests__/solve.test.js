/**
 * Writing a solve down.
 *
 * The pad is a six-by-three cross, prime is a hold and a half turn is a second
 * tap; what a press *means* — and what the text it edits ends up saying — is all
 * here, where the node test runner can reach it without a renderer.
 */

import {
  HOLD_MS,
  PAD_COLUMNS,
  PAD_KEYS,
  PAD_LAYOUT,
  PAD_ROWS,
  appendAlg,
  appendToken,
  applyPadPress,
  describeSolve,
  describeToken,
  dropLastToken,
  holdProgress,
  isHold,
  promoteLastToken,
  solveError,
} from '../solve';
import { cubeFromAlg } from '../cubeState';
import { isValidAlg, parseMove, tokenize } from '../moves';

describe('PAD_LAYOUT', () => {
  it('fills a six-by-three grid exactly', () => {
    expect(PAD_LAYOUT).toHaveLength(PAD_COLUMNS * PAD_ROWS);
  });

  it("has no empty cells left: the cross's gap is the prime key", () => {
    // The design left column 3 row 1 deliberately empty. The operator used the
    // hold on a phone and found its feedback lives under the thumb causing it,
    // so the armed `′` came back as a second route and took that cell.
    expect(PAD_LAYOUT.some((cell) => cell.gap)).toBe(false);
    expect(PAD_LAYOUT[2].tool).toBe('prime');
  });

  it('puts the prime key directly above R', () => {
    // The most prime-heavy key on a Roux pad, and the reach is one row.
    expect(PAD_LAYOUT[2 + PAD_COLUMNS].key).toBe('R');
  });

  it('is every key a move, or a tool, and never both', () => {
    PAD_LAYOUT.forEach((cell) => {
      const kinds = [cell.key, cell.tool, cell.gap].filter(Boolean);
      expect(kinds).toHaveLength(1);
    });
  });

  it('puts the faces where they are on a cube net', () => {
    const at = (row, col) => PAD_LAYOUT[(row - 1) * PAD_COLUMNS + (col - 1)];
    // U, F, D down the spine; L and R either side of F.
    expect(at(1, 2).key).toBe('U');
    expect(at(2, 2).key).toBe('F');
    expect(at(3, 2).key).toBe('D');
    expect(at(2, 1).key).toBe('L');
    expect(at(2, 3).key).toBe('R');
    // B is the face a net cannot place, so it is the one that is tagged.
    expect(at(1, 1).key).toBe('B');
    expect(at(1, 1).tag).toBe('far');
  });

  it('gives the slices, wides and rotations a column each', () => {
    const column = (col) =>
      [1, 2, 3].map((row) => PAD_LAYOUT[(row - 1) * PAD_COLUMNS + (col - 1)].key);
    expect(column(4)).toEqual(['M', 'E', 'S']);
    expect(column(5)).toEqual(['l', 'r', undefined]);
    expect(column(6)).toEqual(['x', 'y', 'z']);
  });

  it('carries the four tools, and no Clear', () => {
    const tools = PAD_LAYOUT.filter((cell) => cell.tool).map((cell) => cell.tool);
    expect(tools.sort()).toEqual(['backspace', 'flag', 'keyboard', 'prime']);
    // Clearing a solve does not belong under a thumb aiming at `R` — it moved
    // to the solves list in Step 8 (plan §8.8).
    expect(tools).not.toContain('clear');
  });

  it('leaves `2` off the pad, because a half turn is still a second tap', () => {
    // Only the prime came back. The promotion needs no key.
    const tools = PAD_LAYOUT.filter((cell) => cell.tool).map((cell) => cell.tool);
    expect(tools).not.toContain('half');
    expect(PAD_KEYS).not.toContain('2');
  });

  it('gives every key a tint group', () => {
    PAD_LAYOUT.filter((cell) => !cell.gap).forEach((cell) => {
      expect(['face', 'slice', 'wide', 'rot', 'tool', 'accent']).toContain(cell.tone);
    });
  });
});

describe('PAD_KEYS', () => {
  it('is every move key on the layout, and each is notation the parser takes', () => {
    expect(PAD_KEYS).toHaveLength(14);
    PAD_KEYS.forEach((key) => {
      expect(parseMove(key)).not.toBeNull();
    });
  });

  it('covers what a Roux solve is actually written in', () => {
    ['U', 'D', 'L', 'R', 'F', 'B', 'M', 'r', 'x', 'y'].forEach((key) => {
      expect(PAD_KEYS).toContain(key);
    });
  });

  it('has room for E and S now the modifier keys are gone', () => {
    // Step 3 left them off for space, not for notation: two of the eighteen
    // cells went on the armed `'` and `2`, and prime is a hold now.
    expect(PAD_KEYS).toContain('E');
    expect(PAD_KEYS).toContain('S');
    expect(PAD_KEYS).not.toContain("'");
    expect(PAD_KEYS).not.toContain('2');
  });
});

describe('the hold', () => {
  it('is a prime only past the threshold', () => {
    expect(isHold(0)).toBe(false);
    expect(isHold(HOLD_MS - 1)).toBe(false);
    expect(isHold(HOLD_MS)).toBe(true);
    expect(isHold(HOLD_MS + 500)).toBe(true);
  });

  it('fills from 0ms, which is what stops it being a hidden gesture', () => {
    // Without a fill that starts immediately, hold-for-prime is strictly worse
    // than the two taps it replaces (plan §8.8).
    expect(holdProgress(0)).toBe(0);
    expect(holdProgress(HOLD_MS / 2)).toBeCloseTo(0.5);
    expect(holdProgress(HOLD_MS)).toBe(1);
  });

  it('never draws past either end', () => {
    expect(holdProgress(-100)).toBe(0);
    expect(holdProgress(HOLD_MS * 10)).toBe(1);
  });
});

describe('promoteLastToken', () => {
  it('promotes the token already written', () => {
    expect(promoteLastToken('R U R', 'R')).toBe('R U R2');
    expect(promoteLastToken('M', 'M')).toBe('M2');
  });

  it('refuses when the last token is not that key', () => {
    expect(promoteLastToken('R U', 'R')).toBeNull();
    expect(promoteLastToken('', 'R')).toBeNull();
  });

  it('refuses to promote something already promoted, or primed', () => {
    // Which is the whole of "a third tap starts a fresh R" — no extra rule.
    expect(promoteLastToken('R U R2', 'R')).toBeNull();
    expect(promoteLastToken("R U R'", 'R')).toBeNull();
  });

  it('does not confuse a wide turn with its face', () => {
    expect(promoteLastToken('r', 'R')).toBeNull();
    expect(promoteLastToken('R', 'r')).toBeNull();
    expect(promoteLastToken('r', 'r')).toBe('r2');
  });

  it('leaves text it cannot read alone', () => {
    expect(promoteLastToken('not notation', 'R')).toBeNull();
  });
});

describe('applyPadPress', () => {
  it('appends a plain turn on a tap', () => {
    expect(applyPadPress('', 'R', {})).toBe('R');
    expect(applyPadPress('R U', 'F', {})).toBe('R U F');
  });

  it('appends a prime on a hold', () => {
    expect(applyPadPress('', 'R', { held: true })).toBe("R'");
    expect(applyPadPress('R', 'U', { held: true })).toBe("R U'");
  });

  it('makes one R2 out of tap-tap, and not two tokens', () => {
    const once = applyPadPress('', 'R', {});
    const twice = applyPadPress(once, 'R', { repeat: true });
    expect(twice).toBe('R2');
    expect(tokenize(twice)).toHaveLength(1);
  });

  it('starts a fresh move on the third tap', () => {
    let alg = applyPadPress('', 'R', {});
    alg = applyPadPress(alg, 'R', { repeat: true });
    alg = applyPadPress(alg, 'R', { repeat: true });
    expect(alg).toBe('R2 R');
  });

  it('treats a hold on the promoting tap as a plain promotion', () => {
    // `R2'` is `R2`, so the hold is ignored rather than being an error.
    const once = applyPadPress('', 'R', {});
    expect(applyPadPress(once, 'R', { repeat: true, held: true })).toBe('R2');
  });

  it('writes a prime when the `′` key was armed', () => {
    expect(applyPadPress('', 'R', { primed: true })).toBe("R'");
    expect(applyPadPress('U', 'M', { primed: true })).toBe("U M'");
  });

  it('lets an armed prime beat a promotion, because arming is deliberate', () => {
    // You tapped `′` and then `R`. The only thing that can mean is `R'`.
    expect(applyPadPress('R', 'R', { primed: true, repeat: true })).toBe("R R'");
  });

  it('still lets a hold lose to a promotion, because a hold is a duration', () => {
    // The asymmetry with the case above is the whole difference between the two
    // routes to a prime: one is a statement, the other is a finger resting a
    // moment too long on the second tap.
    expect(applyPadPress('R', 'R', { held: true, repeat: true })).toBe('R2');
  });

  it('treats the two routes to a prime as the same result', () => {
    expect(applyPadPress('U', 'R', { held: true })).toBe(
      applyPadPress('U', 'R', { primed: true })
    );
  });

  it('appends rather than promoting when the token is no longer there', () => {
    // The race an undo opens: the promotion would *rewrite* the last token, so
    // a stale one would resurrect a move that had just been deleted. The text
    // is the guard, so a promotion aimed at a move that is gone becomes an
    // ordinary append.
    expect(applyPadPress('R U', 'R', { repeat: true })).toBe('R U R');
    expect(applyPadPress('', 'R', { repeat: true })).toBe('R');
  });

  it('writes notation the parser can read, whatever the gesture', () => {
    PAD_KEYS.forEach((key) => {
      [{}, { held: true }, { repeat: true }].forEach((gesture) => {
        const alg = applyPadPress(applyPadPress('', key, {}), key, gesture);
        expect(isValidAlg(alg)).toBe(true);
      });
    });
  });

  it('keeps the spelling that was pressed', () => {
    // `r` is not rewritten to `Rw` by a promotion any more than by an append.
    expect(applyPadPress('r', 'r', { repeat: true })).toBe('r2');
  });
});

describe('backspace against the promotion', () => {
  it('takes a promoted token off whole, in one press', () => {
    // `R2` goes to nothing rather than back to `R` (plan §8.8).
    const promoted = applyPadPress(applyPadPress('', 'R', {}), 'R', { repeat: true });
    expect(promoted).toBe('R2');
    expect(dropLastToken(promoted)).toBe('');
  });

  it('does the same in the middle of a solve', () => {
    expect(dropLastToken('r U R2')).toBe('r U');
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
    alg = applyPadPress(alg, 'r', {});
    alg = applyPadPress(alg, 'U', { held: true });
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
      ['', "'", '2'].forEach((modifier) => {
        expect(describeToken(`${key}${modifier}`)).toBeTruthy();
      });
    });
  });

  it('names the two slices the pad only just gained', () => {
    expect(describeToken('E')).toBe('E slice');
    expect(describeToken("S'")).toBe('S slice prime');
  });
});
