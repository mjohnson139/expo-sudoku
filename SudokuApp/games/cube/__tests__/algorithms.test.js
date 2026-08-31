import {
  ALL_LABEL,
  algorithmCase,
  algorithmStartingCube,
  MAX_ALGORITHMS,
  MAX_ALG_NAME,
  MAX_ALG_NOTES,
  MAX_ASSIGNMENTS,
  UNASSIGNED,
  UNASSIGNED_LABEL,
  algorithmFilters,
  algorithmsForStage,
  createAlgorithm,
  defaultAlgorithmName,
  describeAlgorithmSize,
  describeAssignment,
  describeStageAlgorithms,
  editAlgorithm,
  filterAlgorithms,
  findAlgorithm,
  hasAssignment,
  liveFilter,
  nextAlgorithmId,
  normalizeAlgName,
  removeAlgorithm,
  sanitizeAlgorithms,
  sanitizeAssignments,
  searchAlgorithms,
  toggleAssignment,
} from '../algorithms';
import { EMPTY_CASE, caseOfAlgorithm, caseOfSetup } from '../algCase';
import { METHODS } from '../methods';
import { cubeFromAlg, facelets } from '../cubeState';
import { invertAlg } from '../moves';

const SUNE = "R U R' U R U2 R'";
const TPERM = "R U R' U' R' F R2 U' R' U' R U R' F'";

/** One entry, made the way the screen makes them. */
const make = (list = [], options = {}, catalogue) =>
  createAlgorithm(list, { moves: SUNE, savedAt: 1, ...options }, catalogue);

/** A library of `n` entries, each with distinct moves so nothing collides. */
const library = (n) => {
  let list = [];
  for (let i = 0; i < n; i += 1) {
    list = createAlgorithm(list, { moves: `${'U '.repeat(i + 1).trim()}`, savedAt: 1 }).algorithms;
  }
  return list;
};

describe('stage algorithm views', () => {
  const catalogue = [...METHODS, { id: 'mine', name: 'My long method', stages: ['First idea'] }];
  let algorithms;

  beforeEach(() => {
    algorithms = make([], {
      assignments: [{ method: 'roux', stage: 'CMLL' }, { method: 'mine', stage: 'First idea' }],
    }, catalogue).algorithms;
    algorithms = make(algorithms, {
      moves: 'U',
      assignments: [{ method: 'roux', stage: 'LSE' }],
    }, catalogue).algorithms;
  });

  it('filters by the exact method and stage and describes linked counts', () => {
    expect(algorithmsForStage(algorithms, 'roux', 'CMLL').map((entry) => entry.id)).toEqual(['a1']);
    expect(algorithmsForStage(algorithms, 'roux', 'LSE').map((entry) => entry.id)).toEqual(['a2']);
    expect(describeStageAlgorithms(algorithms, 'roux', 'CMLL')).toBe('1 algorithm linked');
    expect(describeStageAlgorithms(algorithms, 'cfop', 'OLL')).toBe('no algorithms · intuitive');
  });

  it('includes user methods in filters and falls back when their last chip disappears', () => {
    const chips = algorithmFilters(algorithms, catalogue);
    expect(chips.some((chip) => chip.id === 'mine' && chip.count === 1)).toBe(true);
    const mine = findAlgorithm(algorithms, 'a1');
    const withoutMine = editAlgorithm(algorithms, 'a1', {
      assignments: toggleAssignment(mine.assignments, 'mine', 'First idea', catalogue),
    }, { catalogue });
    expect(liveFilter(algorithmFilters(withoutMine, catalogue), 'mine')).toBeNull();
  });

  it('adds and removes a stage assignment idempotently through editAlgorithm', () => {
    const second = findAlgorithm(algorithms, 'a2');
    const added = editAlgorithm(algorithms, 'a2', {
      assignments: toggleAssignment(second.assignments, 'mine', 'First idea', catalogue),
    }, { catalogue });
    expect(algorithmsForStage(added, 'mine', 'First idea')).toHaveLength(2);
    const removed = editAlgorithm(added, 'a2', {
      assignments: toggleAssignment(findAlgorithm(added, 'a2').assignments, 'mine', 'First idea', catalogue),
    }, { catalogue });
    expect(algorithmsForStage(removed, 'mine', 'First idea')).toHaveLength(1);
  });
});

