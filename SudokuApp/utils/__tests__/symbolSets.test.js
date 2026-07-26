import {
  REGION_PALETTES,
  getRegionColor,
  getRegionPalette,
  getSymbolLabel,
  resolveSymbol,
  SYMBOL_SET_IDS,
} from '../symbolSets';
import { MAX_SIZE } from '../../games/fungiku/engine';
import { CVD_TYPES, closestPair, contrastRatio, deltaE, hexToLab, simulateCvd } from '../color';

/**
 * The region palette's readability is a *measured* property, not a matter of
 * taste, so it gets a floor. The first palette tinted every hue toward white by
 * the same amount and left sky blue and blue only ΔE 6.67 apart — indistinguishable
 * at 8×8. If a future tweak softens the palette back into that state, these
 * tests fail instead of the operator discovering it on a device.
 */

// Comfortably below what the tuned palettes achieve, but far above the ΔE 6.67
// that motivated the fix.
const MIN_PAIR_DISTANCE = 15;

// WCAG 2.1 SC 1.4.11: non-text graphics need 3:1. Glyph ink aims higher.
const MIN_GRAPHIC_CONTRAST = 3;
const MIN_INK_CONTRAST = 4.5;

/**
 * What the nine-colour palette scored under dichromat simulation before the
 * tenth colour was added — the bar the ten-colour palette had to clear.
 *
 * This is a **relative** bar on purpose. Simulation is a model, and a CIEDE2000
 * distance between two simulated colours is not a calibrated measure of what a
 * dichromat can tell apart. What it can honestly answer is "did adding a colour
 * make this worse?", which is the question §12.2 asks.
 *
 * Recorded here rather than derived, because the nine-colour palette no longer
 * exists to measure — re-tuning changed every fill.
 */
const NINE_COLOUR_CVD_BASELINE = {
  light: { protan: 4.13, deutan: 5.44, tritan: 14.85 },
  dark: { protan: 5.8, deutan: 6.38, tritan: 18.52 },
};

describe.each([
  ['light', REGION_PALETTES.light, { lMin: 65, lMax: 97 }],
  ['dark', REGION_PALETTES.dark, { lMin: 15, lMax: 55 }],
])('the %s region palette', (mode, palette, band) => {
  const fills = palette.map((entry) => entry.background);

  /**
   * One fill per region at the largest board the engine will build. This is the
   * assertion that makes a colour collision impossible rather than merely
   * unlikely: `getRegionColor` no longer wraps, so if this ever fails the board
   * draws magenta cells and logs — which is the point.
   */
  it(`covers every region of a ${MAX_SIZE}×${MAX_SIZE} board`, () => {
    expect(palette.length).toBeGreaterThanOrEqual(MAX_SIZE);
    expect(palette).toHaveLength(10);
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

  /**
   * ΔE for normal vision is not colourblind safety — different properties, and
   * the tenth colour is where that stops being a footnote. A hue chosen purely
   * to maximize separation for trichromats can land straight on top of an
   * existing fill for a deutan, and every other test in this file would pass.
   *
   * So each dichromacy gets its own floor, set at what the nine-colour palette
   * managed. Ten colours in the same lightness band have less room than nine, so
   * holding this line was a constraint on the search, not a happy accident.
   */
  describe.each(CVD_TYPES)('as a %s sees it', (type) => {
    const simulated = fills.map((fill) => simulateCvd(fill, type));
    const floor = NINE_COLOUR_CVD_BASELINE[mode][type];

    it(`keeps its worst pair at least ΔE ${floor} apart, as the nine did`, () => {
      const worst = closestPair(simulated);
      const name = (hex) => palette[simulated.indexOf(hex)]?.name;

      expect({
        worstPair: `${name(worst.a)} vs ${name(worst.b)}`,
        belowBaseline: worst.distance < floor,
      }).toEqual({
        worstPair: expect.any(String),
        belowBaseline: false,
      });
    });

    it('still draws every region a different color', () => {
      expect(new Set(simulated).size).toBe(simulated.length);
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

  /**
   * The bug this closes: `getRegionColor` used to wrap with
   * `regionId % palette.length`, so on a 10-region board region 9 was drawn
   * exactly like region 0. Region colour is how a player tells regions apart, so
   * that is a wrong board rather than a caught error — and moving the wrap to 11
   * would only relocate it.
   */
  it('gives every region of the largest board its own distinct color', () => {
    const names = Array.from({ length: MAX_SIZE }, (_, id) => getRegionColor(id).name);
    expect(new Set(names).size).toBe(MAX_SIZE);
  });

  it('does not wrap ids back onto earlier regions', () => {
    expect(getRegionColor(MAX_SIZE - 1).name).not.toBe(getRegionColor(0).name);
  });

  describe('an id with no colour', () => {
    let consoleError;

    beforeEach(() => {
      consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    afterEach(() => consoleError.mockRestore());

    // Unreachable from a board this app generates — `generate()` rejects sizes
    // above MAX_SIZE — so this is about how the impossible case behaves: loudly,
    // and without taking the screen down mid-render.
    it('returns an unmistakable fill rather than a plausible wrong one', () => {
      const entry = getRegionColor(999);
      expect(entry.background).toBe('#FF00FF');
      expect(entry.name).toBe('unknown region');
    });

    it('says so on the console, once per id', () => {
      getRegionColor(1000);
      getRegionColor(1000);
      expect(consoleError).toHaveBeenCalledTimes(1);
      expect(consoleError.mock.calls[0][0]).toMatch(/region 1000/);
    });
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
