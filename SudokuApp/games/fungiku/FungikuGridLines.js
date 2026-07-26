import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

/**
 * The board's lines — every grid line and every region boundary — drawn as one
 * overlay on top of the cells.
 *
 * ### Why this is not per-cell borders
 *
 * It used to be: each cell set its own four border widths and colors, thick
 * where the neighboring cell belonged to a different region. That is the obvious
 * way to do it and it produces three artifacts, all of which the operator saw on
 * device (2026-07-26) and none of which are visible in a browser at desktop
 * scale:
 *
 * 1. **Every interior region boundary was drawn twice** — once by the cell on
 *    each side — so it rendered at double width, while the board's outer edge
 *    was drawn once. Interior boundaries were literally twice the weight of the
 *    frame around them.
 * 2. **Corners notched.** React Native miters adjacent borders, so a cell with a
 *    thick top edge and a hairline left edge gets a diagonal seam between the
 *    two where they meet. Where four cells meet at a region corner there are
 *    four independent miters, and they do not line up.
 * 3. **Borders are drawn *inside* the cell box**, so a boundary ate 2px off both
 *    neighbors' fills. At 32px cells that is an eighth of the cell.
 *
 * Drawing the lines as absolutely-positioned rectangles fixes all three by
 * construction: each edge is drawn exactly **once**, at a width that does not
 * depend on how many cells touch it, **centered on the edge** rather than inside
 * one cell, and with region segments extended by half a stroke at each end so
 * corners and T-junctions fill in solid instead of mitering.
 *
 * Collinear runs are merged, so a boundary that follows a whole row is one View
 * and not ten. The whole overlay depends only on the puzzle, never on the
 * player's marks, so it is memoized and does not re-render on taps.
 */

/**
 * Grid lines *within* a region take their color from the fill they sit on, the
 * same way glyph ink does, rather than from the theme.
 *
 * The theme's `grid.cellBorder` is tuned for Sudoku's white cells — in the
 * Pastel theme it is `#d0d8e6`, which simply disappears on a saturated orange or
 * green region fill. That is what "the grid lines could use some darker lines"
 * was about. A contrast-picked ink at low alpha is legible on every fill in the
 * palette by construction.
 */
const gridInkFor = (ink) => (ink === '#ffffff' ? '#ffffff66' : '#1a1a1a5e');

// One physical-ish line rather than StyleSheet.hairlineWidth: a third of a pixel
// at low alpha is what made these vanish. Region boundaries stay clearly the
// heavier of the two — that contrast is the board's structure (plan §3).
const GRID_LINE_WIDTH = 1;

/**
 * @param {number}   size   - N
 * @param {number}   cell   - cell size in px
 * @param {number[]} regions- flat region ids
 * @param {number}   width  - region-boundary stroke width
 * @param {string}   color  - region-boundary color
 * @param {function} inkAt  - (regionId) => the glyph ink for that region's fill
 */
const FungikuGridLines = ({ size, cell, regions, width, color, inkAt }) => {
  const { gridSegments, regionSegments } = useMemo(() => {
    const grid = [];
    const region = [];
    const half = width / 2;
    const gridHalf = GRID_LINE_WIDTH / 2;
    const at = (row, col) => regions[row * size + col];

    /**
     * What sits on one interior edge: a region boundary, or a grid line in the
     * color of the region both sides share. The string is what run-merging
     * compares, so two runs only merge when they would draw identically.
     */
    const edge = (aRow, aCol, bRow, bCol) => {
      const a = at(aRow, aCol);
      const b = at(bRow, bCol);
      if (a !== b) return { key: 'region', boundary: true };
      const ink = gridInkFor(inkAt(a));
      return { key: `grid:${ink}`, boundary: false, ink };
    };

    /**
     * Where a run of region boundary starts and ends along its line.
     *
     * Interior ends are extended half a stroke so a corner or T-junction is
     * filled by overlap rather than left as a notch — but an end that reaches
     * the edge of the board is **clamped instead**. Extending there put the
     * half-stroke *outside* the board, where nothing clips it, and it showed on
     * device as small ticks poking past the frame. Clamped, the run still runs
     * right into the frame band and joins it solidly.
     */
    const span = (index, last) => ({
      from: index === 0 ? 0 : index * cell - half,
      to: last === size ? size * cell : last * cell + half,
    });

    /** Walk one line of edges, emitting a rectangle per run of identical ones. */
    const walk = (count, edgeAtIndex, emit) => {
      let start = 0;
      let run = edgeAtIndex(0);
      for (let i = 1; i <= count; i++) {
        const next = i < count ? edgeAtIndex(i) : null;
        if (!next || next.key !== run.key) {
          emit(start, i, run);
          start = i;
          run = next;
        }
      }
    };

    // Interior horizontal edges: the line between row r-1 and row r.
    for (let r = 1; r < size; r++) {
      walk(
        size,
        (col) => edge(r - 1, col, r, col),
        (c0, c1, run) => {
          if (run.boundary) {
            const { from, to } = span(c0, c1);
            region.push({
              key: `h${r}-${c0}`,
              style: { top: r * cell - half, left: from, width: to - from, height: width },
            });
          } else {
            grid.push({
              key: `h${r}-${c0}`,
              style: {
                top: r * cell - gridHalf,
                left: c0 * cell,
                width: (c1 - c0) * cell,
                height: GRID_LINE_WIDTH,
                backgroundColor: run.ink,
              },
            });
          }
        }
      );
    }

    // Interior vertical edges: the line between column c-1 and column c.
    for (let c = 1; c < size; c++) {
      walk(
        size,
        (row) => edge(row, c - 1, row, c),
        (r0, r1, run) => {
          if (run.boundary) {
            const { from, to } = span(r0, r1);
            region.push({
              key: `v${c}-${r0}`,
              style: { left: c * cell - half, top: from, height: to - from, width },
            });
          } else {
            grid.push({
              key: `v${c}-${r0}`,
              style: {
                left: c * cell - gridHalf,
                top: r0 * cell,
                height: (r1 - r0) * cell,
                width: GRID_LINE_WIDTH,
                backgroundColor: run.ink,
              },
            });
          }
        }
      );
    }

    // The frame, at the same weight as an interior boundary — which it was not
    // before, when interior boundaries were double-drawn. Inset fully inside the
    // board rather than centered on its edge, because the board's box *is* the
    // touch geometry: `cellFromPoint` resolves taps against this origin, so
    // nothing here may change where the board's top-left corner sits.
    const frame = [
      { key: 'top', style: { top: 0, left: 0, right: 0, height: width } },
      { key: 'bottom', style: { bottom: 0, left: 0, right: 0, height: width } },
      { key: 'left', style: { top: 0, bottom: 0, left: 0, width } },
      { key: 'right', style: { top: 0, bottom: 0, right: 0, width } },
    ];

    return { gridSegments: grid, regionSegments: [...region, ...frame] };
  }, [regions, size, cell, width, inkAt]);

  return (
    // Purely decorative, and the board owns every touch — the overlay must never
    // intercept one.
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {gridSegments.map((seg) => (
        <View key={`g-${seg.key}`} style={[styles.segment, seg.style]} />
      ))}
      {/* Region boundaries last, so they cover the grid lines they cross rather
          than being interrupted by them. */}
      {regionSegments.map((seg) => (
        <View key={`r-${seg.key}`} style={[styles.segment, { backgroundColor: color }, seg.style]} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  segment: {
    position: 'absolute',
  },
});

// The lines depend on the puzzle, never on the player's marks, and the board
// re-renders on every tap.
export default React.memo(FungikuGridLines);
