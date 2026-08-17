import GameScreen from '../screens/GameScreen';
import FungikuScreen from './fungiku/FungikuScreen';
import CubeScreen from './cube/CubeScreen';
import { readSudokuProgress } from '../utils/storage';
import { readFungikuProgress } from './fungiku/storage';
import { readCubeProgress } from './cube/storage';

/**
 * The game registry — the single list of games the hub knows about
 * (docs/fungiku-plan.md §6).
 *
 * Adding a game is an entry here, not a UI edit: the hub renders its cards from
 * this list and `App.js` routes to `Screen` by `id`.
 *
 * Each entry:
 *   id           route id, also the storage namespace for that game
 *   title        name on the card and in the game's header
 *   tagline      one line describing the game to someone who has never played it
 *   icon         MaterialCommunityIcons name
 *   accent       color used for the card's icon tile
 *   Screen       component rendered for the route; receives { onExitToHub }
 *   readProgress optional `async () => ({ label, detail }) | null` for the card's
 *                Continue affordance. Null/absent means "no resumable state".
 *   keepsStateOnResume
 *                optional. `App.js` remounts the open game on `AppState →
 *                'active'` so it re-reads its saved snapshot; set this when a
 *                game holds its own state above its screens and does not want
 *                that. See `App.js` for what the remount costs a game with a
 *                navigator inside it.
 *
 * Sudoku's files intentionally stay where they are for now — the entry points at
 * the existing `screens/GameScreen`. Relocating it under `games/sudoku/` to match
 * the convention is deferred.
 */
export const HUB_ROUTE = 'hub';

export const GAMES = [
  {
    id: 'sudoku',
    title: 'Sudoku',
    tagline: 'Fill the 9×9 grid — every row, column and box holds 1–9.',
    icon: 'grid',
    accent: '#4a648c',
    Screen: GameScreen,
    readProgress: readSudokuProgress,
  },
  {
    id: 'fungiku',
    title: 'Fungiku',
    tagline: 'One mushroom per row, column and color — none touching.',
    icon: 'mushroom',
    accent: '#a0522d',
    Screen: FungikuScreen,
    readProgress: readFungikuProgress,
  },
  {
    // Not a puzzle the app sets you — a tool for the puzzle in your hands.
    // It lives in the same list because the hub is the app's front door and a
    // second front door for one tile would be a worse app (docs/cube-plan.md §2).
    id: 'cube',
    title: 'Cube Scramble',
    tagline: 'Scramble a 3×3 and turn it in 3D to inspect every face.',
    icon: 'cube-outline',
    accent: '#c62828',
    Screen: CubeScreen,
    readProgress: readCubeProgress,
    // `CubeContext` owns everything persisted, above both of the cube's screens,
    // and flushes it when the app leaves — so on resume the state in memory is
    // the truth and re-reading the file would only replace it with an older
    // copy. What the remount *also* did was tear down the cube's nested
    // navigator, which is why it had to go; `App.js` has the whole story.
    keepsStateOnResume: true,
  },
];

/**
 * Look up a game by route id.
 * @returns {Object|null} the registry entry, or null for an unknown id.
 */
export const getGame = (id) => GAMES.find((game) => game.id === id) || null;

export default GAMES;
