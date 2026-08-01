import {
  popoverPlacement,
  popoverWidth,
  POPOVER_MAX_WIDTH,
  POPOVER_GAP,
  TAIL_SIZE,
} from '../hintPlacement';
import { SIZES } from '../engine';

// A cell pitch in the range the real board uses: 32pt at 10×10 up to ~70 at 5×5.
const pitchFor = (size) => Math.round(360 / size);

const every = (size, fn) => {
  for (let cell = 0; cell < size * size; cell += 1) fn(cell);
};

describe('popoverWidth', () => {
  test('is capped, so it does not become a full-width bar again', () => {
    expect(popoverWidth(400)).toBe(POPOVER_MAX_WIDTH);
  });

  test('never exceeds the board it sits on', () => {
    expect(popoverWidth(180)).toBe(180);
  });
});

describe('popoverPlacement', () => {
  test('never covers the cell it points at', () => {
    SIZES.forEach((size) => {
      const cellSize = pitchFor(size);
      const boardSide = cellSize * size;

      every(size, (cell) => {
        const row = Math.floor(cell / size);
        const place = popoverPlacement({ cell, size, cellSize });
        const cellTop = row * cellSize;
        const cellBottom = (row + 1) * cellSize;

        if (place.side === 'below') {
          // Its top edge is below the cell's bottom.
          expect(place.top).toBeGreaterThanOrEqual(cellBottom + POPOVER_GAP);
        } else {
          // Anchored from the board's bottom: its bottom edge is above the
          // cell's top.
          expect(boardSide - place.bottom).toBeLessThanOrEqual(cellTop - POPOVER_GAP);
        }
      });
    });
  });

  test('flips sides at the halfway line, so it always has room', () => {
    const size = 9;
    const cellSize = pitchFor(size);

    // Top-left cell → below it.
    expect(popoverPlacement({ cell: 0, size, cellSize }).side).toBe('below');
    // Bottom-left cell → above it.
    expect(popoverPlacement({ cell: size * (size - 1), size, cellSize }).side).toBe('above');
  });

  test('never hangs off either side of the board', () => {
    SIZES.forEach((size) => {
      const cellSize = pitchFor(size);
      const boardSide = cellSize * size;

      every(size, (cell) => {
        const { left, width } = popoverPlacement({ cell, size, cellSize });
        expect(left).toBeGreaterThanOrEqual(0);
        expect(left + width).toBeLessThanOrEqual(boardSide);
      });
    });
  });

  test('the tail stays inside the bubble, clear of both corners', () => {
    SIZES.forEach((size) => {
      const cellSize = pitchFor(size);

      every(size, (cell) => {
        const { tailLeft, width } = popoverPlacement({ cell, size, cellSize });
        expect(tailLeft).toBeGreaterThanOrEqual(TAIL_SIZE);
        expect(tailLeft + TAIL_SIZE).toBeLessThanOrEqual(width - TAIL_SIZE);
      });
    });
  });

  test('the tail points at the cell whenever the bubble has room to centre', () => {
    const size = 9;
    const cellSize = pitchFor(size);
    const middleCol = 4;
    const cell = 2 * size + middleCol;

    const { left, tailLeft } = popoverPlacement({ cell, size, cellSize });
    const tailCentre = left + tailLeft + TAIL_SIZE / 2;
    const cellCentre = (middleCol + 0.5) * cellSize;

    // Within a pixel of the cell's centre — the rounding is the only slack.
    expect(Math.abs(tailCentre - cellCentre)).toBeLessThanOrEqual(1);
  });

  test('a cell in the corner still gets a tail that points at it', () => {
    // The body is clamped against the edge, so the tail has to travel *inside*
    // the body to keep pointing. Two clamps, and this is the one that proves the
    // second exists.
    const size = 10;
    const cellSize = pitchFor(size);

    const topLeft = popoverPlacement({ cell: 0, size, cellSize });
    expect(topLeft.left).toBe(0);
    expect(topLeft.tailLeft).toBe(TAIL_SIZE);

    const topRight = popoverPlacement({ cell: size - 1, size, cellSize });
    expect(topRight.left + topRight.width).toBe(cellSize * size);
    expect(topRight.tailLeft + TAIL_SIZE).toBe(topRight.width - TAIL_SIZE);
  });

  test('a hint with no cell gets no tail and does not pretend to point', () => {
    const size = 7;
    const cellSize = pitchFor(size);

    [-1, null, undefined].forEach((cell) => {
      const place = popoverPlacement({ cell, size, cellSize });
      expect(place.side).toBe('none');
      expect(place.tailLeft).toBeNull();
      expect(place.top).toBeGreaterThan(0);
    });
  });

  test('an out-of-range cell falls back rather than pointing off the board', () => {
    const size = 5;
    const place = popoverPlacement({ cell: 999, size, cellSize: pitchFor(size) });
    expect(place.side).toBe('none');
  });
});