describe('createAlgorithm', () => {
  it('writes an entry with the shape the plan settled on', () => {
    const { algorithm } = make();
    expect(algorithm).toEqual({
      id: 'a1',
      name: 'Algorithm 1',
      moves: SUNE,
      setup: '',
      // Step 2's field, sitting in the file already rather than reshaping it twice.
      case: null,
      assignments: [],
      notes: '',
      savedAt: 1,
      editedAt: 1,
    });
  });

  it('keeps the name, the assignments and the notes it was given', () => {
    const { algorithm } = make([], {
      name: '  Sune   ',
      assignments: [{ method: 'roux', stage: 'CMLL' }],
      notes: 'right hand,\nthumb on the F face',
    });
    expect(algorithm.name).toBe('Sune');
    expect(algorithm.assignments).toEqual([{ method: 'roux', stage: 'CMLL' }]);
    expect(algorithm.notes).toBe('right hand,\nthumb on the F face');
  });

  it('normalizes the moves it stores', () => {
    expect(make([], { moves: "  R   U  R'  " }).algorithm.moves).toBe("R U R'");
  });

  it('refuses moves that do not parse, and moves that are not there', () => {
    ['', '   ', 'R Q U', null, undefined].forEach((moves) => {
      const list = library(1);
      const { algorithms, algorithm } = createAlgorithm(list, { moves, savedAt: 1 });
      expect(algorithm).toBeNull();
      expect(algorithms).toBe(list);
    });
  });

  it('puts the newest entry first', () => {
    const one = make().algorithms;
    const two = createAlgorithm(one, { moves: TPERM, savedAt: 2 }).algorithms;
    expect(two.map((entry) => entry.id)).toEqual(['a2', 'a1']);
  });

  it('makes a clashing name unique rather than keeping two rows that read the same', () => {
    const one = make([], { name: 'Sune' }).algorithms;
    const { algorithm } = createAlgorithm(one, { moves: TPERM, name: 'Sune', savedAt: 2 });
    expect(algorithm.name).toBe('Sune 2');
  });

  it('makes room for the suffix rather than appending past the cap', () => {
    const long = 'x'.repeat(MAX_ALG_NAME);
    const one = make([], { name: long }).algorithms;
    const { algorithm } = createAlgorithm(one, { moves: TPERM, name: long, savedAt: 2 });
    expect(algorithm.name.length).toBeLessThanOrEqual(MAX_ALG_NAME);
    expect(algorithm.name).not.toBe(long);
  });

  it('refuses rather than evicting when the library is full', () => {
    const full = library(MAX_ALGORITHMS);
    expect(full).toHaveLength(MAX_ALGORITHMS);
    const { algorithms, algorithm } = createAlgorithm(full, { moves: TPERM, savedAt: 2 });
    // The oldest entry is the operator's work. Nothing is dropped to make room.
    expect(algorithm).toBeNull();
    expect(algorithms).toBe(full);
  });
});

describe('nextAlgorithmId', () => {
  it('counts one past the highest, so a deleted id is not handed out again', () => {
    const two = createAlgorithm(make().algorithms, { moves: TPERM, savedAt: 2 }).algorithms;
    expect(nextAlgorithmId(two)).toBe('a3');
    // The highest is what is counted from rather than the length, so deleting
    // `a1` does not make the next entry a second `a2`.
    expect(nextAlgorithmId(removeAlgorithm(two, 'a1'))).toBe('a3');
  });

  it('ignores ids it did not mint', () => {
    expect(nextAlgorithmId([{ id: 'wat' }, { id: 'a4' }, { id: 'a2' }])).toBe('a5');
    expect(nextAlgorithmId(null)).toBe('a1');
  });
});

