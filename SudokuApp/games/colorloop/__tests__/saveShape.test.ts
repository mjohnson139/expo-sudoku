import { LEVELS } from '../levels';
import { maxN } from '../puzzle';
import {
  DEFAULT_PHYSICS,
  PHYSICS_RANGE,
  emptyColorLoopSave,
  readColorLoopSave,
  sanitizeMatchBest,
  sanitizePhysics,
  sanitizeTraining,
} from '../saveShape';

describe('sanitizeTraining', () => {
  it('round-trips a valid progress blob', () => {
    const p = { unlocked: 3, best: { 1: { secs: 7, moves: 3, stars: 2 }, 2: { secs: 30, moves: 12, stars: 1 } } };
    expect(sanitizeTraining(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });

  it('falls back cleanly on garbage', () => {
    for (const raw of [null, undefined, 42, 'nope', [], { unlocked: 'x', best: 3 }]) {
      expect(sanitizeTraining(raw)).toEqual({ unlocked: 1, best: {} });
    }
  });

  it('clamps unlocked into [1, LEVELS.length]', () => {
    expect(sanitizeTraining({ unlocked: 0, best: {} }).unlocked).toBe(1);
    expect(sanitizeTraining({ unlocked: 999, best: {} }).unlocked).toBe(LEVELS.length);
  });

  it('drops invalid best entries and out-of-range ids', () => {
    const p = sanitizeTraining({
      unlocked: 2,
      best: {
        1: { secs: 7, moves: 3, stars: 2 },
        2: { secs: 'bad' },
        999: { secs: 5, moves: 1, stars: 3 },
      },
    });
    expect(Object.keys(p.best)).toEqual(['1']);
  });

  it('clamps stars into [1, 3]', () => {
    const p = sanitizeTraining({ unlocked: 1, best: { 1: { secs: 5, moves: 2, stars: 9 } } });
    expect(p.best[1].stars).toBe(3);
  });
});

describe('sanitizeMatchBest', () => {
  it('round-trips a valid map', () => {
    const m = { 'MS-K7P2Q': { secs: 71, moves: 42, name: 'Mike' } };
    expect(sanitizeMatchBest(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });

  it('falls back cleanly on garbage and drops bad entries', () => {
    expect(sanitizeMatchBest(null)).toEqual({});
    expect(sanitizeMatchBest('x')).toEqual({});
    expect(sanitizeMatchBest({ 'MS-A': { secs: 'bad' }, 'MC-B': { secs: 9 } })).toEqual({
      'MC-B': { secs: 9, moves: 0, name: '' },
    });
  });
});

/**
 * The `@ColorLoop` blob — eleven unprefixed keys consolidated into one versioned
 * record (plan §4.4).
 *
 * **Every field falls back on its own**, which is the difference between this
 * reader and `games/numberslide/saveShape.ts`'s. That one restores a *board*, so
 * a half-valid grid has to be refused outright; this one restores *preferences*,
 * and a corrupt physics value should cost the player their physics value and not
 * their eighteen training stars.
 */
describe('readColorLoopSave', () => {
  it('round-trips a full save', () => {
    const save = {
      n: 5,
      mode: 'ordered' as const,
      playerName: 'Mike',
      bestMap: { '5o': { secs: 91, name: 'Mike' } },
      physics: { friction: 0.9, flick: 0.2, magnet: 0.4, twin: 0.2 },
      training: { unlocked: 3, best: { 1: { secs: 7, moves: 3, stars: 2 } } },
      matchBest: { 'MS-K7P2Q': { secs: 71, moves: 42, name: 'Mike' } },
    };
    expect(readColorLoopSave(JSON.parse(JSON.stringify(save)))).toEqual(save);
  });

  it('reads an absent or unusable blob as a first launch', () => {
    for (const raw of [null, undefined, 42, 'nope', []]) {
      expect(readColorLoopSave(raw)).toEqual(emptyColorLoopSave());
    }
  });

  it('keeps the fields it can read when a neighbour is garbage', () => {
    const out = readColorLoopSave({
      n: 'four',
      mode: 'sideways',
      physics: 'broken',
      training: { unlocked: 4, best: {} },
    });
    // The unreadable fields fall back; the training progress survives intact.
    expect(out.n).toBe(4);
    expect(out.mode).toBe('rows');
    expect(out.physics).toEqual(DEFAULT_PHYSICS);
    expect(out.training.unlocked).toBe(4);
  });

  /**
   * The size and the goal are stored separately, so an inconsistent pair is a
   * shape this has to handle rather than one it can assume away — and getting it
   * wrong means a diagonal board asking for more colours than the palette holds.
   */
  it('reconciles a size the stored goal cannot reach', () => {
    const out = readColorLoopSave({ n: 6, mode: 'diag' });
    expect(out.n).toBe(maxN('diag'));
    expect(out.n).toBe(4);
  });

  it('clamps a size outside the range any goal offers', () => {
    expect(readColorLoopSave({ n: 99, mode: 'rows' }).n).toBe(6);
    expect(readColorLoopSave({ n: 0, mode: 'rows' }).n).toBe(3);
  });

  it('truncates a name to what the field accepts', () => {
    expect(readColorLoopSave({ playerName: 'a'.repeat(40) }).playerName).toHaveLength(12);
  });

  it('drops best entries that would not draw', () => {
    const out = readColorLoopSave({
      bestMap: { '4a': { secs: 30, name: 'Mike' }, '5a': { secs: 'soon' }, '6a': null },
    });
    expect(Object.keys(out.bestMap)).toEqual(['4a']);
  });
});

describe('sanitizePhysics', () => {
  it('clamps every value into the range its slider offers', () => {
    const out = sanitizePhysics({ friction: 99, flick: -1, magnet: 0.5, twin: 12 });
    expect(out.friction).toBe(PHYSICS_RANGE.friction.hi);
    expect(out.flick).toBe(PHYSICS_RANGE.flick.lo);
    expect(out.magnet).toBe(0.5);
    expect(out.twin).toBe(PHYSICS_RANGE.twin.hi);
  });

  it('falls back per value rather than all at once', () => {
    const out = sanitizePhysics({ friction: 0.8, flick: 'fast' });
    expect(out.friction).toBe(0.8);
    expect(out.flick).toBe(DEFAULT_PHYSICS.flick);
  });

  it('defaults every value on garbage', () => {
    for (const raw of [null, undefined, 7, 'nope']) {
      expect(sanitizePhysics(raw)).toEqual(DEFAULT_PHYSICS);
    }
  });

  it('ships defaults that sit inside their own ranges', () => {
    (Object.keys(PHYSICS_RANGE) as (keyof typeof PHYSICS_RANGE)[]).forEach((key) => {
      expect(DEFAULT_PHYSICS[key]).toBeGreaterThanOrEqual(PHYSICS_RANGE[key].lo);
      expect(DEFAULT_PHYSICS[key]).toBeLessThanOrEqual(PHYSICS_RANGE[key].hi);
    });
  });
});

describe('the empty save', () => {
  it('is a board this game can actually deal', () => {
    const empty = emptyColorLoopSave();
    expect(empty.n).toBeLessThanOrEqual(maxN(empty.mode));
    expect(empty.training).toEqual({ unlocked: 1, best: {} });
    expect(LEVELS[empty.training.unlocked - 1]).toBeDefined();
  });

  it('hands out a fresh object each time, not a shared one', () => {
    const a = emptyColorLoopSave();
    a.physics.magnet = 0.01;
    expect(emptyColorLoopSave().physics.magnet).toBe(DEFAULT_PHYSICS.magnet);
  });
});
