import { best, fork, switchVariation, variationStageCount } from '../variations';

const SOLVE = {
  alg: "R U F M R' U'",
  phases: [
    { at: 0, label: 'First block' },
    { at: 2, label: 'Second block' },
    { at: 4, label: 'CMLL' },
    { at: 6, label: '' },
  ],
  variations: [],
};

describe('phase variation branches', () => {
  it('forks at the selected stage and keeps the complete old continuation', () => {
    expect(fork(SOLVE, 2, { savedAt: 10 })).toEqual({
      alg: 'R U',
      phases: [
        { at: 0, label: 'First block' },
        { at: 2, label: '' },
      ],
      variations: [{
        id: 'v1',
        phaseAt: 2,
        alg: "F M R' U'",
        phases: [
          { at: 0, label: 'Second block' },
          { at: 2, label: 'CMLL' },
          { at: 4, label: '' },
        ],
        variations: [],
        savedAt: 10,
      }],
    });
  });

  it('restores the complete old solve, then switches back to the retry branch', () => {
    const forked = fork(SOLVE, 2, { savedAt: 10 });
    const retry = {
      ...forked,
      alg: 'R U F2',
      phases: [
        { at: 0, label: 'First block' },
        { at: 2, label: 'Second block' },
        { at: 3, label: '' },
      ],
    };

    const restored = switchVariation(retry, 'v1', { label: 'Second block', savedAt: 11 });
    expect(restored.alg).toBe(SOLVE.alg);
    expect(restored.phases).toEqual(SOLVE.phases);
    expect(restored.variations).toEqual([{
      id: 'v2',
      phaseAt: 2,
      alg: 'F2',
      phases: [
        { at: 0, label: 'Second block' },
        { at: 1, label: '' },
      ],
      variations: [],
      savedAt: 11,
    }]);

    const back = switchVariation(restored, 'v2', { label: 'Second block', savedAt: 12 });
    expect(back.alg).toBe(retry.alg);
    expect(back.phases).toEqual(retry.phases);
  });

  it('keeps downstream alternatives inside the branch they belong to', () => {
    const withCMLLBranch = {
      ...SOLVE,
      variations: [{ id: 'v7', phaseAt: 4, alg: "R2 U2", savedAt: 5 }],
    };
    const forked = fork(withCMLLBranch, 2, { savedAt: 10 });
    expect(forked.variations[0].variations).toEqual([
      { id: 'v7', phaseAt: 2, alg: 'R2 U2', savedAt: 5 },
    ]);
    const restored = switchVariation(forked, 'v8', { label: 'Second block' });
    expect(restored.variations).toContainEqual({
      id: 'v7', phaseAt: 4, alg: 'R2 U2', savedAt: 5,
    });
  });

  it('chooses the shortest stage rather than the shortest whole continuation', () => {
    const runs = [
      { id: 'v2', phaseAt: 0, alg: 'R U F', phases: [{ at: 0, label: 'First' }, { at: 1, label: 'Next' }], savedAt: 2 },
      { id: 'v1', phaseAt: 0, alg: 'L', phases: [{ at: 0, label: 'First' }, { at: 1, label: '' }], savedAt: 1 },
    ];
    expect(variationStageCount(runs[0])).toBe(1);
    expect(best(runs, 0).id).toBe('v1');
  });
});
