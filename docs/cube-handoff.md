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

## Next step: **Step 3 — solve mode**

> **Read plan §8.1 before anything else.** The epic was replanned on 2026-08-01
> and the old Step 3 ("enter a cube") and Step 4 ("a two-phase solver") are gone
> from the critical path. If you have context that says this step is a solver, it
> is stale.

The operator has been using the scrambler to drill: **the same scramble, over and
over**, working out a Roux first block by hand and trying to remember what they
did. What they need is somewhere to write it down and watch it back. Eventually
that is several named solves per scramble, each with the orientation the cube was
held in — this step is the one move that all of it stands on.

**Enter a move, and the cube turns.** That is the whole step.

### Scope — ONLY this

1. **A solve mode.** A button on the cube screen switches the screen from
   *reading a scramble* to *writing a solve*. The cube starts from the scramble
   fully applied — that is the cube you would be holding — and the moves you
   enter go on top of it.
2. **A move pad.** Twelve keys: `U D L R F B` · `M` · `r` · `l` · `x y z`, with
   `'` and `2` as modifiers, plus undo and clear. This is the **Roux set**
   (operator, 2026-08-01): first block is faces plus `M` and `r`, LSE is almost
   entirely `M` and `U`, and `x`/`y` are how you turn the cube over during
   inspection. Not the full parser set — `E`, `S` and the other three wides are
   real notation nobody writes a Roux solve in, and eighteen keys on a phone is a
   worse pad.
3. **A text field**, alongside the pad, for typing or pasting a whole algorithm —
   a CMLL alg, a sequence off a tutorial. The parser already does the work
   (`parseAlg` takes the full set, spaces optional, curly apostrophes, and
   refuses anything it cannot read *whole*), so this is a screen, not a parser.
   Show why something was rejected: `parseAlg` throws with the offending token
   in the message.
4. **Each entered move animates**, using Step 2's machinery, and the transport
   underneath scrubs the solve exactly as it scrubs a scramble.

**The solve is a scratchpad this step** (operator, 2026-08-01) — one solve, held
in memory, gone when you leave. Saving and naming several is Step 4, and that is
where the save file's shape gets decided properly rather than in passing.

### Read first

- `docs/cube-plan.md` §4 (notation, and the new note on canonical tokens), §5
  (the renderer and the transport), §7 (what is stored), §8 and **§8.1–8.2**
- `games/cube/moves.js` — `parseMove`, `parseAlg`, `tryParseAlg`; note
  `BASE_MOVES`/`WIDE_MOVES` and that `TOKEN_SOURCE` is the scanner you will want
  to expose
- `games/cube/player.js` — `buildPlayback`, and the fact that it starts from
  `solvedCube()`
- `games/cube/useScramblePlayer.js` — `playTo`, `animate`, and the effect that
  resets to the end when the algorithm changes
- `games/cube/CubeScreen.js`, `CubeScrubber.js`, `CubeFavoritesModal.js` — the
  screen, the transport, and this feature's modal pattern
- `games/fungiku/FungikuMenuModal.js` — **the only `TextInput` in the app**, and
  therefore the house pattern for one

### Behaviors that are easy to get wrong

- **`parseMove` normalizes `r` to `Rw`** (plan §4). A Roux notebook that echoes
  `Rw U Rw'` back at someone who tapped `r` is correcting them in notation their
  method does not use. Keep the entered text as the source of truth and export a
  `tokenize` from `moves.js` so the displayed token and the animated move are two
  arrays built in one pass — not two things hoped to line up. Step 2's token
  rendering in `CubeScreen` has the same latent problem and can be fixed by the
  same export.
- **Appending a move must *animate*, not jump.** `useScramblePlayer`'s effect
  resets to the end whenever the algorithm changes, which is right for loading a
  favorite and wrong for adding a move — you would never see the turn. The rule
  that works: if the new algorithm *extends* the old one and the cube was sitting
  at the old end, walk forward to the new end (`playTo`) instead of resetting.
  Worth a pure `extendsAlg(before, after)` in `player.js` so it is testable.
- **`buildPlayback` starts from a solved cube.** A solve starts from the
  scrambled one, so it needs a starting cube — `buildPlayback(alg, { from })`.
  This was flagged as coming in Step 2's handoff and is now due.
- **Undo has to run the move backwards**, then drop it. Dropping it first and
  letting the state reset is a jump, and it is the wrong direction of the same
  bug as the point above. Step 2 already animates backwards for free: it is the
  same move run from `t = 1` down to 0 on the cube before it.
- **A whole-cube rotation changes the model, not the camera.** `x`/`y`/`z`
  already animate correctly and open no seams — but after a `y`, `R` means a
  different physical face. That is exactly right and exactly what Roux
  inspection needs; just do not also move the camera, and do not expect the
  scramble text above to still describe the orientation.
- **A text field on a screen that does not scroll.** The keyboard covers the
  bottom half of a phone and this page is a fixed column by design (plan §2).
  The field probably belongs in a modal, like the favorites list.
