import {
  CASE_CELLS,
  CASE_CENTRE,
  EMPTY_CASE,
  SOLVED_CASE,
  captureCase,
  caseOfAlgorithm,
  describeCase,
  sanitizeCase,
  toggleCaseCell,
} from '../algCase';
import { cubeFromAlg, solvedCube } from '../cubeState';
import { invertAlg } from '../moves';

/**
 * Real algorithms, because the arithmetic is only interesting if it agrees with
 * what a cuber would draw. The OLLs are last-layer algorithms — they preserve
 * F2L, so their inverses do too — and the PLLs are here to prove the U face is
 * not enough on its own.
 */
const SUNE = "R U R' U R U2 R'";
const ANTI_SUNE = "R U2 R' U' R U' R'";
const TPERM = "R U R' U' R' F R2 U' R' U' R U R' F'";
const JPERM = "R U R' F' R U R' U' R' F R2 U' R' U'";
const DOT_OLL = "F R U R' U' F' f R U R' U' f'";
const H_OLL = "R U R' U R U' R' U R U2 R'";
const ROUX_LSE = "M' U' M U2 M' U' M";

const oriented = (pattern) => pattern.split('').filter((cell) => cell === 'y').length;

describe('captureCase', () => {
  it('reads a solved cube as nine oriented stickers', () => {
    expect(captureCase(solvedCube())).toBe(SOLVED_CASE);
    expect(SOLVED_CASE).toHaveLength(CASE_CELLS);
  });

  it('compares against the U centre, not against a colour', () => {
    // `z2` puts what was the D face on top, and `x` puts F there. Neither is a
    // scramble, so all three have to read as solved. A capture written against
    // a fixed yellow would fail two of them.
    expect(captureCase(cubeFromAlg('z2'))).toBe(SOLVED_CASE);
    expect(captureCase(cubeFromAlg('x'))).toBe(SOLVED_CASE);
    expect(captureCase(cubeFromAlg('x y z'))).toBe(SOLVED_CASE);
  });

  it('marks the stickers a turn moved off the top', () => {
    // One quarter turn of R takes three U stickers away and brings three up.
    const pattern = captureCase(cubeFromAlg('R'));
    expect(oriented(pattern)).toBe(6);
    expect(pattern[CASE_CENTRE]).toBe('y');
  });
});

describe('caseOfAlgorithm', () => {
  /**
   * **The literal this whole step is checked against.**
   *
   * Sune is the first case anybody learns: the cross is done — all four edges
   * oriented — and exactly one corner is facing up. That is six oriented
   * stickers, and `.y.yyyyy.` is where they are, with the corner at the front
   * left.
   *
   * `docs/cube-methods-handoff.md` and plan §3.2 both quote `.y..yy.y.` as "the
   * literal from the design", and it is **not** Sune's case: it has three of the
   * four edges oriented and no corners at all. No cube with its first two layers
   * solved can show that, because last-layer edge orientation is always even —
   * flipping one edge flips another. (The pattern is reachable on a *scrambled*
   * cube, where the top layer holds pieces from elsewhere, so it is a possible
   * capture; it is not a possible OLL.) The design's tile is a drawing; this is
   * the arithmetic, and where the two disagree about a real algorithm the
   * arithmetic is the one holding a cube.
   */
  it('is the Sune case for Sune', () => {
    expect(caseOfAlgorithm(SUNE)).toBe('.y.yyyyy.');
  });

  it('is the mirror-ish anti-Sune case for anti-Sune', () => {
    // The other one-corner OLL: four edges again, and the oriented corner has
    // moved to the back right.
    expect(caseOfAlgorithm(ANTI_SUNE)).toBe('.yyyyy.y.');
  });

  it('reads every PLL as a fully oriented top — which is right, and not enough', () => {
    // Permutation moves pieces without turning them, so a T-perm's case and a
    // J-perm's case are the same nine characters. That is the U-face-only case
    // failing to tell two algorithms apart, and it is plan §6's question 8
    // rather than a bug. **Do not "fix" this**: the fix is a richer case, and
    // the evidence for wanting one is a real library with two identical tiles.
    expect(caseOfAlgorithm(TPERM)).toBe(SOLVED_CASE);
    expect(caseOfAlgorithm(JPERM)).toBe(SOLVED_CASE);
  });

  it('reads a dot OLL as the centre alone', () => {
    expect(caseOfAlgorithm(DOT_OLL)).toBe('....y....');
  });

  it('gives every last-layer case an even number of oriented edges', () => {
    // The property the Sune literal above turns on, checked rather than
    // asserted: an OLL case can have 0, 2 or 4 edges facing up and never 1 or 3.
    [SUNE, ANTI_SUNE, TPERM, JPERM, DOT_OLL, H_OLL].forEach((alg) => {
      const pattern = caseOfAlgorithm(alg);
      const edges = [1, 3, 5, 7].filter((index) => pattern[index] === 'y').length;
      expect(edges % 2).toBe(0);
    });
  });

  it('always says the centre is oriented', () => {
    [SUNE, TPERM, DOT_OLL, ROUX_LSE].forEach((alg) => {
      expect(caseOfAlgorithm(alg)[CASE_CENTRE]).toBe('y');
    });
  });

  it('reads no moves as the solved cube, because that is what they solve', () => {
    expect(caseOfAlgorithm('')).toBe(SOLVED_CASE);
    expect(caseOfAlgorithm(null)).toBe(SOLVED_CASE);
  });

  it('refuses moves that do not parse rather than guessing', () => {
    expect(caseOfAlgorithm('R U banana')).toBeNull();
  });

  it('is the case the algorithm actually solves', () => {
    // The whole claim, checked end to end rather than through the inverse:
    // put the cube in the derived case, run the algorithm, and the top is solved.
    [SUNE, ANTI_SUNE, H_OLL, DOT_OLL].forEach((alg) => {
      expect(captureCase(cubeFromAlg(`${invertAlg(alg)} ${alg}`))).toBe(SOLVED_CASE);
    });
  });

  it('answers the same thing however the moves were spaced', () => {
    expect(caseOfAlgorithm("R U R'  U   R U2 R'")).toBe(caseOfAlgorithm(SUNE));
    expect(caseOfAlgorithm(`  ${SUNE}  `)).toBe(caseOfAlgorithm(SUNE));
  });

  it('survives more distinct algorithms than the memo holds', () => {
    // The cache is bounded and Step 2.5 will push a new key through it on every
    // move. Overflowing it must cost time, never correctness.
    for (let i = 0; i < 400; i += 1) caseOfAlgorithm(`${'U '.repeat(i % 7)}R`.trim());
    expect(caseOfAlgorithm(SUNE)).toBe('.y.yyyyy.');
  });
});

