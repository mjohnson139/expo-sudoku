import { LEVELS } from '../levels';
import { Grid, Mode, makeScrambled, maxN } from '../puzzle';
import { presetById } from '../match';
import {
  ColorLoopBoard,
  DEFAULT_PHYSICS,
  PHYSICS_RANGE,
  SavedPlay,
  colorCounts,
  describeColorLoopProgress,
  emptyColorLoopSave,
  readColorLoopBoard,
  readColorLoopSave,
  sanitizeMatchBest,
  sanitizePhysics,
  sanitizeTraining,
} from '../saveShape';

/** A board the game could really have dealt, for the readers below to chew on. */
function board(over: Partial<ColorLoopBoard> = {}): ColorLoopBoard {
  const n = over.n ?? 4;
  const mode: Mode = over.mode ?? 'rows';
  const seed = over.seed ?? 7331;
  return {
    seed,
    n,
    mode,
    grid: makeScrambled(seed, n, mode),
    moves: 9,
    secs: 84,
    phase: 'live',
    ctx: { kind: 'free' },
    ...over,
  };
}

/** The same board with one cell repainted — same shape, wrong multiset. */
function repaint(b: ColorLoopBoard): ColorLoopBoard {
  const grid: Grid = b.grid.map((row) => [...row]);
  grid[0][0] = (grid[0][0] + 1) % colorCounts(b.n, b.mode).length;
  return { ...b, grid };
}

const roundTrip = (b: ColorLoopBoard) => readColorLoopBoard(JSON.parse(JSON.stringify(b)));

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
      board: board({ n: 5, mode: 'ordered', moves: 12, secs: 40 }),
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

/**
 * The board in flight (Step 3, plan §4.6).
 *
 * The rule the rest of this file does not have: **all or nothing.** A grid that
 * renders happily and cannot be solved is worse than no save at all, so anything
 * that is not exactly a board this game could have dealt is refused, and a
 * refusal costs the player a fresh deal rather than their training stars.
 */
describe('colorCounts', () => {
  it('is n of each colour when every row starts one colour', () => {
    for (const mode of ['rows', 'ordered'] as const) {
      expect(colorCounts(4, mode)).toEqual([4, 4, 4, 4]);
      expect(colorCounts(6, mode)).toEqual([6, 6, 6, 6, 6, 6]);
    }
  });

  /**
   * The trap the handoff names: a diagonal board is **not** n of each. It runs
   * `0…2n−2` with triangular counts, so "n of each" would reject every valid
   * diagonal board and a reader without the check would restore unsolvable ones.
   */
  it('is triangular for a diagonal board', () => {
    expect(colorCounts(4, 'diag')).toEqual([1, 2, 3, 4, 3, 2, 1]);
    expect(colorCounts(3, 'diag')).toEqual([1, 2, 3, 2, 1]);
  });

  it('always accounts for every cell, on every mode and size', () => {
    for (const mode of ['rows', 'ordered', 'diag'] as const) {
      for (let n = 3; n <= maxN(mode); n++) {
        const counts = colorCounts(n, mode);
        expect(counts.reduce((a, b) => a + b, 0)).toBe(n * n);
        expect(counts.every((c) => c > 0)).toBe(true);
      }
    }
  });

  /** The multiset survives play, which is the only reason checking it is useful. */
  it('describes a scrambled board as well as a solved one', () => {
    for (const mode of ['rows', 'ordered', 'diag'] as const) {
      const n = Math.min(4, maxN(mode));
      const seen: number[] = [];
      for (const v of makeScrambled(4242, n, mode).flat()) seen[v] = (seen[v] ?? 0) + 1;
      expect(seen).toEqual(colorCounts(n, mode));
    }
  });
});

