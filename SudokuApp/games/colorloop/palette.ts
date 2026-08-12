import type { AppTheme } from '../../utils/themes';
import { mix, readableOn, relativeLuminance } from '../../utils/color';
import { ensureContrast, ensureContrastAll, withAlpha } from '../../utils/contrast';
import { COLORS } from './colors';

/**
 * Every colour Color Loop draws that is not a tile, derived from the app theme
 * the player chose.
 *
 * Built to `games/numberslide/palette.ts`'s pattern, which plan §4.2 names as
 * the template: one pure function with no React and no React Native in it, every
 * part played by the token that already plays it in Sudoku, and floors that hold
 * **by construction** via `ensureContrast` rather than by having been checked
 * once. An eighth theme added to `utils/themes.js` therefore arrives legible
 * instead of arriving as a device bug.
 *
 * ### The one structural difference from Number Slide's, and it matters
 *
 * **The tiles are not themed.** Number Slide's tile faces come out of the
 * theme's own `cell.background`; Color Loop's are the seven Okabe–Ito hues in
 * `./colors.ts`, identical on all seven themes, because *the hues are the
 * puzzle*. A board whose colours shifted with the theme would be a board where
 * "make every row one solid colour" means something different in Twilight than
 * in Classic, and where the shared code that is this game's entire product idea
 * no longer describes what two people are looking at.
 *
 * So this file's job is the inverse of Number Slide's: not to derive the board
 * from the theme, but to derive **a frame that seven fixed hues sit inside**
 * without either fighting the other. That is what `tray`, `socket` and
 * `glyphInk` below are for, and it is why two of them are measured against the
 * tile colours rather than against the page.
 *
 * ### Which theme token plays which part
 *
 * The same casting as Number Slide's, so the two guest games read as one app:
 * the tray is the grid's background, panels are the number pad's, and the accent
 * — code chips, the primary button, the win badge, the star fill — is
 * `cell.userValueText`, the colour each theme prints *the player's own answer*
 * in. It is the only token that differs on all seven, which is what makes
 * cycling the theme visibly carry the screen.
 *
 * Brass does not survive as a colour and this is where that is felt: the amber
 * the standalone app used for every emphasis is now whatever the player's theme
 * emphasises with.
 */

/** WCAG 2.1 SC 1.4.3: body text needs 4.5:1. */
const TEXT_CONTRAST = 4.5;

/** WCAG 2.1 SC 1.4.11: meaningful non-text graphics need 3:1. */
const GRAPHIC_CONTRAST = 3;

/**
 * How much of the board the win scrim takes — the sibling app's own weight,
 * kept. The solved board's wave **is** the celebration; a scrim heavy enough to
 * hide it throws the moment away (Step 1's finding, plan §4.2).
 */
export const BACKDROP_ALPHA = 0.72;

/**
 * How much of the board the armed cover takes.
 *
 * Nearly opaque, and deliberately so: the cover exists to hold the board back
 * until the player presses Start, and a scrambled board legible through it is a
 * board they have begun solving before the clock starts. This is the one surface
 * in the app that is *supposed* to hide what is behind it.
 */
const COVER_ALPHA = 0.97;

export interface ColorLoopPalette {
  /** The page. */
  background: string;
  ink: string;
  muted: string;
  label: string;
  accent: string;

  /** The board. */
  tray: string;
  socket: string;
  tileBorder: string;
  litTileBorder: string;
  /** Drawn on every tile, so it is held against all seven hues at once. */
  glyphInk: string;

  /** Panels — stat blocks, level chips, the toast, the menu. */
  panel: string;
  panelBorder: string;
  panelText: string;
  panelLabel: string;

  /** Controls. */
  button: string;
  buttonText: string;
  buttonPressed: string;
  link: string;
  segBackground: string;
  segSelected: string;
  segText: string;
  segSelectedText: string;
  sliderTrack: string;
  inputBackground: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;

  /** The armed cover, drawn over the board before play begins. */
  cover: string;
  coverInk: string;
  coverLabel: string;
  /**
   * What the cover's text actually lands on — the cover blended with each thing
   * that can be behind it. Exported so the test measures the same composite the
   * ink was constructed against, rather than a colour nobody sees.
   */
  coverSurfaces: string[];

