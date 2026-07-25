import { cellFromPoint, cellsAlongLine } from '../geometry';

describe('cellFromPoint', () => {
  const grid = { cellSize: 40, size: 5 };

  it('maps a point to the cell containing it', () => {
    expect(cellFromPoint({ x: 0, y: 0, ...grid })).toBe(0);
    expect(cellFromPoint({ x: 39, y: 39, ...grid })).toBe(0);
    expect(cellFromPoint({ x: 40, y: 0, ...grid })).toBe(1);
    expect(cellFromPoint({ x: 0, y: 40, ...grid })).toBe(5);
    expect(cellFromPoint({ x: 199, y: 199, ...grid })).toBe(24);
  });

  it('puts cell boundaries on the lower cell', () => {
    // 40 belongs to column 1, not column 0 — an off-by-one here means a stroke
    // paints the wrong cell at every boundary it crosses.
    expect(cellFromPoint({ x: 80, y: 120, ...grid })).toBe(3 * 5 + 2);
  });

  it('rejects points off the board', () => {
    expect(cellFromPoint({ x: -1, y: 10, ...grid })).toBe(-1);
    expect(cellFromPoint({ x: 10, y: -1, ...grid })).toBe(-1);
    expect(cellFromPoint({ x: 200, y: 10, ...grid })).toBe(-1);
    expect(cellFromPoint({ x: 10, y: 200, ...grid })).toBe(-1);
  });

  it('rejects nonsense geometry rather than returning a bogus cell', () => {
    expect(cellFromPoint({ x: NaN, y: 10, ...grid })).toBe(-1);
    expect(cellFromPoint({ x: 10, y: undefined, ...grid })).toBe(-1);
    expect(cellFromPoint({ x: 10, y: 10, cellSize: 0, size: 5 })).toBe(-1);
    expect(cellFromPoint({ x: 10, y: 10, cellSize: 40, size: 0 })).toBe(-1);
  });

  it('works for a bigger board', () => {
    expect(cellFromPoint({ x: 5, y: 5, cellSize: 25, size: 8 })).toBe(0);
    expect(cellFromPoint({ x: 199, y: 199, cellSize: 25, size: 8 })).toBe(63);
  });
});

describe('cellsAlongLine', () => {
  const size = 5;
  const at = (row, col) => row * size + col;

  it('returns the single cell when both ends are the same', () => {
    expect(cellsAlongLine(at(2, 2), at(2, 2), size)).toEqual([at(2, 2)]);
  });

  it('fills a horizontal run', () => {
    expect(cellsAlongLine(at(1, 0), at(1, 4), size)).toEqual([
      at(1, 0),
      at(1, 1),
      at(1, 2),
      at(1, 3),
      at(1, 4),
    ]);
  });

  it('fills a vertical run', () => {
    expect(cellsAlongLine(at(0, 3), at(4, 3), size)).toEqual([
      at(0, 3),
      at(1, 3),
      at(2, 3),
      at(3, 3),
      at(4, 3),
    ]);
  });

  it('fills a diagonal', () => {
    expect(cellsAlongLine(at(0, 0), at(4, 4), size)).toEqual([
      at(0, 0),
      at(1, 1),
      at(2, 2),
      at(3, 3),
      at(4, 4),
    ]);
  });

  it('works backwards as well as forwards', () => {
    const forward = cellsAlongLine(at(0, 0), at(0, 4), size);
    const backward = cellsAlongLine(at(0, 4), at(0, 0), size);

    expect(backward).toEqual([...forward].reverse());
  });

  it('includes both endpoints on a shallow diagonal', () => {
    const line = cellsAlongLine(at(0, 0), at(1, 4), size);

    expect(line[0]).toBe(at(0, 0));
    expect(line[line.length - 1]).toBe(at(1, 4));
  });

  it('never returns a cell twice, so a stroke cannot double back on itself', () => {
    const line = cellsAlongLine(at(0, 0), at(4, 3), size);
    expect(new Set(line).size).toBe(line.length);
  });

  it('stays on the board for every pair of cells', () => {
    const total = size * size;
    for (let from = 0; from < total; from++) {
      for (let to = 0; to < total; to++) {
        const line = cellsAlongLine(from, to, size);
        expect(line[0]).toBe(from);
        expect(line[line.length - 1]).toBe(to);
        line.forEach((c) => {
          expect(c).toBeGreaterThanOrEqual(0);
          expect(c).toBeLessThan(total);
        });
      }
    }
  });

  it('moves only to a touching cell at each step', () => {
    // This is the property that matters for painting: a gap in the chain is a
    // gap in the stroke.
    const line = cellsAlongLine(0, 24, size);
    for (let i = 1; i < line.length; i++) {
      const prevRow = Math.floor(line[i - 1] / size);
      const prevCol = line[i - 1] % size;
      const row = Math.floor(line[i] / size);
      const col = line[i] % size;

      expect(Math.abs(row - prevRow)).toBeLessThanOrEqual(1);
      expect(Math.abs(col - prevCol)).toBeLessThanOrEqual(1);
    }
  });

  it('rejects invalid input', () => {
    expect(cellsAlongLine(-1, 3, size)).toEqual([]);
    expect(cellsAlongLine(3, 25, size)).toEqual([]);
    expect(cellsAlongLine(1.5, 3, size)).toEqual([]);
    expect(cellsAlongLine(0, 3, 0)).toEqual([]);
  });
});
