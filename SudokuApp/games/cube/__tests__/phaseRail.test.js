import { railStates } from '../phaseRail';

describe('railStates', () => {
  it('builds the method stages as open then upcoming before the first move', () => {
    expect(railStates('roux', [], '')).toEqual([
      { stage: 'First block', state: 'open', count: 0 },
      { stage: 'Second block', state: 'upcoming', count: null },
      { stage: 'CMLL', state: 'upcoming', count: null },
      { stage: 'LSE', state: 'upcoming', count: null },
    ]);
  });

  it('locks marked stages and derives the open count from the algorithm', () => {
    const phases = [{ at: 0, label: 'First block' }, { at: 2, label: '' }];
    expect(railStates('roux', phases, "R U R' F2")).toEqual([
      { stage: 'First block', state: 'locked', count: 2 },
      { stage: 'Second block', state: 'open', count: 2 },
      { stage: 'CMLL', state: 'upcoming', count: null },
      { stage: 'LSE', state: 'upcoming', count: null },
    ]);
  });

  it('follows a tidied algorithm rather than retaining a running tally', () => {
    const phases = [{ at: 0, label: 'First block' }, { at: 1, label: '' }];
    expect(railStates('roux', phases, 'R F F')[1].count).toBe(2);
    expect(railStates('roux', phases, 'R F2')[1].count).toBe(1);
  });

  it('has no rail for legacy, Freeform, or unknown methods', () => {
    expect(railStates(null, [{ at: 0, label: 'First block' }], 'R')).toEqual([]);
    expect(railStates('unknown', [], 'R')).toEqual([]);
  });
});
