import {
  MAX_SOLVES,
  MAX_SOLVE_NAME,
  createSolve,
  defaultSolveName,
  describeSolveSize,
  duplicateSolve,
  findSolve,
  nextSolveId,
  normalizeName,
  removeSolve,
  renameSolve,
  sanitizeSolves,
  sanitizeWorkspace,
  solvesFor,
  updateSolve,
} from '../solveList';

const SCRAMBLE = "R U2 F' D L B2 R' U";
const OTHER = "D2 B L' U R2 F";

/** One solve, made the way the screen makes them. */
const make = (scramble = SCRAMBLE, list = [], options = {}) =>
  createSolve(list, scramble, { savedAt: 1, ...options });

describe('createSolve', () => {
  it('starts an empty page against the scramble, at inspection', () => {
    const { solve } = make();
    expect(solve).toEqual({
      id: 's1',
      scramble: SCRAMBLE,
      name: 'Solve 1',
      orientation: null,
      alg: '',
      phases: [],
      savedAt: 1,
    });
  });

  it('puts the newest first and mints ids by counting', () => {
    const first = make();
    const second = make(SCRAMBLE, first.solves);
    expect(second.solves.map((s) => s.id)).toEqual(['s2', 's1']);
    expect(second.solve.name).toBe('Solve 2');
  });

  it('numbers within the scramble, not across the file', () => {
    const first = make();
    const second = make(OTHER, first.solves);
    expect(second.solve.name).toBe('Solve 1');
  });

  it('keys off the scramble text however it was spaced', () => {
    const { solve } = make(`  ${SCRAMBLE.replace(/ /g, '   ')} `);
    expect(solve.scramble).toBe(SCRAMBLE);
  });

  it('refuses a scramble that is not notation, and says so by returning null', () => {
    const list = [make().solve];
    expect(createSolve(list, 'not a scramble')).toEqual({ solves: list, solve: null });
    expect(createSolve(list, '')).toEqual({ solves: list, solve: null });
  });

  it('takes a name, and keeps it distinct within the scramble', () => {
    const first = make(SCRAMBLE, [], { name: 'First block' });
    const second = make(SCRAMBLE, first.solves, { name: 'First block' });
    expect(second.solve.name).toBe('First block 2');
  });

  it('caps the file, dropping the oldest', () => {
    let list = [];
    for (let i = 0; i < MAX_SOLVES + 3; i += 1) {
      list = createSolve(list, SCRAMBLE, { savedAt: i }).solves;
    }
    expect(list).toHaveLength(MAX_SOLVES);
    expect(list[0].savedAt).toBe(MAX_SOLVES + 2);
  });
});

describe('nextSolveId', () => {
  it('counts from the highest rather than from the length, so a delete cannot reuse one', () => {
    expect(nextSolveId([{ id: 's7' }, { id: 's2' }])).toBe('s8');
    expect(nextSolveId([])).toBe('s1');
    expect(nextSolveId(null)).toBe('s1');
    expect(nextSolveId([{ id: 'nonsense' }])).toBe('s1');
  });
});

describe('defaultSolveName', () => {
  it('steps past a name the operator already used', () => {
    const { solves } = make(SCRAMBLE, [], { name: 'Solve 1' });
    expect(defaultSolveName(solves, SCRAMBLE)).toBe('Solve 2');
  });
});

describe('duplicateSolve', () => {
  it('copies the moves and the hold — which is the point of it', () => {
    const first = make();
    const written = updateSolve(first.solves, 's1', { orientation: 'z2', alg: "r U r'" });
    const { solve } = duplicateSolve(written, 's1', { savedAt: 9 });

    expect(solve).toEqual({
      id: 's2',
      scramble: SCRAMBLE,
      name: 'Solve 1 copy',
      orientation: 'z2',
      alg: "r U r'",
      phases: [],
      savedAt: 9,
    });
  });

  it('numbers repeated copies', () => {
    const first = make();
    const once = duplicateSolve(first.solves, 's1', { savedAt: 2 });
    const twice = duplicateSolve(once.solves, 's1', { savedAt: 3 });
    expect(twice.solve.name).toBe('Solve 1 copy 2');
  });

  it('does not share the phases array with the solve it came from', () => {
    const first = make();
    const { solves, solve } = duplicateSolve(first.solves, 's1', { savedAt: 2 });
    solve.phases.push({ at: 0, label: 'First block' });
    expect(findSolve(solves, 's1').phases).toEqual([]);
  });

  it('leaves the list alone for an id it does not know', () => {
    const { solves } = make();
    expect(duplicateSolve(solves, 'nope')).toEqual({ solves, solve: null });
  });
});

