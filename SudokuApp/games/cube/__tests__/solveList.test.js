import {
  MAX_PHASES,
  MAX_SOLVES,
  MAX_SOLVE_NAME,
  announceCompareCell,
  announcePhaseSpan,
  clampPhases,
  comparePhases,
  createSolve,
  currentSpan,
  defaultSolveName,
  describePhaseSpan,
  describeSolveSize,
  duplicateSolve,
  endPhase,
  findSolve,
  isPhaseBoundary,
  nextSolveId,
  normalizeName,
  openPhaseStart,
  phaseSpans,
  removePhase,
  removeSolve,
  renameSolve,
  sanitizeSolves,
  sanitizeWorkspace,
  solvesFor,
  updateSolve,
  withMoves,
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
      mistakes: 0,
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
      mistakes: 0,
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

  it('starts the copy at zero fumbles — a fresh attempt earns its own', () => {
    const first = make();
    const written = updateSolve(first.solves, 's1', { mistakes: 3 });
    const { solve } = duplicateSolve(written, 's1', { savedAt: 2 });
    expect(solve.mistakes).toBe(0);
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
    mistakes: 2,
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

  it('reads the fumble count back, and repairs a corrupt one', () => {
    expect(sanitizeSolves([{ ...stored, mistakes: 5 }])[0].mistakes).toBe(5);
    // A pre-Step-3.5 solve simply has no count — zero fumbles by shape, the same
    // tolerance every other field on this path is given.
    const legacy = { ...stored };
    delete legacy.mistakes;
    expect(sanitizeSolves([legacy])[0].mistakes).toBe(0);
    // Corrupt values floor or fall to zero rather than reaching the screen.
    expect(sanitizeSolves([{ ...stored, mistakes: -3 }])[0].mistakes).toBe(0);
    expect(sanitizeSolves([{ ...stored, mistakes: 2.7 }])[0].mistakes).toBe(2);
    expect(sanitizeSolves([{ ...stored, mistakes: 'lots' }])[0].mistakes).toBe(0);
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

describe('clampPhases', () => {
  it('drops a marker the solve no longer reaches, and keeps the one at the very end', () => {
    const phases = [{ at: 0, label: 'First block' }, { at: 8, label: '' }];
    expect(clampPhases(phases, 8)).toEqual(phases);
    expect(clampPhases(phases, 7)).toEqual([{ at: 0, label: 'First block' }]);
  });

  it('sorts, so consecutive markers really do bound consecutive spans', () => {
    expect(clampPhases([{ at: 8, label: 'b' }, { at: 0, label: 'a' }], 10)).toEqual([
      { at: 0, label: 'a' },
      { at: 8, label: 'b' },
    ]);
  });

  it('merges two markers at one index, because that is one boundary', () => {
    expect(clampPhases([{ at: 3, label: 'first' }, { at: 3, label: 'second' }], 5)).toEqual([
      { at: 3, label: 'first' },
    ]);
  });

  it('normalizes the labels and refuses anything that is not a marker', () => {
    expect(
      clampPhases(
        [
          { at: 0, label: '  First   block ' },
          { at: -1, label: 'before the start' },
          { at: 1.5, label: 'between moves' },
          { at: 2 },
          'nope',
          null,
        ],
        4
      )
    ).toEqual([
      { at: 0, label: 'First block' },
      { at: 2, label: '' },
    ]);
  });

  it('survives a missing list and a nonsense count', () => {
    expect(clampPhases(undefined, 4)).toEqual([]);
    expect(clampPhases([{ at: 0, label: 'x' }], undefined)).toEqual([{ at: 0, label: 'x' }]);
    expect(clampPhases([{ at: 1, label: 'x' }], undefined)).toEqual([]);
  });

  it('caps the list', () => {
    const many = Array.from({ length: MAX_PHASES + 5 }, (_, at) => ({ at, label: `p${at}` }));
    expect(clampPhases(many, many.length)).toHaveLength(MAX_PHASES);
  });
});

describe('openPhaseStart', () => {
  it('is the last boundary before here, or the start of the solve', () => {
    const phases = [{ at: 0, label: 'First block' }, { at: 8, label: '' }];
    expect(openPhaseStart(phases, 12)).toBe(8);
    // Standing on the boundary the last "end the phase" left: the group that
    // ends here is the one behind it, which is what makes naming again a
    // rename rather than a dead end.
    expect(openPhaseStart(phases, 8)).toBe(0);
    expect(openPhaseStart(phases, 3)).toBe(0);
    expect(openPhaseStart([], 5)).toBe(0);
  });

  it('says whether a boundary is already here, so the screen can name what it is doing', () => {
    const phases = [{ at: 0, label: 'First block' }, { at: 8, label: '' }];
    expect(isPhaseBoundary(phases, 8)).toBe(true);
    expect(isPhaseBoundary(phases, 7)).toBe(false);
    expect(isPhaseBoundary([], 0)).toBe(false);
  });
});

describe('endPhase', () => {
  it('names the group that just ended and opens the next one', () => {
    // Without the second marker "First block · 8" would quietly become
    // "First block · 12" as the second block was written.
    expect(endPhase([], 8, 'First block', 8)).toEqual([
      { at: 0, label: 'First block' },
      { at: 8, label: '' },
    ]);
  });

  it('walks a Roux solve the way it is actually written', () => {
    const first = endPhase([], 8, 'First block', 8);
    const second = endPhase(first, 20, 'Second block', 20);
    const cmll = endPhase(second, 31, 'CMLL', 31);

    expect(cmll).toEqual([
      { at: 0, label: 'First block' },
      { at: 8, label: 'Second block' },
      { at: 20, label: 'CMLL' },
      { at: 31, label: '' },
    ]);
    expect(phaseSpans(cmll, 31).map((span) => describePhaseSpan(span))).toEqual([
      'First block · 8',
      'Second block · 12',
      'CMLL · 11',
      'In progress · 0',
    ]);
  });

  it('takes free text as readily as a method name', () => {
    expect(endPhase([], 4, '  M   first ', 4)[0].label).toBe('M first');
  });

  it('renames the group when the boundary is already there', () => {
    // A second tap on the flag with nothing new written can only mean the group
    // behind it — and it is the way out of a mis-tapped name. Refusing instead
    // dead-ends: bin a marker and the group it left could never be named again
    // without writing another move.
    const marked = endPhase([], 8, 'First block', 8);
    expect(endPhase(marked, 8, 'Second block', 8)).toEqual([
      { at: 0, label: 'Second block' },
      { at: 8, label: '' },
    ]);
  });

  it('refuses a group with no moves in it — which is only ever the start', () => {
    // Every other position has at least one move behind it, because the group
    // that ends there begins at the last boundary *before* it.
    expect(endPhase([], 0, 'First block', 8)).toEqual([]);
    expect(endPhase([{ at: 0, label: 'a' }], 0, 'b', 8)).toEqual([{ at: 0, label: 'a' }]);
  });

  it('refuses a position the solve does not reach, and a name that is not one', () => {
    expect(endPhase([], 9, 'First block', 8)).toEqual([]);
    expect(endPhase([], 4, '   ', 8)).toEqual([]);
    expect(endPhase([], 1.5, 'First block', 8)).toEqual([]);
  });

  it('marks in the middle when the operator scrubbed back to say so', () => {
    // Not the flow §8.5 designs for, but the one that happens when someone
    // forgets to mark and steps back to where the block finished.
    const marked = endPhase([], 20, 'Whole thing', 20);
    expect(endPhase(marked, 8, 'First block', 20)).toEqual([
      { at: 0, label: 'First block' },
      { at: 8, label: '' },
      { at: 20, label: '' },
    ]);
  });

  it('stops at the cap rather than dropping a marker to make room', () => {
    const full = Array.from({ length: MAX_PHASES }, (_, at) => ({ at, label: `p${at}` }));
    expect(endPhase(full, MAX_PHASES + 1, 'One more', MAX_PHASES + 1)).toHaveLength(
      MAX_PHASES
    );
  });
});

describe('phaseSpans', () => {
  it('is empty for a solve nobody has annotated', () => {
    expect(phaseSpans([], 12)).toEqual([]);
    expect(phaseSpans(undefined, 12)).toEqual([]);
  });

  it('derives the counts by subtraction, and runs the last span to the end', () => {
    expect(phaseSpans([{ at: 0, label: 'First block' }, { at: 8, label: 'LSE' }], 14)).toEqual([
      { at: 0, end: 8, label: 'First block', count: 8 },
      { at: 8, end: 14, label: 'LSE', count: 6 },
    ]);
  });

  it('puts an unnamed span in front of a file whose first marker is not at 0', () => {
    expect(phaseSpans([{ at: 3, label: 'Second block' }], 9)).toEqual([
      { at: 0, end: 3, label: '', count: 3 },
      { at: 3, end: 9, label: 'Second block', count: 6 },
    ]);
  });
});

describe('currentSpan', () => {
  const spans = phaseSpans([{ at: 0, label: 'a' }, { at: 8, label: 'b' }], 14);

  it('picks the span the move just played belongs to', () => {
    expect(currentSpan(spans, 0)).toBe(0);
    expect(currentSpan(spans, 8)).toBe(0);
    expect(currentSpan(spans, 9)).toBe(1);
    expect(currentSpan(spans, 14)).toBe(1);
    expect(currentSpan([], 3)).toBe(-1);
  });
});

describe('describePhaseSpan / announcePhaseSpan', () => {
  it('says the name and the count, and names a group nobody has closed', () => {
    expect(describePhaseSpan({ at: 0, end: 8, label: 'First block', count: 8 })).toBe(
      'First block · 8'
    );
    expect(describePhaseSpan({ at: 8, end: 11, label: '', count: 3 })).toBe('In progress · 3');
  });

  it('says the moves out loud, which is what the chip has no room for', () => {
    expect(announcePhaseSpan({ at: 0, end: 8, label: 'First block', count: 8 })).toBe(
      'First block, 8 moves, 1 to 8'
    );
    expect(announcePhaseSpan({ at: 8, end: 9, label: 'LSE', count: 1 })).toBe(
      'LSE, 1 move, move 9'
    );
    expect(announcePhaseSpan({ at: 8, end: 8, label: 'LSE', count: 0 })).toBe(
      'LSE, no moves yet'
    );
  });
});

describe('withMoves', () => {
  const EIGHT = "R U R' U' R U R' U'";

  it('leaves the markers alone when the solve grows', () => {
    const solve = {
      alg: EIGHT,
      phases: [{ at: 0, label: 'First block' }, { at: 8, label: '' }],
    };
    expect(withMoves(solve, `${EIGHT} M2`)).toEqual({
      alg: `${EIGHT} M2`,
      phases: solve.phases,
    });
  });

  it('drops the marker an undo just removed the move from under', () => {
    // The move that ended the first block is gone, so the group is open again —
    // and this has to be the *same* answer `sanitizeSolves` gives, or a marker
    // survives a reload that did not survive the edit.
    const solve = {
      alg: EIGHT,
      phases: [{ at: 0, label: 'First block' }, { at: 8, label: '' }],
    };
    const undone = withMoves(solve, "R U R' U' R U R'");
    expect(undone.phases).toEqual([{ at: 0, label: 'First block' }]);

    const reloaded = sanitizeSolves([
      {
        id: 's1',
        scramble: SCRAMBLE,
        name: 'Solve 1',
        orientation: '',
        alg: undone.alg,
        phases: solve.phases,
        savedAt: 1,
      },
    ]);
    expect(reloaded[0].phases).toEqual(undone.phases);
  });

  it('re-marking after the undo lands back where it was', () => {
    const solve = { alg: EIGHT, phases: [{ at: 0, label: 'First block' }, { at: 8, label: '' }] };
    const undone = withMoves(solve, "R U R' U' R U R'");
    const regrown = withMoves({ ...solve, phases: undone.phases }, EIGHT);
    expect(endPhase(regrown.phases, 8, 'First block', 8)).toEqual(solve.phases);
  });

  it('survives a solve with no markers at all', () => {
    expect(withMoves({ alg: '', phases: [] }, 'R')).toEqual({ alg: 'R', phases: [] });
    expect(withMoves(null, 'R')).toEqual({ alg: 'R', phases: [] });
  });
});

describe('sanitizeWorkspace', () => {
  const solves = [
    { id: 's1', scramble: SCRAMBLE, name: 'Solve 1', orientation: null, alg: '', phases: [] },
    { id: 's2', scramble: OTHER, name: 'Solve 1', orientation: null, alg: '', phases: [] },
  ];

  it('restores the solve that was open — which is the route being restored with it', () => {
    expect(sanitizeWorkspace({ solveId: 's1' }, { solves, scramble: SCRAMBLE })).toEqual({
      solveId: 's1',
      view: null,
    });
  });

  it('refuses a solve written against a different scramble', () => {
    expect(sanitizeWorkspace({ solveId: 's2' }, { solves, scramble: SCRAMBLE })).toEqual({
      solveId: null,
      view: null,
    });
  });

  it('refuses a solve that did not survive sanitizing', () => {
    expect(sanitizeWorkspace({ solveId: 'gone' }, { solves, scramble: SCRAMBLE })).toEqual({
      solveId: null,
      view: null,
    });
  });

  it('survives a missing or corrupt workspace', () => {
    const nothing = { solveId: null, view: null };
    expect(sanitizeWorkspace(undefined, { solves, scramble: SCRAMBLE })).toEqual(nothing);
    expect(sanitizeWorkspace('nope', { solves, scramble: SCRAMBLE })).toEqual(nothing);
    expect(sanitizeWorkspace({ solveId: 7 }, { solves, scramble: SCRAMBLE })).toEqual(nothing);
  });

  // ——— The flag that used to be beside it (Cube Flow Step 2) ————————————————
  //
  // `solving` is not written any more: the solve is a route, and the id is
  // written only while that route is on the stack. A file from before the split
  // still has both, and the mode it recorded is the last thing that build had to
  // say about where the operator was standing.

  it('opens a solve a pre-Step-2 file left open', () => {
    expect(
      sanitizeWorkspace({ solving: true, solveId: 's1' }, { solves, scramble: SCRAMBLE }).solveId
    ).toBe('s1');
  });

  it('does not open one a pre-Step-2 file had merely remembered', () => {
    expect(
      sanitizeWorkspace({ solving: false, solveId: 's1' }, { solves, scramble: SCRAMBLE }).solveId
    ).toBeNull();
  });

  // ——— The angle the cube was left at (operator, 2026-08-06) ————————————————
  //
  // A change to §7.1's rule rather than an addition to it: the angle used to be
  // excluded as "where you are standing", and turning the cube to where you want
  // it turns out to be closer to putting it down than to scrolling. The scrub
  // position and the speed stay out.

  it('keeps the angle the cube was left turned to', () => {
    expect(
      sanitizeWorkspace(
        { solveId: 's1', view: { yaw: 0.5, pitch: -0.25 } },
        { solves, scramble: SCRAMBLE }
      )
    ).toEqual({ solveId: 's1', view: { yaw: 0.5, pitch: -0.25 } });
  });

  it('remembers the angle even when the solve it was looking at is gone', () => {
    // An angle is valid against any cube, so it does not get cross-checked the
    // way the id is — losing your place should not also move the camera.
    expect(
      sanitizeWorkspace(
        { solveId: 'gone', view: { yaw: 0.5, pitch: -0.25 } },
        { solves, scramble: SCRAMBLE }
      )
    ).toEqual({ solveId: null, view: { yaw: 0.5, pitch: -0.25 } });
  });

  it('has nothing remembered on a first visit, which is the cue to open at the default', () => {
    expect(sanitizeWorkspace({ solveId: 's1' }, { solves, scramble: SCRAMBLE }).view).toBeNull();
  });

  it('refuses anything that is not two angles', () => {
    const view = (raw) =>
      sanitizeWorkspace({ solveId: 's1', view: raw }, { solves, scramble: SCRAMBLE }).view;

    expect(view({ yaw: 0.5 })).toBeNull();
    expect(view({ yaw: 0.5, pitch: 'up' })).toBeNull();
    expect(view({ yaw: NaN, pitch: 0 })).toBeNull();
    expect(view({ yaw: Infinity, pitch: 0 })).toBeNull();
    expect(view('0.5,0.25')).toBeNull();
    expect(view(null)).toBeNull();
  });

  it('wraps an angle a corrupt file could hold, rather than trusting it', () => {
    // 1e9 radians is finite and is not somewhere anybody can look from.
    const wrapped = sanitizeWorkspace(
      { solveId: 's1', view: { yaw: 1e9, pitch: 1e9 } },
      { solves, scramble: SCRAMBLE }
    ).view;

    expect(Math.abs(wrapped.yaw)).toBeLessThanOrEqual(Math.PI);
    expect(Math.abs(wrapped.pitch)).toBeLessThanOrEqual(Math.PI);
  });

  it('keeps a full turn as the same picture it already was', () => {
    const view = sanitizeWorkspace(
      { solveId: 's1', view: { yaw: 0.4 + Math.PI * 2, pitch: -0.2 } },
      { solves, scramble: SCRAMBLE }
    ).view;

    expect(view.yaw).toBeCloseTo(0.4, 10);
    expect(view.pitch).toBeCloseTo(-0.2, 10);
  });
});

// ——— Comparing the attempts (plan §8.10, Step 9) ——————————————————————————

/** `n` real moves, so `moveCount` and `phaseSpans` see what the screen sees. */
const moves = (n) =>
  Array.from({ length: n }, (_, i) => ['R', 'U', 'F', "D'", 'L2', 'B'][i % 6]).join(' ');

/** An attempt, as the file holds one. */
const attempt = (id, name, count, phases) => ({
  id,
  scramble: SCRAMBLE,
  name,
  orientation: '',
  alg: moves(count),
  phases,
  savedAt: 1,
});

/** Roux markers: first block of `a`, second block of `b`, and the fresh unnamed
 *  boundary the last "end the phase" opens. */
const roux = (a, b) => [
  { at: 0, label: 'First block' },
  { at: a, label: 'Second block' },
  { at: a + b, label: '' },
];

describe('comparePhases', () => {
  // Newest first is how the list arrives, so this is written the way the file
  // holds it and read back the other way round.
  const three = [
    attempt('s3', 'Solve 3', 18, roux(6, 12)),
    attempt('s2', 'Solve 2', 19, roux(7, 12)),
    attempt('s1', 'Solve 1', 20, roux(8, 12)),
  ];

  it('lines up phases with the same name, oldest attempt first', () => {
    const { labels, rows } = comparePhases(three);

    expect(labels).toEqual(['First block', 'Second block']);
    expect(rows.map((row) => row.name)).toEqual(['Solve 1', 'Solve 2', 'Solve 3']);
    // The column is the point: 8, 7, 6 read downwards is the improvement.
    expect(rows.map((row) => row.cells[0].count)).toEqual([8, 7, 6]);
    expect(rows.map((row) => row.cells[1].count)).toEqual([12, 12, 12]);
  });

  it('agrees with phaseSpans, because it is phaseSpans', () => {
    const { rows } = comparePhases(three);
    const oldest = three[2];
    const spans = phaseSpans(oldest.phases, 20);

    expect(rows[0].cells[0].count).toBe(
      spans.find((span) => span.label === 'First block').count
    );
    expect(rows[0].total).toBe(20);
  });

  it('marks the fewest, not the first', () => {
    const { rows } = comparePhases(three);

    expect(rows.map((row) => row.cells[0].best)).toEqual([false, false, true]);
    // Three equal second blocks are all the fewest, so all three are marked.
    expect(rows.map((row) => row.cells[1].best)).toEqual([true, true, true]);
  });

  it('averages nothing — there is no mean to be dragged around by a bad attempt', () => {
    const abandoned = [attempt('s2', 'Solve 2', 3, roux(3, 0)), ...three];
    const { rows } = comparePhases(abandoned);

    expect(rows.map((row) => row.cells[0].count)).toEqual([8, 7, 6, 3]);
    expect(rows.some((row) => 'average' in row)).toBe(false);
  });

  it('refuses to call a phase only one solve has marked the best', () => {
    const list = [
      attempt('s2', 'Solve 2', 6, [{ at: 0, label: 'First block' }]),
      attempt('s1', 'Solve 1', 12, [
        { at: 0, label: 'First block' },
        { at: 8, label: 'CMLL' },
      ]),
    ];

    const { labels, rows } = comparePhases(list);
    expect(labels).toEqual(['First block', 'CMLL']);
    // Two attempts at the first block, one of them shorter.
    expect(rows.map((row) => row.cells[0].best)).toEqual([false, true]);
    // One attempt at CMLL, and a sample of one has no best in it.
    expect(rows.map((row) => (row.cells[1] ? row.cells[1].best : null))).toEqual([false, null]);
  });

  it('gives a solve with no markers a row of nothing, and says it is unannotated', () => {
    const list = [attempt('s2', 'Solve 2', 20, []), attempt('s1', 'Solve 1', 20, roux(8, 12))];
    const { labels, rows } = comparePhases(list);

    expect(labels).toEqual(['First block', 'Second block']);
    expect(rows[1]).toEqual({
      id: 's2',
      name: 'Solve 2',
      total: 20,
      annotated: false,
      cells: [null, null],
    });
    expect(rows[0].annotated).toBe(true);
  });

  it('has no columns at all when nothing is annotated', () => {
    const list = [attempt('s2', 'Solve 2', 20, []), attempt('s1', 'Solve 1', 12, [])];
    expect(comparePhases(list)).toEqual({
      labels: [],
      rows: [
        { id: 's1', name: 'Solve 1', total: 12, annotated: false, cells: [] },
        { id: 's2', name: 'Solve 2', total: 20, annotated: false, cells: [] },
      ],
    });
  });

  it('does not line Roux up against CFOP', () => {
    const list = [
      attempt('s2', 'Solve 2', 20, [
        { at: 0, label: 'Cross' },
        { at: 7, label: 'F2L' },
        { at: 20, label: '' },
      ]),
      attempt('s1', 'Solve 1', 20, roux(8, 12)),
    ];

    const { labels, rows } = comparePhases(list);

    // Eight columns rather than four, because a Cross is not a First block and
    // no arrangement makes it one.
    expect(labels).toEqual(['First block', 'Second block', 'Cross', 'F2L']);
    expect(rows[0].cells.map((cell) => cell && cell.count)).toEqual([8, 12, null, null]);
    expect(rows[1].cells.map((cell) => cell && cell.count)).toEqual([null, null, 7, 13]);
    // And nothing is anyone's best, because no column has two attempts in it.
    expect(rows.every((row) => row.cells.every((cell) => !cell || !cell.best))).toBe(true);
  });

  it('interleaves a new label where the solve that introduced it put it', () => {
    const list = [
      attempt('s2', 'Solve 2', 20, [
        { at: 0, label: 'First block' },
        { at: 8, label: 'Second block' },
        { at: 14, label: 'CMLL' },
        { at: 20, label: '' },
      ]),
      attempt('s1', 'Solve 1', 20, [
        { at: 0, label: 'First block' },
        { at: 14, label: 'CMLL' },
        { at: 20, label: '' },
      ]),
    ];

    // Solve 1 never named a second block, and Solve 2's goes *between* the two
    // labels it already has rather than on the end.
    expect(comparePhases(list).labels).toEqual(['First block', 'Second block', 'CMLL']);
  });

  it('puts a label directly after whatever it followed, which is all the evidence there is', () => {
    const list = [
      // A solve that stopped after the first block and then jumped to LSE says
      // LSE follows First block, and nothing here knows Roux well enough to
      // disagree with it.
      attempt('s2', 'Solve 2', 20, [
        { at: 0, label: 'First block' },
        { at: 6, label: 'LSE' },
        { at: 20, label: '' },
      ]),
      attempt('s1', 'Solve 1', 20, [
        { at: 0, label: 'First block' },
        { at: 8, label: 'Second block' },
        { at: 20, label: '' },
      ]),
    ];

    expect(comparePhases(list).labels).toEqual(['First block', 'LSE', 'Second block']);
  });

  it('leaves the unnamed spans out — including the one at the very end', () => {
    // A trailing marker at the end of the solve is a real boundary with no moves
    // in it. The strip skips it and so does this; it is not a column.
    const list = [attempt('s1', 'Solve 1', 20, roux(8, 12))];
    const { labels, rows } = comparePhases(list);

    expect(labels).toEqual(['First block', 'Second block']);
    // 8 and 12 is the whole solve here, but the row carries its own total
    // because the columns are under no obligation to add up.
    expect(rows[0].total).toBe(20);
  });

  it('carries a total the columns do not have to add up to', () => {
    // Only the first block is named; the twelve moves after it are unclassified
    // and stay that way rather than being invented into a phase.
    const list = [attempt('s1', 'Solve 1', 20, [{ at: 0, label: 'First block' }, { at: 8, label: '' }])];
    const { labels, rows } = comparePhases(list);

    expect(labels).toEqual(['First block']);
    expect(rows[0].cells[0].count).toBe(8);
    expect(rows[0].total).toBe(20);
  });

  it('sums a label used twice in one solve, and says it was two groups', () => {
    const list = [
      attempt('s1', 'Solve 1', 20, [
        { at: 0, label: 'Second block' },
        { at: 5, label: 'CMLL' },
        { at: 12, label: 'Second block' },
        { at: 20, label: '' },
      ]),
    ];

    const { labels, rows } = comparePhases(list);
    expect(labels).toEqual(['Second block', 'CMLL']);
    expect(rows[0].cells[0]).toEqual({
      label: 'Second block',
      count: 13,
      groups: 2,
      best: false,
    });
  });

  it('survives an empty list, and a missing one', () => {
    expect(comparePhases([])).toEqual({ labels: [], rows: [] });
    expect(comparePhases(null)).toEqual({ labels: [], rows: [] });
  });

  it('does not mutate the list it was handed', () => {
    const list = [...three];
    comparePhases(list);
    expect(list.map((solve) => solve.id)).toEqual(['s3', 's2', 's1']);
  });
});

describe('announceCompareCell', () => {
  it('says the count, and singular where it should', () => {
    expect(announceCompareCell('Solve 1', 'First block', { count: 8, groups: 1, best: false })).toBe(
      'Solve 1, First block, 8 moves'
    );
    expect(announceCompareCell('Solve 1', 'CMLL', { count: 1, groups: 1, best: false })).toBe(
      'Solve 1, CMLL, 1 move'
    );
  });

  it('says which is the fewest, and how many groups it took', () => {
    expect(announceCompareCell('Solve 3', 'First block', { count: 6, groups: 1, best: true })).toBe(
      'Solve 3, First block, 6 moves, fewest so far'
    );
    expect(
      announceCompareCell('Solve 3', 'Second block', { count: 13, groups: 2, best: false })
    ).toBe('Solve 3, Second block, 13 moves, 2 groups');
  });

  it('says plainly when a solve did not mark the phase', () => {
    expect(announceCompareCell('Solve 2', 'CMLL', null)).toBe('Solve 2, CMLL not marked');
  });
});