describe('defaultAlgorithmName', () => {
  it('counts the library', () => {
    expect(defaultAlgorithmName([])).toBe('Algorithm 1');
    expect(defaultAlgorithmName(make().algorithms)).toBe('Algorithm 2');
  });

  it('steps past a name the operator already used', () => {
    const one = make([], { name: 'Algorithm 2' }).algorithms;
    expect(defaultAlgorithmName(one)).toBe('Algorithm 2 2');
  });
});

describe('normalizeAlgName', () => {
  it('trims, single-spaces and bounds', () => {
    expect(normalizeAlgName('  two   words ')).toBe('two words');
    expect(normalizeAlgName('x'.repeat(80))).toHaveLength(MAX_ALG_NAME);
    expect(normalizeAlgName(null)).toBe('');
  });
});

describe('sanitizeAssignments', () => {
  it('keeps a method and a stage the catalogue knows', () => {
    expect(sanitizeAssignments([{ method: 'roux', stage: 'CMLL' }])).toEqual([
      { method: 'roux', stage: 'CMLL' },
    ]);
  });

  it('drops an unknown method, an unknown stage, and a stage from the wrong method', () => {
    expect(
      sanitizeAssignments([
        { method: 'petrus', stage: 'Block' },
        { method: 'roux', stage: 'My thing' },
        // CFOP's stage, named against Roux — a real trap once user methods share
        // stage strings, and a tag that would read as true.
        { method: 'roux', stage: 'OLL' },
        { method: null, stage: 'CMLL' },
        'nope',
        null,
      ])
    ).toEqual([]);
  });

  it('trims a stage before matching it', () => {
    expect(sanitizeAssignments([{ method: 'cfop', stage: '  F2L ' }])).toEqual([
      { method: 'cfop', stage: 'F2L' },
    ]);
  });

  it('collapses duplicates and bounds the list', () => {
    expect(
      sanitizeAssignments([
        { method: 'roux', stage: 'CMLL' },
        { method: 'roux', stage: 'CMLL' },
      ])
    ).toHaveLength(1);

    const many = [];
    METHODS.forEach((method) =>
      method.stages.forEach((stage) => many.push({ method: method.id, stage }))
    );
    expect(sanitizeAssignments([...many, ...many].slice(0, 40)).length).toBeLessThanOrEqual(
      MAX_ASSIGNMENTS
    );
  });

  it('lets one entry serve two methods at once', () => {
    expect(
      sanitizeAssignments([
        { method: 'roux', stage: 'CMLL' },
        { method: 'cfop', stage: 'OLL' },
      ])
    ).toHaveLength(2);
  });

  it('is the empty list for anything that is not one', () => {
    expect(sanitizeAssignments(undefined)).toEqual([]);
    expect(sanitizeAssignments('roux')).toEqual([]);
  });
});

describe('toggleAssignment', () => {
  it('adds one that is not there and removes one that is', () => {
    const on = toggleAssignment([], 'roux', 'CMLL');
    expect(on).toEqual([{ method: 'roux', stage: 'CMLL' }]);
    expect(toggleAssignment(on, 'roux', 'CMLL')).toEqual([]);
  });

  it('leaves the others alone', () => {
    const both = toggleAssignment([{ method: 'cfop', stage: 'OLL' }], 'roux', 'CMLL');
    expect(toggleAssignment(both, 'cfop', 'OLL')).toEqual([{ method: 'roux', stage: 'CMLL' }]);
  });

  it('refuses a method or a stage the catalogue does not know', () => {
    expect(toggleAssignment([], 'petrus', 'Block')).toEqual([]);
    expect(toggleAssignment([], 'roux', 'OLL')).toEqual([]);
  });

  it('reports what is on', () => {
    expect(hasAssignment([{ method: 'roux', stage: 'CMLL' }], 'roux', 'CMLL')).toBe(true);
    expect(hasAssignment([{ method: 'roux', stage: 'CMLL' }], 'cfop', 'CMLL')).toBe(false);
    expect(hasAssignment(null, 'roux', 'CMLL')).toBe(false);
  });
});

