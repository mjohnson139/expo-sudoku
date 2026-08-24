import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CASE_CELLS, EMPTY_CASE, ORIENTED, sanitizeCase } from './algCase';

/**
 * The case, drawn (docs/cube-methods-plan.md §3.2).
 *
 * Nine cells on a near-black rounded square: yellow where the sticker is
 * oriented, grey where it is not. The design's tile, and the only picture in
 * this epic of the thing an algorithm is *for*.
 *
 * ### Why it is not themed
 *
 * `cubeState.js` makes the same call about `STICKER_COLORS` and gives the
 * reason: this is a picture of an object the player owns rather than a themed
 * surface. A case tile that went pale in the light theme would be a case tile
 * that stopped looking like a cube. So the three colours are fixed, and the
 * square is dark in both themes on purpose — it is the plastic between the
 * stickers.
 *
 * The yellow is `STICKER_COLORS.D`, which is the cube's *down* face. That is not
 * a mistake: every OLL sheet ever printed draws the last layer yellow-up,
 * because that is how a cuber holds it, and a case is a diagram rather than a
 * photograph. One yellow, defined once, whichever face it is on today.
 *
 * ### Sizing
 *
 * The outer box is exactly `size` — the card reserves 40 points for it and a
 * tile that rendered 39 or 41 would move the name and the moves on every row.
 * The cells are floored to whole points and centred, so any remainder becomes
 * padding rather than a half-point seam.
 *
 * ### Accessibility
 *
 * Two colours in a 40-point square are unreadable to a screen reader by
 * construction, so the tile never speaks for itself: pass `label`
 * (`describeCase`) where it stands alone, and leave it off where the row around
 * it already says the case — the library card's own label does — in which case
 * it is hidden rather than read out as an unlabelled image.
 */

/** The gap between cells, from the design. */
const GAP = 2;

/** The plastic showing around the edge. */
const PAD = 3;

/** Sticker yellow — `STICKER_COLORS.D`, spelled out rather than imported so the
 *  tile does not read as "the down face". */
const ORIENTED_COLOR = '#ffd500';

/** A sticker that is not oriented. Grey rather than another colour: the case
 *  says *whether*, never *which*, and the U face of a real case shows four
 *  different colours that mean nothing to the algorithm. */
const FLAT_COLOR = '#5a5a5a';

/** The plastic. Near-black in both themes — see above. */
const BODY_COLOR = '#141414';

/**
 * A hairline rim, one shade up from the body.
 *
 * **Found in a browser at 393 × 852 on the dark theme**, where the card behind
 * the tile is itself near-black and the square dissolved into it: what was left
 * read as stickers floating on the card rather than as a cube face. The rim is
 * fixed rather than the theme's border colour on purpose — a light rim would
 * ring the black square with a halo on the light themes, which is the same bug
 * pointing the other way. One shade up from the body is invisible where the
 * card is pale and is the whole edge where it is not.
 */
const RIM_COLOR = '#3a3a3a';

const CubeCaseTile = ({ pattern, size = 40, label }) => {
  const cells = sanitizeCase(pattern) || EMPTY_CASE;
  const cell = Math.max(2, Math.floor((size - PAD * 2 - GAP * 2) / 3));
  const radius = Math.max(3, Math.round(size * 0.15));

  return (
    <View
      style={[styles.tile, { width: size, height: size, borderRadius: radius }]}
      accessible={label ? true : false}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
    >
      <View style={[styles.grid, { width: cell * 3 + GAP * 2 }]}>
        {Array.from({ length: CASE_CELLS }, (unused, index) => (
          <View
            key={index}
            style={{
              width: cell,
              height: cell,
              // A sixth of the cell, so a 10-point cell and a 22-point one look
              // like the same sticker at two distances.
              borderRadius: Math.max(1, Math.round(cell / 6)),
              backgroundColor: cells[index] === ORIENTED ? ORIENTED_COLOR : FLAT_COLOR,
            }}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BODY_COLOR,
    // Inside the width, so the outer box is still exactly `size`.
    borderWidth: 1,
    borderColor: RIM_COLOR,
  },
  // A wrapping row rather than three row views: the width is pinned to exactly
  // three cells and two gaps above, so the wrap happens where it is meant to and
  // there is one gap rule instead of two.
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
});

export default CubeCaseTile;
