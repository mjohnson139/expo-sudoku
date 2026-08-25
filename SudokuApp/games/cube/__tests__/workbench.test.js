import { inverseSetup, setupAt, workbenchDraft, workbenchSave } from '../workbench';
import { cubeFromAlg, isSolved } from '../cubeState';

describe('algorithm workbench decisions', () => {
  test('a new draft receives the library default name', () => {
    expect(workbenchDraft([], null)).toEqual({ id: null, moves: '', setup: '', name: 'Algorithm 1', assignments: [] });
  });

  test('an existing entry is edited rather than recreated', () => {
    const entry = { id: 'a4', moves: 'R U', name: 'One', assignments: [{ method: 'cfop', stage: 'OLL' }] };
    expect(workbenchSave(workbenchDraft([], entry), 100)).toMatchObject({ ok: true, mode: 'edit', id: 'a4' });
    expect(workbenchDraft([], entry).setup).toBe("U' R'");
  });

  test('new work is refused at the cap without refusing edits', () => {
    expect(workbenchSave({ id: null, moves: 'R', name: 'One', assignments: [] }, 100)).toEqual({ ok: false, reason: 'full' });
    expect(workbenchSave({ id: 'a1', moves: 'R', name: 'One', assignments: [] }, 100).ok).toBe(true);
  });

  test('the confirmed setup is the position visible at the scrubber', () => {
    expect(setupAt(['R', 'U', "R'"], 2)).toBe('R U');
  });

  test('an inverse-derived start followed by its algorithm ends solved', () => {
    const moves = "R U R' U R U2 R'";
    const setup = inverseSetup(moves);
    expect(setup).toBe("R U2 R' U' R U' R'");
    expect(isSolved(cubeFromAlg(`${setup} ${moves}`))).toBe(true);
  });

  test('derive later has no premature setup when there are no moves', () => {
    expect(inverseSetup('')).toBe('');
  });
});