describe('readColorLoopBoard', () => {
  it('round-trips a board of every mode', () => {
    for (const mode of ['rows', 'ordered', 'diag'] as const) {
      const b = board({ n: Math.min(4, maxN(mode)), mode });
      expect(roundTrip(b)).toEqual(b);
    }
  });

  it('reads an absent or unusable record as no board at all', () => {
    for (const raw of [null, undefined, 42, 'nope', [], {}]) {
      expect(readColorLoopBoard(raw)).toBeNull();
    }
  });

  it('copies the grid rather than aliasing the parsed JSON', () => {
    const raw = JSON.parse(JSON.stringify(board()));
    const out = readColorLoopBoard(raw)!;
    raw.grid[0][0] = 99;
    expect(out.grid[0][0]).not.toBe(99);
  });

  /* ---------- the grid ---------- */

  it('refuses a grid whose colours are not the multiset its mode implies', () => {
    for (const mode of ['rows', 'ordered', 'diag'] as const) {
      const b = board({ n: Math.min(4, maxN(mode)), mode });
      expect(roundTrip(b)).not.toBeNull();
      expect(roundTrip(repaint(b))).toBeNull();
    }
  });

  /**
   * The literal transfer of Number Slide's reader, and why it is wrong here.
   * A 4×4 grid holding four each of `0…3` is a perfectly good `rows` board and
   * cannot be a diagonal one, which needs `0…6` in triangular counts.
   */
  it('does not accept a rows multiset as a diagonal board', () => {
    const rows = board({ n: 4, mode: 'rows' });
    expect(roundTrip({ ...rows, mode: 'diag' })).toBeNull();
  });

  it('refuses a grid that is not n by n', () => {
    const b = board({ n: 4 });
    expect(roundTrip({ ...b, grid: b.grid.slice(0, 3) })).toBeNull();
    expect(roundTrip({ ...b, grid: b.grid.map((row) => row.slice(0, 3)) })).toBeNull();
    expect(roundTrip({ ...b, grid: [] })).toBeNull();
  });

  it('refuses a grid holding anything that is not a colour index', () => {
    const b = board({ n: 4 });
    for (const bad of [1.5, -1, '0', null]) {
      const grid = b.grid.map((row) => [...row]);
      (grid as unknown[][])[1][2] = bad;
      expect(roundTrip({ ...b, grid })).toBeNull();
    }
  });

  /* ---------- the rest of the record ---------- */

  it('refuses a size the mode could never have dealt', () => {
    // Five colours of diagonal would need nine hues; Color Loop sees seven.
    expect(roundTrip({ ...board({ n: 5, mode: 'rows' }), mode: 'diag' })).toBeNull();
    expect(readColorLoopBoard({ ...board(), n: 2 })).toBeNull();
    expect(readColorLoopBoard({ ...board(), n: 7 })).toBeNull();
  });

  it('refuses an unknown goal', () => {
    expect(readColorLoopBoard({ ...board(), mode: 'sideways' })).toBeNull();
  });

  /** A finished puzzle is not something to continue, whoever wrote the record. */
  it('refuses a board that was already won', () => {
    expect(roundTrip({ ...board(), phase: 'won' as never })).toBeNull();
    expect(roundTrip({ ...board(), phase: 'paused' as never })).toBeNull();
  });

  it('keeps an armed board, which is progress only when a match is behind it', () => {
    const armed = board({ phase: 'armed', moves: 0, secs: 0 });
    expect(roundTrip(armed)).toEqual(armed);
  });

  it('refuses a clock or a move count that could not have happened', () => {
    for (const bad of [-1, 1.5, NaN, 'soon', undefined]) {
      expect(roundTrip({ ...board(), moves: bad as never })).toBeNull();
      expect(roundTrip({ ...board(), secs: bad as never })).toBeNull();
    }
  });

  it('refuses a record with no seed — the seed is the shareable code', () => {
    expect(roundTrip({ ...board(), seed: 'K7P2Q' as never })).toBeNull();
  });

  /* ---------- what the player was doing ---------- */

  it('refuses a board with no context at all', () => {
    expect(roundTrip({ ...board(), ctx: undefined as never })).toBeNull();
    expect(roundTrip({ ...board(), ctx: { kind: 'daily' } as never })).toBeNull();
  });

  it('round-trips a training rung, checked against the level it names', () => {
    const level = LEVELS[8];
    const b = board({ n: level.n, mode: level.mode, ctx: { kind: 'level', id: level.id } });
    expect(roundTrip(b)).toEqual(b);

    // A rung whose board is not that rung's board is not that rung.
    expect(roundTrip({ ...b, ctx: { kind: 'level', id: 1 } })).toBeNull();
    for (const id of [0, LEVELS.length + 1, 2.5]) {
      expect(roundTrip({ ...b, ctx: { kind: 'level', id } })).toBeNull();
    }
  });

  describe('a match', () => {
    const preset = presetById('classic');
    const leg = preset.boards[1];
    const inFlight: SavedPlay = {
      kind: 'match',
      code: 'MC-K7P2Q',
      boardIdx: 1,
      splits: [{ secs: 11, moves: 6 }],
    };
    const b = board({ n: leg.n, mode: leg.mode, ctx: inFlight });

    it('round-trips the code, the leg and the splits', () => {
      expect(roundTrip(b)).toEqual(b);
    });

    it('refuses a code nothing can be derived from', () => {
      // Everything else about a match — the preset, the per-board seeds — is a
      // pure function of the code, so a code that will not parse is a match
      // that cannot be rebuilt.
      for (const code of ['MZ-K7P2Q', '4-K7P2Q', '', 7]) {
        expect(roundTrip({ ...b, ctx: { ...inFlight, code: code as never } })).toBeNull();
      }
    });

    it('refuses a leg the preset does not have', () => {
      for (const boardIdx of [-1, preset.boards.length, 1.5]) {
        expect(
          roundTrip({ ...b, ctx: { ...inFlight, boardIdx, splits: [] } })
        ).toBeNull();
      }
    });

    it('refuses a board that is not the leg it claims to be', () => {
      const wrongLeg = preset.boards.findIndex((x) => x.n !== leg.n || x.mode !== leg.mode);
      expect(
        roundTrip({ ...b, ctx: { ...inFlight, boardIdx: wrongLeg, splits: [] } })
      ).toBeNull();
    });

    /**
     * One finished split per leg behind you. The two advance together on every
     * solve, so a pair that disagrees is a half-written record — and a match
     * that forgot a split is worse than one that starts again.
     */
    it('refuses splits that do not account for the legs already played', () => {
      expect(roundTrip({ ...b, ctx: { ...inFlight, splits: [] } })).toBeNull();
      expect(
        roundTrip({
          ...b,
          ctx: { ...inFlight, splits: [{ secs: 11, moves: 6 }, { secs: 9, moves: 4 }] },
        })
      ).toBeNull();
    });

    it('refuses a split that is not a time and a move count', () => {
      for (const bad of [{ secs: 11 }, { secs: -1, moves: 6 }, null, 11]) {
        expect(roundTrip({ ...b, ctx: { ...inFlight, splits: [bad] as never } })).toBeNull();
      }
      expect(roundTrip({ ...b, ctx: { ...inFlight, splits: 'none' as never } })).toBeNull();
    });
  });
});

