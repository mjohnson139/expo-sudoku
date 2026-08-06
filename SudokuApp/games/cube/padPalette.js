/**
 * The pad's four move groups, as colours that survive a theme (plan §8.8).
 *
 * The design bundle is a set of **light-mode hexes** — it was drawn at 375pt on
 * white, and it says so. This screen is themed, and two of the app's eight
 * themes are dark. Hardcoding `#ffffff` into a key would put a white slab on a
 * dark page, which is the one instruction §8.8 gives about colour.
 *
 * ### What is information here, and what is not
 *
 * The *hue* is the information: cool means a slice, green means a wide, sand
 * means a rotation, neutral means a face. The **lightness is not** — it is a
 * consequence of the design having been drawn on white. So a dark theme keeps
 * every hue and re-seats it on the theme's own surface, which is exactly what
 * `utils/color.mix` was written for on the Fungiku regions: *"region fills tint
 * toward white on a light theme and toward the theme's dark surface on a dark
 * one, so the same hues work on both."* Same problem, same answer.
 *
 * On a light theme the design's values are used verbatim, so the screen the
 * operator sees is the screen that was designed.
 *
 * ### The grouping moves channel on a dark theme, and it has to
 *
 * The first cut tinted the *backgrounds* toward the theme surface and kept
 * everything else. It read fine and it was wrong: at the tint strength a dark
 * key needs, the four backgrounds land **ΔE 0.9–2.6 apart**, against the 6.12
 * the design gets between them on white. Four tints that have collapsed into one
 * another are four tints doing nothing, and this repo has made that exact
 * mistake once already — the Fungiku regions, where *"tinting every hue toward
 * white by the same amount compressed them toward a common light gray"*.
 *
 * So on a dark theme the group is carried by the **border and the label**, which
 * are the group's own chroma rather than a wash of it: the borders come out
 * ΔE 6.3–6.9 apart, which is the separation the design has on light. The
 * background keeps a whisper of the hue and stops being the signal.
 *
 * `padPalette.test.js` puts a number under both halves — the label's contrast on
 * its key, and the groups' distance from each other — on all eight themes. It is
 * the part that would otherwise be judged by eye on whichever two themes someone
 * happened to open.
 */

import { mix, relativeLuminance } from '../../utils/color';

/**
 * The design's groups, exactly as drawn. `ink` is the label, and it is a colour
 * rather than the theme's title colour because a sand label on a sand key is
 * what makes the group readable at a glance.
 */
export const GROUPS = {
  face: { bg: '#ffffff', border: '#c9cfd8', ink: '#1f2430' },
  slice: { bg: '#e7eef8', border: '#b3c4dd', ink: '#2f4a75' },
  wide: { bg: '#e3efe8', border: '#b3d2c1', ink: '#2c5a4a' },
  rot: { bg: '#f4efe4', border: '#ddd0b6', ink: '#77613c' },
  tool: { bg: '#f0f1f4', border: '#d5dae2', ink: '#5d6473' },
};

/** The four groups the legend names, in the order it names them. */
export const LEGEND = [
  { tone: 'face', label: 'FACES' },
  { tone: 'slice', label: 'SLICES' },
  { tone: 'wide', label: 'WIDE' },
  { tone: 'rot', label: 'ROTATE' },
];

/** Is this a surface that wants light text on it? */
export const isDarkSurface = (hex) => relativeLuminance(hex) < 0.4;

/**
 * The palette for one theme.
 *
 * @param {object} theme the app theme
 * @param {string} accent the cube's accent
 * @returns {{tone: (name: string) => {bg, border, ink}, ...}}
 *
 * On a dark theme the key sits mostly on the theme's own surface — a background
 * that is texture rather than signal — and the group is said by the border and
 * the label instead. The label is lifted toward white rather than toward the
 * theme's own text colour, which is what the first cut did: `twilight`'s title
 * is a mid-lightness purple, so a label mixed toward it came out at contrast
 * 3.1 on its own key.
 */
export const padPalette = (theme, accent) => {
  const surface = theme.colors.numberPad.background;
  const title = theme.colors.title;
  const dark = isDarkSurface(surface);

  const tone = (name) => {
    const group = GROUPS[name] || GROUPS.face;
    if (!dark) return { ...group };
    return {
      bg: mix(group.bg, surface, 0.86),
      // Only 15% toward the surface: this is where the grouping lives on a dark
      // theme, so it keeps the group's own chroma rather than a wash of it.
      border: mix(group.border, surface, 0.15),
      ink: mix(group.border, '#ffffff', 0.55),
    };
  };

  return {
    dark,
    tone,
    // The one accent fill on the pad, and the reason the flag is findable.
    accent: { bg: accent, border: accent, ink: '#ffffff' },
    // Pressed but not yet armed. On a dark theme "pressed" cannot be a lighter
    // grey than the key, so it goes the other way.
    pressed: dark ? mix(surface, '#000000', 0.28) : '#e6e9ee',
    pressedBorder: dark ? mix(surface, '#ffffff', 0.28) : '#b9c0cb',
    // The hairline the hold fills across, under the accent that fills it.
    holdTrack: dark ? mix(surface, '#ffffff', 0.22) : 'rgba(31,36,48,0.14)',
    // The legend's label, the `far` tag, and the speed chip at 1×.
    faint: dark ? mix(title, surface, 0.45) : '#8b91a1',
    ink: dark ? title : '#3d4450',
  };
};

export default { GROUPS, LEGEND, padPalette, isDarkSurface };