describe('describeAssignment', () => {
  it('names the method and the stage', () => {
    expect(describeAssignment({ method: 'roux', stage: 'CMLL' })).toBe('Roux · CMLL');
    expect(describeAssignment({ method: 'petrus', stage: 'Block' })).toBe('');
  });

  it('names assignments from an injected user-method catalogue', () => {
    const catalogue = [
      ...METHODS,
      { id: 'user-method-1', name: 'Roux 2-look', stages: ['CMLL 2-look'] },
    ];
    expect(
      describeAssignment(
        { method: 'user-method-1', stage: 'CMLL 2-look' },
        catalogue
      )
    ).toBe('Roux 2-look · CMLL 2-look');
  });
});

describe('editAlgorithm — the one edit funnel', () => {
  const one = make([], { name: 'Sune' }).algorithms;

  it('changes a field and stamps editedAt, keeping savedAt and the position', () => {
    const next = editAlgorithm(one, 'a1', { notes: 'thumb on F' }, { editedAt: 9 });
    expect(next[0]).toMatchObject({ id: 'a1', notes: 'thumb on F', savedAt: 1, editedAt: 9 });
  });

  it('takes a function of the entry as well as an object', () => {
    const next = editAlgorithm(one, 'a1', (entry) => ({ notes: `${entry.name} notes` }), {
      editedAt: 9,
    });
    expect(next[0].notes).toBe('Sune notes');
  });

  it('refuses the whole patch when the moves do not parse', () => {
    expect(editAlgorithm(one, 'a1', { moves: 'R Q', notes: 'kept?' }, { editedAt: 9 })).toBe(one);
    expect(editAlgorithm(one, 'a1', { moves: '' }, { editedAt: 9 })).toBe(one);
  });

  it('normalizes the moves it does take', () => {
    expect(editAlgorithm(one, 'a1', { moves: "  R   U " }, { editedAt: 9 })[0].moves).toBe('R U');
  });

  it('detects assignment edits against an injected user-method catalogue', () => {
    const catalogue = [
      ...METHODS,
      { id: 'user-method-1', name: 'Roux 2-look', stages: ['CMLL', 'LSE'] },
    ];
    const assigned = make([], {
      assignments: [{ method: 'user-method-1', stage: 'CMLL' }],
    }, catalogue).algorithms;
    const next = editAlgorithm(
      assigned,
      'a1',
      { assignments: [{ method: 'user-method-1', stage: 'LSE' }] },
      { editedAt: 9, catalogue }
    );
    expect(next[0].assignments).toEqual([{ method: 'user-method-1', stage: 'LSE' }]);
    expect(next[0].editedAt).toBe(9);
  });

  it('keeps the current name when the patch clears it', () => {
    expect(editAlgorithm(one, 'a1', { name: '   ' }, { editedAt: 9 })).toBe(one);
  });

  it('makes a renamed entry unique among the others, but not against itself', () => {
    const two = createAlgorithm(one, { moves: TPERM, name: 'T perm', savedAt: 2 }).algorithms;
    expect(editAlgorithm(two, 'a2', { name: 'Sune' }, { editedAt: 9 })[0].name).toBe('Sune 2');
    // Renaming an entry to the name it already has is not a clash with itself.
    expect(editAlgorithm(two, 'a2', { name: 'T perm' }, { editedAt: 9 })).toBe(two);
  });

  it('sanitizes assignments, notes and case rather than trusting them', () => {
    const next = editAlgorithm(
      one,
      'a1',
      {
        assignments: [{ method: 'roux', stage: 'CMLL' }, { method: 'nope', stage: 'CMLL' }],
        notes: 'x'.repeat(MAX_ALG_NOTES + 50),
        case: 'not a case',
      },
      { editedAt: 9 }
    );
    expect(next[0].assignments).toEqual([{ method: 'roux', stage: 'CMLL' }]);
    expect(next[0].notes).toHaveLength(MAX_ALG_NOTES);
    expect(next[0].case).toBeNull();
  });

  it('will not patch the id or savedAt', () => {
    const next = editAlgorithm(one, 'a1', { id: 'a99', savedAt: 500 }, { editedAt: 9 });
    // Nothing patchable changed, so nothing changed at all.
    expect(next).toBe(one);
  });

  it('returns the list itself when nothing actually changes, so editedAt does not drift', () => {
    expect(editAlgorithm(one, 'a1', { name: 'Sune' }, { editedAt: 9 })).toBe(one);
    expect(editAlgorithm(one, 'a1', { moves: SUNE }, { editedAt: 9 })).toBe(one);
    expect(editAlgorithm(one, 'a1', { notes: '' }, { editedAt: 9 })).toBe(one);
    expect(editAlgorithm(one, 'a1', { assignments: [] }, { editedAt: 9 })).toBe(one);
  });

  it('notices an assignment change even though the list is not a scalar', () => {
    const on = editAlgorithm(one, 'a1', { assignments: [{ method: 'roux', stage: 'CMLL' }] }, {
      editedAt: 9,
    });
    expect(on[0].editedAt).toBe(9);
    expect(editAlgorithm(on, 'a1', { assignments: [{ method: 'roux', stage: 'CMLL' }] }, {
      editedAt: 10,
    })).toBe(on);
  });

  it('leaves the list alone for an id it does not know, or a patch that is not one', () => {
    expect(editAlgorithm(one, 'gone', { notes: 'x' }, { editedAt: 9 })).toBe(one);
    expect(editAlgorithm(one, 'a1', null, { editedAt: 9 })).toBe(one);
    expect(editAlgorithm(null, 'a1', { notes: 'x' }, { editedAt: 9 })).toEqual([]);
  });
});