/**
 * The board inside the blob — the one field that is all-or-nothing, reached
 * through its own reader rather than by weakening the one around it.
 */
describe('the board inside readColorLoopSave', () => {
  it('carries a board that reads, and the whole board comes back', () => {
    const b = board({ n: 4, mode: 'diag', moves: 21, secs: 137 });
    const out = readColorLoopSave(JSON.parse(JSON.stringify({ n: 4, mode: 'rows', board: b })));
    expect(out.board).toEqual(b);
    expect(out.board!.grid).toEqual(b.grid);
  });

  it('costs the player the board and nothing else when it does not', () => {
    const out = readColorLoopSave({
      board: repaint(board()),
      training: { unlocked: 12, best: { 1: { secs: 7, moves: 3, stars: 3 } } },
      bestMap: { '4a': { secs: 30, name: 'Mike' } },
    });
    expect(out.board).toBeNull();
    expect(out.training.unlocked).toBe(12);
    expect(out.bestMap['4a']).toEqual({ secs: 30, name: 'Mike' });
  });

  it('reads a blob with no board as a first launch would', () => {
    expect(readColorLoopSave({ n: 4, mode: 'rows' }).board).toBeNull();
    expect(emptyColorLoopSave().board).toBeNull();
  });
});

describe('describeColorLoopProgress', () => {
  it('says nothing when there is no board', () => {
    expect(describeColorLoopProgress(null)).toBeNull();
  });

  /**
   * An untouched board is not progress. Every visit deals one, so a card that
   * offered to continue a board nobody has moved would say Continue permanently
   * and mean nothing by it — the line `describeNumberSlideProgress` and
   * `describeFungikuProgress` both draw.
   */
  it('says nothing about a board nobody has moved', () => {
    expect(describeColorLoopProgress(board({ phase: 'armed', moves: 0, secs: 0 }))).toBeNull();
    expect(describeColorLoopProgress(board({ moves: 0, secs: 30 }))).toBeNull();
    expect(
      describeColorLoopProgress(
        board({ n: 3, mode: 'rows', moves: 0, ctx: { kind: 'level', id: 1 } })
      )
    ).toBeNull();
  });

  /** Free play here is a fifteen-way settings space, so the goal is part of the offer. */
  it('names the size and the goal of a free-play board', () => {
    expect(describeColorLoopProgress(board({ n: 4, mode: 'rows', moves: 9, secs: 84 }))).toEqual({
      label: '4×4 · 01:24',
      detail: '9 moves',
    });
    expect(describeColorLoopProgress(board({ n: 5, mode: 'ordered', moves: 1, secs: 5 }))).toEqual({
      label: '5×5 in order · 00:05',
      detail: '1 move',
    });
    expect(describeColorLoopProgress(board({ n: 4, mode: 'diag', moves: 30, secs: 605 }))).toEqual({
      label: '4×4 diagonal · 10:05',
      detail: '30 moves',
    });
  });

  it('names the rung of a training board', () => {
    const level = LEVELS[8];
    const b = board({ n: level.n, mode: level.mode, moves: 4, secs: 41, ctx: { kind: 'level', id: 9 } });
    expect(describeColorLoopProgress(b)).toEqual({ label: 'Level 9 · 00:41', detail: '4 moves' });
  });

  describe('a match', () => {
    const preset = presetById('sprint');
    const leg = (boardIdx: number, splits: { secs: number; moves: number }[], over = {}) =>
      board({
        n: preset.boards[boardIdx].n,
        mode: preset.boards[boardIdx].mode,
        ctx: { kind: 'match', code: 'MS-K7P2Q', boardIdx, splits },
        ...over,
      });

    /**
     * `Sprint · 2/3` is a different offer from `4×4 · 01:24`, and a card that
     * said the second while reopening the first would be a card that lied.
     */
    it('names the preset, the leg, and the run so far rather than this board', () => {
      expect(
        describeColorLoopProgress(leg(1, [{ secs: 11, moves: 6 }], { moves: 4, secs: 20 }))
      ).toEqual({ label: 'Sprint · 2/3 · 00:31', detail: '10 moves' });
    });

    /** The one board an untouched grid still earns a badge for: the legs behind it. */
    it('counts a leg you have not started yet, because the ones behind it happened', () => {
      expect(
        describeColorLoopProgress(
          leg(2, [{ secs: 11, moves: 6 }, { secs: 9, moves: 4 }], {
            phase: 'armed',
            moves: 0,
            secs: 0,
          })
        )
      ).toEqual({ label: 'Sprint · 3/3 · 00:20', detail: '10 moves' });
    });

    it('says nothing about a match nobody has started', () => {
      expect(
        describeColorLoopProgress(leg(0, [], { phase: 'armed', moves: 0, secs: 0 }))
      ).toBeNull();
    });
  });
});

