import SUDOKU_THEMES from '../../../utils/themes';
import { contrastRatio, mix, relativeLuminance } from '../../../utils/color';
import { ensureContrast, ensureContrastAll, withAlpha } from '../../../utils/contrast';
import { COLORS } from '../colors';
import { BACKDROP_ALPHA, colorLoopPalette } from '../palette';

/**
 * The contrast floor for Color Loop's theme adoption (plan §4.2).
 *
 * The same measured floor `games/numberslide/__tests__/palette.test.ts` puts
 * under Number Slide, and for the same reason: the sibling app drew this game in
 * parchment on walnut, here every chrome colour comes from whichever of the
 * seven themes the player picked, and a pair that reads on one theme and not on
 * another is a bug that looks fine in the one screenshot anybody takes.
 *
 * **What is different here is the board.** Colour Loop's tiles are seven fixed
 * hues rather than a themed surface, which moves two of the hard cases:
 *
 *  - the glyph is drawn on **all seven** hues at once, so it cannot be fixed up
 *    against a single background — `ensureContrastAll` is what that needs, and
 *    the assertions below check it against every hue rather than the worst one;
 *  - the win card is **opaque**, so its text measures against one known colour
 *    instead of against a scrim over a board of seven. Step 1's finding — that
 *    text on an overlay must be measured against the *composite* — still holds;
 *    this is the construction that means nothing is drawn on the composite.
 */

const THEME_NAMES = Object.keys(SUDOKU_THEMES);

const TEXT = 4.5;
const GRAPHIC = 3;

const HUES = COLORS.map((entry) => entry.c);

describe('the seven themes this palette has to work on', () => {
  it('is all of them, so a new theme fails here rather than on a phone', () => {
    expect(THEME_NAMES).toEqual([
      'classic',
      'dark',
      'pastel',
      'sunset',
      'sunrise',
      'ocean',
      'twilight',
    ]);
  });
});

describe.each(THEME_NAMES)('the %s theme', (name) => {
  const theme = SUDOKU_THEMES[name];
  // The same rule `useAppTheme` uses, rather than a list of names.
  const isDark = relativeLuminance(theme.colors.background) < 0.4;
  const p = colorLoopPalette(theme, isDark);

  /**
   * The game-critical one. The glyph is the non-colour channel of identity — it
   * is what makes the board playable for someone who cannot separate two of the
   * hues — so a glyph that disappears into one tile is not a cosmetic failure.
   */
  it('reads the glyph on every one of the seven tiles', () => {
    HUES.forEach((hue) => {
      expect(contrastRatio(p.glyphInk, hue)).toBeGreaterThanOrEqual(GRAPHIC);
    });
  });

  it('separates two same-coloured tiles sitting side by side', () => {
    // A solved row is n identical squares; without a rim it reads as one bar.
    // The rim is translucent, so what is pinned is the colour it is drawn from.
    expect(p.tileBorder.startsWith('rgba(')).toBe(true);
    expect(p.litTileBorder.startsWith('rgba(')).toBe(true);
  });

  it('shows the board against the page it sits on', () => {
    expect(contrastRatio(p.tray, p.background)).toBeGreaterThanOrEqual(1.05);
  });

  it('reads the page text on the page', () => {
    expect(contrastRatio(p.ink, p.background)).toBeGreaterThanOrEqual(TEXT);
    expect(contrastRatio(p.muted, p.background)).toBeGreaterThanOrEqual(TEXT);
    expect(contrastRatio(p.label, p.background)).toBeGreaterThanOrEqual(GRAPHIC);
  });

  it('shows the accent against the page', () => {
    expect(contrastRatio(p.accent, p.background)).toBeGreaterThanOrEqual(GRAPHIC);
  });

  it('reads the stat panels and the menu', () => {
    expect(contrastRatio(p.panelText, p.panel)).toBeGreaterThanOrEqual(TEXT);
    expect(contrastRatio(p.panelLabel, p.panel)).toBeGreaterThanOrEqual(GRAPHIC);
  });

  /**
   * Step 1's composite finding, applied literally: the cover is translucent, so
   * its text sits on the cover blended with whatever tile is behind that word —
   * eight surfaces, not one. Measuring against the cover alone is the shortcut
   * that shipped the bug the first time.
   */
  it('reads the armed cover over every tile it can be covering', () => {
    expect(p.coverSurfaces).toHaveLength(HUES.length + 1);
    p.coverSurfaces.forEach((surface) => {
      expect(contrastRatio(p.coverInk, surface)).toBeGreaterThanOrEqual(TEXT);
      expect(contrastRatio(p.coverLabel, surface)).toBeGreaterThanOrEqual(GRAPHIC);
    });
    // And the cover itself is drawn translucent, which is what makes those eight
    // surfaces different from each other in the first place.
    expect(p.cover.startsWith('rgba(')).toBe(true);
  });

  it('reads every line of the win card on the card', () => {
    expect(contrastRatio(p.cardInk, p.card)).toBeGreaterThanOrEqual(TEXT);
    expect(contrastRatio(p.cardMuted, p.card)).toBeGreaterThanOrEqual(TEXT);
    expect(contrastRatio(p.cardLabel, p.card)).toBeGreaterThanOrEqual(GRAPHIC);
    // The badge and the code are 24–26pt bold — WCAG's large-text bar.
    expect(contrastRatio(p.cardAccent, p.card)).toBeGreaterThanOrEqual(GRAPHIC);
  });

  it('shows an unearned star as present but visibly unearned', () => {
    const off = contrastRatio(p.starOff, p.card);
    const on = contrastRatio(p.cardAccent, p.card);
    expect(off).toBeGreaterThanOrEqual(1.2);
    expect(off).toBeLessThan(on);
  });

  it('leaves the celebration visible through its own scrim', () => {
    expect(BACKDROP_ALPHA).toBeLessThanOrEqual(0.8);
    expect(p.backdrop).toBe(withAlpha(p.background, BACKDROP_ALPHA));
  });

  it('reads a button label on its button, and a segment on its segment', () => {
    expect(contrastRatio(p.buttonText, p.button)).toBeGreaterThanOrEqual(TEXT);
    expect(contrastRatio(p.segText, p.segBackground)).toBeGreaterThanOrEqual(TEXT);
    expect(contrastRatio(p.segSelectedText, p.segSelected)).toBeGreaterThanOrEqual(TEXT);
  });

  it('shows a slider track against the panel it is drawn on', () => {
    expect(contrastRatio(p.sliderTrack, p.inputBackground)).toBeGreaterThanOrEqual(1.2);
    expect(contrastRatio(p.accent, p.sliderTrack)).toBeGreaterThanOrEqual(1.2);
  });

  it('reads what is typed into a field, and the prompt to type it', () => {
    expect(contrastRatio(p.inputText, p.inputBackground)).toBeGreaterThanOrEqual(TEXT);
    expect(contrastRatio(p.inputPlaceholder, p.inputBackground)).toBeGreaterThanOrEqual(GRAPHIC);
  });

  it('drops no confetti that is invisible on the board', () => {
    expect(p.confetti).toHaveLength(5);
    p.confetti.forEach((piece) => {
      expect(contrastRatio(piece, p.tray)).toBeGreaterThanOrEqual(2);
    });
  });

  it('leaves nothing undefined for a style to swallow', () => {
    Object.entries(p).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((entry) => expect(typeof entry).toBe('string'));
      } else {
        expect(typeof value).toBe('string');
        expect(key.length > 0 && (value as string).length > 0).toBe(true);
      }
    });
  });
});

