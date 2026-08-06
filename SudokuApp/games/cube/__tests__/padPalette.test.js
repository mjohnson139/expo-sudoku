/**
 * The pad's four move groups, on every theme the app has.
 *
 * The design bundle is a set of light-mode hexes; two of the eight themes are
 * dark. What is worth pinning is not which hex comes out but that **a key's
 * label is legible on the key**, on all of them — which is otherwise judged by
 * eye on whichever two themes someone happened to open.
 */

import { GROUPS, LEGEND, isDarkSurface, padPalette } from '../padPalette';
import { closestPair, contrastRatio } from '../../../utils/color';
import { SUDOKU_THEMES } from '../../../utils/themes';

const ACCENT = '#c62828';
const TONES = ['face', 'slice', 'wide', 'rot', 'tool'];

/** Every theme the app ships, as `[name, theme]`. */
const themes = Object.entries(SUDOKU_THEMES).map(([name, theme]) => [name, theme]);

describe('the design values', () => {
  it('keeps the four move groups plus tools', () => {
    expect(Object.keys(GROUPS).sort()).toEqual(['face', 'rot', 'slice', 'tool', 'wide']);
  });

  it('names four groups in the legend, and not the tools', () => {
    // Tools are outlined rather than tinted — nothing that edits the solve
    // wears a move colour — so there is nothing to key.
    expect(LEGEND.map((l) => l.tone)).toEqual(['face', 'slice', 'wide', 'rot']);
  });
});

describe('padPalette', () => {
  it.each(themes)('keeps every key label legible on the %s theme', (name, theme) => {
    const palette = padPalette(theme, ACCENT);
    TONES.forEach((tone) => {
      const { bg, ink } = palette.tone(tone);
      expect(contrastRatio(ink, bg)).toBeGreaterThanOrEqual(4.5);
    });
  });

  it.each(themes)('keeps the flag legible on the %s theme', (name, theme) => {
    const palette = padPalette(theme, ACCENT);
    expect(contrastRatio(palette.accent.ink, palette.accent.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(themes)('keeps the four groups distinguishable on the %s theme', (name, theme) => {
    // Four tints that have collapsed into one another are four tints that are
    // not doing anything — the Fungiku regions learned this the hard way, and
    // the first cut of this palette repeated it on the dark themes.
    //
    // Measured on the **border**, because that is the channel that carries the
    // grouping on a dark theme: tint the backgrounds far enough for a dark key
    // and they land ΔE ~1 apart. The floor is set just under the separation the
    // design's own borders have on white (7.05).
    const palette = padPalette(theme, ACCENT);
    const borders = ['face', 'slice', 'wide', 'rot'].map((t) => palette.tone(t).border);
    const worst = closestPair(borders);

    // Asserting on the labelled pair rather than the bare number, so a
    // regression says *which* two groups collided.
    const named = (hex) =>
      ['face', 'slice', 'wide', 'rot'].find((t) => palette.tone(t).border === hex);
    expect({
      worstPair: `${named(worst.a)} vs ${named(worst.b)}`,
      tooClose: worst.distance < 5,
    }).toEqual({ worstPair: expect.any(String), tooClose: false });
  });

  it('uses the design values verbatim on a light theme', () => {
    const light = themes.find(([, theme]) => !isDarkSurface(theme.colors.numberPad.background));
    expect(light).toBeDefined();
    const palette = padPalette(light[1], ACCENT);
    expect(palette.tone('slice')).toEqual(GROUPS.slice);
    expect(palette.tone('rot')).toEqual(GROUPS.rot);
  });

  it('does not put a white slab on a dark theme', () => {
    const dark = themes.find(([, theme]) => isDarkSurface(theme.colors.numberPad.background));
    if (!dark) return;
    const palette = padPalette(dark[1], ACCENT);
    expect(palette.dark).toBe(true);
    // The face key is `#ffffff` as drawn. On a dark page it has to sit on the
    // theme's own surface instead, or the pad is a lamp.
    expect(palette.tone('face').bg).not.toBe('#ffffff');
    expect(contrastRatio(palette.tone('face').bg, '#ffffff')).toBeGreaterThan(2);
  });
});