  /** The win overlay, drawn over the board. */
  backdrop: string;
  card: string;
  cardBorder: string;
  cardInk: string;
  cardMuted: string;
  cardLabel: string;
  cardAccent: string;
  starOff: string;
  confetti: string[];
}

/**
 * The whole screen's colours for one theme.
 *
 * @param theme  an entry from `utils/themes.js`
 * @param isDark `useAppTheme`'s luminance-derived flag — used only to decide
 *   which way a surface recesses, never to branch on a theme by name.
 */
export function colorLoopPalette(theme: AppTheme, isDark: boolean): ColorLoopPalette {
  const c = theme.colors;
  const hues = COLORS.map((entry) => entry.c);

  const background = c.background;
  const ink = ensureContrast(c.title, background, TEXT_CONTRAST);
  const muted = ensureContrast(mix(c.title, background, 0.35), background, TEXT_CONTRAST);
  const label = ensureContrast(mix(c.title, background, 0.45), background, GRAPHIC_CONTRAST);
  const accent = ensureContrast(c.cell.userValueText, background, GRAPHIC_CONTRAST);

  // Sudoku's board tokens, doing the same job one card away.
  const tray = mix(c.grid.background, c.grid.border, 0.12);

  // A socket is an empty *slot*, visible only in the gap a dragged line leaves
  // behind, so unlike Number Slide's it is not game-critical — but it is the
  // only thing that says the board has depth. It recesses the way that screen's
  // does: toward the theme's own grid line on a light tray so it keeps the
  // theme's hue, and toward white on a dark one, which has no such token to
  // borrow.
  const socket =
    relativeLuminance(tray) > 0.4 ? mix(tray, c.grid.border, 0.3) : mix(tray, '#ffffff', 0.16);

  /**
   * The glyph is drawn on **all seven hues**, so it is the one ink in the app
   * that cannot be fixed up against a single background.
   *
   * The sibling app used a flat `rgba(0,0,0,0.28)`, which is a decoration rather
   * than a cue — and the glyph is not decoration here, it is the non-colour
   * channel of identity that makes the board playable for someone who cannot
   * separate two of the hues (plan §4.2, and the operator's answer to open
   * question 1). So it is held to the *graphics* floor against every hue at
   * once, which is what `ensureContrastAll` exists for: a colour fixed against
   * the worst hue alone would routinely have been pushed past legibility on
   * another.
   */
  const glyphInk = ensureContrastAll(readableOn(tray), hues, GRAPHIC_CONTRAST);

  const panel = c.numberPad.background;
  const button = accent;
  const inputBackground = c.cell.background;
  const inputText = ensureContrast(c.title, inputBackground, TEXT_CONTRAST);

  /**
   * The win card is **opaque**, and that is a deliberate answer to Step 1's
   * hardest finding.
   *
   * That step found that text on a scrim over a lit board is measured against a
   * *composite* — the scrim's colour blended with whatever the board turned —
   * and that measuring against the page instead passes a card nobody can read.
   * Number Slide could compute that composite exactly because its solved board
   * is one colour. Color Loop's is **seven**, so the pixel behind the badge
   * depends on which tile it lands over, and there is no single composite to
   * hold the text to.
   *
   * Rather than hold every word to the worst of seven composites — which would
   * push the card's ink to near-black or near-white on most themes and throw the
   * theme away — the card carries its own opaque surface, exactly as the sibling
   * app's did. The scrim then only has to dim the board, and every string on the
   * card is measured against one known colour. It is the cheaper answer *and*
   * the more legible one; the composite rule still stands for anything drawn
   * directly on the scrim, which is now nothing.
   */
  const card = isDark ? mix(panel, '#000000', 0.35) : mix(panel, '#ffffff', 0.45);
  const cardInk = ensureContrast(c.title, card, TEXT_CONTRAST);

  /**
   * The armed cover, and **the one place Step 1's composite rule is applied
   * literally rather than designed around**.
   *
   * It is drawn at 0.97 over a scrambled board, so what its text sits on is the
   * cover blended with whichever tile happens to be behind that word — eight
   * possible surfaces (seven hues and the tray), not one. At this alpha they are
   * only a few percent apart, which is exactly the kind of gap that tempts you to
   * measure against the cover alone and call it close enough. That is how the
   * bug Step 1 found got in: *measured against the page it passes; measured
   * against what is actually behind it, it does not.* Three percent of a
   * saturated hue is worth about a tenth of a contrast point, so it is measured.
   */
  const cover = mix(background, tray, 0.5);
  const coverSurfaces = [...hues, tray].map((behind) => mix(behind, cover, COVER_ALPHA));

  return {
    background,
    ink,
    muted,
    label,
    accent,

    tray,
    socket,
    // A hairline that separates two same-coloured tiles sitting side by side —
    // a solved row is seven identical squares, and without a rim it is one long
    // bar. Held against the hues rather than against the tray, since that is
    // what it is drawn on top of.
    tileBorder: withAlpha(ensureContrastAll(readableOn(tray), hues, 1.6), 0.35),
    litTileBorder: withAlpha(ensureContrastAll(readableOn(tray), hues, GRAPHIC_CONTRAST), 0.9),
    glyphInk,

    panel,
    panelBorder: c.numberPad.border,
    panelText: ensureContrast(c.numberPad.text, panel, TEXT_CONTRAST),
    panelLabel: ensureContrast(mix(c.numberPad.text, panel, 0.35), panel, GRAPHIC_CONTRAST),

    button,
    buttonText: ensureContrast(readableOn(button), button, TEXT_CONTRAST),
    // Pressed is the same button, pushed away from itself — one step further
    // from the page than it was, so it reads as depressed on light and dark.
    buttonPressed: mix(button, isDark ? '#ffffff' : '#000000', 0.2),
    link: muted,
    segBackground: inputBackground,
    segSelected: accent,
    segText: ensureContrast(c.numberPad.text, inputBackground, TEXT_CONTRAST),
    segSelectedText: ensureContrast(readableOn(accent), accent, TEXT_CONTRAST),
    sliderTrack: ensureContrast(mix(accent, inputBackground, 0.75), inputBackground, 1.6),
    inputBackground,
    inputBorder: c.numberPad.border,
    inputText,
    inputPlaceholder: ensureContrast(
      mix(inputText, inputBackground, 0.45),
      inputBackground,
      GRAPHIC_CONTRAST
    ),

    cover: withAlpha(cover, COVER_ALPHA),
    coverInk: ensureContrastAll(c.title, coverSurfaces, TEXT_CONTRAST),
    coverLabel: ensureContrastAll(mix(c.title, cover, 0.4), coverSurfaces, GRAPHIC_CONTRAST),
    coverSurfaces,

    // The board dims under the win card rather than being covered by a panel of
    // some other colour — the page's own background, at weight.
    backdrop: withAlpha(background, BACKDROP_ALPHA),
    card,
    cardBorder: c.numberPad.border,
    cardInk,
    cardMuted: ensureContrast(mix(c.title, card, 0.35), card, TEXT_CONTRAST),
    cardLabel: ensureContrast(mix(c.title, card, 0.45), card, GRAPHIC_CONTRAST),
    // 26pt bold: WCAG's large-text bar, not the body one.
    cardAccent: ensureContrast(accent, card, GRAPHIC_CONTRAST),
    // An unearned star has to read as *absent* rather than as unlit decoration,
    // so it is held to a low floor against the card on purpose — visible, and
    // visibly not a star.
    starOff: ensureContrast(mix(c.title, card, 0.72), card, 1.5),
    // Decorative, but not invisible: each piece is held to 2:1 against the tray
    // it falls over, or a light theme's celebration is a burst of nothing.
    confetti: [
      accent,
      c.cell.correctValueText,
      c.cell.incorrectValueText,
      c.cell.notesText,
      c.title,
    ].map((piece) => ensureContrast(piece, tray, 2)),
  };
}

export default colorLoopPalette;
