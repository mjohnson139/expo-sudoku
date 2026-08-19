import {
  MAX_FAVORITES,
  addFavorite,
  isFavorite,
  normalizeAlg,
  readCubeSave,
  removeFavorite,
  sanitizeFavorites,
} from '../favorites';

const ALG = "R U R' U' F2 L";
const OTHER = "D2 B L' U R2 F";

describe('addFavorite', () => {
  it('puts the newest first', () => {
    const list = addFavorite(addFavorite([], ALG, 1), OTHER, 2);
    expect(list.map((f) => f.alg)).toEqual([OTHER, ALG]);
  });

  it('records when it was saved', () => {
    expect(addFavorite([], ALG, 1234)[0]).toEqual({ alg: ALG, savedAt: 1234 });
  });

  it('is a no-op for a scramble already saved, whatever its spacing', () => {
    const list = addFavorite([], ALG, 1);
    expect(addFavorite(list, ALG, 2)).toBe(list);
    expect(addFavorite(list, `  ${ALG.replace(/ /g, '  ')}  `, 2)).toBe(list);
  });

  it('refuses empty text and anything that is not notation', () => {
    expect(addFavorite([], '')).toEqual([]);
    expect(addFavorite([], '   ')).toEqual([]);
    expect(addFavorite([], 'not a scramble')).toEqual([]);
  });

  it('caps the list, dropping the oldest', () => {
    let list = [];
    // Distinct by length, so every one of them is genuinely a new favorite.
    for (let i = 0; i < MAX_FAVORITES + 5; i += 1) {
      list = addFavorite(list, `${'R U '.repeat(i + 1)}F`, i);
    }
    expect(list).toHaveLength(MAX_FAVORITES);
    expect(list[0].savedAt).toBe(MAX_FAVORITES + 4);
    expect(list[MAX_FAVORITES - 1].savedAt).toBe(5);
  });
});

describe('removeFavorite', () => {
  it('removes by algorithm', () => {
    const list = addFavorite(addFavorite([], ALG, 1), OTHER, 2);
    expect(removeFavorite(list, ALG).map((f) => f.alg)).toEqual([OTHER]);
  });

  it('leaves the list alone — and identical — when nothing matches', () => {
    const list = addFavorite([], ALG, 1);
    expect(removeFavorite(list, OTHER)).toBe(list);
  });
});

describe('isFavorite', () => {
  it('ignores spacing differences', () => {
    const list = addFavorite([], ALG, 1);
    expect(isFavorite(list, ALG)).toBe(true);
    expect(isFavorite(list, `${ALG}  `)).toBe(true);
    expect(isFavorite(list, OTHER)).toBe(false);
    expect(isFavorite(null, ALG)).toBe(false);
  });
});

describe('normalizeAlg', () => {
  it('collapses whitespace so one scramble is one entry', () => {
    expect(normalizeAlg("  R   U\nR'  ")).toBe("R U R'");
    expect(normalizeAlg(null)).toBe('');
  });
});

describe('sanitizeFavorites', () => {
  it('drops entries that are not saveable scrambles', () => {
    const clean = sanitizeFavorites([
      { alg: ALG, savedAt: 1 },
      { alg: 'garbage', savedAt: 2 },
      { alg: '', savedAt: 3 },
      null,
      { savedAt: 4 },
      { alg: ALG, savedAt: 5 },
    ]);
    expect(clean).toEqual([{ alg: ALG, savedAt: 1 }]);
  });

  it('answers an empty list for anything that is not a list', () => {
    expect(sanitizeFavorites(undefined)).toEqual([]);
    expect(sanitizeFavorites('nope')).toEqual([]);
  });

  it('replaces a missing timestamp rather than dropping the scramble', () => {
    expect(sanitizeFavorites([{ alg: ALG }])).toEqual([{ alg: ALG, savedAt: 0 }]);
  });
});

describe('readCubeSave', () => {
  // Deliberately a **pre-Step-4 record**: no `method`, no `editedAt`. Cube Flow
  // Step 4 added both by shape rather than by a version bump, so what this
  // fixture is really testing is that a file written by an older build still
  // comes back as the operator left it, with the two new fields filled in and
  // nothing else touched.
  const SOLVE = {
    id: 's1',
    scramble: ALG,
    name: 'First block',
    orientation: 'z2',
    alg: "r U r'",
    phases: [],
    savedAt: 7,
  };

  /** The same solve as this build stores it: no method, and last written to when
   *  it was started — which is the most that can honestly be said about a record
   *  that never carried the field. */
  const UPGRADED = { ...SOLVE, method: null, editedAt: 7 };

  it('reads a well-formed save', () => {
    expect(
      readCubeSave({
        scramble: ALG,
        favorites: [{ alg: OTHER, savedAt: 7 }],
        solves: [SOLVE],
        workspace: { solveId: 's1', view: null },
      })
    ).toEqual({
      scramble: ALG,
      favorites: [{ alg: OTHER, savedAt: 7 }],
      solves: [UPGRADED],
      workspace: { solveId: 's1', view: null },
    });
  });

  it('discards a scramble that no longer parses instead of crashing the screen', () => {
    expect(readCubeSave({ scramble: 'R Q U', favorites: [] }).scramble).toBe('');
  });

  it('survives a missing, empty or corrupt blob', () => {
    const empty = {
      scramble: '',
      favorites: [],
      solves: [],
      workspace: { solveId: null, view: null },
    };
    expect(readCubeSave(null)).toEqual(empty);
    expect(readCubeSave('nope')).toEqual(empty);
    expect(readCubeSave({})).toEqual(empty);
  });

  /**
   * Both directions of version skew, pinned — Step 4 changed the file's shape
   * and this is the only place that has to know it.
   */
  describe('a file written by another build', () => {
    it('reads a Step 5 save, which has no solves in it at all', () => {
      const step5 = { _v: 1, scramble: ALG, favorites: [{ alg: ALG, savedAt: 3 }] };

      expect(readCubeSave(step5)).toEqual({
        scramble: ALG,
        favorites: [{ alg: ALG, savedAt: 3 }],
        solves: [],
        workspace: { solveId: null, view: null },
      });
    });

    it('leaves a Step 4 save readable by a Step 5 build — the two old keys are untouched', () => {
      const step4 = {
        _v: 2,
        scramble: ALG,
        favorites: [{ alg: ALG, savedAt: 3 }],
        solves: [SOLVE],
        workspace: { solving: true, solveId: 's1', view: null },
      };
      const read = readCubeSave(step4);

      expect(read.scramble).toBe(ALG);
      expect(read.favorites).toEqual([{ alg: ALG, savedAt: 3 }]);
    });

    it('will not open a solve that outlived the scramble it was written against', () => {
      expect(
        readCubeSave({
          scramble: OTHER,
          favorites: [],
          solves: [SOLVE],
          workspace: { solveId: 's1' },
        }).workspace
      ).toEqual({ solveId: null, view: null });
    });

    it('keeps a solve whose scramble was never favourited', () => {
      // Forcing a star before you are allowed to keep work is a rule nobody
      // asked for (plan §7.1).
      expect(
        readCubeSave({ scramble: ALG, favorites: [], solves: [SOLVE] }).solves
      ).toEqual([UPGRADED]);
    });
  });
});
