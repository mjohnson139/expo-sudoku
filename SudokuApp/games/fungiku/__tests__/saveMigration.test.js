import { FUNGIKU_STORAGE_VERSION, migrateFungikuSave } from '../saveMigration';
import { MARKS, createEmptyMarks } from '../engine';

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
    const migrated = migrateFungikuSave(v1Save());

    expect(migrated.showMistakes).toBe(true);
    expect(migrated.hintsUsed).toBe(2);
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

describe('a current save', () => {
  it('passes through unchanged', () => {
    const saved = { ...v1Save(), _v: FUNGIKU_STORAGE_VERSION, difficulty: 'easy' };
    expect(migrateFungikuSave(saved)).toEqual(saved);
  });

  it('has a corrupt difficulty repaired from its size rather than being discarded', () => {
    const saved = { ...v1Save(), _v: FUNGIKU_STORAGE_VERSION, difficulty: 'legendary' };
    expect(migrateFungikuSave(saved).difficulty).toBe('easy');
    expect(migrateFungikuSave(saved).marks).toEqual(saved.marks);
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
