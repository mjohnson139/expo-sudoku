# Cube Scramble — next-step handoff

**If you are a session picking up cube work: this file is your entry point. Read
it first, then do the step described under "Next step" below.**

It always describes **exactly one step — the next one**. It is rewritten at the
end of every step so the following session can start from a one-line prompt.

## The one-line prompt that starts a session

```
Work in mjohnson139/expo-sudoku. Continue the Cube Scramble epic: read
docs/cube-handoff.md and do the next step it describes.
```

Nothing else needs to be pasted.

## Before you finish: rewrite this file

**This is part of every step's definition of done.** Before you open your PR,
replace the "Next step" section with a brief for the step *after* yours, at the
same level of detail — scope, the files to read, the behaviors that are easy to
get wrong, what must be visible in Expo Go, and how to verify. Carry the open
questions forward.

---

## Standing context (true for every step)

- **Repo:** `mjohnson139/expo-sudoku`. App code is in **`SudokuApp/`**
  (Expo · React Native · JavaScript).
- **Source of truth:** `docs/cube-plan.md`. Read it end to end before writing
  code — model (§3), notation (§4), renderer (§5), scrambles (§6), storage (§7),
  the step table (§8), open questions (§9), and the edge cases that already bit
  someone (§10).
- **Tracker:** GitHub issue **#82**. Tick your step's checkboxes as you go.
- **Process:** `.github/dev-process.md` — one delivery step per branch, commit
  after each step, **prompt the operator to test after each step.**

### Branching

The hub the cube's tile lives on exists only on **`epic/fungiku`**, so cube work
is based there, not on `main` (plan §"Where this branches from"). Once Fungiku's
Step 13 merges that epic to `main`, rebase onto `main` and the dependency is
gone. Branch from wherever the previous cube step landed; do not start from
`main` while `games/registry.js` is still missing there.

### Golden rules

- **The cube's code lives under `games/cube/`.** Sudoku and Fungiku keep working
  exactly as they do. Outside that directory Step 1 touched three things — a
  registry entry, `describeCubeProgress` in `utils/gameProgress.js`, and adding
  `react-native-svg` — and a step that needs to touch a fourth should say why in
  its PR.
- **The model owns the rules.** Import `solvedCube` / `applyMove` / `applyMoves`
  / `cubeFromAlg` / `facelets` / `isSolved` from `games/cube/cubeState.js`, and
  `parseAlg` / `parseMove` / `moveCount` from `games/cube/moves.js`. If you find
  yourself writing a facelet permutation table anywhere, that is a bug.
- **Anything pure goes in a module the node test runner can import.** No React
  Native imports in the parts worth testing — that is why `readCubeSave` lives in
  `favorites.js` and not in `storage.js`.
- **Stay in scope.** Note what you spot for a later step rather than fixing it
  now, and say so in your PR.

### Every step must be visible in Expo Go

Hard requirement, same as Fungiku's. A step whose only evidence is a passing test
suite is not done.

### Verify before handoff (from `SudokuApp/`)

```bash
npm test                          # Jest — keep it green and extend it
npx expo-doctor                   # expect 18/18
npx expo export --platform all    # web + iOS + Android must all bundle
```

For anything visual, the web export can be driven headlessly — serve the export
directory and drive it with the pre-installed Chromium
(`/opt/pw-browsers/chromium`). Step 1 used that to check three viewport sizes for
overflow before handing over; it caught a real layout bug that a single
screenshot did not.

---

## Next step: **Step 2 — play the scramble**

Make the cube *move*. Right now it snaps from solved to scrambled with nothing in
between; the operator's stated goal is to "see each phase", and that starts with
being able to watch one move happen.

### Scope — ONLY this

1. **Animated layer turns.** `applyMove` already isolates the affected cubies;
   the renderer needs to draw them mid-turn. `buildScene` takes an optional
   in-progress move — `{ axis, layers, amount, t }` with `t` from 0 to 1 — and
   applies a partial rotation of `t * amount * -90°` about `axis` to the cubies
   in `layers` before projecting. That is the whole change to the renderer, and
   it stays exact: the cube is still convex, so the depth sort still holds.
2. **A scrubber under the cube.** Move *n* of *20*, with back/forward, and a
   play/pause that walks the whole scramble. Tapping a token in the scramble text
   jumps to it.
