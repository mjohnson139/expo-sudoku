/**
 * App-level identity, used by the hub.
 *
 * The app shipped as "Sudoku" when Sudoku *was* the app. It now hosts two games
 * as peers behind a hub, so the shell needs a name of its own. Step 3 put
 * "Puzzle Box" here as a placeholder; closing the epic (Step 13) is where the
 * operator adopted it as the real name — a collection brand, so neither game is
 * the app and a third one can arrive without a rename. `app.json` now agrees
 * (`expo.name`, `web.name`/`shortName`). The icon and the store listing are the
 * remaining places the name has to land, and they are follow-ups against `main`.
 *
 * `expo.slug` stays `expo-sudoku` and the iOS bundle identifier stays
 * `com.mjohnson139.sudokuapp` on purpose: those are identity for EAS and the
 * store, not for the player, and changing them orphans the project and every
 * existing install.
 */
export const APP_NAME = 'Puzzle Box';
export const APP_TAGLINE = 'Pick a puzzle';

export default { APP_NAME, APP_TAGLINE };
