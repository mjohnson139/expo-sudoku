import { cubeFromAlg } from '../cubeState';
import { checkStage, checkStageAt, stageResults } from '../stageChecks';

const PRESET_STAGES = [
  ['roux', 'First block'],
  ['roux', 'Second block'],
  ['roux', 'CMLL'],
  ['roux', 'LSE'],
  ['cfop', 'Cross'],
  ['cfop', 'F2L'],
  ['cfop', 'OLL'],
  ['cfop', 'PLL'],
  ['beginner-lbl', 'Cross'],
  ['beginner-lbl', 'F2L basic'],
  ['beginner-lbl', 'OLL 2-look'],
  ['beginner-lbl', 'PLL 2-look'],
];

describe('preset stage exit checks', () => {
  test.each(PRESET_STAGES)('%s %s accepts its known-good solved state', (method, stage) => {
    expect(checkStage(method, stage, cubeFromAlg(''))).toBe(true);
  });

  test.each(PRESET_STAGES)('%s %s is unchanged by a whole-cube rotation', (method, stage) => {
    expect(checkStage(method, stage, cubeFromAlg("x y' z2"))).toBe(true);
  });

  it('distinguishes representative near misses for every predicate shape', () => {
    expect(checkStage('roux', 'First block', cubeFromAlg('L'))).toBe(false);
    expect(checkStage('roux', 'Second block', cubeFromAlg('R'))).toBe(false);
    expect(checkStage('roux', 'CMLL', cubeFromAlg('U'))).toBe(false);
    expect(checkStage('roux', 'LSE', cubeFromAlg('U'))).toBe(false);
    expect(checkStage('cfop', 'Cross', cubeFromAlg('D'))).toBe(false);
    expect(checkStage('cfop', 'F2L', cubeFromAlg('D'))).toBe(false);
    expect(checkStage('cfop', 'OLL', cubeFromAlg('R'))).toBe(false);
    expect(checkStage('cfop', 'PLL', cubeFromAlg('U'))).toBe(false);
    expect(checkStage('beginner-lbl', 'Cross', cubeFromAlg('D'))).toBe(false);
    expect(checkStage('beginner-lbl', 'F2L basic', cubeFromAlg('D'))).toBe(false);
    expect(checkStage('beginner-lbl', 'OLL 2-look', cubeFromAlg('R'))).toBe(false);
    expect(checkStage('beginner-lbl', 'PLL 2-look', cubeFromAlg('U'))).toBe(false);
  });

  it('has no opinion about user methods or copied preset labels', () => {
    expect(checkStage('method-7', 'Cross', cubeFromAlg(''))).toBeNull();
    expect(checkStage('roux', 'Custom stage', cubeFromAlg(''))).toBeNull();
  });
});

describe('solve replay at a stage marker', () => {
  const solve = (orientation) => ({
    method: 'cfop', scramble: 'R', orientation, alg: "R' U", phases: [],
  });

  test.each([null, ''])('preserves orientation state %p and stops at the exact marker', (orientation) => {
    expect(checkStageAt(solve(orientation), { at: 1, label: 'PLL' })).toBe(true);
    expect(checkStageAt(solve(orientation), { at: 2, label: 'PLL' })).toBe(false);
  });

  it('replays a non-empty hold before the solve moves', () => {
    const held = { method: 'cfop', scramble: '', orientation: 'x', alg: "U U'" };
    expect(checkStageAt(held, { at: 1, label: 'PLL' })).toBe(false);
    expect(checkStageAt(held, { at: 2, label: 'PLL' })).toBe(true);
  });

  it('attaches the result to the ending marker, not the labelled span start', () => {
    const value = { ...solve(''), phases: [{ at: 0, label: 'PLL' }, { at: 1, label: '' }] };
    expect(stageResults(value)).toEqual([{ at: 1, label: 'PLL', result: true }]);
  });
});
