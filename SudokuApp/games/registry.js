import GameScreen from '../screens/GameScreen';
import FungikuScreen from './fungiku/FungikuScreen';
import CubeScreen from './cube/CubeScreen';
import NumberSlideScreen from './numberslide/NumberSlideScreen';
import ColorLoopScreen from './colorloop/ColorLoopScreen';
import { readSudokuProgress } from '../utils/storage';
import { readFungikuProgress } from './fungiku/storage';
import { readCubeProgress } from './cube/storage';
import { readNumberSlideProgress } from './numberslide/storage';
import { readColorLoopProgress } from './colorloop/storage';

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
  },
  {
    // The first of the two games arriving from the sibling color-loop app
    // (docs/colorloop-merge-plan.md, Step 1). A *manipulation* puzzle rather
    // than a deduction one — the board moves under your finger and the
    // challenge is planning motion, which is a shape the box did not have.
    //
    // It carries a Continue badge like every other card: the board is written on
    // every move and restored on the way back in, so leaving for the hub costs
    // the player nothing. That was Step 3's work, pulled forward on the
    // operator's ask — a guest game that quietly loses your board is not
    // behaving like the rest of the box (plan §4.6).
    id: 'numberslide',
    title: 'Number Slide',
    tagline: 'Slide the tiles back into order around the one gap — 3×3 to 5×5.',
    icon: 'view-grid-outline',
    // The one place a game is allowed its own hue. Brass does not survive the
    // merge as a colour, but it survives as an idea (plan §4.2) — this is the
    // amber the standalone app's hardware was, held at arm's length from
    // Fungiku's `#a0522d` and the cube's `#c62828`.
    accent: '#b07f26',
    Screen: NumberSlideScreen,
    readProgress: readNumberSlideProgress,
  },
  {
    // The second of the two games arriving from the sibling color-loop app, and
    // the one the epic is named after (docs/colorloop-merge-plan.md, Step 2).
    // Drag any row or column and it wraps around the edge until every row is one
    // solid colour — the other *manipulation* puzzle, where the challenge is
    // planning motion rather than deducing a placement.
    //
    // It carries a Continue badge like every other card (Step 3, plan §4.6):
    // the board is written on every move and restored on the way back in, so
    // leaving for the hub costs the player nothing. The badge names which offer
    // it is — `4×4 in order · 01:24`, `Level 9 · 00:41` or `Sprint · 2/3 ·
    // 01:07` — because free play, a training rung and a match leg are three
    // different things to come back to and the card has one line for all three.
    id: 'colorloop',
    title: 'Color Loop',
    tagline: 'Drag a row or column — it wraps — until every row is one colour.',
    icon: 'palette-swatch',
    // The one place a game is allowed its own hue, and it comes from the source
    // of colour truth rather than from beside it: Okabe–Ito's green, which is
    // the palette entry furthest from Sudoku's blue, Fungiku's sienna, the
    // cube's red and Number Slide's amber (plan §4.2).
    accent: '#009E73',
    Screen: ColorLoopScreen,
    readProgress: readColorLoopProgress,
  },
];

/**
 * Look up a game by route id.
 * @returns {Object|null} the registry entry, or null for an unknown id.
 */
export const getGame = (id) => GAMES.find((game) => game.id === id) || null;

export default GAMES;
