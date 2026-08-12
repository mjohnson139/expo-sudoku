import {
  PRESETS,
  encodeMatchCode,
  formatMatchResult,
  matchSeeds,
  parseMatchCode,
  presetById,
  totalMoves,
  totalSecs,
} from '../match';
import { maxN, parseCode } from '../puzzle';

describe('presets', () => {
  it('have unique ids and code letters', () => {
    expect(new Set(PRESETS.map(p => p.id)).size).toBe(PRESETS.length);
    expect(new Set(PRESETS.map(p => p.letter)).size).toBe(PRESETS.length);
  });

  it('every board fits the palette', () => {
    for (const p of PRESETS) {
      expect(p.boards.length).toBeGreaterThanOrEqual(2);
      for (const b of p.boards) {
        expect(b.n).toBeGreaterThanOrEqual(3);
        expect(b.n).toBeLessThanOrEqual(maxN(b.mode));
      }
    }
  });
});

describe('match codes', () => {
  it('round-trip through encode/parse for every preset', () => {
    const seed = parseInt('K7P2Q', 36);
    for (const p of PRESETS) {
      const code = encodeMatchCode(p.id, seed);
      expect(code).toBe('M' + p.letter + '-K7P2Q');
      expect(parseMatchCode(code)).toEqual({ preset: presetById(p.id), seed });
    }
  });

  it('normalizes lowercase and whitespace', () => {
    const seed = parseInt('K7P2Q', 36);
    expect(parseMatchCode(' ms-k7p2q ')).toEqual({ preset: presetById('sprint'), seed });
  });

  it('rejects garbage, unknown presets, and single-board codes', () => {
    expect(parseMatchCode('garbage')).toBeNull();
    expect(parseMatchCode('MX-K7P2Q')).toBeNull();
    expect(parseMatchCode('4-K7P2Q')).toBeNull();
    expect(parseMatchCode('')).toBeNull();
  });

  it('does not collide with the single-board code grammar', () => {
    expect(parseCode('MS-K7P2Q')).toBeNull();
  });
});

describe('matchSeeds', () => {
  it('is deterministic and yields distinct per-board seeds', () => {
    const a = matchSeeds(12345, 5);
    expect(a).toEqual(matchSeeds(12345, 5));
    expect(a).toHaveLength(5);
    expect(new Set(a).size).toBe(5);
  });

  it('different match seeds give different boards', () => {
    expect(matchSeeds(1, 3)).not.toEqual(matchSeeds(2, 3));
  });
});

describe('result card', () => {
  const splits = [
    { secs: 12, moves: 10 },
    { secs: 31, moves: 18 },
    { secs: 28, moves: 14 },
  ];

  it('totals splits', () => {
    expect(totalSecs(splits)).toBe(71);
    expect(totalMoves(splits)).toBe(42);
  });

  it('formats a pasteable card with the code as the invitation', () => {
    expect(formatMatchResult('MS-K7P2Q', splits, 'Mike')).toBe(
      'COLOR LOOP · MATCH MS-K7P2Q\n' +
        '00:12 · 00:31 · 00:28 → 01:11 · 42 moves · Mike\n' +
        'Beat me — play code MS-K7P2Q'
    );
  });

  it('omits the name when absent', () => {
    expect(formatMatchResult('MS-K7P2Q', splits, '')).not.toContain('· Mike');
  });
});