describe('updateSolve', () => {
  it('keeps the solve where it was in the list', () => {
    const first = make();
    const second = make(SCRAMBLE, first.solves);
    const next = updateSolve(second.solves, 's1', { alg: 'R' });
    expect(next.map((s) => s.id)).toEqual(['s2', 's1']);
    expect(findSolve(next, 's1').alg).toBe('R');
  });

  it('takes a function of the solve', () => {
    const { solves } = make();
    const next = updateSolve(solves, 's1', (solve) => ({ alg: `${solve.alg}R`.trim() }));
    expect(findSolve(next, 's1').alg).toBe('R');
  });

  it('refuses to let a patch change what a solve is', () => {
    const { solves } = make();
    const next = updateSolve(solves, 's1', { id: 'hacked', scramble: OTHER });
    expect(findSolve(next, 's1').scramble).toBe(SCRAMBLE);
  });

  it('leaves the list identical when the id is unknown', () => {
    const { solves } = make();
    expect(updateSolve(solves, 'nope', { alg: 'R' })).toBe(solves);
  });
});

describe('renameSolve', () => {
  it('renames', () => {
    const { solves } = make();
    expect(findSolve(renameSolve(solves, 's1', '  Second   block '), 's1').name).toBe(
      'Second block'
    );
  });

  it('keeps names distinct within the scramble', () => {
    const first = make();
    const second = make(SCRAMBLE, first.solves);
    const next = renameSolve(second.solves, 's2', 'Solve 1');
    expect(findSolve(next, 's2').name).toBe('Solve 1 2');
  });

  it('does not mind a name already used against a different scramble', () => {
    const first = make();
    const second = make(OTHER, first.solves);
    const next = renameSolve(second.solves, 's2', 'Solve 1');
    expect(findSolve(next, 's2').name).toBe('Solve 1');
  });

  it('refuses an empty name rather than keeping a row you cannot ask for', () => {
    const { solves } = make();
    expect(renameSolve(solves, 's1', '   ')).toBe(solves);
  });

  it('terminates when the name is already at the cap', () => {
    const long = 'x'.repeat(MAX_SOLVE_NAME);
    const first = make(SCRAMBLE, [], { name: long });
    const second = make(SCRAMBLE, first.solves);
    const next = renameSolve(second.solves, 's2', long);
    expect(findSolve(next, 's2').name).not.toBe(findSolve(next, 's1').name);
    expect(findSolve(next, 's2').name.length).toBeLessThanOrEqual(MAX_SOLVE_NAME);
  });
});

describe('removeSolve', () => {
  it('removes by id, and leaves the list identical when nothing matches', () => {
    const first = make();
    const second = make(SCRAMBLE, first.solves);
    expect(removeSolve(second.solves, 's1').map((s) => s.id)).toEqual(['s2']);
    expect(removeSolve(second.solves, 'nope')).toBe(second.solves);
  });
});

describe('solvesFor', () => {
  it('picks out one scramble’s solves, newest first', () => {
    const first = make();
    const second = make(OTHER, first.solves);
    const third = make(SCRAMBLE, second.solves);
    expect(solvesFor(third.solves, SCRAMBLE).map((s) => s.id)).toEqual(['s3', 's1']);
    expect(solvesFor(third.solves, `  ${SCRAMBLE}  `).map((s) => s.id)).toEqual(['s3', 's1']);
    expect(solvesFor(third.solves, '')).toEqual([]);
  });
});

describe('normalizeName', () => {
  it('trims, collapses and caps', () => {
    expect(normalizeName('  First   block ')).toBe('First block');
    expect(normalizeName(null)).toBe('');
    expect(normalizeName('y'.repeat(80))).toHaveLength(MAX_SOLVE_NAME);
  });
});

describe('describeSolveSize', () => {
  it('says how big a solve is, and says empty rather than "0 moves"', () => {
    expect(describeSolveSize({ alg: '' })).toBe('empty');
    expect(describeSolveSize({ alg: 'R' })).toBe('1 move');
    expect(describeSolveSize({ alg: "r U r'" })).toBe('3 moves');
    expect(describeSolveSize(null)).toBe('empty');
  });
});

