import {
  MAX_CELL,
  MIN_CELL,
  NAME_WIDTH,
  ROW_RULE,
  cellWidth,
  tableScrolls,
} from '../compareLayout';

/** What the modal actually has to give the table: 340 points or 94% of the
 *  screen, whichever is smaller, less 14 points of padding either side. */
const room = (screen) => Math.min(340, screen * 0.94) - 28;

describe('cellWidth', () => {
  it('fits four Roux phases at 320, which is the case this screen is for', () => {
    const width = room(320);
    const cell = cellWidth(width, 4);

    expect(cell).toBeGreaterThanOrEqual(MIN_CELL);
    expect(NAME_WIDTH + ROW_RULE + cell * 4).toBeLessThanOrEqual(width);
    expect(tableScrolls(width, 4)).toBe(false);
  });

  it('fits four at 375 and 393 as well, with air to spare', () => {
    [375, 393].forEach((screen) => {
      expect(tableScrolls(room(screen), 4)).toBe(false);
    });
  });

  it('stops widening once two phases would sprawl', () => {
    expect(cellWidth(room(393), 2)).toBe(MAX_CELL);
    expect(cellWidth(4000, 1)).toBe(MAX_CELL);
  });

  it('stops narrowing at the point two digits stop fitting, and scrolls instead', () => {
    // A Roux solve beside a CFOP one is eight columns, and eight do not fit.
    const width = room(320);
    expect(cellWidth(width, 8)).toBe(MIN_CELL);
    expect(tableScrolls(width, 8)).toBe(true);
  });

  it('starts at its widest before there is a width to divide up', () => {
    // The first render has no layout yet. Measuring down from the widest is a
    // table that settles; measuring up from the narrowest is one that flinches.
    expect(cellWidth(0, 4)).toBe(MAX_CELL);
    expect(cellWidth(undefined, 4)).toBe(MAX_CELL);
    expect(tableScrolls(0, 4)).toBe(false);
  });

  it('has nothing to divide when there are no columns', () => {
    expect(cellWidth(300, 0)).toBe(MAX_CELL);
    expect(tableScrolls(300, 0)).toBe(false);
  });
});
