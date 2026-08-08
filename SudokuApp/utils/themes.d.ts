/**
 * Types for `utils/themes.js`.
 *
 * ### Why this file exists
 *
 * The incoming games are TypeScript and this app is JavaScript
 * (docs/colorloop-merge-plan.md §4.1). `allowJs` is deliberately **off**, so
 * that the existing JavaScript is not suddenly under a type checker nobody
 * asked for — and with it off, TypeScript cannot resolve a `.js` module at all.
 * A hand-written `.d.ts` beside each JS module the games import is what bridges
 * that, and it is a better bridge than `allowJs` would be: **the platform seam
 * is written down.** The five shims in this repo are exactly the platform
 * contract the plan's §3 table names, in types.
 *
 * ### And how they are kept honest
 *
 * A `.d.ts` is trusted absolutely — TypeScript never opens the `.js` beside it,
 * so a rename on the JavaScript side would go unnoticed. `utils/__tests__/
 * typeShims.test.js` is the floor under that: it reads every shim, pulls the
 * names out, and requires the real module to still export them.
 */

/** One palette entry from `SUDOKU_THEMES`. */
export interface AppTheme {
  name: string;
  colors: {
    background: string;
    title: string;
    grid: {
      background: string;
      border: string;
      boxBorder: string;
      cellBorder: string;
      innerBorder: string;
    };
    cell: {
      background: string;
      prefilled: string;
      selectedBackground: string;
      initialValueText: string;
      userValueText: string;
      correctValueText: string;
      incorrectValueText: string;
      incorrectBackground: string;
      textFont: string;
      hoverBackground: string;
      touchedBackground: string;
      relatedBackground: string;
      boxRelatedBackground: string;
      rowRelatedBackground: string;
      columnRelatedBackground: string;
      sameValueBackground: string;
      initialCellBackground: string;
      notesText: string;
    };
    numberPad: {
      background: string;
      border: string;
      text: string;
      shadow: string;
      clearButton: string;
      notesBackground: string;
    };
    badge: {
      background: string;
      text: string;
    };
    difficulty: {
      easy: string;
      medium: string;
      hard: string;
      expert: string;
    };
  };
}

export declare const SUDOKU_THEMES: Record<string, AppTheme>;

declare const _default: Record<string, AppTheme>;
export default _default;
