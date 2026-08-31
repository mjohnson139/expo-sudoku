import { railStates } from '../phaseRail';

describe('railStates', () => {
  it('makes only the first stage available on an unmarked completed solve', () => {
    const states = railStates('roux', [], 'R U F L', 2);
    expect(states[0]).toMatchObject({ stage: 'First block', state: 'unmarked', available: true });
    expect(states[1]).toMatchObject({ stage: 'Second block', state: 'unavailable', available: false });
  });

  it('shows counts, the boundary at the cursor, and valid edits distinctly', () => {
    const phases = [
      { at: 0, label: 'First block' },
      { at: 2, label: 'Second block' },
      { at: 4, label: '' },
    ];
    const states = railStates('roux', phases, 'R U F L B D', 2);
    expect(states[0]).toMatchObject({ state: 'marked', count: 2, atCursor: true, available: true });
    expect(states[1]).toMatchObject({ state: 'marked', count: 2, atCursor: false, available: false });
    expect(states[2]).toMatchObject({ state: 'unavailable', count: null });
  });

  it('follows folded move counts rather than retaining a tally', () => {
    const phases = [{ at: 0, label: 'First block' }, { at: 1, label: '' }];
    expect(railStates('roux', phases, 'R F F', 2)[0].count).toBe(1);
    expect(railStates('roux', phases, 'R F2', 2)[0].count).toBe(1);
  });

  it('keeps passed, failed, and unverified locks as three values', () => {
    const phases = [
      { at: 0, label: 'First block' },
      { at: 1, label: 'Second block' },
      { at: 2, label: 'CMLL' },
      { at: 3, label: '' },
    ];
    const checks = [
      { at: 1, label: 'First block', result: true },
      { at: 2, label: 'Second block', result: false },
      { at: 3, label: 'CMLL', result: null },
    ];
    expect(railStates('roux', phases, 'R U F', 3, undefined, checks).map((item) => item.verified))
      .toEqual([true, false, null, null]);
  });

  it('has no rail for legacy, Freeform, or unknown methods', () => {
    expect(railStates(null, [{ at: 0, label: 'First block' }], 'R', 1)).toEqual([]);
    expect(railStates('unknown', [], 'R', 1)).toEqual([]);
  });
});
