import {
  FREEFORM_NAME,
  METHODS,
  defaultMethod,
  findMethod,
  methodName,
  sanitizeMethodId,
  stagesOf,
} from '../methods';

/**
 * **The old `PHASE_METHODS`, copied out literally.**
 *
 * This is the point of the whole file, and it has to be a *copy* rather than an
 * import: the table it pins no longer exists, and a test that read the live one
 * would pass by construction and pin nothing. Every string here is a label that
 * a build before Cube Flow's Step 4 could have written into somebody's save
 * file, so every string here has to still resolve against a shipped method — or
 * the promotion silently orphaned a marker the operator wrote.
 *
 * `solve.test.js:32-40` is the precedent for a pin of this kind.
 */
const PHASE_METHODS_AT_STEP_3 = [
  { name: 'Roux', labels: ['First block', 'Second block', 'CMLL', 'LSE'] },
  { name: 'CFOP', labels: ['Cross', 'F2L', 'OLL', 'PLL'] },
];

describe('METHODS', () => {
  it('gives every method an id, a name and a non-empty stage list', () => {
    METHODS.forEach((method) => {
      expect(typeof method.id).toBe('string');
      expect(method.id.length).toBeGreaterThan(0);
      expect(typeof method.name).toBe('string');
      expect(method.name.length).toBeGreaterThan(0);
      expect(method.stages.length).toBeGreaterThan(0);
    });
  });

  it('has unique ids — a solve stores one of these and has to get one solve back', () => {
    const ids = METHODS.map((method) => method.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('names each stage once within a method, so a rail has no duplicate rung', () => {
    METHODS.forEach((method) => {
      expect(new Set(method.stages).size).toBe(method.stages.length);
    });
  });

  it('ships read-only presets', () => {
    // User-definable methods are a different design and explicitly not in this
    // epic (plan §4). Frozen so that stops being a convention: a screen that
    // pushed onto a stage list would be editing every solve that ever used it.
    expect(Object.isFrozen(METHODS)).toBe(true);
    METHODS.forEach((method) => {
      expect(Object.isFrozen(method)).toBe(true);
      expect(Object.isFrozen(method.stages)).toBe(true);
    });
  });

  it('leads with Roux, which is what the operator is drilling', () => {
    // docs/cube-plan.md §8.2 — and it is the sheet's default when there is
    // nothing else to go on.
    expect(METHODS[0].id).toBe('roux');
  });
});

describe('the promotion from PHASE_METHODS', () => {
  it('orphans no label a previous build could have written', () => {
    const stages = new Set(METHODS.flatMap((method) => method.stages));

    PHASE_METHODS_AT_STEP_3.forEach((old) => {
      old.labels.forEach((label) => {
        expect(stages.has(label)).toBe(true);
      });
    });
  });

  it('keeps each old method whole, in order, under the same name', () => {
    // Not just "the labels exist somewhere" — `Cross` landing in Roux would
    // satisfy the test above and would build the wrong rail in Step 5.
    PHASE_METHODS_AT_STEP_3.forEach((old) => {
      const method = METHODS.find((candidate) => candidate.name === old.name);
      expect(method).toBeTruthy();
      expect([...method.stages]).toEqual(old.labels);
    });
  });
});

describe('findMethod', () => {
  it('finds a shipped method by id', () => {
    expect(findMethod('roux').name).toBe('Roux');
    expect(findMethod('cfop').name).toBe('CFOP');
  });

  it('answers null for the absence of a method rather than throwing', () => {
    // `null` is Freeform *and* legacy, and neither is an error.
    expect(findMethod(null)).toBeNull();
    expect(findMethod(undefined)).toBeNull();
    expect(findMethod('ZZ')).toBeNull();
    expect(findMethod(42)).toBeNull();
  });
});

describe('stagesOf', () => {
  it('gives the method its stages, in order', () => {
    expect([...stagesOf('roux')]).toEqual(['First block', 'Second block', 'CMLL', 'LSE']);
    expect([...stagesOf('cfop')]).toEqual(['Cross', 'F2L', 'OLL', 'PLL']);
  });

  it('gives an empty list for a solve with no method, so no caller needs a branch', () => {
    expect(stagesOf(null)).toEqual([]);
    expect(stagesOf('ZZ')).toEqual([]);
  });

  it('returns the same list every time, so a memo reading it is not rebuilt', () => {
    expect(stagesOf(null)).toBe(stagesOf('ZZ'));
    expect(stagesOf('roux')).toBe(stagesOf('roux'));
  });
});

describe('methodName', () => {
  it('names a method, and says nothing about a solve that has none', () => {
    expect(methodName('roux')).toBe('Roux');
    // Null rather than `FREEFORM_NAME`: a card leaves the segment off entirely,
    // because labelling every pre-Step-4 record "Freeform" would be a claim
    // about it this app cannot support.
    expect(methodName(null)).toBeNull();
    expect(methodName('ZZ')).toBeNull();
    expect(FREEFORM_NAME).toBe('Freeform');
  });
});

describe('sanitizeMethodId', () => {
  it('keeps a shipped id', () => {
    expect(sanitizeMethodId('roux')).toBe('roux');
    expect(sanitizeMethodId('cfop')).toBe('cfop');
  });

  it('maps absent and unknown ids to null — the whole of the migration', () => {
    // A record written before Step 4 has no `method` at all; a record written by
    // a future build may name one this build has never heard of. Both get the
    // legacy treatment, which is the honest one.
    expect(sanitizeMethodId(undefined)).toBeNull();
    expect(sanitizeMethodId(null)).toBeNull();
    expect(sanitizeMethodId('')).toBeNull();
    expect(sanitizeMethodId('Roux')).toBeNull(); // ids are not names
    expect(sanitizeMethodId('petrus')).toBeNull();
    expect(sanitizeMethodId({ id: 'roux' })).toBeNull();
  });
});

describe('defaultMethod', () => {
  const solve = (method) => ({ id: 's1', method });

  it('opens on Roux when there is nothing to go on', () => {
    expect(defaultMethod([])).toBe('roux');
    expect(defaultMethod(null)).toBe('roux');
  });

  it('opens on the method of the newest solve for this scramble', () => {
    // Derived, stored nowhere: "what you were doing here a minute ago", without
    // a settings store this epic has not decided on (plan §6, question 13).
    expect(defaultMethod([solve('cfop'), solve('roux')])).toBe('cfop');
  });

  it('opens on Freeform after a Freeform or a legacy solve', () => {
    expect(defaultMethod([solve(null)])).toBeNull();
    expect(defaultMethod([{ id: 's1' }])).toBeNull();
  });

  it('does not hand back a method this build cannot draw', () => {
    expect(defaultMethod([solve('petrus')])).toBeNull();
  });
});
