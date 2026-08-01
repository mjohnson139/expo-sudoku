# Cube Scramble — Feature Plan

**A 3×3 Rubik's cube you can scramble, keep, and turn over in your hands.** The
first step ships a random scramble, a cube rendered in 3D that you drag to
inspect from any angle, and a favorites list. The epic it opens is a *cube
workbench*: step through a scramble move by move, then step through a **solve**
— CFOP, Roux, and whatever else the operator wants to teach — with the cube
showing what each phase does.

The reference the operator gave is **<https://scramble.cubing.net/>**: a
scramble, a draggable 3D cube, and nothing else on the page. That restraint is
the target. This is a tool, not a game — nothing here is scored, timed, or won.

**The cube is 3D, and only 3D** (operator, 2026-08-01). The reference also has a
flat "2D Show" net, and Step 2 was briefly planned to copy it. It was cut before
any of it was built: a net is a *second* way to read the same state, and two
views of one cube means every later feature — a highlighted F2L pair, a phase
label, an animating turn — has to be designed twice or look wrong in one of them.
`facelets()` still returns the six flat faces, so nothing about the model
forecloses it if that judgement ever changes.

## For the implementer (start here)

- **Repo:** `mjohnson139/expo-sudoku`. The app code is in the `SudokuApp/`
  subdirectory (Expo · React Native · JavaScript).
- **This document is the source of truth** for scope and approach.
- **Start here if you are a new session:** **`docs/cube-handoff.md`** always
  describes *the next step only*, so a session can start from a one-line prompt.
  **Rewriting it for the following step is part of every step's definition of
  done** — the same discipline Fungiku runs on.
- **Tracker:** GitHub issue **#82**. Tick your step's checkboxes as you go.
- **Process:** follow `.github/dev-process.md` — one delivery step per branch,
  commit after each step, and **prompt the operator to test after each step.**
- **Nothing here touches Sudoku or Fungiku.** The cube's code lives entirely
  under `SudokuApp/games/cube/`. Outside that directory, Step 1 added exactly
  three things: a registry entry, a `describeCubeProgress` in
  `utils/gameProgress.js`, and `react-native-svg` in `package.json`.

### Branching

The cube lands on its own epic branch, like Fungiku did. Every step PR targets
**`epic/cube`**, and the epic merges to `main` once the cube is worth shipping:

```
main ─── epic/cube ─── feature/cube-<step>   (PRs target epic/cube)
```

`epic/cube` is cut from **`main`**, which is where it belongs and where it now
sits. It briefly was not: the hub the cube's tile lives on was built inside the
Fungiku epic, so until that epic merged there was no `games/registry.js` on
`main` to add a tile to, and `epic/cube` was cut from `epic/fungiku` instead.
Fungiku's Step 13 closed that epic on 2026-08-01 and `epic/cube` was rebased onto
`main` the same day. **There is no Fungiku dependency any more** — this is
recorded only so that a reader of the early history is not confused by it.

Pushing to `epic/cube` publishes an EAS Update branch of the same name
(`.github/workflows/eas-publish.yml`), so the epic stays openable in Expo Go
between step PRs — a step PR also gets its own throwaway `pr-<N>` preview with a
QR code in the PR comments.

## 1. What the first step delivers

Everything the operator asked for, and nothing past it:

- **Get a scramble.** 20 random moves, standard notation, shown in a monospaced
  block above the cube. "New scramble" replaces it.
- **Inspect the cube.** The scramble is applied to a solved cube and drawn in 3D.
  Drag it in any direction to see any face. "Other side" is a shortcut to the
  three faces you cannot currently see; "Reset view" goes back to U-F-R.
- **Save it to a favorites list.** The star keeps the scramble on screen; the
  Favorites button opens the list, where a row loads that scramble back onto the
  cube and the bin removes it. Both the current scramble and the list survive
  leaving the app.

## 2. Where it lives in the app

A third card on the hub, from the same registry every other game comes from
(`SudokuApp/games/registry.js`):

```
id 'cube' · "Cube Scramble" · cube-outline · #c62828 · CubeScreen · readCubeProgress
```

It is deliberately a peer of the two puzzles rather than a section inside one, or
a second front door. The hub is the app's front door; a tool that lives anywhere
else is a tool nobody finds. The Continue badge reads `20 moves · 3 favorites`,
which is what "come back to this" means for a scramble.

