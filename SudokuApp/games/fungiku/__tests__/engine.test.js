import {
  MARKS,
  MAX_SIZE,
  MIN_SIZE,
  SIZES,
  nextMark,
  createRng,
  generate,
  findSolutions,
  countSolutions,
  findConflicts,
  isSolved,
  countMushrooms,
  createEmptyMarks,
  cellsRuledOutBy,
  findForcedDeduction,
} from '../engine';

// Every size the game offers, the new top sizes included (plan §12).
const LADDER = SIZES;
const SEEDS = [1, 2, 3, 7, 42, 1337];

/**
 * The top size runs against fewer seeds, because generating a 10×10 is not free:
 * ~0.4s each in plain node, and **~3s each under Jest**, whose transform costs
 * roughly 7× here. Six seeds at 10×10 put 20 seconds on a suite that otherwise
 * runs in under three, which is enough friction to stop people running it.
 *
 * Two seeds still exercise every invariant at the big sizes; the smaller boards
 * keep the full six, and they are where a rule bug would show up anyway. Every
 * 10×10 generation in this file is deliberate — there are three.
 */
const BIG_SIZE_SEEDS = [1, 3];
const seedsFor = (size) => (size >= 9 ? BIG_SIZE_SEEDS : SEEDS);

/**
 * A ceiling on generation work at the top size, in **perturbation rounds** — not
 * milliseconds, which would measure the CI runner and flake accordingly. Rounds
 * are a property of the algorithm and identical on every machine.
 *
 * Why this bound exists at all (plan §12.1): cost rises by roughly an order of
 * magnitude per size above 10 — 10×10 284 ms, 11×11 2.5 s, 12×12 7.3 s. 10×10
 * sits one step below that cliff, so a change that made the uniqueness loop
 * modestly less effective would turn the top size from a hitch into a freeze
 * with no other symptom, and nothing else in the suite would notice.
 *
 * The sampled seeds currently need 455 rounds in total. The ceiling is generous
 * enough not to fail on an unlucky re-tune, tight enough to catch a doubling.
 */
const TOP_SIZE_ROUND_BUDGET = 1200;