3. **A 2D net toggle**, beside the 3D view, like the reference's "2D Show".
   `facelets()` already returns exactly what it needs — six 9-letter faces — so
   this is a layout job, not a model job.

### Read first

- `docs/cube-plan.md` §3 (model), §5 (renderer), §8 (why this step is second)
- `games/cube/geometry.js` — `rotateQuarter`, `buildScene`
- `games/cube/cubeState.js` — `applyMove`, `facelets`
- `games/cube/CubeScreen.js` — where the scramble and the cube meet
- `docs/fungiku-plan.md` §2 "A pattern worth knowing: native-only gesture and
  animation bugs" — this repo has been bitten before, and this step is animation

### Behaviors that are easy to get wrong

- **A partial turn is not integer arithmetic.** `rotateQuarter` is exact and must
  stay that way; the animation rotates *projected* geometry by a float angle and
  never touches the model. Apply the move to the model once, at the end.
- **Which direction a turn goes.** `amount` is quarter turns clockwise *seen from
  the positive end of the axis*, so D, L and B carry 3 rather than 1. Animating
  `amount` as a raw angle will spin half the moves the wrong way; animate the
  short way round (`amount === 3` is `-90°`, not `+270°`).
- **The pan gesture and the animation.** Dragging mid-animation must not fight
  it. Simplest answer: a drag cancels playback.
- **The scrubber's state and the saved scramble.** Where you are in a scramble is
  transient. Do not persist it — plan §7 stores algorithm text only, and a
  position that outlived a relaunch would put the operator in the middle of a
  scramble they thought they had.
- **`useNativeDriver`.** The rotation drives an SVG rebuild, so it cannot use it.
  Drive `t` from an `Animated.Value` listener or `requestAnimationFrame` and keep
  the polygon count where it is — 27 faces is the budget that makes this fine.

### Out of scope for this step

Solving, CFOP/Roux phases, other puzzle sizes, random-state scrambles, entering a
cube by hand, a timer. All of those are later rows in plan §8.

### Visible in Expo Go when this lands

Open Cube Scramble, tap play, and watch the cube turn through the scramble one
move at a time; scrub back and forth; flip to the 2D net and see the same state
flattened.

### How to verify

- `npm test` — extend `geometry.test.js` for the partial-turn path: `t = 0` must
  equal the un-animated scene exactly, and `t = 1` must equal the scene of the
  cube with the move applied.
- The three commands above, all green.
- Drive the web export headlessly at 320×568, 375×667 and 420×860 and check for
  vertical overflow — the scrubber is new furniture on a screen that already fits
  exactly.

---

## Open questions for the operator (carry these forward)

These are plan §9, restated so a session does not have to go looking. None block
Step 2.

1. Scramble length — 20 moves. Leave it?
2. Other puzzles — 2×2, 4×4, pyraminx, skewb?
3. A timer — in this epic, or a separate feature?
4. Colour scheme — a setting, or is the standard one enough?
5. What a "solve" should be for Steps 5–6: the method's own logic, or the
   shortest algorithm?
6. Drag direction — currently "push the surface under your finger".

### Noted in passing, for a later step

- `utils/buildNotes.js` and `app.json` both stop at `2.8.0` (May 2025). The whole
  Fungiku epic landed without touching them. Either revive the ritual or delete
  the instruction in `.cursorrules` — plan §12.
- `CubeView` takes a `colors` prop already, so a colour-scheme setting is a
  screen-level change, not a renderer one.

---

## Steps already done

### **Step 1 — scramble, inspect, favorite** ✅

Shipped: the `cube` hub tile; `games/cube/` with the cubie model, notation
parser, random-move scrambler, SVG 3D renderer with drag-to-orbit, favorites and
persistence; 84 tests. Verified with `npm test` (539 across the app),
`expo-doctor` 18/18, `expo export --platform all`, and a headless run of the web
export through the whole flow — scramble, drag, save, new scramble, save, open
the list, load one back, return to the hub and see the Continue badge — at three
viewport sizes, with no console errors.

Decisions worth not relitigating: SVG rather than WebGL or a WebView (plan §5),
cubies rather than facelets (§3), random-move rather than random-state scrambles
(§6), and the whole set of notation up front rather than one letter at a time
(§4).
