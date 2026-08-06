import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

/**
 * The cube's icons, drawn rather than borrowed (docs/cube-plan.md §8.8, Step 8).
 *
 * ### Why these are not `MaterialCommunityIcons`
 *
 * The transport used to be `skip-previous` · `chevron-left` · `play` ·
 * `chevron-right` · `skip-next`, and the design's complaint about it is exact:
 * the skips are **filled** glyphs from one family and the chevrons are
 * **stroked** glyphs from another, so five buttons that do one job read as two
 * unrelated pairs and a triangle. The fix is one family — *step* is a single
 * chevron against a bar, *jump* is a double chevron against the same bar, so the
 * four differ only in chevron count — and **play is the only filled glyph and
 * the only circle**, which is what makes it findable without looking. That is a
 * thing an icon set cannot be asked for; it has to be drawn.
 *
 * The `d` attributes are the design bundle's own, read off its `ico()` helper
 * and reproduced here at the stroke weight it specifies (1.9, round caps and
 * joins, 24pt box). They are not approximations of it.
 *
 * `pause` is the one glyph the bundle does not draw — it only says play "swaps
 * to a two-bar pause glyph at the same stroke weight", so the two bars are set
 * on the play triangle's own optical centre at the weight the family uses.
 */

const STROKE = 1.9;

/** Everything stroked, in the 24-box the design draws in. */
const PATHS = {
  jumpStart: ['M5 6v12', 'M13 6l-6 6 6 6', 'M20 6l-6 6 6 6'],
  stepPrev: ['M6 6v12', 'M17 6l-6 6 6 6'],
  stepNext: ['M18 6v12', 'M7 6l6 6-6 6'],
  jumpEnd: ['M19 6v12', 'M4 6l6 6-6 6', 'M11 6l6 6-6 6'],
  pause: ['M9.5 6v12', 'M14.5 6v12'],
  backspace: [
    'M9.6 5H20a1.6 1.6 0 0 1 1.5 1.6v10.8A1.6 1.6 0 0 1 20 19H9.6L2.6 12z',
    'M12.6 9.6l4.8 4.8M17.4 9.6l-4.8 4.8',
  ],
  flag: ['M6.4 3.2v17.6', 'M6.4 4.4h11.2l-2.2 4 2.2 4H6.4z'],
  keyboard: [
    'M6 8h.01M9.4 8h.01M12.8 8h.01M16.2 8h.01M7.6 11.4h8.8',
    'M8.6 17.6l3.4 3.4 3.4-3.4',
  ],
};

/** The one filled glyph. */
const PLAY = 'M8.5 5.6l10.5 6.4-10.5 6.4z';

const CubeGlyph = ({ name, size = 20, color = '#3d4450' }) => {
  const common = {
    stroke: color,
    strokeWidth: STROKE,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'play' ? (
        <Path d={PLAY} fill={color} />
      ) : (
        <>
          {/* The keyboard's tray is a rounded rect in the design rather than a
              path, and rounding it by hand would be a different corner. */}
          {name === 'keyboard' && (
            <Rect x="2.6" y="4.4" width="18.8" height="10.4" rx="1.8" {...common} />
          )}
          {(PATHS[name] || []).map((d) => (
            <Path key={d} d={d} {...common} />
          ))}
        </>
      )}
    </Svg>
  );
};

export default CubeGlyph;
