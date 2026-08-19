import { best, fork, switchVariation } from '../variations';

const SOLVE = {
  alg: "R U R' F M2",
  phases: [
    { at: 0, label: 'First block' },
    { at: 3, label: 'Second block' },
    { at: 5, label: '' },
  ],
  variations: [],
};

describe('phase variations', () => {
  it('forks a locked run into inactive storage and reopens its marker', () => {
    expect(fork(SOLVE, 3, { savedAt: 10 })).toEqual({
      alg: "R U R'",
      phases: [
        { at: 0, label: 'First block' },
        { at: 3, label: '' },
      ],
      variations: [{ id: 'v1', phaseAt: 3, alg: 'F M2', savedAt: 10 }],
    });
  });

  it('switches twice and keeps the displaced run available', () => {
    const empty = fork(SOLVE, 3, { savedAt: 10 });
    const retry = { ...empty, alg: "R U R' F2", phases: empty.phases };
    const restored = switchVariation(retry, 'v1', { label: 'Second block', savedAt: 11 });
    expect(restored.alg).toBe(SOLVE.alg);
    expect(restored.phases).toEqual(SOLVE.phases);
    expect(restored.variations).toEqual([{ id: 'v2', phaseAt: 3, alg: 'F2', savedAt: 11 }]);

    const back = switchVariation(restored, 'v2', { label: 'Second block', savedAt: 12 });
    expect(back.alg).toBe(retry.alg);
    expect(back.phases).toEqual([
      { at: 0, label: 'First block' },
      { at: 3, label: 'Second block' },
      { at: 4, label: '' },
    ]);
  });

  it('chooses shortest with saved time then id as stable tie breaks', () => {
    const runs = [
      { id: 'v2', phaseAt: 0, alg: 'R U', savedAt: 1 },
      { id: 'v3', phaseAt: 0, alg: 'F', savedAt: 2 },
      { id: 'v1', phaseAt: 0, alg: 'L', savedAt: 2 },
    ];
    expect(best(runs, 0).id).toBe('v1');
  });
});