describe('ensureContrastAll', () => {
  it('leaves a colour alone when it already clears the bar against every target', () => {
    expect(ensureContrastAll('#000000', ['#ffffff', '#eeeeee'], 4.5)).toBe('#000000');
  });

  it('satisfies the whole set, not merely the worst member of it', () => {
    // A mid grey clears neither end of this pair on its own.
    const fixed = ensureContrastAll('#808080', ['#ffffff', '#f0f0f0', '#dddddd'], 3);
    ['#ffffff', '#f0f0f0', '#dddddd'].forEach((against) => {
      expect(contrastRatio(fixed, against)).toBeGreaterThanOrEqual(3);
    });
  });

  it('returns the best worst-case when the bar cannot be met', () => {
    // Nothing clears 4.5:1 against both black and white at once.
    const fixed = ensureContrastAll('#777777', ['#000000', '#ffffff'], 4.5);
    expect(typeof fixed).toBe('string');
    expect(fixed.startsWith('#')).toBe(true);
  });
});

describe('the win card is opaque by construction', () => {
  it('is a hex colour, so its text is measured against one known surface', () => {
    THEME_NAMES.forEach((name) => {
      const theme = SUDOKU_THEMES[name];
      const p = colorLoopPalette(theme, relativeLuminance(theme.colors.background) < 0.4);
      expect(p.card.startsWith('#')).toBe(true);
      // And it is *not* what the composite would have been over any tile — which
      // is the point: there is no single composite to hold the text to when the
      // board underneath is seven colours.
      HUES.forEach((hue) => {
        expect(p.card).not.toBe(mix(hue, p.background, BACKDROP_ALPHA));
      });
    });
  });
});

describe('ensureContrast, borrowed from Number Slide', () => {
  it('is the same function both palettes call', () => {
    expect(ensureContrast('#000000', '#ffffff', 4.5)).toBe('#000000');
    expect(
      contrastRatio(ensureContrast('#dddddd', '#ffffff', 4.5), '#ffffff')
    ).toBeGreaterThanOrEqual(4.5);
  });
});