- **The screen is already full.** Step 2's transport came to about 284 points
  against the 300 the narrowest supported phone has. A pad is another ~120
  points of vertical, on a page where the stage is the `flex: 1` that absorbs
  it — so the *cube* is what shrinks. Two rows of six plus a modifier row is the
  budget that fits; check it, do not assume it.
- **Do not persist the solve** this step (plan §7). Same reasoning as Step 2's
  scrub position and speed.

### The modifier question, which is genuinely unsettled

`'` and `2` are **armed** — tap `'`, then `R`, and you get `R'`; the arming
clears after one move. That is two taps for a move Roux uses constantly, and it
is the first thing to revisit once the operator has drilled a real solve on it
(plan §9.8). Two alternatives, neither obviously better:

- **Modify the last move instead** — tap `R`, then `'`, and it becomes `R'`. One
  fewer tap in the common case, but the cube has already turned `R`, so it has
  to un-turn and re-turn, and the animation stops meaning "this is the move I
  just made".
- **Tap a key repeatedly to cycle** `R` → `R2` → `R'`. No modifier keys at all,
  and it is what some cube apps do, but the intermediate animations are a cube
  turning back and forth rather than a solve being written.

Ship the armed modifiers, keep undo one tap away so a mis-entry is cheap, and
let the operator's first real session decide.

### Out of scope for this step

Saving or naming solves, several solves per scramble, an orientation step,
phase markers, entering a cube by colour, a solver, colour neutrality, a timer.
Those are plan §8 rows 4–8, and §8.2 says what the first three are. Note what
you spot for them; do not start them.

### Visible in Expo Go when this lands

Open Cube Scramble, tap Solve, tap `R` — the cube turns `R`. Arm `'`, tap `U`
— it turns `U'`. Tap undo and watch it come back. Type `R U R' U'` in the field
and watch all four run.

### How to verify

- `npm test` — `tokenize`, `extendsAlg` and `buildPlayback({ from })` are all
  pure and belong where the node runner can reach them. Pin the round trip: a
  token entered as `r` comes back as `r` and animates as `Rw`.
- `npx expo-doctor` (16/18 in a sandbox; see the note above) and
  `npx expo export --platform all`.
- Drive the web export headlessly at 320×568, 375×667 and 420×860 — and look at
  the screenshots, do not only assert on them. Step 2's drivers are a good
  starting point: serve `dist`, drive it with
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.

---

## Open questions for the operator (carry these forward)

These are plan §9, restated so a session does not have to go looking. None block
Step 3.

1. Scramble length — 20 moves. Leave it?
2. Other puzzles — 2×2, 4×4, pyraminx, skewb?
3. A timer — in this epic, or a separate feature?
4. Colour scheme — a setting, or is the standard one enough?
5. ~~Where a solve comes from.~~ **Answered, and it replanned the epic**
   (operator, 2026-08-01): solves are **written by the operator**, not computed.
   See plan §8.1.
6. Drag direction — currently "push the surface under your finger".
7. ~~Turn speed.~~ **Answered** (operator, 2026-08-01): a speed control, and it
   is in — a chip cycling 1× → 2× → 0.5×, scaling the beat between moves as well
   as the turns, and applying to single steps as much as to playback. It is not
   persisted, for the same reason the view angle is not. If it should survive a
   relaunch, that is a save-file change and belongs with **Step 4's** decision
   about what else the file holds.
8. **How a move gets entered** — new, and live. Step 3 ships armed `'` and `2`
   modifier keys; Roux is prime-heavy, so that is two taps for a very common
   move. The alternatives are written up under Step 3 above. This wants the
   operator's first real drilling session, not an opinion.
9. **Colour neutrality** — raised and deferred by the operator on 2026-08-01
   ("we're not gonna get into that right now"). Solves assume you pick a top and
   a left colour and hold it that way.

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
  applying moves from `solvedCube()`. A solve starts from a scrambled one, so it
  wants a starting cube as an argument. **Step 3 is the caller** — this is no
  longer "later".
- **The scrubber row is full.** Five buttons, `n / 20` and the speed chip come to
  about 284 points, and the narrowest phone this app supports has 300. It wraps
  rather than overflows, but a sixth control wants a rethink rather than another
  chip.
- **Half turns animate clockwise.** `shortWay(2)` is 2, not −2; both land in the
  same place and nothing prefers one. If a solve tutorial ever wants `R2` to go
  the way a particular fingertrick goes, that is the line to change.

---

## Steps already done

### **Step 2 — play the scramble** ✅

Shipped: `buildScene` takes an optional in-progress `turn` and draws the cube
part-way through a move; a transport under the cube (start · back · play/pause ·
forward · end, with `n / 20` and a speed chip); every token in the scramble is a
tap target that **turns the cube its way there**, forwards or backwards; a drag
stops playback. 125 cube tests.

Playing the scramble, playing it backwards and turning to a tapped move are one
loop told where to stop (`playTo`), so direction falls out of which side of the
goal the cube is on and an interruption — including one that reverses — works
the same way for all three. The two skip buttons are the only thing that still
jumps: "back to the solved cube" is a way *out* of where you are, and turning
twenty moves to get there would be the opposite of what the button says.

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
