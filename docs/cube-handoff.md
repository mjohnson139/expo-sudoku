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

`epic/cube` carries Steps 1, 2, 3 and 5 as of 2026-08-02. It is cut from `main`
and tracks it. (It was briefly cut from
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
  `parseAlg` / `parseMove` / `scanAlg` / `tokenize` / `algError` / `moveCount`
  from `games/cube/moves.js`. If you find yourself writing a facelet permutation
  table anywhere, that is a bug. Playing an algorithm back is
  `games/cube/player.js` and `useScramblePlayer` — a solve is a list of moves
  like any other, and Step 3 drove the solve through the same transport rather
  than writing a second one. Keep it that way.
- **Never redisplay a canonical token.** `parseMove` normalizes `r` to `Rw`,
  which is right for the model and wrong for the operator (plan §4). Anything
  shown on screen comes from `tokenize`/`player.tokens`, never from
  `move.token`.
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
rather than reporting the number on its own. (Step 3's environment *did* have
network and got 18/18, so do not treat 16 as the expected number either; report
what you got and which checks failed.)

**The repo does not ship `node_modules`.** Run `npm install` in `SudokuApp/`
first — `npm test` fails with `jest: not found` otherwise, and `npx jest` picks
up an unrelated jest that cannot read this project's babel config.

For anything visual, the web export can be driven headlessly — serve the export
directory and drive it with the pre-installed Chromium (the binary is at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`). Step 1 used that to check
three viewport sizes for overflow before handing over; it caught a real layout
bug that a single screenshot did not. **Step 2 found one a headless check could
not:** the turn animation was geometrically wrong in the middle of every move,
and no assertion about the ends could see it — the screenshot did. Look at what
you built, at every stage of the motion, not only at rest.

---

## Next step: **Step 4 — the workspace survives**

> **Read plan §7.1 first.** It is new, it inverts a rule two earlier steps
> shipped on purpose, and it is the reason this step exists.

The operator, after drilling on Step 5: *"if I background the app and come back,
the view resets to the scramble view… and even worse my solve I was working on
is gone."*

Steps 3 and 5 kept the solve and its hold in memory on purpose — a scratchpad,
so there was something to try before the save file's shape had to be settled.
Real use answered that: a phone app is backgrounded constantly, a cold start
takes everything unsaved with it, and **a notebook that loses the page is not a
notebook.**

**Nothing the operator wrote is lost, and there can be more than one of it.**
That is the step.

### Scope — ONLY this

1. **Decide the save file's shape, once, and write it into plan §7.** A solve is
   already `{ orientation, alg }` and §8.5 adds `phases` in Step 6. **Put the
   `phases` slot in the file now even though nothing writes one yet** — the
   alternative is reshaping the file twice and writing two migrations. Give a
   solve a `name` too.
2. **Persist every solve, against the scramble it belongs to.** Plan §7 already
   identifies a favorite by its algorithm rather than a generated id; follow
   that rule for the scramble a solve hangs off, or replace it everywhere rather
   than in one of two places. Note the real question the handoff has been
   carrying: a solve can be written against a scramble that was never
   favourited, and forcing a star before you can keep work is a rule nobody
   asked for.
3. **Restore the workspace, not just the data.** Coming back should put you
   where you were: the same scramble, the same solve open, the same hold, and
   still in solve mode if that is where you left. **The scrub position, the view
   angle and the speed stay transient** (plan §7.1) — those are where you are
   standing, not what you wrote.
4. **Several named solves per scramble**, with new / duplicate / delete, and a
   list to switch between them. **Duplicate is the one that matters for
   drilling**: "same first block, try the second block differently" is how the
   practice actually goes.

### Read first

- `docs/cube-plan.md` §7 and **§7.1** (what is kept and what is not), §8, §8.2,
  **§8.5** (what Step 6 will add to a solve — build the slot for it now)
- `games/cube/favorites.js` — `readCubeSave`, `sanitizeFavorites`, and **why the
  shape rules live here and not in `storage.js`**: the test runner is plain node
  and `storage.js` imports AsyncStorage. Whatever shape you pick gets sanitized
  here, with tests, or it is not done.
- `games/cube/storage.js` — the debounce and its `flush()` on unmount
- `games/cube/solve.js` — the pure half of editing a solve; a named solve is
  `{ name, orientation, alg }` and these functions stay exactly as they are
- `games/cube/orientation.js` — a hold is a rotation prefix, and it is a *field
  of a solve*, not of the screen
- `games/cube/CubeScreen.js` — `solving`, `orientation`, `solve`, and the effect
  that clears all three when the scramble changes. That effect is what this step
  replaces.
- `games/cube/CubeFavoritesModal.js` — the modal pattern, including the "on the
  cube" marker on the current row

### Behaviors that are easy to get wrong

- **The starting cube is an identity, not just a cube.** `useScramblePlayer`
  reads `from`'s object identity to tell "a different algorithm" from "the same
  one, grown". This has already caused one shipped bug: scramble mode passed a
  constant, so the **empty** scramble the screen mounts with vacuously extended
  into the real one arriving from storage, and the transport **played all twenty
  moves on every cold start** (plan §5). Loading a *solve* is the same trap one
  level down — switch solves and you must change the starting cube's identity
  too, or the transport will animate its way from one solve into the other.
- **Restoring is a second path into the same state**, and every path has to
  agree. Opening solve mode from a restore must land exactly where opening it by
  tapping Solve lands, including which of the three middle buttons is showing
  (`Set start` / `Re-orient` / `Start view`). Those are derived from
  `orientation === null` and the move count — keep them derived.
- **A file written by an older build has no solves in it**, and one written by
  this build has to survive being opened by an older one. `readCubeSave` is the
  boundary where both are handled — filter on the way out, do not trust. A saved
  solve is more text from a file and gets the same treatment as a favorite that
  no longer parses.
- **Do not restore into a hold that no longer parses.** An orientation is
  notation like any other; if it fails, the honest fallback is the reference
  hold, not a crash.
- **The screen is full.** Solve mode is header · scramble line · solve card · a
  3-button row · stage · transport · 3 pad rows · a caption, and at 320×568 that
  leaves the cube about 120 points. A solve *picker* must not be another row —
  put it in a modal, or on the card, or replace something already there. The
  action row's middle button is already three-way; it cannot become four. Check
  at 320, do not assume.
- **`describeCubeProgress` in `utils/gameProgress.js`** reads `20 moves · 3
  favorites` on the hub. Once solves are kept, "come back to this" plausibly
  means something else. It is outside `games/cube/`, so say why in the PR.

### Out of scope for this step

Phase annotations (Step 6 — but leave the field), entering a cube by colour,
a solver, random-state scrambles, colour neutrality, a timer. Note what you
spot; do not start it.

### Visible in Expo Go when this lands

Write a solve, name it, write a second one against the same scramble, switch
between them — then **background the app, come back, and find exactly what you
left**: same solve, same hold, same mode, nothing replayed at you.

### How to verify

- `npm test` — the file's shape, its sanitizing, and the migration from a Step 5
  file are all pure and belong where the node runner can reach them. Pin a Step 5
  save round-tripping through the new reader.
- `npx expo-doctor` and `npx expo export --platform all`.
- Drive the web export headlessly at 320×568, 375×667 and 420×860, and **look at
  the screenshots**. A reload is a cold start, so a driver can test restore
  directly: write a solve, reload the page, and assert you land back on it.
  `scratchpad/resume.js` in the Step 5 session did exactly this to catch the
  replay-on-open bug — sample the position label over the first four seconds and
  assert nothing animates.

---

## Open questions for the operator (carry these forward)

These are plan §9, restated so a session does not have to go looking. None block
Step 4.

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
8. **How a move gets entered** — live, and now shipped in one form. Step 3's pad
   arms `'` and `2` before the key. Roux is prime-heavy, so that is two taps for
   a very common move; what makes it bearable is that **the pad relabels every
   key** while a modifier is armed, so the second tap is aimed at a key that
   already reads `R'`. The two alternatives — modify the move you just made, or
   cycle `R → R2 → R'` on repeated taps — are written up in the Step 3 entry
   under "Steps already done". This wants the operator's first real drilling
   session, not an opinion.
9. **Colour neutrality** — raised and deferred by the operator on 2026-08-01
   ("we're not gonna get into that right now"). Solves assume you pick a top and
   a left colour and hold it that way. **It now has a concrete cost attached**:
   eight of the 24 holds are unreachable until the camera gains a roll axis
   (plan §8.3), and those eight are exactly the ones a colour-neutral solver
   would want.
10. ~~**Whether a solve is worth keeping.**~~ **Answered by use** (operator,
    2026-08-02): yes, and losing one to a backgrounded app is the thing that
    made it obvious. Plan §7.1 has the rule this settled — everything authored
    is kept, everything about how you are currently looking at it is not.
11. **How move groups get annotated** — new, and specified rather than open
    (operator, 2026-08-02): *"these moves solve first block, this set solves
    second block."* Plan §8.5 has the four decisions. What is still genuinely
    open is **whether it should come before several-solves**: it is arguably
    worth more for drilling one scramble, and the save-file shape supports
    either order, which is the point of deciding that shape once.

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
- ~~**`useScramblePlayer` assumes a solved starting cube.**~~ **Done in Step 3**:
  `buildPlayback(alg, { from })` and `useScramblePlayer(alg, from)`.
- **The text field appends; it cannot edit.** A typo in the middle of a solve is
  fixed by undoing back to it, which was fine for a scratchpad and stops being
  fine the moment solves are kept — **which is Step 4, so this is now live.**
  Editing a saved solve as text is a screen question, not a parser one.
- **Solve mode has no "Favorites" button**, because the row it lived on is now
  the move pad. Getting to the list means tapping Scramble first. Nobody has
  complained because nobody has used it yet.
- **`'` and `2` are the only modifiers on the pad**, so a solve cannot be entered
  with a curly apostrophe from the pad — but one *pasted* into the text field is
  kept as typed, and will read back as `R’` next to the pad's `R'`. Honest
  (plan §4 says keep what was entered) and slightly inconsistent; if it grates,
  normalize the apostrophe in `appendAlg`, not in the parser.
- **The scrubber row is full.** Five buttons, `n / 20` and the speed chip come to
  about 284 points, and the narrowest phone this app supports has 300. It wraps
  rather than overflows, but a sixth control wants a rethink rather than another
  chip.
- **And so is the page.** Step 3 spent the rest of it: at 320×568 solve mode
  leaves the cube about 120 points. That is why the two view buttons are
  icon-only in solve mode and the scramble drops to one line — both were
  measured, and labelling either one wraps the row and costs the cube 40 more
  points.
- **Half turns animate clockwise.** `shortWay(2)` is 2, not −2; both land in the
  same place and nothing prefers one. If a solve tutorial ever wants `R2` to go
  the way a particular fingertrick goes, that is the line to change.

---

## Steps already done

### **Step 5 — the starting orientation** ✅ *(shipped out of order, 2026-08-02)*

*Merged to `epic/cube` with Step 3 on 2026-08-02 (#87, #88).*

Shipped: solve mode is now **two phases**, and the cube turns all the way over. Tap Solve and you are *inspecting* —
no pad, no transport, a cube roughly twice the size, and a live readout under it
saying **"yellow up · blue front"** as you drag. Tap **Set start** and that hold
is baked into the model as a rotation prefix, so every move you then write is
relative to it. `Start view` is the shortcut back to it; `Re-orient` goes back to
inspecting, and is only offered while the solve is empty.

Why it jumped the queue: the operator used Step 3 and found entering `x`/`y`/`z`
by hand to be the wrong instrument — *"we can pan the cube around and look at it
and that's a lot easier than using the keyboard."* Picking a hold by typing `z2`
is asking someone to compute the answer to the question they are using the cube
to answer. **`x`/`y`/`z` stay on the pad**, because a solve occasionally needs a
rotation mid-way (operator, 2026-08-02).

Three things this step learned, all now in plan §8.3:

- **The camera and the model are not interchangeable.** Panning moves the
  camera; a hold moves the model. Leaving the camera somewhere and calling it the
  orientation looks right and is wrong the instant a move is entered.
- **The angle is thrown away and only the hold is kept.** 24 holds, infinitely
  many angles — so setting one is a deliberate jump back to the standard
  three-quarter view. **The invariant is not "the picture is unchanged"**, which
  is what this step first assumed and a driver disproved; it is "the hold you
  were promised is the hold you get".
- **Front must be picked among the faces perpendicular to up.** Two independent
  argmaxes return the *same face* for both when you look down a body diagonal —
  yaw 45°, pitch 45°, one drag from the opening view — and that pair is not an
  orientation. A unit test pins it.
- **A constraint added to prevent a feeling can silently remove a capability.**
  Pitch had been clamped short of ±90° since Step 1 so a drag could never roll
  the cube past its pole and invert. Correct about the symptom — and it made
  **yellow-up unpickable**, because D is only the highest face on screen when
  `cos(pitch) < 0`. That is the traditional Roux hold and the first thing the
  operator tried. Nothing failed; there was just a hold you could not name. The
  clamp is gone and the inversion is handled instead
  (`geometry.isUpsideDown`). **Sixteen of the 24 holds are reachable** — every
  one with white or yellow up — and the missing eight need a camera roll axis,
  which belongs with colour neutrality if that ever lands (plan §8.3).

One more bug, found by the operator and fixed before the merge: **a cold start
played the whole scramble** before settling on it. The screen mounts with an
empty scramble and fills it from storage, and position 0 of nothing vacuously
extends into position 0 of anything — so the transport called it growth and
walked all twenty moves. The starting cube is an identity as well as a cube, and
scramble mode was passing a constant one. Backgrounding the app is how an
operator meets this, because the system evicts it and the next open is cold.

Also recorded and **declined**: swipe-to-turn (plan §8.4), dropped as too
complicated. The groundwork finding is kept in case it returns.

Verified with `npm test` (669 across the app, 32 of them new across orientation
and geometry — including a sweep of every yaw/pitch a finger can reach, a
reachability census of the 24 holds, and a proof that the near surface really
does reverse its screen direction past the pole), `npx expo-doctor` (18/18),
`npx expo export --platform all`, and headless runs at 320×568 and 375×667
driving both phases — pan, watch the readout follow, set, confirm the promised
hold is the one delivered, enter a move, pan away, `Start view` back, clear,
re-orient — plus a driver that turns the cube right over, lands on yellow-up,
and walks all four of its fronts. Step 3's three drivers were re-run against it
unchanged in intent, and all still pass.

### **Step 3 — solve mode** ✅

Shipped: a **Solve** button that switches the screen from reading a scramble to
writing one down, with the cube starting from the scramble fully applied; a
twelve-key Roux pad (`U D L R F B` · `M` · `r` · `l` · `x y z`) with `'` and `2`
armed before the key, plus undo, clear and a text field for whole algorithms;
every entered move animates, and the transport scrubs a solve exactly as it
scrubs a scramble. 179 cube tests, 637 across the app.

The solve is a scratchpad, as planned — one solve, in memory, cleared by a new
scramble. Step 4 is where the save file's shape gets decided.

Three things this step learned:

- **The pad relabels itself while a modifier is armed.** Every key reads `U'`,
  `R'`, `M'` … so the second of the two taps is aimed at a key that already says
  the move it will make. That is what makes armed modifiers bearable enough to
  ship and let a real drilling session pick between the alternatives (plan §9.8).
- **"The algorithm changed" is two different events**, and Step 2's transport
  treated them as one. Loading a favorite must reset to the end; appending a
  move must *turn* it. `extendsAlg(before, after, from)` tells them apart, and
  asking it at **where the cube actually is** rather than at the end of the old
  algorithm is what makes undo-then-type animate instead of jump. Plan §5 has it.
- **Undo is two things that cannot happen at once**, and the gap between them is
  where the bugs were. `retract` owes the caller a removal and every exit from
  the backwards turn pays it. Without that, a second undo inside 260ms kept a
  move that had been deleted, and a key tapped in the same window stranded the
  removal entirely. **Neither was visible in any test this step wrote** — both
  came out of driving the export and reading the solve back.

Verified with `npm test` (637 across the app), `npx expo-doctor` (18/18; this
environment had network, unlike Step 2's), `npx expo export --platform all`
(web + iOS + Android), and headless runs of the web export at 320×568, 375×667
and 420×860: no vertical or horizontal overflow, no console errors, and the whole
of solve mode driven — enter a move, arm a modifier, undo, clear, type an
algorithm and watch it run, scrub it, rotate with `y`, round-trip to the scramble
and back, and a new scramble clearing the solve. Frames were sampled across each
turn to confirm the moves actually animate rather than appearing already made,
including in the undo race.

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
