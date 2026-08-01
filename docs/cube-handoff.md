# Cube Scramble — next-step handoff

**If you are a session picking up cube work: this file is your entry point. Read
it first, then do the step described under "Next step" below.**

It always describes **exactly one step — the next one**. It is rewritten at the
end of every step so the following session can start from a one-line prompt.

## The one-line prompt that starts a session

```
Work in mjohnson139/expo-sudoku. Continue the Cube Scramble epic: check out
epic/cube, read docs/cube-handoff.md and do the next step it describes.
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

The cube lands on an epic branch, never straight to `main`:

```
main ─── epic/cube ─── feature/cube-<step>   (PRs target epic/cube)
```

Branch from **`epic/cube`**, and open your PR **against `epic/cube`**. The epic
merges to `main` once the cube is worth shipping, so `main` never carries a
half-built tool.

`epic/cube` is cut from `main` and tracks it. (It was briefly cut from
`epic/fungiku`, because the hub only existed there; Fungiku's Step 13 merged that
epic to `main` on 2026-08-01 and this was rebased the same day. **No Fungiku
dependency remains** — if you find a doc that says otherwise, it is stale.)

Pushing `epic/cube` publishes an EAS Update branch of the same name, so the epic
is always openable in Expo Go (project → Branches) even with no step PR open.

### Golden rules

- **The cube's code lives under `games/cube/`.** Sudoku and Fungiku keep working
  exactly as they do. Outside that directory Step 1 touched three things — a
  registry entry, `describeCubeProgress` in `utils/gameProgress.js`, and adding
  `react-native-svg` — and Step 2 touched only `utils/buildNotes.js`, because
  plan §12 says to. A step that needs to touch anything else should say why in
  its PR.
- **The model owns the rules.** Import `solvedCube` / `applyMove` / `applyMoves`
  / `cubeFromAlg` / `facelets` / `isSolved` from `games/cube/cubeState.js`, and
  `parseAlg` / `parseMove` / `moveCount` from `games/cube/moves.js`. If you find
  yourself writing a facelet permutation table anywhere, that is a bug. Playing
  an algorithm back is `games/cube/player.js` and `useScramblePlayer` — a solve
  is a list of moves like any other, so a later step should drive them rather
  than write a second transport.
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

`expo-doctor`'s "Expo config schema" and "React Native Directory" checks both
fetch over the network, and both fail with a DNS error in a sandbox that has
none. 16/18 with exactly those two failing is not a regression — say which two,
rather than reporting the number on its own.

For anything visual, the web export can be driven headlessly — serve the export
directory and drive it with the pre-installed Chromium (the binary is at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`). Step 1 used that to check
three viewport sizes for overflow before handing over; it caught a real layout
bug that a single screenshot did not. **Step 2 found one a headless check could
not:** the turn animation was geometrically wrong in the middle of every move,
and no assertion about the ends could see it — the screenshot did. Look at what
you built, at every stage of the motion, not only at rest.

---

## Next step: **Step 3 — enter a cube**

The cube on screen is always a cube this app made up. The operator's goal is a
workbench for *the cube in their hands*, and every step after this one — the
solver, CFOP, Roux — is worth nothing until the state being solved is theirs.

### Scope — ONLY this

1. **Paste or type an algorithm.** A text field that takes notation, validates it
   live, and applies it to the cube. `parseAlg` already accepts the whole set —
   faces, slices, wides, rotations, curly apostrophes, optional spaces — and
   already refuses anything it cannot read whole, so this is a screen, not a
   parser. Show *why* it was rejected: `parseAlg` throws with the offending
   token in the message.
2. **Set the colours by hand.** Tap a facelet on the cube, tap a colour, and the
   sticker changes. This is the half that makes a *scrambled physical cube*
   enterable, since nobody knows the algorithm that produced the cube on their
   table.
3. **Say whether what was entered is a real cube.** A hand-entered facelet state
   can be impossible — ten green stickers, a flipped edge, a twisted corner, two
   identical corners. Report it in the UI, and do not let Step 4's solver be
   handed a state it will search forever for.

### Read first

- `docs/cube-plan.md` §3 (model), §4 (notation), §7 (what is stored), §8
- `games/cube/moves.js` — `parseAlg`, `tryParseAlg`, `isValidAlg`, `formatAlg`
- `games/cube/cubeState.js` — `facelets`, `faceletString`, `FACE_READING`; the
  reading order of D and B is the thing to get right (plan §10)
- `games/cube/favorites.js` and `storage.js` — what a save is allowed to contain
- `games/cube/CubeScreen.js` and `CubeScrubber.js` — where new furniture goes on
  a screen that already fits exactly

### Behaviors that are easy to get wrong

- **Storage holds algorithm text, not a cube** (plan §7). A hand-entered facelet
  state is not algorithm text, so it needs an answer: either store a 54-character
  facelet string alongside — a *second* shape that `readCubeSave` has to filter
  and that every later reader has to handle — or do not persist hand-entered
  states at all and say so. Decide it deliberately and write down which, because
  it is the first time the save file has had two kinds of thing in it.
- **The scrubber assumes a scramble** — `useScramblePlayer` builds its states by
  applying moves to a solved cube. A cube entered by colour has no move list, so
  the transport has nothing to walk. Decide what the scrubber shows then; a
  scrubber that silently reads `0 / 0` and does nothing is worse than one that
  is honestly absent.
