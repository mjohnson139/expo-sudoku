/**
 * App-level identity, used by the hub.
 *
 * The app shipped as "Sudoku" when Sudoku *was* the app. It now hosts two games
 * as peers behind a hub, so the shell needs a name of its own. Naming is an open
 * branding decision (docs/fungiku-plan.md §8 #2), so these are deliberate
 * placeholders: change them here and the hub follows. `app.json`'s `expo.name`,
 * the icon and the store listing are the other places a final name has to land.
 */
export const APP_NAME = 'Puzzle Box';
export const APP_TAGLINE = 'Pick a puzzle';

export default { APP_NAME, APP_TAGLINE };
