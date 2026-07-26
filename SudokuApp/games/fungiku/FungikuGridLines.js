import React, { useMemo } from 'react';
import { View, StyleSheet, PixelRatio } from 'react-native';

/**
 * The board's grid, drawn as one overlay on top of the cells.
 *
 * ### What is drawn, and what deliberately is not
 *
 * A line is drawn between two cells **of the same region**, and nowhere else.
 * Where two regions meet there is no line at all: the fills change colour, and
 * that colour edge *is* the boundary. Drawing a stroke there as well was drawing
 * the same information twice — see "the boundary stroke" below.
 *
 * So the overlay is: a thin line wherever a region continues into the next cell,
 * and a frame around the board.
 *
 * ### Why this is not per-cell borders
 *
 * It used to be: each cell set its own four border widths and colours. That is
 * the obvious way to do it and it produces three artifacts, all of which the
 * operator saw on device (2026-07-26) and none of which show in a desktop
 * browser:
 *
 * 1. **Every interior line was drawn twice**, once by the cell on each side, so
 *    it rendered at double width while the board's frame was drawn once.
 * 2. **Corners notched.** React Native miters adjacent borders, so a cell with a
 *    thick edge meeting a thin one gets a diagonal seam; where four cells meet,
 *    four independent miters fail to line up.
 * 3. **Borders draw *inside* the cell box**, so a line ate width off both
 *    neighbours' fills — an eighth of the cell at 32px.
 *
 * Rectangles fix all three by construction: each edge is drawn exactly once, at
 * a width that does not depend on how many cells touch it, centred on the edge
 * rather than inside one cell.
 *
 * ### The boundary stroke, and why it went away
 *
 * Region boundaries used to be drawn as a heavy stroke, on the reasoning that
 * region outlines are the board's structure the way box lines are in Sudoku
 * (plan §3). They are not the same case. Sudoku's boxes are invisible without
 * their lines; a Fungiku region is a **colour**, and ten of them are tuned to be
 * distinguishable by a measured margin (plan §12.2). The stroke was a second
 * rendering of information the fill already carried, and it cost the geometry
 * that produced every artifact above — the double-drawing, the mitering, the
 * half-stroke extensions needed to close corners, and the ticks where those
 * extensions ran past the frame.
 *
 * Removing it makes colour the **only** channel for region identity. That is a
 * real trade for a colourblind player, and the reason `corners` in
 * `utils/symbolSets.js` still exists unused: if the boundary is ever wanted back
 * as an accessibility channel, a shape cue is the cheaper way to pay for it than
 * a stroke on every edge.
 *
 * Collinear runs are merged, so a row of same-region cells is one View and not
 * ten. The overlay depends only on the puzzle, never on the player's marks, so
 * it is memoized and does not re-render on taps.
 */

/**
 * Grid lines take their colour from the fill they sit on, the same way glyph ink
 * does, rather than from the theme.
 *
 * The theme's `grid.cellBorder` is tuned for Sudoku's white cells — in the
 * Pastel theme it is `#d0d8e6`, which simply disappears on a saturated orange or
 * green region fill. That is what "the grid lines could use some darker lines"
 * was about. A contrast-picked ink at low alpha is legible on every fill in the
 * palette by construction. A line only ever sits between two cells of the *same*
 * region, so there is exactly one fill to be legible against.
 */
const gridInkFor = (ink) => (ink === '#ffffff' ? '#ffffff66' : '#1a1a1a5e');

// One physical-ish line rather than StyleSheet.hairlineWidth: a third of a pixel
// at low alpha is what made these vanish.
const GRID_LINE_WIDTH = 1;

/**
 * Round a length to a whole number of **device** pixels.
 *
 * This is the difference between a line and a smear. A line centred on a cell
 * edge lands at a half logical pixel — `y = 35.5, height = 1` — and on a 3×
 * screen that is device rows 106.5 to 109.5. The renderer cannot draw half a
 * pixel, so it antialiases: 50% coverage, 100%, 100%, 50%. Multiply that by the
 * line's own 37% alpha and the edges all but vanish, unevenly, depending on the
 * fill behind them. On device that read as "the grid has misses" when in fact
 * every edge was drawn (plan §12.5).
 *
 * Snapping both the position *and* the thickness means every line covers whole
 * device pixels at full strength.
 */
