import {
  DEFAULT_SCRAMBLE_LENGTH,
  describeScramble,
  isWellFormedScramble,
  randomScramble,
} from '../scramble';
import { isValidAlg, moveCount } from '../moves';
import { cubeFromAlg, isSolved } from '../cubeState';

describe('randomScramble', () => {
  it('produces the asked-for number of moves, all valid notation', () => {
    for (let i = 0; i < 200; i += 1) {
      const alg = randomScramble();
      expect(moveCount(alg)).toBe(DEFAULT_SCRAMBLE_LENGTH);
      expect(isValidAlg(alg)).toBe(true);
    }
  });

  it('honours a custom length', () => {
    expect(moveCount(randomScramble({ length: 8 }))).toBe(8);
    expect(moveCount(randomScramble({ length: 1 }))).toBe(1);
  });

  it('never repeats a face, and never sandwiches one between its opposite', () => {
    for (let i = 0; i < 500; i += 1) {
      expect(isWellFormedScramble(randomScramble())).toBe(true);
    }
  });

  it('terminates on a degenerate random source, rather than looping forever', () => {
    // A `random` that always answers the same thing would spin a
    // draw-and-retry generator forever, because the draw it keeps proposing is
    // the one face that is not allowed. Choosing from the allowed faces instead
    // makes every draw succeed. Both ends of the range, since both are the kind
    // of stub a future test will reach for.
    [() => 0, () => 0.999999999, () => 0.5].forEach((random) => {
      const alg = randomScramble({ length: 12, random });
      expect(moveCount(alg)).toBe(12);
      expect(isWellFormedScramble(alg)).toBe(true);
      expect(alg).not.toMatch(/undefined/);
    });
  });

  it('never leaves the cube solved', () => {
    for (let i = 0; i < 100; i += 1) {
      expect(isSolved(cubeFromAlg(randomScramble()))).toBe(false);
    }
  });

  it('is not deterministic — two scrambles in a row differ', () => {
    const seen = new Set();
    for (let i = 0; i < 50; i += 1) seen.add(randomScramble());
    expect(seen.size).toBe(50);
  });

});

describe('isWellFormedScramble', () => {
  it('accepts a legal one', () => {
    expect(isWellFormedScramble("R U2 F' D L B2")).toBe(true);
  });

  it('rejects a repeated face', () => {
    expect(isWellFormedScramble("R R' U")).toBe(false);
  });

  it('rejects a face sandwiched between its opposite', () => {
    expect(isWellFormedScramble('U D U')).toBe(false);
    // …but the same three faces in an order that is not redundant are fine.
    expect(isWellFormedScramble('U D R')).toBe(true);
  });

  it('rejects slices and rotations — a scramble is face turns only', () => {
    expect(isWellFormedScramble("M U R'")).toBe(false);
    expect(isWellFormedScramble('')).toBe(false);
  });
});

describe('describeScramble', () => {
  it('counts the moves, and gets the singular right', () => {
    expect(describeScramble("R U R' U'")).toBe('4 moves');
    expect(describeScramble('R')).toBe('1 move');
    expect(describeScramble('')).toBe('0 moves');
  });
});
