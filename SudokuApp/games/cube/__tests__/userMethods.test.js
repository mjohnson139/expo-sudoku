import { METHODS } from '../methods';
import {
  duplicateMethod, editMethod, methodCatalogue, methodsForNewSolves,
  nextMethodId, removeMethod, renameStageReferences, sanitizeUserMethods,
} from '../userMethods';

describe('user methods', () => {
  it('duplicates presets deeply in its own namespace and preserves origin', () => {
    const { methods, method } = duplicateMethod([], METHODS[0], 12);
    expect(method).toMatchObject({ id: 'user-method-1', from: 'roux', savedAt: 12, forNewSolves: true });
    expect(method.stages).toEqual(METHODS[0].stages);
    expect(method.stages).not.toBe(METHODS[0].stages);
    method.stages.push('Mine');
    expect(METHODS[0].stages).not.toContain('Mine');
    expect(methods[0]).toBe(method);
  });

  it('avoids preset, user and reserved id collisions', () => {
    expect(nextMethodId([{ id: 'user-method-1' }, { id: 'unassigned' }])).toBe('user-method-2');
  });

  it('edits through one funnel and keeps stage names unique', () => {
    const made = duplicateMethod([], METHODS[1], 1).method;
    const renamed = editMethod([made], made.id, { name: 'CFOP', stages: ['Cross', 'cross', 'OLL'], forNewSolves: false }, 9);
    expect(renamed[0].name).toBe('CFOP 2');
    expect(renamed[0].stages).toEqual(['Cross', 'OLL']);
    expect(renamed[0].forNewSolves).toBe(false);
    expect(renamed[0].editedAt).toBe(9);
  });

  it('sanitizes independently, then appends users after frozen presets', () => {
    const good = { id: 'user-method-4', name: 'Two look', stages: ['One', 'Two'], forNewSolves: false, from: 'roux', savedAt: 2, editedAt: 3 };
    const users = sanitizeUserMethods([null, { ...good, id: 'roux' }, good]);
    expect(users).toEqual([good]);
    expect(methodCatalogue(users).map((method) => method.id)).toEqual([...METHODS.map((method) => method.id), good.id]);
    expect(methodsForNewSolves(methodCatalogue(users)).map((method) => method.id)).not.toContain(good.id);
  });

  it('refuses deletion while a solve references the method', () => {
    const made = duplicateMethod([], METHODS[0], 1).method;
    expect(removeMethod([made], made.id, [{ method: made.id }]).reason).toMatch(/saved solve/);
    expect(removeMethod([made], made.id, []).methods).toEqual([]);
  });

  it('renames marker and assignment references atomically', () => {
    const made = duplicateMethod([], METHODS[0], 1).method;
    const result = renameStageReferences({
      methods: [made],
      solves: [{ id: 's1', method: made.id, phases: [{ at: 3, label: 'CMLL' }], editedAt: 1 }],
      algorithms: [{ id: 'a1', assignments: [{ method: made.id, stage: 'CMLL' }] }],
    }, made.id, 'CMLL', 'CMLL 2-look', 8);
    expect(result.methods[0].stages).toContain('CMLL 2-look');
    expect(result.solves[0].phases[0].label).toBe('CMLL 2-look');
    expect(result.algorithms[0].assignments[0].stage).toBe('CMLL 2-look');
  });
});