const snap = (value) => PixelRatio.roundToNearestPixel(value);

/** A line's thickness, never rounded away to nothing. */
const snapWidth = (value) => Math.max(StyleSheet.hairlineWidth, snap(value));

/**
 * @param {number}   size    - N
 * @param {number}   cell    - cell size in px
 * @param {number[]} regions - flat region ids
 * @param {number}   width   - the board frame's stroke width
 * @param {string}   color   - the board frame's colour
 * @param {function} inkAt   - (regionId) => the glyph ink for that region's fill
 */
const FungikuGridLines = ({ size, cell, regions, width, color, inkAt }) => {
  const { lines, frame } = useMemo(() => {
    const drawn = [];
    const frameWidth = snapWidth(width);
    const lineWidth = snapWidth(GRID_LINE_WIDTH);
    /** A line of `lineWidth` centred on edge position `p`, snapped. */
    const lineAt = (p) => snap(p - lineWidth / 2);
    const at = (row, col) => regions[row * size + col];

    /**
     * The line on one interior edge, or null where the two cells belong to
     * different regions — there the change of fill is the edge. The key is what
     * run-merging compares, so two runs only merge when they draw identically.
     */
    const edge = (aRow, aCol, bRow, bCol) => {
      const region = at(aRow, aCol);
      if (region !== at(bRow, bCol)) return null;
      const ink = gridInkFor(inkAt(region));
      return { key: ink, ink };
    };

    /** Walk one line of edges, emitting a rectangle per run of identical ones. */
    const walk = (count, edgeAtIndex, emit) => {
      let start = 0;
      let run = edgeAtIndex(0);
      for (let i = 1; i <= count; i++) {
        const next = i < count ? edgeAtIndex(i) : null;
        if (next?.key !== run?.key) {
          if (run) emit(start, i, run);
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
        (c0, c1, run) =>
          drawn.push({
            key: `h${r}-${c0}`,
            style: {
              top: lineAt(r * cell),
              left: c0 * cell,
              width: (c1 - c0) * cell,
              height: lineWidth,
              backgroundColor: run.ink,
            },
          })
      );
    }

    // Interior vertical edges: the line between column c-1 and column c.
    for (let c = 1; c < size; c++) {
      walk(
        size,
        (row) => edge(row, c - 1, row, c),
        (r0, r1, run) =>
          drawn.push({
            key: `v${c}-${r0}`,
            style: {
              left: lineAt(c * cell),
              top: r0 * cell,
              height: (r1 - r0) * cell,
              width: lineWidth,
              backgroundColor: run.ink,
            },
          })
      );
    }

    // The frame. Inset fully inside the board rather than centred on its edge,
    // because the board's box *is* the touch geometry: `cellFromPoint` resolves
    // taps against this origin, so nothing here may move the board's corner.
    return {
      lines: drawn,
      frame: [
        { key: 'top', style: { top: 0, left: 0, right: 0, height: frameWidth } },
        { key: 'bottom', style: { bottom: 0, left: 0, right: 0, height: frameWidth } },
        { key: 'left', style: { top: 0, bottom: 0, left: 0, width: frameWidth } },
        { key: 'right', style: { top: 0, bottom: 0, right: 0, width: frameWidth } },
      ],
    };
  }, [regions, size, cell, width, inkAt]);

  return (
    // Purely decorative, and the board owns every touch — the overlay must never
    // intercept one.
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {lines.map((seg) => (
        <View key={seg.key} style={[styles.segment, seg.style]} />
      ))}
      {frame.map((seg) => (
        <View key={`frame-${seg.key}`} style={[styles.segment, { backgroundColor: color }, seg.style]} />
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
