import {
  REGION_PALETTES,
  getRegionColor,
  getRegionPalette,
  getSymbolLabel,
  resolveSymbol,
  SYMBOL_SET_IDS,
} from '../symbolSets';
import { closestPair, contrastRatio, deltaE, hexToLab } from '../color';

/**
 * The region palette's readability is a *measured* property, not a matter of
 * taste, so it gets a floor. The first palette tinted every hue toward white by
 * the same amount and left sky blue and blue only ΔE 6.67 apart — indistinguishable
 * at 8×8. If a future tweak softens the palette back into that state, these
 * tests fail instead of the operator discovering it on a device.
 */

// Comfortably below what the tuned palettes achieve (17.11 light / 18.55 dark),
// but far above the ΔE 6.67 that motivated the fix.
const MIN_PAIR_DISTANCE = 15;

// WCAG 2.1 SC 1.4.11: non-text graphics need 3:1. Glyph ink aims higher.
const MIN_GRAPHIC_CONTRAST = 3;
const MIN_INK_CONTRAST = 4.5;

describe.each([
  ['light', REGION_PALETTES.light, { lMin: 65, lMax: 97 }],
  ['dark', REGION_PALETTES.dark, { lMin: 15, lMax: 55 }],
])('the %s region palette', (mode, palette, band) => {
  const fills = palette.map((entry) => entry.background);

  it('covers all nine regions', () => {
    expect(palette).toHaveLength(9);
  });

  it('has a stable name for every region', () => {
    const names = palette.map((entry) => entry.name);
    expect(names.every((name) => typeof name === 'string' && name.length > 0)).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });

  it('uses a distinct fill for every region', () => {
    expect(new Set(fills).size).toBe(fills.length);
  });

  it(`keeps every pair at least ΔE ${MIN_PAIR_DISTANCE} apart`, () => {
    const worst = closestPair(fills);
    const name = (hex) => palette.find((entry) => entry.background === hex)?.name;

    // Asserting on the labelled pair rather than the bare number, so a
    // regression reports *which* two regions collided instead of just "6.67 is
    // not >= 15" — that is the first thing anyone re-tuning will want to know.
    expect({
      worstPair: `${name(worst.a)} vs ${name(worst.b)}`,
      tooClose: worst.distance < MIN_PAIR_DISTANCE,
    }).toEqual({
      worstPair: expect.any(String),
      tooClose: false,
    });
  });

  it('separates the two blues, the pair that originally collided', () => {
    const skyBlue = palette.find((entry) => entry.name === 'sky blue').background;
    const blue = palette.find((entry) => entry.name === 'blue').background;

    expect(deltaE(skyBlue, blue)).toBeGreaterThanOrEqual(MIN_PAIR_DISTANCE);
  });

  it('separates orange from yellow, the runner-up collision', () => {
    const orange = palette.find((entry) => entry.name === 'orange').background;
    const yellow = palette.find((entry) => entry.name === 'yellow').background;

    expect(deltaE(orange, yellow)).toBeGreaterThanOrEqual(MIN_PAIR_DISTANCE);
  });

  it(`keeps every fill inside the ${mode} lightness band`, () => {
    // This is what stops a future re-tune from "fixing" separation by turning
    // the board into nine saturated blocks that swamp the mushroom glyph.
    fills.forEach((fill) => {
      const { L } = hexToLab(fill);
      expect(L).toBeGreaterThanOrEqual(band.lMin);
      expect(L).toBeLessThanOrEqual(band.lMax);
    });
  });

  it('gives every fill legible glyph ink', () => {
    palette.forEach((entry) => {
      expect(contrastRatio(entry.background, entry.ink)).toBeGreaterThanOrEqual(
        MIN_INK_CONTRAST
      );
    });
  });

  it('gives every fill a visible conflict color', () => {
    palette.forEach((entry) => {
      expect(contrastRatio(entry.background, entry.conflictInk)).toBeGreaterThanOrEqual(
        MIN_GRAPHIC_CONTRAST
      );
    });
  });
});

describe('getRegionPalette / getRegionColor', () => {
  it('defaults to the light palette', () => {
    expect(getRegionPalette()).toBe(REGION_PALETTES.light);
    expect(getRegionPalette(false)).toBe(REGION_PALETTES.light);
  });

  it('returns the dark palette when asked', () => {
    expect(getRegionPalette(true)).toBe(REGION_PALETTES.dark);
  });

  it('maps region ids to entries', () => {
    expect(getRegionColor(0).name).toBe(REGION_PALETTES.light[0].name);
    expect(getRegionColor(0, true).background).toBe(REGION_PALETTES.dark[0].background);
  });

  it('wraps around for ids beyond the palette', () => {
    expect(getRegionColor(9).name).toBe(getRegionColor(0).name);
    expect(getRegionColor(13).name).toBe(getRegionColor(4).name);
  });

  it('keeps light and dark aligned so a region keeps its identity across themes', () => {
    REGION_PALETTES.light.forEach((entry, index) => {
      expect(REGION_PALETTES.dark[index].name).toBe(entry.name);
      expect(REGION_PALETTES.dark[index].color).toBe(entry.color);
    });
  });
});

describe("Sudoku's symbol seam is untouched", () => {
  it('still resolves numbers to their digit', () => {
    expect(resolveSymbol(SYMBOL_SET_IDS.NUMBERS, 5)).toEqual({
      kind: 'text',
      value: 5,
      text: '5',
      label: '5',
    });
    expect(getSymbolLabel(SYMBOL_SET_IDS.NUMBERS, 7)).toBe('7');
  });

  it('still resolves the fungiku mushroom and swatches', () => {
    expect(resolveSymbol(SYMBOL_SET_IDS.FUNGIKU, 1)).toMatchObject({
      kind: 'icon',
      icon: 'mushroom',
      label: 'mushroom',
    });
    expect(resolveSymbol(SYMBOL_SET_IDS.FUNGIKU, 3)).toMatchObject({
      kind: 'swatch',
      label: 'sky blue',
    });
  });

  it('falls back to the digit for an unknown set', () => {
    expect(resolveSymbol('nope', 4).kind).toBe('text');
  });
});
