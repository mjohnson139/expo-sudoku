import { EMPTY_TRAINING, LEVELS, applyWin, isUnlocked, starsFor, totalStars } from '../levels';
import { isSolved, makeScrambled, maxN } from '../puzzle';

describe('LEVELS ladder', () => {
  it('has contiguous 1-based ids', () => {
    LEVELS.forEach((l, i) => expect(l.id).toBe(i + 1));
  });

  it('every level fits the palette and has a sane definition', () => {
    for (const l of LEVELS) {
      expect(l.n).toBeGreaterThanOrEqual(3);
      expect(l.n).toBeLessThanOrEqual(maxN(l.mode));
      expect(l.scramble).toBeGreaterThanOrEqual(1);
      expect(l.stars.three).toBeGreaterThan(0);
      expect(l.stars.three).toBeLessThan(l.stars.two);
    }
  });

  it('no level board is already solved', () => {
    for (const l of LEVELS) {
      expect(isSolved(makeScrambled(l.seed, l.n, l.mode, l.scramble), l.mode)).toBe(false);
    }
  });

  it('starts gentle: level 1 is a tiny 3x3 scramble', () => {
    expect(LEVELS[0]).toMatchObject({ n: 3, mode: 'rows' });
    expect(LEVELS[0].scramble).toBeLessThanOrEqual(2);
  });
});

describe('starsFor', () => {
  const level = LEVELS[0]; // stars { two: 10, three: 5 }

  it('awards by time thresholds, inclusive at the boundary', () => {
    expect(starsFor(level, level.stars.three)).toBe(3);
    expect(starsFor(level, level.stars.three + 1)).toBe(2);
    expect(starsFor(level, level.stars.two)).toBe(2);
    expect(starsFor(level, level.stars.two + 1)).toBe(1);
  });
});

describe('applyWin / isUnlocked', () => {
  it('only level 1 is unlocked initially', () => {
    expect(isUnlocked(EMPTY_TRAINING, 1)).toBe(true);
    expect(isUnlocked(EMPTY_TRAINING, 2)).toBe(false);
  });

  it('winning a level unlocks the next one and records the result', () => {
    const p = applyWin(EMPTY_TRAINING, 1, 7, 3);
    expect(p.unlocked).toBe(2);
    expect(p.best[1]).toEqual({ secs: 7, moves: 3, stars: 2 });
  });

  it('replaying an earlier level never lowers unlocked', () => {
    let p = applyWin(EMPTY_TRAINING, 1, 7, 3);
    p = applyWin(p, 2, 9, 4);
    expect(p.unlocked).toBe(3);
    p = applyWin(p, 1, 4, 2);
    expect(p.unlocked).toBe(3);
  });

  it('keeps only the best time; stars never regress', () => {
    let p = applyWin(EMPTY_TRAINING, 1, 4, 2); // 3 stars
    p = applyWin(p, 1, 20, 9); // slower — ignored
    expect(p.best[1]).toEqual({ secs: 4, moves: 2, stars: 3 });
    p = applyWin(p, 1, 3, 8); // faster — replaces, stars stay 3
    expect(p.best[1]).toEqual({ secs: 3, moves: 8, stars: 3 });
  });

  it('clamps unlocked at the last level', () => {
    const last = LEVELS.length;
    const p = applyWin({ unlocked: last, best: {} }, last, 60, 30);
    expect(p.unlocked).toBe(last);
  });

  it('ignores unknown level ids', () => {
    expect(applyWin(EMPTY_TRAINING, 999, 5, 5)).toEqual(EMPTY_TRAINING);
  });

  it('totalStars sums earned stars', () => {
    let p = applyWin(EMPTY_TRAINING, 1, 4, 2); // 3 stars
    p = applyWin(p, 2, 100, 40); // 1 star
    expect(totalStars(p)).toBe(4);
  });
});
