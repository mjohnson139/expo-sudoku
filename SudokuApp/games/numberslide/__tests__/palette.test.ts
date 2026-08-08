import SUDOKU_THEMES from '../../../utils/themes';
import { contrastRatio, mix, relativeLuminance } from '../../../utils/color';
import { BACKDROP_ALPHA, ensureContrast, numberSlidePalette, withAlpha } from '../palette';

/**
 * The contrast floor for the theme adoption (plan §4.2).
 *
 * **This is the failure mode the step could ship without noticing.** The
 * sibling app drew Number Slide in parchment on walnut; here every colour comes
 * from whichever of the seven themes the player picked, and `#f4ecdd` text on
 * Classic's `#f8f8f8` background is a bug that looks fine in the one screenshot
 * anybody takes. So the mapping is measured on every theme rather than looked
 * at on one, the way `utils/__tests__/symbolSets.test.js` measures the region
 * palette.
 *
 * The floors are the WCAG ones: 4.5:1 for text, 3:1 for meaningful non-text
 * graphics. They hold by construction — `ensureContrast` blends a colour toward
 * black or white until it clears its ratio — so an eighth theme added to
 * `utils/themes.js` arrives legible instead of arriving as a device bug. These
 * assertions are the floor under *that*, not a description of hand-picked hues.
 */

const THEME_NAMES = Object.keys(SUDOKU_THEMES);

const TEXT = 4.5;
const GRAPHIC = 3;

describe('the seven themes this palette has to work on', () => {
  it('is all of them, so a new theme fails here rather than on a phone', () => {
    expect(THEME_NAMES).toEqual(['classic', 'dark', 'pastel', 'sunset', 'sunrise', 'ocean', 'twilight']);
  });
});

describe.each(THEME_NAMES)('the %s theme', (name) => {
  const theme = SUDOKU_THEMES[name];
  // The same rule `useAppTheme` uses, rather than a list of names.
  const isDark = relativeLuminance(theme.colors.background) < 0.4;
  const p = numberSlidePalette(theme, isDark);

  it('inks a tile legibly on its own face', () => {
    expect(contrastRatio(p.tileInk, p.tile)).toBeGreaterThanOrEqual(TEXT);
  });

  it('inks a solved tile legibly on the lit face', () => {
    expect(contrastRatio(p.litTileInk, p.litTile)).toBeGreaterThanOrEqual(TEXT);
  });

  /**
   * The game-critical one. A socket is the empty square, and a player who
   * cannot tell the gap from a tile cannot play at all — which is a different
   * order of bug from a panel that looks flat.
   */
  it('separates the gap from a tile', () => {
    expect(contrastRatio(p.socket, p.tile)).toBeGreaterThanOrEqual(GRAPHIC);
  });

  it('reads the page text on the page', () => {
    expect(contrastRatio(p.ink, p.background)).toBeGreaterThanOrEqual(TEXT);
    expect(contrastRatio(p.muted, p.background)).toBeGreaterThanOrEqual(TEXT);
  });

  it('shows the accent against the page', () => {
    expect(contrastRatio(p.accent, p.background)).toBeGreaterThanOrEqual(GRAPHIC);
  });

  it('reads the stat panels', () => {
    expect(contrastRatio(p.panelText, p.panel)).toBeGreaterThanOrEqual(TEXT);
    expect(contrastRatio(p.panelLabel, p.panel)).toBeGreaterThanOrEqual(GRAPHIC);
  });

  /**
   * The win card's text does not sit on the page — it sits on the scrim, over a
   * board that has just turned accent-coloured. That composite is a third
   * colour, and measuring the text against the page instead would pass a card
   * nobody can read on a light theme.
   */
  it('reads the win card over the scrim over the lit board', () => {
    const surface = mix(p.litTile, p.background, BACKDROP_ALPHA);
    expect(contrastRatio(p.winInk, surface)).toBeGreaterThanOrEqual(TEXT);
    expect(contrastRatio(p.winMuted, surface)).toBeGreaterThanOrEqual(TEXT);
    // The badge is 30pt bold — WCAG's large-text bar.
    expect(contrastRatio(p.winAccent, surface)).toBeGreaterThanOrEqual(GRAPHIC);
  });

  it('leaves the celebration visible through its own scrim', () => {
    // The solved board turning the accent colour *is* the celebration; a scrim
    // heavy enough to hide it throws the moment away.
    expect(BACKDROP_ALPHA).toBeLessThanOrEqual(0.8);
    expect(p.backdrop).toBe(withAlpha(p.background, BACKDROP_ALPHA));
  });

  it('reads a button label on its button', () => {
    expect(contrastRatio(p.buttonText, p.button)).toBeGreaterThanOrEqual(TEXT);
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

describe('ensureContrast', () => {
  it('leaves a colour alone when it already clears the bar', () => {
    expect(ensureContrast('#000000', '#ffffff', 4.5)).toBe('#000000');
  });

  it('darkens toward black against a light background', () => {
    const fixed = ensureContrast('#dddddd', '#ffffff', 4.5);
    expect(contrastRatio(fixed, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });

  it('lightens toward white against a dark background', () => {
    const fixed = ensureContrast('#222222', '#000000', 4.5);
    expect(contrastRatio(fixed, '#000000')).toBeGreaterThanOrEqual(4.5);
  });

  it('terminates at the extreme rather than looping', () => {
    // 21:1 is only reachable from pure black on pure white.
    expect(ensureContrast('#ffffff', '#ffffff', 21)).toBe('#000000');
  });
});

describe('withAlpha', () => {
  it('writes an rgba string a style can use', () => {
    expect(withAlpha('#123456', 0.5)).toBe('rgba(18, 52, 86, 0.5)');
  });
});