describe('sanitizeCase', () => {
  it('keeps a nine-character pattern', () => {
    expect(sanitizeCase(SOLVED_CASE)).toBe(SOLVED_CASE);
    expect(sanitizeCase(EMPTY_CASE)).toBe(EMPTY_CASE);
    expect(sanitizeCase('.y.yyyyy.')).toBe('.y.yyyyy.');
  });

  it('answers null for anything else, so the moves get to say instead', () => {
    // Null means "derive it" (`algorithmCase`) and `EMPTY_CASE` means "nothing
    // is oriented" — a real answer a hand correction can give. Sanitizing
    // corruption to `EMPTY_CASE` would pin a blank tile onto an entry whose
    // moves knew the answer.
    ['', 'yyy', 'y'.repeat(10), '.y.yyyyyx', null, undefined, 7, {}].forEach((raw) => {
      expect(sanitizeCase(raw)).toBeNull();
    });
  });
});

describe('toggleCaseCell', () => {
  it('flips one cell and leaves the rest', () => {
    expect(toggleCaseCell(EMPTY_CASE, 0)).toBe('y........');
    expect(toggleCaseCell('y........', 0)).toBe(EMPTY_CASE);
    expect(toggleCaseCell(SOLVED_CASE, 8)).toBe('yyyyyyyy.');
  });

  it('will not turn the centre off — it is what the others are measured against', () => {
    expect(toggleCaseCell(SOLVED_CASE, CASE_CENTRE)).toBe(SOLVED_CASE);
    expect(toggleCaseCell(EMPTY_CASE, CASE_CENTRE)).toBe(EMPTY_CASE);
  });

  it('starts an unknown pattern from empty rather than refusing', () => {
    expect(toggleCaseCell(null, 1)).toBe('.y.......');
    expect(toggleCaseCell('nonsense', 1)).toBe('.y.......');
  });

  it('ignores an index that is not a cell', () => {
    [-1, 9, 1.5, '1', null].forEach((index) => {
      expect(toggleCaseCell(SOLVED_CASE, index)).toBe(SOLVED_CASE);
    });
  });
});

describe('describeCase', () => {
  it('names the oriented cells when there are few', () => {
    expect(describeCase('.y.......')).toBe('Case: back edge oriented');
    expect(describeCase('y.y......')).toBe(
      'Case: back-left corner and back-right corner oriented'
    );
  });

  it('names the flat ones instead when that is the shorter half', () => {
    expect(describeCase('.y.yyyyy.')).toBe(
      'Case: every sticker oriented except the back-left corner, back-right corner and front-right corner'
    );
  });

  it('has a word for both extremes', () => {
    expect(describeCase(SOLVED_CASE)).toBe('Case: every sticker oriented');
    expect(describeCase(EMPTY_CASE)).toBe('Case: no stickers oriented');
  });

  it('never mentions the centre, which is always oriented and never news', () => {
    expect(describeCase('....y....')).toBe('Case: no stickers oriented');
    expect(describeCase(SOLVED_CASE)).not.toContain('centre');
  });

  it('says so rather than lying about a pattern it cannot read', () => {
    expect(describeCase('nonsense')).toBe('Case: unknown');
  });
});
