import { useEffect, useState } from 'react';
import SUDOKU_THEMES from '../utils/themes';
import { readSavedThemeName } from '../utils/storage';

export const DEFAULT_THEME_NAME = 'classic';

/**
 * Theme for screens that live outside Sudoku's GameContext — the hub and
 * Fungiku. It follows whatever theme the player last picked in Sudoku, so the
 * shell doesn't snap back to the default palette when they leave the board.
 *
 * Sudoku keeps using its own themed context; this hook is for everything else.
 * A single app-level theme owned by the shell is the eventual home for this —
 * worth doing when Fungiku has real UI to theme.
 *
 * @returns {Object} a theme object from utils/themes.
 */
const useAppTheme = () => {
  const [themeName, setThemeName] = useState(DEFAULT_THEME_NAME);

  useEffect(() => {
    let cancelled = false;

    readSavedThemeName().then((saved) => {
      if (!cancelled && saved && SUDOKU_THEMES[saved]) {
        setThemeName(saved);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return SUDOKU_THEMES[themeName] || SUDOKU_THEMES[DEFAULT_THEME_NAME];
};

export default useAppTheme;
