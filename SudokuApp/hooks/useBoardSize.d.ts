/**
 * Types for `hooks/useBoardSize.js` — see `utils/themes.d.ts` for why these
 * shims exist and what keeps them honest.
 *
 * `{ fill: true }` is the variant that knows about the 600pt centred web
 * container. Number Slide's own `useWindowDimensions` math did not, which is
 * why the board and the header would otherwise disagree about where the middle
 * of the page is on web (plan §10).
 */
declare function useBoardSize(options?: { fill?: boolean }): number;

export default useBoardSize;
