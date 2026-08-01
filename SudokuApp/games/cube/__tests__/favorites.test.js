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
  it('reads a well-formed save', () => {
    expect(readCubeSave({ scramble: ALG, favorites: [{ alg: OTHER, savedAt: 7 }] })).toEqual({
      scramble: ALG,
      favorites: [{ alg: OTHER, savedAt: 7 }],
    });
  });

  it('discards a scramble that no longer parses instead of crashing the screen', () => {
    expect(readCubeSave({ scramble: 'R Q U', favorites: [] }).scramble).toBe('');
  });

  it('survives a missing, empty or corrupt blob', () => {
    const empty = { scramble: '', favorites: [] };
    expect(readCubeSave(null)).toEqual(empty);
    expect(readCubeSave('nope')).toEqual(empty);
    expect(readCubeSave({})).toEqual(empty);
  });
});