/** Orthogonal flood fill — an independent contiguity check for a region. */
const regionIsContiguous = (regions, size, region) => {
  const members = [];
  for (let i = 0; i < regions.length; i++) {
    if (regions[i] === region) members.push(i);
  }
  if (members.length === 0) return false;

  const seen = new Set([members[0]]);
  const stack = [members[0]];
  while (stack.length > 0) {
    const cell = stack.pop();
    const row = Math.floor(cell / size);
    const col = cell % size;
    const neighbors = [];
    if (row > 0) neighbors.push(cell - size);
    if (row < size - 1) neighbors.push(cell + size);
    if (col > 0) neighbors.push(cell - 1);
    if (col < size - 1) neighbors.push(cell + 1);
    for (const n of neighbors) {
      if (regions[n] === region && !seen.has(n)) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return seen.size === members.length;
};

const marksFromSolution = (puzzle) => {
  const marks = createEmptyMarks(puzzle.size);
  puzzle.solution.forEach((col, row) => {
    marks[row * puzzle.size + col] = MARKS.MUSHROOM;
  });
  return marks;
};

describe('nextMark', () => {
  it('cycles empty -> X -> mushroom -> empty (plan §2)', () => {
    expect(nextMark(MARKS.EMPTY)).toBe(MARKS.X);
    expect(nextMark(MARKS.X)).toBe(MARKS.MUSHROOM);
    expect(nextMark(MARKS.MUSHROOM)).toBe(MARKS.EMPTY);
  });

  it('treats an unknown mark as empty so the first tap gives X', () => {
    expect(nextMark(undefined)).toBe(MARKS.X);
  });
});

describe('createRng', () => {
  it('is deterministic for a given seed', () => {
    const a = createRng(123);
    const b = createRng(123);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces different streams for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(Array.from({ length: 10 }, () => a())).not.toEqual(
      Array.from({ length: 10 }, () => b())
    );
  });

  it('stays within [0, 1)', () => {
    const rng = createRng(99);
    for (let i = 0; i < 500; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('generate', () => {
  it.each([4, 3, 0, -1])('rejects size %i as unsolvable (plan §9)', (size) => {
    expect(() => generate({ size, seed: 1 })).toThrow(/size/i);
  });

  it('rejects a non-integer size', () => {
    expect(() => generate({ size: 5.5, seed: 1 })).toThrow(/size/i);
  });

  it(`starts the ladder at ${MIN_SIZE}`, () => {
    expect(MIN_SIZE).toBe(5);
    expect(() => generate({ size: MIN_SIZE, seed: 1 })).not.toThrow();
  });

  /**
   * The upper bound is the half of this that did not exist. `generate()` used to
   * accept any size at all — asked for 12×12 it took 7 seconds, and asked for 20
   * it simply never returned. These sizes are rejected up front, cheaply, rather
   * than discovered by waiting.
   */
  it.each([MAX_SIZE + 1, 12, 20])('rejects size %i as beyond the ceiling (plan §12)', (size) => {
    expect(() => generate({ size, seed: 1 })).toThrow(/size/i);
  });

  it(`tops the ladder out at ${MAX_SIZE}`, () => {
    // That the top size *generates* is the whole battery below; this is only
    // about where the ceiling sits.
    expect(MAX_SIZE).toBe(10);
  });

  it('names the bounds in the error, so the caller knows what is allowed', () => {
    expect(() => generate({ size: 99, seed: 1 })).toThrow(
      new RegExp(`${MIN_SIZE}[^0-9]+${MAX_SIZE}`)
    );
  });

  describe.each(LADDER)('size %i', (size) => {
    const seeds = seedsFor(size);
    const puzzles = seeds.map((seed) => generate({ size, seed }));

    it('is deterministic — same size+seed gives an identical puzzle', () => {
      // One seed at the top size rather than all of them: re-generating is the
      // whole cost of this test, and determinism does not vary by seed.
      const repeat = size === MAX_SIZE ? seeds.slice(0, 1) : seeds;
      repeat.forEach((seed, i) => {
        expect(generate({ size, seed })).toEqual(puzzles[i]);
      });
    });

    it('has exactly one solution (plan §1 rule 5)', () => {
      puzzles.forEach((p) => {
        // Ask for more than 2 so a wrong answer shows the real count.
        expect(countSolutions(p.regions, size, 5)).toBe(1);
      });
    });

    it('partitions the grid into N regions covering every cell', () => {
      puzzles.forEach((p) => {
        expect(p.regions).toHaveLength(size * size);
        expect(p.regions).not.toContain(-1);
        expect(new Set(p.regions).size).toBe(size);
      });
    });

    it('makes every region contiguous (plan §4)', () => {
      puzzles.forEach((p) => {
        for (let region = 0; region < size; region++) {
          expect(regionIsContiguous(p.regions, size, region)).toBe(true);
        }
      });
    });

    it('places one mushroom per row and per column', () => {
      puzzles.forEach((p) => {
        expect(p.solution).toHaveLength(size);
        expect(new Set(p.solution).size).toBe(size); // a column permutation
        p.solution.forEach((col) => {
          expect(col).toBeGreaterThanOrEqual(0);
          expect(col).toBeLessThan(size);
        });
      });
    });

    it('places one mushroom per region', () => {
      puzzles.forEach((p) => {
        const regionsUsed = p.solution.map((col, row) => p.regions[row * size + col]);
        expect(new Set(regionsUsed).size).toBe(size);
      });
    });

    it('never lets two mushrooms touch, including diagonally', () => {
      puzzles.forEach((p) => {
        for (let row = 0; row < size - 1; row++) {
          expect(Math.abs(p.solution[row] - p.solution[row + 1])).toBeGreaterThanOrEqual(2);
        }
      });
    });

    it('reports its own solution as solved and conflict-free', () => {
      puzzles.forEach((p) => {
        const marks = marksFromSolution(p);
        expect(findConflicts(marks, p.regions, size).size).toBe(0);
        expect(isSolved(marks, p.regions, size)).toBe(true);
      });
    });

    it('agrees with the solver — the stored solution is the one found', () => {
      puzzles.forEach((p) => {
        const [only] = findSolutions(p.regions, size, 2);
        expect(only).toEqual(p.solution);
      });
    });

    it('echoes back the size and seed it was asked for', () => {
      seeds.forEach((seed, i) => {
        expect(puzzles[i].size).toBe(size);
        expect(puzzles[i].seed).toBe(seed);
      });
    });

    if (size === MAX_SIZE) {
      it(`generates the top size within ${TOP_SIZE_ROUND_BUDGET} perturbation rounds`, () => {
        const rounds = puzzles.reduce((total, p) => total + p.rounds, 0);

        // Reported as an object so a regression says how far over it went
        // instead of "6103 is not less than 5000" — the first thing anyone
        // touching the uniqueness loop will want to know.
        expect({ size, rounds, overBudget: rounds > TOP_SIZE_ROUND_BUDGET }).toEqual({
          size,
          rounds: expect.any(Number),
          overBudget: false,
        });
      });
    }
  });

  it('produces different puzzles for different seeds', () => {
    const a = generate({ size: 7, seed: 1 });
    const b = generate({ size: 7, seed: 2 });
    expect(a.regions).not.toEqual(b.regions);
  });
});

/**
 * SIZES is what the size chips render from. It lives here, next to the bounds it
 * is derived from, so the sizes the UI offers and the sizes `generate()` accepts
 * cannot drift — the previous copy was a hand-written list in the context file.
 */
describe('SIZES', () => {
  it('is every size between the bounds, in order', () => {
    expect(SIZES).toEqual([5, 6, 7, 8, 9, 10]);
    expect(SIZES[0]).toBe(MIN_SIZE);
    expect(SIZES[SIZES.length - 1]).toBe(MAX_SIZE);
  });

  it('offers nothing the generator would reject', () => {
    // Bounds, not generation: every size here is run through `generate` by the
    // battery above, and a 10×10 costs three seconds under Jest.
    SIZES.forEach((size) => {
      expect(Number.isInteger(size)).toBe(true);
      expect(size).toBeGreaterThanOrEqual(MIN_SIZE);
      expect(size).toBeLessThanOrEqual(MAX_SIZE);
    });
  });
});

describe('findConflicts', () => {
  const size = 6;
  const puzzle = generate({ size, seed: 42 });

  it('flags two mushrooms in the same row', () => {
    const marks = createEmptyMarks(size);
    marks[0] = MARKS.MUSHROOM; // (0,0)
    marks[3] = MARKS.MUSHROOM; // (0,3)
    expect([...findConflicts(marks, puzzle.regions, size)].sort((a, b) => a - b)).toEqual([0, 3]);
  });

  it('flags two mushrooms in the same column', () => {
    const marks = createEmptyMarks(size);
    marks[0] = MARKS.MUSHROOM; // (0,0)
    marks[3 * size] = MARKS.MUSHROOM; // (3,0)
    expect(findConflicts(marks, puzzle.regions, size).size).toBe(2);
  });

  it('flags two mushrooms that touch diagonally', () => {
    const marks = createEmptyMarks(size);
    marks[0] = MARKS.MUSHROOM; // (0,0)
    marks[size + 1] = MARKS.MUSHROOM; // (1,1)
    expect([...findConflicts(marks, puzzle.regions, size)].sort((a, b) => a - b)).toEqual([
      0,
      size + 1,
    ]);
  });

  it('flags two mushrooms sharing a region', () => {
    // Find two same-region cells that share no row, column, and don't touch,
    // so region membership is the only rule they can be breaking.
    let pair = null;
    for (let a = 0; a < size * size && !pair; a++) {
      for (let b = a + 1; b < size * size && !pair; b++) {
        const [ar, ac] = [Math.floor(a / size), a % size];
        const [br, bc] = [Math.floor(b / size), b % size];
        const touching = Math.abs(ar - br) <= 1 && Math.abs(ac - bc) <= 1;
        if (puzzle.regions[a] === puzzle.regions[b] && ar !== br && ac !== bc && !touching) {
          pair = [a, b];
        }
      }
    }
    // Every generated layout has at least one such pair; guard so a failure
    // here reads as a real problem rather than a silent skip.
    expect(pair).not.toBeNull();

    const marks = createEmptyMarks(size);
    marks[pair[0]] = MARKS.MUSHROOM;
    marks[pair[1]] = MARKS.MUSHROOM;
    expect(findConflicts(marks, puzzle.regions, size).size).toBe(2);
  });

  it('returns nothing for a legal partial placement', () => {
    const marks = createEmptyMarks(size);
    marks[0 * size + puzzle.solution[0]] = MARKS.MUSHROOM;
    expect(findConflicts(marks, puzzle.regions, size).size).toBe(0);
  });

  it('ignores X marks entirely', () => {
    const marks = createEmptyMarks(size).map(() => MARKS.X);
    expect(findConflicts(marks, puzzle.regions, size).size).toBe(0);
  });
});

describe('isSolved', () => {
  const size = 6;
  const puzzle = generate({ size, seed: 42 });

  it('is true for the solution', () => {
    expect(isSolved(marksFromSolution(puzzle), puzzle.regions, size)).toBe(true);
  });

  it('stays true no matter how many X marks are sprinkled around (plan §9)', () => {
    const marks = marksFromSolution(puzzle).map((m) => (m === MARKS.MUSHROOM ? m : MARKS.X));
    expect(isSolved(marks, puzzle.regions, size)).toBe(true);
  });

  it('is false when a mushroom is missing', () => {
    const marks = marksFromSolution(puzzle);
    marks[0 * size + puzzle.solution[0]] = MARKS.EMPTY;
    expect(isSolved(marks, puzzle.regions, size)).toBe(false);
  });

  it('is false when an extra, conflicting mushroom is added', () => {
    const marks = marksFromSolution(puzzle);
    const free = marks.findIndex((m) => m !== MARKS.MUSHROOM);
    marks[free] = MARKS.MUSHROOM;
    expect(isSolved(marks, puzzle.regions, size)).toBe(false);
  });

  it('is false for an empty board', () => {
    expect(isSolved(createEmptyMarks(size), puzzle.regions, size)).toBe(false);
  });

  it('is false when N mushrooms are placed but they conflict', () => {
    // All N in column 0: right count, every rule broken.
    const marks = createEmptyMarks(size);
    for (let row = 0; row < size; row++) marks[row * size] = MARKS.MUSHROOM;
    expect(countMushrooms(marks)).toBe(size);
    expect(isSolved(marks, puzzle.regions, size)).toBe(false);
  });
});

describe('countMushrooms', () => {
  it('counts only mushrooms, never X or empty (drives the X/N counter)', () => {
    const marks = createEmptyMarks(5);
    marks[0] = MARKS.MUSHROOM;
    marks[1] = MARKS.X;
    marks[2] = MARKS.MUSHROOM;
    expect(countMushrooms(marks)).toBe(2);
  });

  it('is 0 for a fresh board', () => {
    expect(countMushrooms(createEmptyMarks(6))).toBe(0);
  });
});

describe('createEmptyMarks', () => {
  it('returns size*size empty marks', () => {
    const marks = createEmptyMarks(7);
    expect(marks).toHaveLength(49);
    expect(marks.every((m) => m === MARKS.EMPTY)).toBe(true);
  });
});

describe('cellsRuledOutBy', () => {
  const size = 5;
  // A deliberately simple region layout: five horizontal bands, so "same region"
  // is "same row" and the region rule is easy to reason about separately.
  const bands = Array.from({ length: size * size }, (_, i) => Math.floor(i / size));

  it('excludes the cell itself', () => {
    expect(cellsRuledOutBy(12, bands, size).has(12)).toBe(false);
  });

  it('rules out the whole row and column', () => {
    const out = cellsRuledOutBy(12, bands, size); // row 2, col 2

    for (let i = 0; i < size; i++) {
      if (i !== 2) {
        expect(out.has(2 * size + i)).toBe(true); // row
        expect(out.has(i * size + 2)).toBe(true); // column
      }
    }
  });

  it('rules out the eight touching cells, diagonals included', () => {
    const out = cellsRuledOutBy(12, bands, size);

    [6, 7, 8, 11, 13, 16, 17, 18].forEach((n) => expect(out.has(n)).toBe(true));
  });

  it('rules out every cell of the same region', () => {
    const regions = [...bands];
    regions[24] = regions[12]; // put a far-away cell in the same region

    expect(cellsRuledOutBy(12, regions, size).has(24)).toBe(true);
  });

  it('leaves cells that break no rule alone', () => {
    // Row 0, col 4 with band regions: different row, different column,
    // different region, not touching row 2.
    expect(cellsRuledOutBy(12, bands, size).has(4)).toBe(false);
  });

  it('clips at the board edges for a corner cell', () => {
    const out = cellsRuledOutBy(0, bands, size);

    expect(out.has(1)).toBe(true);
    expect(out.has(size)).toBe(true);
    expect(out.has(size + 1)).toBe(true); // the one diagonal neighbour
    expect([...out].every((c) => c >= 0 && c < size * size)).toBe(true);
  });

  it('agrees with findConflicts: a second mushroom on a ruled-out cell conflicts', () => {
    const out = cellsRuledOutBy(12, bands, size);

    out.forEach((cell) => {
      const marks = createEmptyMarks(size);
      marks[12] = MARKS.MUSHROOM;
      marks[cell] = MARKS.MUSHROOM;

      expect(findConflicts(marks, bands, size).size).toBeGreaterThan(0);
    });
  });
});

describe('findForcedDeduction', () => {
  const size = 5;
  const at = (row, col) => row * size + col;
  // Five horizontal bands: every region is a whole row, so nothing is forced on
  // an empty board and the test controls exactly what constrains what.
  const bands = Array.from({ length: size * size }, (_, i) => Math.floor(i / size));

  it('finds nothing on an unconstrained board', () => {
    expect(findForcedDeduction(createEmptyMarks(size), bands, size)).toBeNull();
  });

  it('finds a row with exactly one candidate left', () => {
    const marks = createEmptyMarks(size);
    // Two mushrooms, chosen so row 1 is squeezed to exactly one cell:
    //   (0,0) blocks column 0, and touches (1,0) and (1,1)
    //   (2,2) blocks column 2, and touches (1,1), (1,2) and (1,3)
    // That leaves (1,4) as row 1's only candidate. The two do not conflict:
    // different rows, columns and bands, and rows 0 and 2 do not touch.
    marks[at(0, 0)] = MARKS.MUSHROOM;
    marks[at(2, 2)] = MARKS.MUSHROOM;

    expect(findForcedDeduction(marks, bands, size)).toEqual({
      kind: 'row',
      index: 1,
      cell: at(1, 4),
    });
  });

  it('finds nothing when a group is over-constrained rather than forced', () => {
    // Adding a third mushroom in column 4 blocks (1,4) too, so row 1 has *no*
    // candidates. "Exactly one" is the deduction; zero is a contradiction, and
    // reporting it as forced would be a confidently wrong hint.
    const marks = createEmptyMarks(size);
    marks[at(0, 0)] = MARKS.MUSHROOM;
    marks[at(2, 2)] = MARKS.MUSHROOM;
    marks[at(4, 4)] = MARKS.MUSHROOM;

    expect(findForcedDeduction(marks, bands, size)).toBeNull();
  });

  it('reasons only from mushrooms, never from the player X marks', () => {
    // X marks are beliefs and may be wrong; deducing from them would produce a
    // confidently wrong hint.
    const withXs = createEmptyMarks(size);
    for (let col = 1; col < size; col++) withXs[at(0, col)] = MARKS.X;

    // Row 0 "looks" forced to column 0 if you trust the X's — it must not be.
    expect(findForcedDeduction(withXs, bands, size)).toBeNull();
  });

  it('skips groups that already hold a mushroom', () => {
    const marks = createEmptyMarks(size);
    marks[at(0, 0)] = MARKS.MUSHROOM;

    const found = findForcedDeduction(marks, bands, size);
    // Row 0 is done, so it is never the answer.
    expect(found === null || found.kind !== 'row' || found.index !== 0).toBe(true);
  });

  it('finds a one-cell region, which is forced by definition', () => {
    const regions = [...bands];
    regions[at(2, 2)] = 99; // a region of exactly one cell

    const found = findForcedDeduction(createEmptyMarks(size), regions, size);
    expect(found).toEqual({ kind: 'region', index: 99, cell: at(2, 2) });
  });

  it('agrees with the real generator: every deduction it reports matches the solution', () => {
    // The strongest check available — a forced move must be the *right* move, or
    // the hint would confidently mislead.
    [5, 6, 7].forEach((boardSize) => {
      [1, 2, 3, 7].forEach((seed) => {
        const puzzle = generate({ size: boardSize, seed });
        const marks = createEmptyMarks(boardSize);

        // Walk the puzzle forward, taking forced moves as they appear.
        for (let step = 0; step < boardSize; step++) {
          const found = findForcedDeduction(marks, puzzle.regions, boardSize);
          if (!found) break;

          const row = Math.floor(found.cell / boardSize);
          const col = found.cell % boardSize;
          expect(puzzle.solution[row]).toBe(col);

          marks[found.cell] = MARKS.MUSHROOM;
        }
      });
    });
  });
});