### The screen does not scroll

The cube claims every pan gesture inside its square, because turning it is the
whole interaction. A `ScrollView` around it would put "turn the cube" and
"scroll the page" in competition for the same drag — the exact race this repo
already lost once on Fungiku's board (`docs/fungiku-plan.md` §2). So the page is
a fixed column, the cube is sized from its measured stage rather than from a
share of the window, and the one list in the feature lives in a modal.

## 3. The cube model — cubies, not facelets

`games/cube/cubeState.js`.

The obvious model is a 54-character facelet string plus a permutation table per
move. It is compact, and it is also six hand-written 20-element index tables that
are wrong in ways no reviewer can see.

This model instead stores the **26 moving pieces as positions and outward
normals**, in a right-handed integer lattice with `+x → R`, `+y → U`, `+z → F`:

```js
{ pos: [1, 1, 0], stickers: [{ normal: [1, 0, 0], face: 'R' },
                             { normal: [0, 1, 0], face: 'U' }] }
```

A move rotates both `pos` and each `normal` by the same quarter turn. There are
no tables to get wrong: correctness reduces to one 3×3 rotation, which
`geometry.rotateQuarter` owns and the tests pin down. Everything stays exactly
integral for the life of a cube — a quarter turn maps axis vectors to axis
vectors — which is what makes `isSolved` an exact comparison rather than an
epsilon test.

Two more things fall out of it for free, and they are why the model was chosen:

- **The renderer wants exactly this.** A cubie already knows where it is and
  which way each sticker faces; `buildScene` reads it directly.
- **Animated layer turns are a partial rotation of a subset of cubies**, not a
  new representation. That is Step 2, and it needs nothing added here.

`facelets()` and `faceletString()` project the model back onto the standard
Singmaster/Kociemba reading order, which is what the tests compare and what an
external solver would want.

### The colour scheme

The standard (WCA) one: **white up, green front, red right** — what every
tutorial, every solve method and every physical speedcube assumes. The hexes are
the familiar Rubik's-brand values rather than the app's palette, because this is
a picture of an object the operator owns, not a themed surface. A colour-scheme
setting is a plausible later step; it is a prop on `CubeView` already.

## 4. Notation

`games/cube/moves.js`. A move is `{ token, axis, layers, amount }` — which axis
it spins, which layers come with it, and how many quarter turns clockwise as seen
from the positive end of that axis. Face turns, slices, wides and rotations
differ only in `layers`, which is why the full set costs nothing:

| | |
|---|---|
| Faces | `U D L R F B`, with `'` and `2` |
| Slices | `M` (follows L) · `E` (follows D) · `S` (follows F) |
| Wides | `Uw`…`Bw`, and the lowercase spellings `u d l r f b` |
| Rotations | `x` (follows R) · `y` (follows U) · `z` (follows F) |

A scramble only ever uses the six face turns. The rest is here from the start
because **solve methods are the point of this epic** and both CFOP and Roux speak
in slices, wides and rotations — growing the parser one letter at a time as each
method lands is how a notation bug gets shipped inside a tutorial.

Spaces are optional (`R U R' U'` and `RUR'U'` both parse). Curly apostrophes
parse, because phone keyboards produce them. **Anything unrecognized fails the
whole string** rather than being skipped: a scramble that silently dropped a move
would show a cube that is not the cube in the operator's hands, which is the one
thing this screen must never do.

## 5. The renderer — SVG, and why not WebGL

`games/cube/geometry.js` builds the frame; `games/cube/CubeView.js` draws it.

A cube is 54 flat quads on a convex solid. Only outward faces exist, and
back-facing ones are culled, so **painter's algorithm is exact here, not an
approximation** — no two remaining polygons can overlap in a way that centroid
depth gets wrong. That makes a plain SVG renderer sufficient:

1. Rotate the model by yaw then pitch (the camera never moves).
2. Cull faces pointing away from the camera — against the vector from the face to
   the camera, not against the view axis, or a sliver of edge-on faces shows
   through near the silhouette.
3. Shade each face by its normal against a light fixed to the *screen*, so the
   face pointing up is always the bright one however you spin it.
4. Sort by depth, project, emit plastic-then-tile for each face.