/**
 * The round trip the whole step is for: the board that comes back is the board
 * that was put away.
 */
describe('a board through storage and back', () => {
  it('is the same board, on every mode and size the game deals', () => {
    for (const mode of ['rows', 'ordered', 'diag'] as const) {
      for (let n = 3; n <= maxN(mode); n++) {
        const before = board({ n, mode, seed: n * 977, moves: n * 3, secs: n * 11 });
        const save = { ...emptyColorLoopSave(), board: before };
        // Exactly what `storage.ts` puts through AsyncStorage and reads back.
        const after = readColorLoopSave(JSON.parse(JSON.stringify({ _v: 1, ...save }))).board;
        expect(after).toEqual(before);
        expect(after!.grid).toEqual(makeScrambled(n * 977, n, mode));
      }
    }
  });

  it('survives a match leg with its splits intact', () => {
    const preset = presetById('marathon');
    const before = board({
      n: preset.boards[3].n,
      mode: preset.boards[3].mode,
      ctx: {
        kind: 'match',
        code: 'MM-ZZTOP',
        boardIdx: 3,
        splits: [
          { secs: 8, moves: 4 },
          { secs: 19, moves: 11 },
          { secs: 27, moves: 15 },
        ],
      },
    });
    const save = { ...emptyColorLoopSave(), board: before };
    expect(readColorLoopSave(JSON.parse(JSON.stringify({ _v: 1, ...save }))).board).toEqual(before);
  });
});
