import type { AppTheme } from '../utils/themes';

/**
 * Types for `hooks/useAppTheme.js` — see `utils/themes.d.ts` for why the three
 * surviving shims exist and what keeps them honest.
 *
 * **This one is load-bearing**, and for a reason worth knowing before writing
 * JSDoc anywhere else in this repo: the hook's own `@returns {{theme: Object,
 * …}}` is *believed*. TypeScript reads JSDoc in JavaScript files even with
 * `checkJs` off, so an annotation that says `Object` is worse than no
 * annotation at all — it replaces a correctly inferred theme with a type that
 * has no properties.
 *
 * `isDark` is derived from the background's luminance rather than from a list
 * of theme names, so a new theme classifies itself. New games **read** this and
 * must never write the theme: Sudoku is the one writer (plan §10).
 */
export declare const DEFAULT_THEME_NAME: string;

declare function useAppTheme(): { theme: AppTheme; themeName: string; isDark: boolean };

export default useAppTheme;
