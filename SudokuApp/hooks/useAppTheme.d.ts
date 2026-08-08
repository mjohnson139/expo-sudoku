import type { AppTheme } from '../utils/themes';

/**
 * Types for `hooks/useAppTheme.js` — see `utils/themes.d.ts` for why these
 * shims exist and what keeps them honest.
 *
 * `isDark` is derived from the background's luminance rather than from a list
 * of theme names, so a new theme classifies itself. New games **read** this and
 * must never write the theme: Sudoku is the one writer (plan §10).
 */
export declare const DEFAULT_THEME_NAME: string;

declare function useAppTheme(): { theme: AppTheme; themeName: string; isDark: boolean };

export default useAppTheme;
