import type { AppTheme } from '../../utils/themes';
import { contrastRatio, hexToRgb, mix, readableOn, relativeLuminance } from '../../utils/color';

/**
 * Every colour Number Slide draws, derived from the app theme the player chose.
 *
 * ### Why this is a module and not inline styles
 *
 * **Settled by the operator, 2026-08-08** (plan §4.2): *"I want color loop to
 * fit into the color themes here. There is no attachment to the walnut and
 * brass."* So the sibling app's parchment `TILE` constants and its walnut
 * `THEME` object do not come across at all — every colour on this screen comes
 * from `useAppTheme`, and cycling the theme carries the whole screen with it.
 *
 * That decision has exactly one failure mode left, and the plan names it: a
 * colour that is legible on one of the seven themes and not on another.
 * Parchment `#f4ecdd` on Classic's `#f8f8f8` is that bug, and it ships the
 * moment a site is missed. So the mapping lives in one pure function with no
 * React and no React Native in it, and `__tests__/palette.test.ts` puts a
 * measured floor under every pair of it on all seven themes — the pattern
 * `utils/__tests__/symbolSets.test.js` set.
 *
 * ### The floors are constructed, not hoped for
 *
 * `ensureContrast` is the reason the test passes rather than the test being the
 * reason the colours were chosen. A derived colour that does not clear its ratio
 * against what it sits on is blended toward black or white until it does. An
 * eighth theme added to `utils/themes.js` tomorrow therefore arrives legible,
 * instead of arriving as a bug someone finds on a phone.
 *
 * ### Which theme token plays which part
 *
 * The board is drawn out of Sudoku's **own** board tokens, so Number Slide reads
 * as the same app one card away rather than as a guest with its own idea of what
 * a tile looks like: the tray is the grid's background, a tile face is a cell's
 * background, and a number on a tile is inked in the colour that theme prints a
 * given digit in. The accent — the solved board, the primary button, the code
 * chip, the record badge — is `cell.userValueText`, the colour each theme
 * already uses for *what the player put there*, and it is the one token that is
 * visibly different on all seven.
 */

/** WCAG 2.1 SC 1.4.3: body text needs 4.5:1. */
const TEXT_CONTRAST = 4.5;

/** WCAG 2.1 SC 1.4.11: meaningful non-text graphics need 3:1. */
const GRAPHIC_CONTRAST = 3;

/** Secondary text — smaller in importance, not in size. Held to the text bar. */
const MUTED_CONTRAST = 4.5;

/**
 * How much of the board the win scrim takes.
 *
 * Deliberately not opaque, and deliberately not the 0.86 it started at: the
 * solved board turning the theme's accent colour **is** the celebration, and a
 * scrim heavy enough to hide it is a scrim that throws the moment away. This is
 * the sibling app's own weight, kept.
 */
export const BACKDROP_ALPHA = 0.72;

/**
 * `color`, blended toward black or white until it clears `min` against
 * `against` — the nearest colour to the one asked for that is legible on it.
 *
 * **Both directions are searched, at each distance, and that is not
 * over-engineering.** Picking a direction from the background's luminance is the
 * obvious implementation and it is wrong twice over: a dark ink on a mid-tone
 * fill has to get *darker*, not lighter, and against a mid-tone background
 * neither endpoint is guaranteed to reach a given ratio, so the direction that
 * can succeed is not always the one a rule of thumb names. Sunrise's amber
 * accent is a live example — it caught this the first time the test ran, at
 * 3.97:1 where 4.5 was asked for.
 *
 * Terminates: weight reaches 1 in twenty steps, and the worst case returns
 * whichever endpoint got closest.
 */
export function ensureContrast(color: string, against: string, min: number): string {
  let best = color;
  let bestRatio = contrastRatio(color, against);
  if (bestRatio >= min) return color;

  for (let weight = 0.05; weight <= 1.0001; weight += 0.05) {
    for (const target of ['#000000', '#ffffff']) {
      const candidate = mix(color, target, Math.min(1, weight));
      const ratio = contrastRatio(candidate, against);
      if (ratio >= min) return candidate;
      if (ratio > bestRatio) {
        best = candidate;
        bestRatio = ratio;
      }
    }
  }
  return best;
}