describe('removeAlgorithm', () => {
  it('forgets one, and leaves the list identical for an id it does not know', () => {
    const two = createAlgorithm(make().algorithms, { moves: TPERM, savedAt: 2 }).algorithms;
    expect(removeAlgorithm(two, 'a1').map((entry) => entry.id)).toEqual(['a2']);
    expect(removeAlgorithm(two, 'gone')).toBe(two);
  });
});

describe('findAlgorithm', () => {
  it('finds one by id, or null', () => {
    const one = make().algorithms;
    expect(findAlgorithm(one, 'a1').moves).toBe(SUNE);
    expect(findAlgorithm(one, 'a2')).toBeNull();
    expect(findAlgorithm(null, 'a1')).toBeNull();
  });
});

describe('searchAlgorithms', () => {
  const list = [
    { id: 'a1', name: 'Sune', moves: SUNE, assignments: [] },
    { id: 'a2', name: 'T perm', moves: TPERM, assignments: [] },
    { id: 'a3', name: 'Left block', moves: "M' U M", assignments: [] },
  ];

  it('returns the list itself for an empty query', () => {
    expect(searchAlgorithms(list, '')).toBe(list);
    expect(searchAlgorithms(list, '   ')).toBe(list);
    expect(searchAlgorithms(list, null)).toBe(list);
  });

  it('matches a name, case-insensitively', () => {
    expect(searchAlgorithms(list, 'sun').map((entry) => entry.id)).toEqual(['a1']);
    expect(searchAlgorithms(list, 'BLOCK').map((entry) => entry.id)).toEqual(['a3']);
  });

  it('matches the moves as written', () => {
    expect(searchAlgorithms(list, "M' U").map((entry) => entry.id)).toEqual(['a3']);
  });

  it('matches the moves with the spaces taken out, which is how a cuber types', () => {
    expect(searchAlgorithms(list, "RUR'U'").map((entry) => entry.id)).toEqual(['a2']);
  });

  it('answers with nothing when nothing matches', () => {
    expect(searchAlgorithms(list, 'zzz')).toEqual([]);
  });
});

