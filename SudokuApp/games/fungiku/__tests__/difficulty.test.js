import {
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  DIFFICULTY_IDS,
  difficultyForSize,
  difficultyLabel,
  isDifficulty,
  sizeForDifficulty,
  sizesForDifficulty,
} from '../difficulty';
import { MAX_SIZE, MIN_SIZE, SIZES, generate } from '../engine';

describe('the difficulty table', () => {
  it('offers the four rungs Sudoku offers, in the same order', () => {
    expect(DIFFICULTY_IDS).toEqual(['easy', 'medium', 'hard', 'expert']);
    expect(DIFFICULTIES.map((rung) => rung.label)).toEqual(['Easy', 'Medium', 'Hard', 'Expert']);
  });

  it('maps to the sizes the plan specifies (§14.1)', () => {
    expect(sizesForDifficulty('easy')).toEqual([5, 6]);
    expect(sizesForDifficulty('medium')).toEqual([7]);
    expect(sizesForDifficulty('hard')).toEqual([8, 9]);
    expect(sizesForDifficulty('expert')).toEqual([10]);
  });

  it('never names a size the engine does not support', () => {
    DIFFICULTIES.forEach((rung) => {
      expect(rung.sizes.length).toBeGreaterThan(0);
      rung.sizes.forEach((size) => {
        expect(SIZES).toContain(size);
        expect(size).toBeGreaterThanOrEqual(MIN_SIZE);
        expect(size).toBeLessThanOrEqual(MAX_SIZE);
      });
    });
  });

  it('covers every size the engine supports exactly once', () => {
    // Both halves matter: no size is unreachable from the menu, and no size is
    // claimed by two rungs (which would make difficultyForSize ambiguous).
    const claimed = DIFFICULTIES.flatMap((rung) => rung.sizes);
    expect([...claimed].sort((a, b) => a - b)).toEqual([...SIZES]);
  });

  it('starts on the gentlest rung', () => {
    expect(DEFAULT_DIFFICULTY).toBe('easy');
  });

  it('recognizes its own rungs and nothing else', () => {
    DIFFICULTY_IDS.forEach((id) => expect(isDifficulty(id)).toBe(true));
    ['', 'EASY', 'trivial', null, undefined, 7].forEach((bad) =>
      expect(isDifficulty(bad)).toBe(false)
    );
  });

  it('falls back to the default rung for an unknown difficulty', () => {
    expect(sizesForDifficulty('impossible')).toEqual(sizesForDifficulty(DEFAULT_DIFFICULTY));
    expect(sizesForDifficulty(undefined)).toEqual(sizesForDifficulty(DEFAULT_DIFFICULTY));
  });

  it('labels a rung for the hub badge, and says nothing for a non-rung', () => {
    expect(difficultyLabel('hard')).toBe('Hard');
    expect(difficultyLabel('nonsense')).toBe('');
  });
});

describe('picking a size for a difficulty', () => {
  it('is determined by the seed, so {difficulty, seed} is always the same board', () => {
    for (let seed = 0; seed < 12; seed++) {
      DIFFICULTY_IDS.forEach((id) => {
        expect(sizeForDifficulty(id, seed)).toBe(sizeForDifficulty(id, seed));
      });
    }
  });

  it('always resolves to one of that difficulty’s sizes', () => {
    for (let seed = -5; seed < 20; seed++) {
      DIFFICULTY_IDS.forEach((id) => {
        expect(sizesForDifficulty(id)).toContain(sizeForDifficulty(id, seed));
      });
    }
  });

  it('reaches both sizes of a two-size rung across seeds', () => {
    const seen = new Set();
    for (let seed = 0; seed < 8; seed++) seen.add(sizeForDifficulty('easy', seed));
    expect([...seen].sort()).toEqual([5, 6]);
  });

  it('is stable for a single-size rung whatever the seed', () => {
    for (let seed = 0; seed < 8; seed++) {
      expect(sizeForDifficulty('expert', seed)).toBe(10);
      expect(sizeForDifficulty('medium', seed)).toBe(7);
    }
  });

  it('survives a seed that is not a usable number', () => {
    [undefined, null, NaN, Infinity, 'four'].forEach((seed) => {
      expect(sizesForDifficulty('easy')).toContain(sizeForDifficulty('easy', seed));
    });
  });

  it('treats a negative seed as its magnitude rather than returning undefined', () => {
    expect(sizeForDifficulty('easy', -3)).toBe(sizeForDifficulty('easy', 3));
  });
});

describe('naming the rung a raw size belongs to', () => {
  it('inverts the table', () => {
    expect(difficultyForSize(5)).toBe('easy');
    expect(difficultyForSize(6)).toBe('easy');
    expect(difficultyForSize(7)).toBe('medium');
    expect(difficultyForSize(8)).toBe('hard');
    expect(difficultyForSize(9)).toBe('hard');
    expect(difficultyForSize(10)).toBe('expert');
  });

  it('falls back to the default rung for a size that is not on the table', () => {
    // What a save from a build with different engine bounds would look like.
    [0, 4, 11, 99, undefined, null].forEach((size) =>
      expect(difficultyForSize(size)).toBe(DEFAULT_DIFFICULTY)
    );
  });
});

/**
 * The point of this file. A typo in the table is not a wrong label — it is a
 * crash for whoever picks that difficulty, because `generate()` throws for a size
 * outside the engine's bounds.
 *
 * Deliberately slow: this generates 10×10, which is ~3s under Jest (the babel
 * transform costs ~7× — plan §12.1), so the whole battery gets a generous
 * timeout rather than being trimmed to the cheap sizes.
 */
describe('every difficulty generates a real board at every size it maps to', () => {
  DIFFICULTIES.forEach((rung) => {
    rung.sizes.forEach((size) => {
      it(`${rung.id} at ${size}×${size}`, () => {
        const puzzle = generate({ size, seed: 1 });

        expect(puzzle.size).toBe(size);
        expect(puzzle.solution).toHaveLength(size);
        expect(puzzle.regions).toHaveLength(size * size);
      }, 30000);
    });
  });

  it('generates whatever the seed resolves to, for every rung', () => {
    DIFFICULTY_IDS.forEach((id) => {
      // Seed 2 exercises the other branch of a two-size rung than seed 1 does.
      [1, 2].forEach((seed) => {
        const size = sizeForDifficulty(id, seed);
        expect(() => generate({ size, seed })).not.toThrow();
      });
    });
  }, 60000);
});