/** `hex` at `alpha`, as an `rgba()` string — for the one translucent surface. */
export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface NSPalette {
  /** The page. */
  background: string;
  ink: string;
  muted: string;
  accent: string;

  /** The board. */
  tray: string;
  socket: string;
  tile: string;
  tileInk: string;
  tileBorder: string;
  litTile: string;
  litTileInk: string;

  /** Panels — the stat blocks and the toast. */
  panel: string;
  panelBorder: string;
  panelText: string;
  panelLabel: string;

  /** Controls. */
  button: string;
  buttonText: string;
  buttonPressed: string;
  link: string;
  inputBackground: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;

  /** The win overlay, drawn over the board. */
  backdrop: string;
  winInk: string;
  winMuted: string;
  winAccent: string;
  confetti: string[];
}

/**
 * The whole screen's colours for one theme.
 *
 * @param theme  an entry from `utils/themes.js`
 * @param isDark `useAppTheme`'s luminance-derived flag — used only to decide
 *   which way a surface recesses, never to branch on a theme by name.
 */
export function numberSlidePalette(theme: AppTheme, isDark: boolean): NSPalette {
  const c = theme.colors;
  const background = c.background;
  const ink = ensureContrast(c.title, background, TEXT_CONTRAST);
  const muted = ensureContrast(mix(c.title, background, 0.35), background, MUTED_CONTRAST);

  // The theme's own emphasis colour: what it prints the player's own answer in.
  // It is the only token that differs on all seven themes, which is what makes
  // cycling the theme visibly carry this screen.
  const accent = ensureContrast(c.cell.userValueText, background, GRAPHIC_CONTRAST);

  // Sudoku's board tokens, doing the same job one card away.
  const tray = mix(c.grid.background, c.grid.border, 0.12);
  const tile = c.cell.background;

  // A recess: darker on a light tray, lighter on a dark one — and then held to
  // 3:1 against a tile face, because **the gap is the one square the player has
  // to be able to find**, and an empty socket that reads as a blank tile is the
  // game being unplayable rather than merely unattractive.
  //
  // A light tray recesses toward the theme's own grid line rather than toward
  // black, so the empty square keeps the theme's hue instead of turning the same
  // neutral gray on all five light themes. A dark one has no such token to
  // borrow — a grid line on a dark theme is already light — so it lifts toward
  // white.
  const socketBase =
    relativeLuminance(tray) > 0.4 ? mix(tray, c.grid.border, 0.22) : mix(tray, '#ffffff', 0.14);
  const socket = ensureContrast(socketBase, tile, GRAPHIC_CONTRAST);

  const litTile = accent;

  // What the win card's text actually lands on: the scrim, over a board that has
  // just turned accent-coloured. Alpha compositing over an opaque board is a
  // plain blend, so this is exactly the pixel behind the badge.
  const winSurface = mix(litTile, background, BACKDROP_ALPHA);

  const panel = c.numberPad.background;
  const button = accent;

  const inputBackground = c.cell.background;
  const inputText = ensureContrast(c.title, inputBackground, TEXT_CONTRAST);

  return {
    background,
    ink,
    muted,
    accent,

    tray,
    socket,
    tile,
    tileInk: ensureContrast(c.cell.initialValueText, tile, TEXT_CONTRAST),
    tileBorder: mix(c.grid.cellBorder, tray, 0.2),
    litTile,
    litTileInk: ensureContrast(readableOn(litTile), litTile, TEXT_CONTRAST),

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
    inputBackground,
    inputBorder: c.numberPad.border,
    inputText,
    inputPlaceholder: ensureContrast(
      mix(inputText, inputBackground, 0.45),
      inputBackground,
      GRAPHIC_CONTRAST
    ),

    // The board dims under the win card rather than being covered by a panel of
    // some other colour — the page's own background, at weight.
    backdrop: withAlpha(background, BACKDROP_ALPHA),
    // **The win card's text does not sit on the background; it sits on the
    // backdrop over a board that has just turned accent-coloured**, and that
    // composite is a different colour from either. Measuring the text against
    // the page would pass a card nobody can read — on a light theme the scrim
    // lifts a dark accent board to a mid tone that the page's own ink is only
    // about 3.4:1 against. So the surface is computed and the text is held to it.
    winInk: ensureContrast(ink, winSurface, TEXT_CONTRAST),
    winMuted: ensureContrast(muted, winSurface, TEXT_CONTRAST),
    // 30pt bold: WCAG's large-text bar, not the body one.
    winAccent: ensureContrast(accent, winSurface, GRAPHIC_CONTRAST),
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

export default numberSlidePalette;