- **Validity is not "54 stickers, nine of each".** Permutation parity, corner
  twist and edge flip are all separately checkable and all separately violable
  by a single mis-tapped sticker. Getting this wrong ships a screen that says
  "looks fine" and a Step 4 solver that never terminates.
- **A text field on a screen that does not scroll.** The keyboard covers the
  bottom half of a phone, and this page is a fixed column by design (plan §2).
  Editing probably belongs in a modal, like the favorites list does.
- **Do not let the input clobber the current scramble mid-typing.** The cube
  should follow a *valid* draft, not every keystroke of an invalid one.

### Out of scope for this step

Solving, CFOP/Roux phases, other puzzle sizes, random-state scrambles, a timer.
All of those are later rows in plan §8. The solver is Step 4 and it is the
customer for this step's output — build for it, do not start it.

### Visible in Expo Go when this lands

Open Cube Scramble, paste `R U R' U'`, and see that cube. Then set a few stickers
by hand and see those. Enter something impossible and be told so.

### How to verify

- `npm test` — the validity check is pure and belongs in a module the node
  runner can import, tested against known-good and known-impossible states.
- `npx expo-doctor` (18/18 — the two network-dependent checks may fail behind a
  proxy; say so rather than reporting 16/18 as a regression) and
  `npx expo export --platform all`.
- Drive the web export headlessly at 320×568, 375×667 and 420×860. Step 2's
  driver is a good starting point: serve `dist` and drive it with
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.

---

## Open questions for the operator (carry these forward)

These are plan §9, restated so a session does not have to go looking. None block
Step 3.

1. Scramble length — 20 moves. Leave it?
2. Other puzzles — 2×2, 4×4, pyraminx, skewb?
3. A timer — in this epic, or a separate feature?
4. Colour scheme — a setting, or is the standard one enough?
5. What a "solve" should be for Steps 5–6: the method's own logic, or the
   shortest algorithm?
6. Drag direction — currently "push the surface under your finger".
7. **New, from Step 2: turn speed.** A quarter turn takes 260ms with a 80ms beat
   between moves, so a whole scramble plays in about seven seconds. That is a
   watching pace, not a solving one. Worth a speed control, or is one pace right?

### Noted in passing, for a later step

- **Build notes are kept per release, not per step** (plan §12). Fungiku's Step 13
  wrote `3.0.0`; the cube epic is `3.1.0`. **Extend that entry** as later steps
  land rather than adding a version for each, and keep `app.json`'s
  `expo.version` matching the newest key.
- `CubeView` takes a `colors` prop already, so a colour-scheme setting is a
  screen-level change, not a renderer one.
- **The animation has only been seen on web.** `docs/fungiku-plan.md` §2 is the
  standing warning: both animation bugs this repo has shipped were invisible in
  the browser. This one uses no native driver and no `setValue`, which is the
  class of problem avoided rather than dodged, but a device pass is still the
  only evidence that counts for how it *feels*.
- **`useScramblePlayer` assumes a solved starting cube.** It builds its states by
  applying moves from `solvedCube()`. Playing a *solve* back (Step 4) starts from
  a scrambled one, so it will want a starting cube as an argument — a small
  change, worth making when there is a caller for it rather than now.
- **Half turns animate clockwise.** `shortWay(2)` is 2, not −2; both land in the
  same place and nothing prefers one. If a solve tutorial ever wants `R2` to go
  the way a particular fingertrick goes, that is the line to change.

---

## Steps already done

### **Step 2 — play the scramble** ✅

Shipped: `buildScene` takes an optional in-progress `turn` and draws the cube
part-way through a move; a transport under the cube (start · back · play/pause ·
forward · end, with `n / 20`); every token in the scramble is a tap target that
jumps the cube to that point; a drag stops playback. 118 cube tests.

Three things this step learned, all of them now in plan §5 and §10:

- **A turning cube has an inside.** Only outward stickers exist, so a layer
  half-way round showed the app's background through the gap. `buildScene` now
  draws the seams a move cuts — plastic only, `0 < t < 1` only — and walks all 27
  lattice positions so the core plugs the hole a slice opens.
- **`faceBasis` only spans an axis-aligned normal.** Building a square from a
  half-turned normal gives an unrotated square at a rotated centre, and the tiles
  come off the cube in the middle of every move while both ends stay perfect.
  Squares are built on the lattice and their corners carried. **This got past
  `t = 0` and `t = 1` tests and was caught in a screenshot** — the tests that
  hold it now are the continuity ones.
- **Both ends are exact by construction**, so `t = 0` and `t = 1` frames are
  identical, key for key, to the still cube either side of the move.

Verified with `npm test` (576 across the app), `npx expo export --platform all`
(web + iOS + Android), and a headless run of the web export at 320×568, 375×667
and 420×860: no vertical or horizontal overflow, no console errors, and the whole
transport driven — step, play, pause mid-turn, drag-to-cancel, tap-a-token,
save, new scramble, load a favorite back. `npx expo-doctor` reported 16/18, both
failures being the two checks that need network access this environment does not
have (config schema fetch, React Native Directory).

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
