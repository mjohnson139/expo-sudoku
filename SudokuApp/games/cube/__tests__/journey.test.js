import { demonstrationCounts, orderJourneyMethods, projectJourney } from '../journey';
import { METHODS } from '../methods';

const variant = (id, from, stages = ['A', 'B']) => ({ id, name: id, from, stages });
const check = (solve, method, results) => ({ solve, method, results });

describe('journey', () => {
  test('orders presets beginner to advanced and stable variants after their source', () => {
    const a = variant('a', 'cfop'); const b = variant('b', 'cfop'); const child = variant('child', 'a'); const orphan = variant('orphan', null);
    expect(orderJourneyMethods([...METHODS, a, b, child, orphan]).map((m) => m.id))
      .toEqual(['beginner-lbl', 'cfop', 'a', 'child', 'b', 'roux', 'orphan']);
  });

  test('counts one qualifying lock per stage per solve and distinguishes false from null', () => {
    const catalogue = [variant('mine', null, ['A'])];
    const counts = demonstrationCounts(catalogue, [
      check('one', 'mine', [{ label: 'A', result: null }, { label: 'A', result: null }]),
      check('two', 'mine', [{ label: 'A', result: false }]),
      check('three', 'mine', [{ label: 'A', result: true }]),
    ]);
    expect(counts.get('mine\u0000A')).toBe(2);
  });

  test('derives locked, open, and done at the exact three-demo threshold with gate copy', () => {
    const catalogue = [variant('mine', null)];
    const checks = [1, 2, 3].map((n) => check(n, 'mine', [{ label: 'A', result: null }]))
      .concat([check(4, 'mine', [{ label: 'B', result: null }])]);
    const [method] = projectJourney(catalogue, checks);
    expect(method.state).toBe('open');
    expect(method.stages).toEqual([
      expect.objectContaining({ name: 'A', count: 3, state: 'done' }),
      expect.objectContaining({ name: 'B', count: 1, state: 'open' }),
    ]);
    [
      [0, 'B unlocks after 3 more A locks — 0 of 3 done'],
      [1, 'B unlocks after 2 more A locks — 1 of 3 done'],
      [2, 'B unlocks after 1 more A lock — 2 of 3 done'],
    ].forEach(([total, gate]) => {
      const projected = projectJourney(catalogue, checks.slice(0, total))[0];
      expect(projected.stages[0].state).toBe('open');
      expect(projected.stages[1]).toEqual(expect.objectContaining({ state: 'locked', gate }));
    });
  });

  test('later methods stay gated and deletion or editing rolls derived progress back', () => {
    const catalogue = [variant('first', null, ['A']), variant('second', null, ['B'])];
    const earned = [1, 2, 3].map((n) => check(n, 'first', [{ label: 'A', result: true }]));
    expect(projectJourney(catalogue, earned)[1].state).toBe('open');
    expect(projectJourney(catalogue, earned.slice(1))[1]).toEqual(expect.objectContaining({
      state: 'locked', gate: 'second unlocks after 1 more first A lock — 2 of 3 done',
    }));
    expect(projectJourney(catalogue, earned.map((row) => ({ ...row, results: [{ label: 'A', result: false }] })))[1].state).toBe('locked');
  });
});