describe('filterAlgorithms', () => {
  const list = [
    { id: 'a1', name: 'Sune', moves: SUNE, assignments: [{ method: 'roux', stage: 'CMLL' }] },
    {
      id: 'a2',
      name: 'Both',
      moves: TPERM,
      assignments: [
        { method: 'roux', stage: 'LSE' },
        { method: 'cfop', stage: 'PLL' },
      ],
    },
    { id: 'a3', name: 'Loose', moves: 'U', assignments: [] },
  ];

  it('returns the list itself for the All chip', () => {
    expect(filterAlgorithms(list, null)).toBe(list);
    expect(filterAlgorithms(list, undefined)).toBe(list);
  });

  it('matches any stage of a method', () => {
    expect(filterAlgorithms(list, 'roux').map((entry) => entry.id)).toEqual(['a1', 'a2']);
    expect(filterAlgorithms(list, 'cfop').map((entry) => entry.id)).toEqual(['a2']);
  });

  it('finds the entries with nothing assigned at all', () => {
    expect(filterAlgorithms(list, UNASSIGNED).map((entry) => entry.id)).toEqual(['a3']);
  });
});

describe('algorithmFilters', () => {
  it('offers only the chips that lead somewhere', () => {
    const list = [
      { id: 'a1', name: 'Sune', moves: SUNE, assignments: [{ method: 'roux', stage: 'CMLL' }] },
      { id: 'a2', name: 'Loose', moves: 'U', assignments: [] },
    ];
    expect(algorithmFilters(list)).toEqual([
      { id: null, label: ALL_LABEL, count: 2 },
      { id: 'roux', label: 'Roux', count: 1 },
      { id: UNASSIGNED, label: UNASSIGNED_LABEL, count: 1 },
    ]);
  });

  it('drops Unassigned once everything is assigned', () => {
    const list = [
      { id: 'a1', name: 'Sune', moves: SUNE, assignments: [{ method: 'cfop', stage: 'OLL' }] },
    ];
    expect(algorithmFilters(list).map((chip) => chip.id)).toEqual([null, 'cfop']);
  });

  it('orders by the catalogue rather than by count, so chips do not reshuffle', () => {
    const list = [
      { id: 'a1', name: 'a', moves: 'U', assignments: [{ method: 'cfop', stage: 'OLL' }] },
      { id: 'a2', name: 'b', moves: 'D', assignments: [{ method: 'cfop', stage: 'PLL' }] },
      { id: 'a3', name: 'c', moves: 'F', assignments: [{ method: 'roux', stage: 'CMLL' }] },
    ];
    expect(algorithmFilters(list).map((chip) => chip.id)).toEqual([null, 'roux', 'cfop']);
  });

  it('is just All for an empty library', () => {
    expect(algorithmFilters([])).toEqual([{ id: null, label: ALL_LABEL, count: 0 }]);
    expect(algorithmFilters(null)).toEqual([{ id: null, label: ALL_LABEL, count: 0 }]);
  });
});

describe('liveFilter', () => {
  it('falls back to All when the chip the screen is holding has gone', () => {
    const chips = [
      { id: null, label: ALL_LABEL, count: 1 },
      { id: 'roux', label: 'Roux', count: 1 },
    ];
    expect(liveFilter(chips, 'roux')).toBe('roux');
    expect(liveFilter(chips, 'cfop')).toBeNull();
    expect(liveFilter(chips, null)).toBeNull();
  });
});

describe('describeAlgorithmSize', () => {
  it('counts the moves, singular and plural', () => {
    expect(describeAlgorithmSize({ moves: 'U' })).toBe('1 move');
    expect(describeAlgorithmSize({ moves: SUNE })).toBe('7 moves');
  });
});

