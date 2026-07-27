import { FUNGIKU_STORAGE_VERSION, migrateFungikuSave } from '../saveMigration';
import { MARKS, createEmptyMarks } from '../engine';
import { MAX_LIVES } from '../reducer';

/** A v1 save exactly as Steps 4-8 wrote one. */
const v1Save = (overrides = {}) => {
  const marks = createEmptyMarks(6);
  marks[3] = MARKS.MUSHROOM;
  marks[4] = MARKS.X;

  return {
    _v: 1,
    size: 6,
    seed: 7,
    marks,
    showMistakes: true,
    hintsUsed: 2,
    ...overrides,
  };
};

describe('migrating a v1 save', () => {
  it('names the difficulty the saved size belongs to', () => {
    const migrated = migrateFungikuSave(v1Save());

    expect(migrated._v).toBe(FUNGIKU_STORAGE_VERSION);
    expect(migrated.difficulty).toBe('easy');
  });

  it('does not wipe or alter the board — this is the whole point', () => {
    const saved = v1Save();
    const migrated = migrateFungikuSave(saved);

    expect(migrated.size).toBe(6);
    expect(migrated.seed).toBe(7);
    expect(migrated.marks).toEqual(saved.marks);
  });

  it('keeps the size even though the new difficulty could resolve to another one', () => {
    // Easy spans 5-6. A migration that re-derived the size from the difficulty
    // would hand back a 5×5 and strand the player's deductions on a board that
    // no longer exists.
    expect(migrateFungikuSave(v1Save({ size: 6, seed: 2 })).size).toBe(6);
    expect(migrateFungikuSave(v1Save({ size: 5, seed: 1 })).size).toBe(5);
  });

  it('carries the other v1 fields forward untouched', () => {
    expect(migrateFungikuSave(v1Save()).hintsUsed).toBe(2);
  });

  it('maps every size a v1 save could hold onto a real rung', () => {
    const expected = {
      5: 'easy',
      6: 'easy',
      7: 'medium',
      8: 'hard',
      9: 'hard',
      10: 'expert',
    };

    Object.entries(expected).forEach(([size, difficulty]) => {
      const marks = createEmptyMarks(Number(size));
      marks[0] = MARKS.X;
      expect(migrateFungikuSave(v1Save({ size: Number(size), marks })).difficulty).toBe(difficulty);
    });
  });

  it('does not mutate the blob it was handed', () => {
    const saved = v1Save();
    migrateFungikuSave(saved);
    expect(saved._v).toBe(1);
    expect(saved.difficulty).toBeUndefined();
  });
});

/**
 * v2 → v3 (Step 10, plan §14.3): the "Show mistakes" preference is deleted and a
 * board now carries what it has cost.
 */
describe('migrating a v2 save', () => {
  const v2Save = (overrides = {}) => {
    const { showMistakes, ...rest } = v1Save();
    return { ...rest, _v: 2, difficulty: 'easy', showMistakes, ...overrides };
  };

  it('drops the correctness-feedback preference rather than translating it', () => {
    // There is nothing to translate it *to*: feedback stopped being a preference
    // and became a rule of the game.
    expect(migrateFungikuSave(v2Save({ showMistakes: true }))).not.toHaveProperty('showMistakes');
    expect(migrateFungikuSave(v2Save({ showMistakes: false }))).not.toHaveProperty('showMistakes');
  });

  it('hands the board a full complement of lives', () => {
    // The save has no record of what its guesses would have cost, and inventing
    // a debt for a player who simply updated the app would be worse than level.
    expect(migrateFungikuSave(v2Save()).lives).toBe(MAX_LIVES);
    expect(migrateFungikuSave(v2Save()).mistakeCells).toEqual([]);
  });

  it('does not wipe or alter the board — still the whole point', () => {
    const saved = v2Save();
    const migrated = migrateFungikuSave(saved);

    expect(migrated._v).toBe(FUNGIKU_STORAGE_VERSION);
    expect(migrated.size).toBe(6);
    expect(migrated.seed).toBe(7);
    expect(migrated.marks).toEqual(saved.marks);
    expect(migrated.difficulty).toBe('easy');
    expect(migrated.hintsUsed).toBe(2);
  });
});

describe('a v1 save brought all the way forward', () => {
  it('picks up both bumps in one pass', () => {
    const migrated = migrateFungikuSave(v1Save());

    expect(migrated._v).toBe(FUNGIKU_STORAGE_VERSION);
    expect(migrated.difficulty).toBe('easy');
    expect(migrated.lives).toBe(MAX_LIVES);
    expect(migrated).not.toHaveProperty('showMistakes');
  });
});

describe('a current save', () => {
  const v3Save = (overrides = {}) => {
    const { showMistakes, ...rest } = v1Save();
    return {
      ...rest,
      _v: FUNGIKU_STORAGE_VERSION,
      difficulty: 'easy',
      lives: 2,
      mistakeCells: [4],
      ...overrides,
    };
  };

  it('passes through unchanged', () => {
    const saved = v3Save();
    expect(migrateFungikuSave(saved)).toEqual(saved);
  });

  it('keeps the lives it was saved with — a round trip is not a refund', () => {
    expect(migrateFungikuSave(v3Save({ lives: 1 })).lives).toBe(1);
    expect(migrateFungikuSave(v3Save({ lives: 0 })).lives).toBe(0);
  });

  it('has a corrupt difficulty repaired from its size rather than being discarded', () => {
    const saved = v3Save({ difficulty: 'legendary' });
    expect(migrateFungikuSave(saved).difficulty).toBe('easy');
    expect(migrateFungikuSave(saved).marks).toEqual(saved.marks);
  });

  it('has a corrupt life count repaired rather than drawing a heart row it cannot', () => {
    expect(migrateFungikuSave(v3Save({ lives: 99 })).lives).toBe(MAX_LIVES);
    expect(migrateFungikuSave(v3Save({ lives: -1 })).lives).toBe(0);
    expect(migrateFungikuSave(v3Save({ lives: 'three' })).lives).toBe(MAX_LIVES);
  });

  it('discards mistake records that are not cell indices', () => {
    expect(migrateFungikuSave(v3Save({ mistakeCells: 'nope' })).mistakeCells).toEqual([]);
    expect(migrateFungikuSave(v3Save({ mistakeCells: [1, 'x', 2.5] })).mistakeCells).toEqual([1]);
  });
});

describe('saves there is nothing trustworthy to restore from', () => {
  it('refuses nothing at all', () => {
    expect(migrateFungikuSave(null)).toBeNull();
    expect(migrateFungikuSave(undefined)).toBeNull();
    expect(migrateFungikuSave('{}')).toBeNull();
  });

  it('refuses a blob with no board in it', () => {
    expect(migrateFungikuSave({ _v: 1, seed: 1, marks: [] })).toBeNull();
    expect(migrateFungikuSave({ _v: 1, size: 6, seed: 1 })).toBeNull();
    expect(migrateFungikuSave({ _v: 1, size: 'six', seed: 1, marks: [] })).toBeNull();
  });

  it('refuses a version from the future — a downgraded app cannot know the shape', () => {
    expect(
      migrateFungikuSave({ ...v1Save(), _v: FUNGIKU_STORAGE_VERSION + 1 })
    ).toBeNull();
  });

  it('refuses a version with no path forward', () => {
    // v0 never existed; there is no migration registered for it.
    expect(migrateFungikuSave({ ...v1Save(), _v: 0 })).toBeNull();
    expect(migrateFungikuSave({ ...v1Save(), _v: undefined })).toBeNull();
  });
});
