import { computeGeom, linesAt } from '../geometry';

describe('computeGeom', () => {
  it('holds its invariants across sizes and widths', () => {
    for (const width of [320, 400, 440, 600]) {
      for (let n = 3; n <= 8; n++) {
        const g = computeGeom(width, n);
        expect(g.size).toBeLessThanOrEqual(Math.min(width, 440));
        expect(g.pad * 2 + g.gap * (n - 1) + g.cell * n).toBe(g.size);
        expect(g.cell).toBeGreaterThan(0);
        expect(g.gap).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('caps the board at 440 on wide screens', () => {
    expect(computeGeom(1200, 4).size).toBeLessThanOrEqual(440);
  });
});

describe('linesAt', () => {
  // computeGeom(400, 4) → pad 18, gap 12, cell 82, size 400, step 94
  const n = 4;
  const geom = computeGeom(400, n);
  const step = geom.cell + geom.gap;
  const twin = 0.1; // seam = 8.2px

  it('grabs a single line at a cell center', () => {
    const center = geom.pad + 1 * step + geom.cell / 2;
    expect(linesAt(n, geom, twin, 'row', 0, center)).toEqual([1]);
    expect(linesAt(n, geom, twin, 'col', center, 0)).toEqual([1]);
  });

  it('grabs both neighbours near the right edge of a cell', () => {
    const nearRightEdge = geom.pad + 1 * step + geom.cell - 2;
    expect(linesAt(n, geom, twin, 'row', 0, nearRightEdge)).toEqual([1, 2]);
  });

  it('grabs both neighbours near the left edge of a cell', () => {
    const nearLeftEdge = geom.pad + 1 * step + 2;
    expect(linesAt(n, geom, twin, 'row', 0, nearLeftEdge)).toEqual([0, 1]);
  });

  it('clamps at the board edges — no phantom neighbours', () => {
    const firstCellLeftEdge = geom.pad + 2;
    expect(linesAt(n, geom, twin, 'row', 0, firstCellLeftEdge)).toEqual([0]);
    const lastCellRightEdge = geom.pad + (n - 1) * step + geom.cell - 2;
    expect(linesAt(n, geom, twin, 'row', 0, lastCellRightEdge)).toEqual([n - 1]);
  });

  it('clamps coordinates outside the board to the nearest line', () => {
    expect(linesAt(n, geom, twin, 'row', 0, -50)).toEqual([0]);
    expect(linesAt(n, geom, twin, 'row', 0, 9999)).toEqual([n - 1]);
  });

  it('never grabs two lines when the seam is disabled', () => {
    const nearRightEdge = geom.pad + 1 * step + geom.cell - 2;
    expect(linesAt(n, geom, 0, 'row', 0, nearRightEdge)).toEqual([1]);
  });

  it('uses y for rows and x for columns', () => {
    const center2 = geom.pad + 2 * step + geom.cell / 2;
    const center0 = geom.pad + geom.cell / 2;
    expect(linesAt(n, geom, twin, 'row', center0, center2)).toEqual([2]);
    expect(linesAt(n, geom, twin, 'col', center2, center0)).toEqual([2]);
  });
});
