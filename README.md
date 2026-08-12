# Puzzle Box

Five puzzles and a Rubik's cube behind one hub, built with
[Expo](https://expo.dev/) and React Native — playable on Android, iOS, and web.

The app opens on a hub. Each card is a peer, and a game you left half-finished
carries a *Continue* badge.

## What's in the box

### Sudoku

The classic 9×9. Dynamic puzzle generation via `sudoku-gen`, four difficulties,
notes, unlimited undo/redo, optional correctness feedback, time-based scoring,
and seven themes (Classic, Dark, Pastel, Sunset, Sunrise, Ocean, Twilight).

### Fungiku

A mushroom-placing logic puzzle on a board of colour regions. **One mushroom per
row, per column, and per colour — and no two touching, edges or corners.**

- **Boards from 5×5 to 10×10**, with the size set by the difficulty you pick:
  Easy 5–6, Medium 7, Hard 8–9, Expert 10.
- **Tap to rule a cell out, double-tap to place a mushroom.** Drag to sweep a
  run of ✕'s across cells.
- **Three lives.** A wrong mushroom is flagged immediately and costs one; run out
  and the board restarts as the same puzzle.
- **Earned assists.** Coins are spent on *Rule out* (1) and *Hint* (5), or on a
  *Reveal* (20) when nothing is forced. Solving boards earns them back, and a
  daily floor keeps the game winnable.
- **Motion instead of artwork**: mushrooms sprout into their cells, and the whole
  board ripples in a wave when you solve it.

The design, the rules, and the reasoning behind both are in
[`docs/fungiku-plan.md`](docs/fungiku-plan.md); the epic's twelve-step history is
in [`docs/fungiku-handoff.md`](docs/fungiku-handoff.md).

### Cube Scramble

Not a puzzle the app sets you — a tool for the 3×3 in your hands.

- **A fresh 20-move scramble** in standard notation, every visit.
- **The cube in 3D, already scrambled.** Drag it to turn it and read any face;
  *Other side* jumps to the three you cannot see.
- **Favorites.** Keep a scramble and load it back onto the cube later. What you
  saved, and the scramble you were looking at, survive closing the app.

Rendered as SVG rather than WebGL: a cube is 54 flat quads on a convex solid, so
painter's algorithm is exact, and `react-native-svg` runs the same code on all
three platforms. The cube itself is modelled as 26 cubies carrying positions and
outward normals — a move rotates both by one quarter turn, so there are no
facelet permutation tables to be quietly wrong.

Where this is going — stepping through a scramble, then through a **solve** in
CFOP or Roux — is in [`docs/cube-plan.md`](docs/cube-plan.md), with the next step
always described in [`docs/cube-handoff.md`](docs/cube-handoff.md).

### Number Slide

The sliding-tile classic — and the first of two games arriving from the
sibling `color-loop` app.

- **Three sizes, one tap apart.** 3×3, 4×4 and 5×5; the board keeps the same
  footprint as the grid grows.
- **Tap or swipe toward the gap.** A tap slides a whole line of tiles at once;
  a swipe moves the one tile beside the gap.
- **Your board is kept as you play it.** Leave for the hub or close the app and
  the tiles, the move count and the clock are where you left them — and the card
  carries a *Continue* badge like every other game.
- **A shareable puzzle code.** Every board is a pure function of its seed, so
  the chip *is* the puzzle — copy one, send it, and race the same board on
  someone else's phone. The code carries the size (`4-K7P2Q` is a 4×4), and a
  bare five-character code still means the 3×3 it always did.
- **It wears whichever theme you picked.** There is no colour of its own
  anywhere on the screen: the tray, the tiles, the numbers and the accent all
  come from the theme, so cycling it carries the whole game with it.

### Color Loop

Drag any row or column and it wraps around the edge — the second game arriving
from the sibling `color-loop` app, and a *manipulation* puzzle rather than a
deduction one.

- **Three goals.** Make every row one solid colour, match each row to the colour
  key beside the board, or make every diagonal one colour — either direction
  counts.
- **The board follows your finger.** A line slides with the drag, wraps around
  the edge, and clicks into its slot; flick it and it coasts. A grab near a seam
  takes both neighbours at once.
- **Boards from 3×3 to 6×6.** Diagonal stops at 4×4, because a diagonal board
  needs 2n−1 colours and the palette holds seven.
- **A shareable puzzle code.** Every board is a pure function of its code, so
  `4-K7P2Q` *is* the puzzle on anyone's phone. `-O` and `-D` name the other two
  goals.
- **Training and Match.** An eighteen-rung ladder with three stars a rung, and
  preset gauntlets — Sprint, Classic, Marathon — where one code deals everybody
  the same run of boards and the result card carries the code back out.
- **The tiles are the app's own palette.** The seven hues are the Okabe–Ito set
  Fungiku's swatches use, each with its own glyph so colour is never the only
  thing telling two tiles apart. Everything around them follows your theme.

The merge that brings both games across is planned in
[`docs/colorloop-merge-plan.md`](docs/colorloop-merge-plan.md), with the next
step always described in
[`docs/colorloop-merge-handoff.md`](docs/colorloop-merge-handoff.md).

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 recommended)
- [Yarn](https://yarnpkg.com/) or [npm](https://www.npmjs.com/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/):
  ```bash
  npm install -g expo-cli
  ```

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/mjohnson139/expo-sudoku.git
   cd expo-sudoku/SudokuApp
   ```
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

### Running the App

Use the custom start script for consistent port usage and process management:

```bash
./start-app.sh
```

Or use Expo directly:

```bash
expo start
```

Scan the QR code with Expo Go (iOS/Android) or run on a simulator/emulator.

### Checks

From `SudokuApp/`:

```bash
npm test                          # Jest
npm run typecheck                 # tsc --noEmit — the TypeScript games
npx expo-doctor                   # expect 18/18
npx expo export --platform all    # web + iOS + Android must all bundle
```

## Development Workflow

- Update build notes in `/SudokuApp/utils/buildNotes.js` for each release.
- Use feature branches and reference build numbers in commit messages.
- See `.github/copilot-instructions.md` for detailed workflow and best practices.
- EAS Update is used for CI/CD and over-the-air updates (see `.github/workflows/eas-publish.yml`).

## Folder Structure

- `SudokuApp/` – Main app source code
  - `components/` – Shared and Sudoku UI components (Grid, Cell, NumberPad, …)
  - `games/fungiku/` – Fungiku: engine, reducer, board, menus, wallet
  - `games/cube/` – Cube Scramble: cube model, notation, scrambler, 3D renderer
  - `games/numberslide/` – Number Slide: slide logic, seed codes, theme palette
  - `games/colorloop/` – Color Loop: the frozen puzzle engine and its codes, the
    board's physics, the training ladder, the match presets, theme palette
  - `screens/` – The hub and each game's screen
  - `utils/` – Theme system, board generation, symbol sets, app identity, the
    motion vocabulary, and the three `.d.ts` files that describe the parts of
    this app's JavaScript TypeScript cannot infer correctly
  - `assets/` – App icons and images
- `docs/` – Each epic's plan and its next-step handoff

## Credits

- Built with [Expo](https://expo.dev/) and [React Native](https://reactnative.dev/)
- Sudoku puzzles generated by [`sudoku-gen`](https://www.npmjs.com/package/sudoku-gen)
- Fungiku's boards are generated by the app's own seeded engine
  (`SudokuApp/games/fungiku/engine.js`)
- Cube Scramble's model, scrambler and renderer are the app's own
  (`SudokuApp/games/cube/`); the reference for the screen is
  [scramble.cubing.net](https://scramble.cubing.net/)
- Number Slide and Color Loop come from the sibling
  [`mjohnson139/color-loop`](https://github.com/mjohnson139/color-loop) app, with
  their boards seeded by `mulberry32` (`SudokuApp/utils/rng.ts`)
- Color Loop's tile hues are the Okabe–Ito colorblind-safe palette
  (`SudokuApp/utils/symbolSets.js`), shared with Fungiku