describe('sanitizeAlgorithms', () => {
  it('is the empty list for a file that has never heard of algorithms', () => {
    expect(sanitizeAlgorithms(undefined)).toEqual([]);
    expect(sanitizeAlgorithms(null)).toEqual([]);
    expect(sanitizeAlgorithms('nope')).toEqual([]);
  });

  it('brings a written file back exactly as it left', () => {
    const written = make([], {
      name: 'Sune',
      assignments: [{ method: 'roux', stage: 'CMLL' }],
      notes: 'thumb on F',
    }).algorithms;
    expect(sanitizeAlgorithms(written)).toEqual(written);
  });

  it('drops an entry whose moves no longer parse, and one with none', () => {
    expect(
      sanitizeAlgorithms([
        { id: 'a1', name: 'ok', moves: SUNE, savedAt: 1 },
        { id: 'a2', name: 'bad', moves: 'R Q U', savedAt: 1 },
        { id: 'a3', name: 'empty', moves: '', savedAt: 1 },
        { id: 'a4', name: 'missing', savedAt: 1 },
        'nope',
        null,
      ]).map((entry) => entry.id)
    ).toEqual(['a1']);
  });

  it('re-mints a missing or duplicated id, because two rows with one id opens the wrong entry', () => {
    const clean = sanitizeAlgorithms([
      { id: 'a1', moves: 'U', savedAt: 1 },
      { id: 'a1', moves: 'D', savedAt: 1 },
      { moves: 'F', savedAt: 1 },
    ]);
    expect(new Set(clean.map((entry) => entry.id)).size).toBe(3);
    expect(clean[0].id).toBe('a1');
  });

  it('suffixes a clashing name and names an entry that has none', () => {
    const clean = sanitizeAlgorithms([
      { id: 'a1', name: 'Sune', moves: 'U', savedAt: 1 },
      { id: 'a2', name: 'Sune', moves: 'D', savedAt: 1 },
      { id: 'a3', moves: 'F', savedAt: 1 },
    ]);
    expect(clean.map((entry) => entry.name)).toEqual(['Sune', 'Sune 2', 'Algorithm 3']);
  });

  it('keeps the assignments that are real and drops the ones that are not', () => {
    const clean = sanitizeAlgorithms([
      {
        id: 'a1',
        moves: 'U',
        savedAt: 1,
        assignments: [
          { method: 'roux', stage: 'CMLL' },
          { method: 'petrus', stage: 'Block' },
        ],
      },
    ]);
    expect(clean[0].assignments).toEqual([{ method: 'roux', stage: 'CMLL' }]);
  });

  it('repairs the fields a corrupt file can get wrong without losing the entry', () => {
    const clean = sanitizeAlgorithms([
      {
        id: 'a1',
        name: '   spaced    out  ',
        moves: "  R   U  ",
        notes: 42,
        assignments: 'roux',
        savedAt: 'yesterday',
      },
    ]);
    expect(clean[0]).toEqual({
      id: 'a1',
      name: 'spaced out',
      moves: 'R U',
      setup: '',
      case: null,
      assignments: [],
      notes: '',
      savedAt: 0,
      editedAt: 0,
    });
  });

  it('falls editedAt back to savedAt for a record written before there was one', () => {
    const clean = sanitizeAlgorithms([{ id: 'a1', moves: 'U', savedAt: 7 }]);
    expect(clean[0].editedAt).toBe(7);
  });

  it('keeps a case written by a build that has one, so version skew is lossless', () => {
    // Step 2's field, read by a Step 1 build and written back untouched. The
    // shape is checked; what it *means* is Step 2's business.
    const clean = sanitizeAlgorithms([
      { id: 'a1', moves: 'U', savedAt: 1, case: '.y..yy.y.' },
      { id: 'a2', moves: 'D', savedAt: 1, case: 'yyyyyyyyy' },
      { id: 'a3', moves: 'F', savedAt: 1, case: 'yyyy' },
      { id: 'a4', moves: 'B', savedAt: 1, case: { u: 'y' } },
    ]);
    expect(clean.map((entry) => entry.case)).toEqual(['.y..yy.y.', 'yyyyyyyyy', null, null]);
  });

  it('ignores a future build’s extra fields rather than carrying them into the app', () => {
    const clean = sanitizeAlgorithms([
      { id: 'a1', moves: 'U', savedAt: 1, mirror: 'a2', drills: 12 },
    ]);
    expect(Object.keys(clean[0]).sort()).toEqual([
      'assignments',
      'case',
      'editedAt',
      'id',
      'moves',
      'name',
      'notes',
      'savedAt',
      'setup',
    ]);
  });

  it('bounds a file that is over the cap', () => {
    const many = [];
    for (let i = 0; i < MAX_ALGORITHMS + 20; i += 1) {
      many.push({ id: `a${i + 1}`, moves: 'U', savedAt: 1 });
    }
    expect(sanitizeAlgorithms(many)).toHaveLength(MAX_ALGORITHMS);
  });
});