The scale is fitted to the cube's **bounding sphere**, not to its own eight
corners. A corner fit would be tighter at some angles and clip at others, and the
cube would visibly breathe as it spun.

`react-native-svg` is in Expo Go, ships the same code path on iOS, Android and
web, and needs no bridge, no HTML string and no bundled megabyte of three.js.

**The alternatives, and why not (yet):**

- **`expo-gl` + three.js** would give real lighting, bevels and reflections. It
  would also give a second rendering stack to keep working across Expo upgrades,
  for a shape with at most 27 visible faces. Worth revisiting *if* bevels or
  reflections become the point — not before.
- **A WebView running `cubing.js`'s `<twisty-player>`** is the reference site's
  own stack and would be the fastest way to something polished. It costs a
  WebView on native (and an `iframe` shim on web, since `react-native-webview`
  has no web implementation), a bundled copy of the library, and a `postMessage`
  boundary between the app's state and the cube's. It also puts the cube's
  behaviour outside anything this repo can unit-test. Reconsider if the epic ever
  needs something cubing.js has and this does not — 4×4+, non-cubic puzzles, or
  WCA-legal random-state scrambles it would bring along for free.

## 6. Scrambles

`games/cube/scramble.js`. These are **random-move** scrambles, not the
random-state scrambles a WCA competition uses, and the difference is worth
stating plainly rather than glossing:

- A **random-state** scramble picks a cube position uniformly at random and finds
  a short algorithm to it. It needs a two-phase (Kociemba) solver and a few
  megabytes of pruning tables.
- A **random-move** scramble picks legal moves at random. It is what nearly every
  phone timer ships, it is indistinguishable to a solver, and it is **not
  competition-legal**.

Two rules keep the walk from producing obvious redundancy: never the same face
twice running, and never `X Y X` where `Y` is `X`'s opposite. The generator picks
from the *allowed* faces rather than drawing and retrying — same distribution,
but it terminates by construction instead of depending on the quality of its
randomness.

Upgrading to random-state is its own step (§8), and it is the same work that
gives the epic a solver.

## 7. Favorites and persistence

One AsyncStorage key, `@CubeScramble`, holding both the scramble on screen and
the list. They change together — saving a favorite is a tap on the scramble
already showing — and splitting them would buy two round trips and a way for the
two to disagree.

**Only the algorithm text is stored, never the cube.** The cube is a pure
function of the algorithm; storing it would be a second, staler copy of derived
data that breaks the moment the model changes shape.

**A favorite is identified by its algorithm, not by a generated id.** Two saves of
the same scramble are the same favorite, which is what a player means, and it
makes "is this one saved?" a lookup rather than a search through timestamps.

The shape rules (`readCubeSave`, `sanitizeFavorites`) live in `favorites.js`
rather than `storage.js`, because `storage.js` imports AsyncStorage and the test
runner is a plain node environment. Storage is the boundary where a file written
by an older build comes back in, so the list is filtered on the way out of it
rather than trusted — a favorite that no longer parses would otherwise take the
screen down when it was tapped.

## 8. Delivery steps

One branch per step, per `.github/dev-process.md`. Every step must ship something
the operator can open in Expo Go.

| Step | What lands | State |
|---|---|---|
| **1** | Scramble · 3D cube you can drag · favorites · hub tile | **shipped** |
| **2** | **Play the scramble.** Animated layer turns and a move-by-move scrubber | next |
| **3** | **Enter a cube.** Paste or type a scramble, and/or set the colours by hand, so the cube on screen is the cube on the table | |
| **4** | **Solve it.** A two-phase solver in JS; play the solution back on the cube | |
| **5** | **CFOP.** The solve split into cross / F2L / OLL / PLL, each phase named, its pieces highlighted, steppable | |
| **6** | **Roux.** The same treatment for blocks / CMLL / LSE | |
| **7** | **Random-state scrambles**, once the solver from Step 4 exists — WCA-legal, and the natural place to add other events | |

Steps 5 and 6 are the operator's actual goal ("visualizing how to solve them in
different methods"). Steps 2–4 are what they stand on: you cannot show a phase
until you can animate a turn, cannot animate a solve until you can compute one,
and cannot compute one for the cube in someone's hands until they can enter it.

