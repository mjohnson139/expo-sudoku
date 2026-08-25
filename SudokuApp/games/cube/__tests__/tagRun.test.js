import { addAlgorithmRun, applyAlgorithm, libraryState, normalizeRunRange, orderAlgorithmPicker, tagRun } from '../tagRun';

describe('solve and algorithm reciprocity', () => {
  test('normalizes a backwards token selection', () => {
    expect(normalizeRunRange(4, 2, 6)).toEqual({ start: 2, end: 4 });
  });

  test('derives moves, real starting setup and containing assignment', () => {
    expect(tagRun({
      alg: "R U R' F", phases: [{ at: 0, label: 'CMLL' }, { at: 3, label: 'LSE' }],
      method: 'roux', scramble: 'D2', orientation: 'y', first: 1, last: 2,
    })).toEqual({
      range: { start: 1, end: 2 }, moves: "U R'", setup: 'D2 y R',
      assignments: [{ method: 'roux', stage: 'CMLL' }],
    });
  });

  test('refuses a selection across a phase boundary', () => {
    expect(tagRun({ alg: 'R U F', phases: [{ at: 0, label: 'A' }, { at: 2, label: 'B' }], first: 1, last: 2 }).error)
      .toMatch(/one phase/);
  });

  test('apply appends moves at the end and never setup', () => {
    expect(applyAlgorithm('R U', { setup: 'F2', moves: "L D'" })).toBe("R U L D'");
  });

  test('picker promotes current-stage assignments and preserves every entry', () => {
    const other = { id: 'a1', assignments: [] };
    const match = { id: 'a2', assignments: [{ method: 'roux', stage: 'CMLL' }] };
    expect(orderAlgorithmPicker([other, match], 'roux', 'CMLL')).toEqual([match, other]);
  });

  test('a full library refuses save but continues to permit apply', () => {
    const full = Array.from({ length: 100 }, (_, i) => ({ id: `a${i}` }));
    expect(libraryState([])).toMatchObject({ empty: true, canSave: true, canApply: false });
    expect(libraryState(full)).toMatchObject({ full: true, canSave: false, canApply: true });
  });

  test('names a used algorithm without replacing its solve moves', () => {
    const solve = { alg: 'R U F', algorithmRuns: [] };
    expect(addAlgorithmRun(solve, { id: 'a2', name: 'Sune' }, 1, 3)).toEqual({
      algorithmRuns: [{ at: 1, end: 3, algorithmId: 'a2', name: 'Sune' }],
    });
    expect(solve.alg).toBe('R U F');
  });
});