describe('algorithmCase', () => {
  it('derives a case from the moves when none is stored', () => {
    // Every entry Step 1 wrote has `case: null`, and this is what upgrades all
    // of them without a migration and without anything being re-saved.
    const { algorithm } = make();
    expect(algorithm.case).toBeNull();
    expect(algorithmCase(algorithm)).toBe(caseOfAlgorithm(SUNE));
  });

  it('prefers a stored case over the arithmetic, always', () => {
    // The rule that makes a correction a correction: once a hand has said what
    // the case is, deriving it again would overwrite the operator's answer with
    // the app's, and there would be no way to keep one the app disagrees with.
    const { algorithms } = make();
    const corrected = editAlgorithm(algorithms, 'a1', { case: '....y....' }, { editedAt: 2 });
    expect(algorithmCase(corrected[0])).toBe('....y....');
    expect(algorithmCase(corrected[0])).not.toBe(caseOfAlgorithm(SUNE));
  });

  it('follows the moves when they change', () => {
    const { algorithms } = make();
    const changed = editAlgorithm(algorithms, 'a1', { moves: TPERM }, { editedAt: 2 });
    expect(algorithmCase(changed[0])).toBe(caseOfAlgorithm(TPERM));
  });

  it('uses an authored setup as the starting case', () => {
    const { algorithm } = make([], { setup: "R U R'" });
    expect(algorithm.setup).toBe("R U R'");
    expect(algorithmCase(algorithm)).toBe(caseOfSetup("R U R'"));
  });

  it('drops a stored case that is not one, and derives instead', () => {
    // `editAlgorithm` cannot write a corrupt case, but a save file can carry one
    // and `sanitizeAlgorithms` nulls it — after which the moves answer.
    const clean = sanitizeAlgorithms([{ id: 'a1', moves: SUNE, savedAt: 1, case: 'yyyy' }]);
    expect(clean[0].case).toBeNull();
    expect(algorithmCase(clean[0])).toBe(caseOfAlgorithm(SUNE));
  });

  it('is an empty case for nothing at all', () => {
    expect(algorithmCase(null)).toBe(EMPTY_CASE);
    expect(algorithmCase(undefined)).toBe(EMPTY_CASE);
  });
});

describe('algorithmStartingCube', () => {
  it('uses the authored setup for the three-face preview', () => {
    const { algorithm } = make([], { setup: "R U R'" });
    expect(facelets(algorithmStartingCube(algorithm))).toEqual(facelets(cubeFromAlg("R U R'")));
  });

  it('keeps inverse-derived previews for older and pasted entries', () => {
    const { algorithm } = make();
    expect(facelets(algorithmStartingCube(algorithm))).toEqual(
      facelets(cubeFromAlg(invertAlg(algorithm.moves)))
    );
  });
});