**Step 7 is deliberately last, not first.** Random-state scrambles need the same
search Step 4 needs; doing it once, for the solver, gets both.

## 9. Open questions for the operator

1. **Scramble length.** 20 moves, matching what a WCA 3×3 scramble comes out at.
   Longer is not harder; shorter starts leaving structure in. Leave it?
2. **Other puzzles.** 2×2, 4×4, pyraminx, skewb? The cubie model generalizes to
   any *n*×*n* almost for free; the non-cubic puzzles do not, and would be the
   argument for adopting cubing.js wholesale.
3. **A timer.** The reference links out to `timer.cubing.net` rather than
   building one. Is a timer in scope for this epic, or is it a different feature?
4. **Colour scheme.** Fixed to the standard one now. Worth a setting, or is
   "the scheme on your cube" close enough to universal?
5. **Where a solve comes from.** Step 4's solver finds *a* short solution, which
   is not how a human solves. For Steps 5–6 the phases are the point, so the
   method's own logic (cross first, then pairs) matters more than move count —
   worth confirming that is the intent before building a solver optimized for
   the wrong thing.
6. **Left-handed drag.** The current mapping is "push the surface under your
   finger". Nobody has complained yet because nobody has used it yet.

## 10. Edge cases and things that are easy to get wrong

- **`-0`.** Negating a zero coordinate produces `-0`, which compares equal to `0`
  everywhere the model currently looks but *not* under `Object.is` or in a `Set`
  of tuples. Positions get joined into strings to key both a facelet lookup and
  the renderer's polygons. `geometry.negate` keeps it out; leave it there.
- **The reading order of D and B.** U is read with B at the top of the page, D
  with F at the top; B's columns run right to left. Getting one backwards
  produces a model that passes every "order of this algorithm" test — those are
  satisfied by a self-consistently wrong cube. That is why
  `cubeState.test.js` pins the facelet strings for `R`, `U` and `M` against the
  published values.
- **Stale closures in the pan responder.** `PanResponder.create` runs once, so a
  handler that closes over `yaw`/`pitch` freezes the opening angle into every
  drag. `CubeView` keeps them in a ref that is updated on each render.
- **Pitch past the pole.** Clamped just short of ±90°, or the cube rolls over and
  the drag direction inverts, which reads as the cube fighting you.
- **Sizing from the window.** A cube sized as a share of the window looked right
  on a 6" phone and pushed its own caption through the buttons on a 4" one,
  because the space left over depends on how many lines the header and scramble
  took. The stage measures itself.

## 11. Prior art and licensing

- **`cubing.js`** (<https://github.com/cubing/cubing.js>) is what
  `scramble.cubing.net` is built on — `randomScrambleForEvent` and the
  `<twisty-player>` element. Dual GPL/MPL; as a library it can be treated as
  MPL, which is file-level copyleft and fine to depend on. It is browser-first
  (Web Workers, WASM), so using it means the WebView route in §5.
- **Kociemba's two-phase algorithm** is the standard basis for Step 4's solver.
  There are permissively licensed JS ports; check the licence of whichever is
  picked, and prefer one small enough to read.
- Nothing from either is vendored today. Step 1 has no third-party cube code in
  it at all — `react-native-svg` is the only dependency it added.

## 12. Build notes and versioning

**Answered, and the answer is that the ritual is live.** When Step 1 was written,
`buildNotes.js` and `app.json` both stopped at `2.8.0` (May 2025) — the entire
Fungiku epic had landed without touching either, so `.cursorrules`' build-notes
instruction looked retired, and this plan said so rather than reviving it
unilaterally. Fungiku's Step 13 then closed its epic by writing a `3.0.0` entry
and renaming the app to Puzzle Box in `app.json`. So it was not retired; it is
kept **per release, at the point an epic closes**, not per step.

The cube follows that: `3.1.0`, a minor bump for a new mode rather than a major
one, since the app's shape does not change — it gains a third card on a hub that
already exists. **Later cube steps should extend the `3.1.0` entry rather than
adding a version each**, and only bump again if the epic ships in more than one
release. Keep `app.json`'s `expo.version` in step with whatever the newest key is.

`expo.slug` and the iOS bundle identifier stay as they are, for the reasons
`utils/appIdentity.js` gives: they are identity for EAS and the store, and
changing them orphans the project and every install.
