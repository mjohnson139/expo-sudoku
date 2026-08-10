/**
 * Types for `utils/themes.js`.
 *
 * ### Why this file exists, and why there are only three of these
 *
 * The incoming games are TypeScript and this app is JavaScript
 * (docs/colorloop-merge-plan.md §4.1). `allowJs` is **on** so TypeScript can
 * read the JavaScript and infer types from it, and `checkJs` is **off** so the
 * existing JavaScript is not suddenly under a type checker nobody asked for.
 * Inference covers most of the platform seam for free — `utils/color.js`,
 * `utils/gameProgress.js` and `hooks/useBoardSize.js` all needed a hand-written
 * declaration once and no longer do.
 *
 * **A `.d.ts` survives only where inference gets the JavaScript wrong**, and
 * this is one of the three:
 *
 * - **here**, because `SUDOKU_THEMES` infers as an object literal with seven
 *   named keys and no index signature, so `SUDOKU_THEMES[name]` for a variable
 *   `name` is an error;
 * - **`components/ScreenHeader.d.ts`**, because its props are destructured with
 *   only `dense` carrying a default, so inference makes `subtitle` and
 *   `onMenuPress` *required* — which is not that component's API;
 * - **`hooks/useAppTheme.d.ts`**, because its JSDoc says `@returns {{theme:
 *   Object, …}}` and TypeScript believes JSDoc, so the theme arrives as the
 *   useless `Object`.
 *
 * Each of them is therefore a place the JavaScript does not say what it means,
 * written down. That is worth having; six of them, three of which merely
 * repeated what inference already knew, was not.
 *
 * ### And how they are kept honest
 *
 * A `.d.ts` shadows the `.js` beside it absolutely — TypeScript never opens the
 * JavaScript once a declaration exists, so a rename on that side would go
 * unnoticed. `utils/__tests__/typeShims.test.js` is the floor under that: it
 * reads every shim, pulls the names out, and requires the real module to still
 * export them. **Add to its list whenever a shim is added, and prefer deleting
 * a shim to adding one.**
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