describe('sanitizeSolves', () => {
  const stored = {
    id: 's4',
    scramble: SCRAMBLE,
    name: 'First block',
    orientation: 'z2',
    alg: "r U r'",
    phases: [{ at: 0, label: 'First block' }],
    savedAt: 12,
  };

  it('reads a well-formed list back unchanged', () => {
    expect(sanitizeSolves([stored])).toEqual([stored]);
  });

  it('answers an empty list for anything that is not one — a Step 5 file included', () => {
    expect(sanitizeSolves(undefined)).toEqual([]);
    expect(sanitizeSolves('nope')).toEqual([]);
    expect(sanitizeSolves([null, 7, 'R U'])).toEqual([]);
  });

  it('drops a solve whose scramble or moves no longer parse', () => {
    expect(sanitizeSolves([{ ...stored, scramble: 'R Q U' }])).toEqual([]);
    expect(sanitizeSolves([{ ...stored, scramble: '' }])).toEqual([]);
    expect(sanitizeSolves([{ ...stored, alg: 'R Q U' }])).toEqual([]);
  });

  it('keeps a solve whose hold no longer parses, falling back to the reference hold', () => {
    // The moves are still the operator's work, and dropping back into inspection
    // under written moves is the one thing plan §8.3 says never to do.
    expect(sanitizeSolves([{ ...stored, orientation: 'z9' }])[0].orientation).toBe('');
    expect(sanitizeSolves([{ ...stored, orientation: 42 }])[0].orientation).toBe('');
  });

  it('keeps a solve that was still being inspected', () => {
    expect(sanitizeSolves([{ ...stored, orientation: null }])[0].orientation).toBeNull();
    expect(sanitizeSolves([{ ...stored, orientation: undefined }])[0].orientation).toBeNull();
  });

  it('re-mints a missing or duplicated id, because two rows with one id opens the wrong solve', () => {
    const clean = sanitizeSolves([
      { ...stored, id: 's4' },
      { ...stored, id: 's4', name: 'Second' },
      { ...stored, id: undefined, name: 'Third' },
    ]);
    // Minted past the highest already in the file, so a re-mint cannot collide
    // with an id further down the list that is still perfectly good.
    expect(clean.map((s) => s.id)).toEqual(['s4', 's5', 's6']);
    expect(new Set(clean.map((s) => s.id)).size).toBe(3);
  });

  it('names an unnamed solve and keeps names distinct within a scramble', () => {
    const clean = sanitizeSolves([
      { ...stored, id: 's1', name: '' },
      { ...stored, id: 's2', name: 'First block' },
      { ...stored, id: 's3', name: 'First block' },
      { ...stored, id: 's4', scramble: OTHER, name: 'First block' },
    ]);
    expect(clean.map((s) => s.name)).toEqual([
      'Solve 1',
      'First block',
      'First block 2',
      'First block',
    ]);
  });

  it('replaces a missing timestamp rather than dropping the solve', () => {
    expect(sanitizeSolves([{ ...stored, savedAt: undefined }])[0].savedAt).toBe(0);
  });

  it('keeps the phases slot well-formed even though nothing writes one yet', () => {
    // `alg` is three moves, so a marker at 3 is the empty trailing phase and a
    // marker at 4 is past the end of a solve that never had it.
    const phases = sanitizeSolves([
      {
        ...stored,
        phases: [
          { at: 0, label: '  First   block ' },
          { at: 3, label: 'LSE' },
          { at: 4, label: 'past the end' },
          { at: -1, label: 'before the start' },
          { at: 1.5, label: 'between moves' },
          'not a phase',
          null,
        ],
      },
    ])[0].phases;

    expect(phases).toEqual([
      { at: 0, label: 'First block' },
      { at: 3, label: 'LSE' },
    ]);
  });

  it('gives a solve with no phases key the empty slot', () => {
    expect(sanitizeSolves([{ ...stored, phases: undefined }])[0].phases).toEqual([]);
  });
});

describe('sanitizeWorkspace', () => {
  const solves = [
    { id: 's1', scramble: SCRAMBLE, name: 'Solve 1', orientation: null, alg: '', phases: [] },
    { id: 's2', scramble: OTHER, name: 'Solve 1', orientation: null, alg: '', phases: [] },
  ];

  it('restores the solve that was open, and the mode with it', () => {
    expect(
      sanitizeWorkspace({ solving: true, solveId: 's1' }, { solves, scramble: SCRAMBLE })
    ).toEqual({ solving: true, solveId: 's1' });
  });

  it('keeps an open solve without solve mode — the scramble is where you left', () => {
    expect(
      sanitizeWorkspace({ solving: false, solveId: 's1' }, { solves, scramble: SCRAMBLE })
    ).toEqual({ solving: false, solveId: 's1' });
  });

  it('refuses a solve written against a different scramble', () => {
    expect(
      sanitizeWorkspace({ solving: true, solveId: 's2' }, { solves, scramble: SCRAMBLE })
    ).toEqual({ solving: false, solveId: null });
  });

  it('refuses a solve that did not survive sanitizing', () => {
    expect(
      sanitizeWorkspace({ solving: true, solveId: 'gone' }, { solves, scramble: SCRAMBLE })
    ).toEqual({ solving: false, solveId: null });
  });

  it('will not restore solve mode with nothing open, because that is not a state', () => {
    expect(
      sanitizeWorkspace({ solving: true, solveId: null }, { solves, scramble: SCRAMBLE })
    ).toEqual({ solving: false, solveId: null });
  });

  it('survives a missing or corrupt workspace', () => {
    const nothing = { solving: false, solveId: null };
    expect(sanitizeWorkspace(undefined, { solves, scramble: SCRAMBLE })).toEqual(nothing);
    expect(sanitizeWorkspace('nope', { solves, scramble: SCRAMBLE })).toEqual(nothing);
    expect(sanitizeWorkspace({ solving: 'yes', solveId: 7 }, { solves, scramble: SCRAMBLE })).toEqual(
      nothing
    );
  });
});
