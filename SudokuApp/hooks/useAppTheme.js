import { useEffect, useMemo, useState } from 'react';
import SUDOKU_THEMES from '../utils/themes';
import { loadAppThemeName } from '../utils/appTheme';
import { relativeLuminance } from '../utils/color';

export const DEFAULT_THEME_NAME = 'classic';

/**
 * Theme for screens the shell owns — the hub and Fungiku.
 *
 * Reads the app-level preference (utils/appTheme.js). Sudoku renders from its own
 * reducer state and writes through to that key when the player cycles the theme,
 * so one choice drives the whole app without the shell reaching into Sudoku's
 * saved game the way it did in Step 3.
 *
 * @returns {{theme: Object, themeName: string, isDark: boolean}} `isDark` is
 *   derived from the background's luminance, not a list of theme names, so a new
 *   theme in utils/themes.js classifies itself.
 */
const useAppTheme = () => {
  const [themeName, setThemeName] = useState(DEFAULT_THEME_NAME);

  useEffect(() => {
    let cancelled = false;

    loadAppThemeName().then((saved) => {
      if (!cancelled && saved && SUDOKU_THEMES[saved]) {
        setThemeName(saved);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    const theme = SUDOKU_THEMES[themeName] || SUDOKU_THEMES[DEFAULT_THEME_NAME];
    return {
      theme,
      themeName,
      isDark: relativeLuminance(theme.colors.background) < 0.4,
    };
  }, [themeName]);
};

export default useAppTheme;
