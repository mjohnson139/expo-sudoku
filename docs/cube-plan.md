# Cube Scramble — Feature Plan

**A 3×3 Rubik's cube you can scramble, keep, and turn over in your hands.** The
first step ships a random scramble, a cube rendered in 3D that you drag to
inspect from any angle, and a favorites list. The epic it opens is a *cube
workbench*: step through a scramble move by move, then work out **how you would
solve it** — in Roux, in CFOP, in whatever the operator is learning — with the
cube showing what each move does.

> **Replan note (2026-08-01), and it is the important one.** This document used
> to say the epic ended in a **solver**: a two-phase search in JS that computes a
> solution, then splits it into CFOP or Roux phases to display. That is not what
> the operator wants, and the way they have actually been using the tool is what
> revealed it — running the *same scramble over and over* to drill a Roux solve
> by hand. What they need is a **notebook**: enter your own moves, watch the cube
> follow, and keep several attempts at the same scramble side by side. The cube
> is a place to write down and replay what *you* worked out, not an oracle that
> tells you the answer. §8 is replanned around that, and the solver drops off the
> critical path — see §8.1 for what changed and why.

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

**The rule is about the page, not about every pixel on it.** A bounded strip
well clear of the cube's square may scroll inside itself — the phase strip has
done so sideways since Step 6, and Step 7 gives the moves the same treatment
vertically (§8.5, §8.6). What must never exist is a `ScrollView` the cube is
*inside*.

**What the fixed column does not mean is that the cube takes what is left.** It
was allowed to for six steps, and by Step 6 the chrome had two thirds of the
page. §8.6 inverts that: the cube is sized first and every other row is on a
budget.

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

### A move's canonical token is not always what was typed

`parseMove` normalizes: `r`, `Rw` and `rw` all come back as `{ token: 'Rw', … }`.
That is right for the *model* — one spelling, one comparison — and wrong for
anything the operator reads back. Roux is written `r U r'` and `M2`, and a
notebook that redisplays a solve as `Rw U Rw'` is quietly correcting the person
using it in the notation their own method does not use.

So from Step 3 on, **the text the operator entered is the text that is kept**,
and the canonical token stays an implementation detail of the move. The way to
hold that together is a `tokenize` scan that returns the raw token strings, so a
displayed token and the move it animates are the same element of two arrays built
in one pass rather than two things hoped to line up.

**Built in Step 3.** `scanAlg(text)` is the one pass and returns
`{ tokens, moves }`; `parseAlg` and `tokenize` are its two projections, and
`buildPlayback` carries both through to the screen. The scramble display was
moved onto it at the same time, so nothing in the feature redisplays a canonical
token any more. `algError(text)` is the same scan kept for its message, which is
what lets the text field say *which* token it choked on.

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

### Turns (added in Step 2)

`buildScene` takes an optional `turn` — `{ axis, layers, amount, t }` — and draws
the cube part-way through a move **without the model knowing anything about it**:
the cubies the move carries are rotated by `t` of the way round on their way to
the screen, and the move is applied to the model once, exactly, when it lands.

Two things about it are worth not rediscovering:

- **A closed cube has no inside, and a turning one does.** Only outward stickers
  exist, so a layer half-way round leaves a gap with nothing behind it and the
  app's background shows through the middle of the cube. `buildScene` therefore
  draws the *seams a move cuts* — the inward faces either side of the cut,
  plastic only — for `0 < t < 1`, and walks all 27 lattice positions rather than
  the 26 cubies, because a slice swings the core away from the middle too. A
  face turn costs about a dozen extra polygons, and only while it is turning.
- **Both ends are exact, by construction.** At `t = 0` there is no turn; at
  `t = 1` the frame is built on the settled lattice by the same code a still
  cube goes through. So a frame at either end is **identical**, polygon for
  polygon and key for key, to the still cube before or after the move — which
  makes "the animation starts and lands without a jump" a test rather than a
  hope (`geometry.test.js`).

A face is keyed by **where it is going**, not where it is, so React re-renders
the cube each frame instead of remounting fifty-four views twenty times a
scramble.

### The transport (added in Step 2)

`games/cube/player.js` is the pure half — every cube state built once per
scramble, so scrubbing is a lookup and stepping backwards needs no inverse move,
just the previous cube and the same move run from `t = 1` down to 0.
`useScramblePlayer` is the clock, driven by `requestAnimationFrame` rather than
an `Animated.Value`: a turn rebuilds the SVG scene, so there is nothing for
`useNativeDriver` to drive, and not having one closes the question
`docs/fungiku-plan.md` §2 raises.

**Playing forwards, playing backwards and turning to a tapped move are one
loop.** It is told a goal and takes one move toward it at a time; direction falls
out of which side of the goal the cube is on. So a tap on move 14 turns its way
there rather than cutting to it, reversing mid-walk lands the in-flight turn and
sets off the other way, and pause, a drag and a new goal all interrupt it
identically. Only the two skip buttons jump — "back to the solved cube" is a way
*out* of where you are.

Tempo is a chip cycling 1× → 2× → 0.5×, scaling the beat between moves as well as
the turns so double speed hurries rather than stutters, and applying to single
steps as much as to playback. It is transient, like the view angle: the save file
holds algorithm text (§7).

**Playing one phase is two calls into this, not a third path** (Step 6): `seek`
to where the group starts, then `playTo` where it ends. The jump is the right
half of it — "play just the second block" is not a request to watch the first one
go past first — and the walk is the loop that was already there.

### Growing an algorithm, not replacing one (added in Step 3)

`buildPlayback(alg, { from })` takes the cube move 1 starts on, because a solve
starts from the scrambled cube rather than a solved one. Everything else about
playback is unchanged — **a solve is a list of moves like any other**, which is
why entering one drives the same transport instead of growing a second.

What did have to change is what a *changed algorithm* means. Loading a favorite
and tapping `R` on the solve pad arrive identically — the string underneath the
transport is different — and the right answer is opposite in the two cases:
reset to the end for one, turn the new move for the other. Resetting when a move
is appended applies it without ever showing it, which is the one thing the pad
exists to do.

**The starting cube is the identity, and it has to change when the subject
does.** `from` is not only where move 1 begins — it is what says *this is a
different algorithm now*. Scramble mode originally passed a constant, and the
consequence was a bug worth remembering: the screen mounts with an **empty**
scramble and fills it from storage, and position 0 of nothing vacuously extends
into position 0 of anything, so the transport read the arriving scramble as
growth and **played all twenty moves on every cold start** (which is what a
backgrounded app does when the system evicts it). The fix is that the starting
cube is rebuilt whenever the scramble is, so its identity changes with the
subject rather than staying put.

`extendsAlg(before, after, from)` is the pure predicate that tells them apart,
and the `from` argument is the part worth not losing. Asked at the end of
`before` it is the plain reading — *same algorithm, more on the end*. The
transport asks it at **where the cube actually is**, which is the same question
somewhere more useful: moves past that point have not been played, so whether
they changed cannot matter. That is what makes *undo, then type a different
move* animate rather than jump — by then the cube has turned back, and both
algorithms agree everywhere it has been.

**Undo is two things that cannot happen at once**: turn the move backwards, then
drop it. Dropping first is a jump; turning first leaves the algorithm holding a
move the operator has already taken back. So `retract(onDone)` owes the drop and
*every* exit from the turn pays it — it lands, or something interrupts it. That
matters more than it sounds: a second undo, or a key tapped inside the 260ms the
turn takes, otherwise walks away from a removal that never happened and the
solve silently keeps a move that was deleted. Both were real, and both were
caught by driving the export rather than by a test.

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

Upgrading to random-state is its own step (§8, last row), and it is the same
search a solver needs — which is why the two share a row now that neither is on
the critical path (§8.1).

## 7. Favorites and persistence

One AsyncStorage key, `@CubeScramble`, holding the scramble on screen, the
favorites list, every solve the operator has written, and which of them was
open. They change together — saving a favorite is a tap on the scramble already
showing — and splitting them would buy four round trips and four ways for them
to disagree.

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

### 7.1 What has to survive, and what must not (revised 2026-08-02)

Step 3 shipped the solve as a scratchpad and Step 5 added a hold to it, both
deliberately in memory only. **That was the wrong call for real use**, and the
operator found out the way these things are always found out: *"if I background
the app and come back… my solve I was working on is gone."* A phone app is
backgrounded constantly, and on a cold start every unsaved thing is gone. A
notebook that loses the page is not a notebook.

So the rule inverts. **Everything the operator authored is kept; everything
about how they happen to be looking at it right now is not.**

| Kept | Not kept |
|---|---|
| The scramble, and the favorites | The view angle |
| Every solve: its hold, its moves, its name | The scrub position |
| Which solve was being edited, and that solve mode was open | The turn speed |

The right-hand column is unchanged and the reasoning still holds: those are
where you are standing, not what you wrote. Restoring someone into the middle of
a half-played scramble is worse than opening it whole.

**Decide the shape once.** A solve is already two fields (`orientation`, `alg`)
and §8.5 adds a third (`phases`), so the file wants a slot for annotations from
the start even if nothing writes one yet. The alternative is reshaping the save
file twice and writing two migrations.

### 7.2 The save file's shape (decided in Step 4, 2026-08-02)

```js
{
  _v: 2,
  scramble: "R U2 F' …",                       // the one on the cube
  favorites: [{ alg, savedAt }],
  solves:    [{ id, scramble, name, orientation, alg, phases, savedAt }],
  workspace: { solving, solveId },
}
```

`games/cube/solveList.js` owns the solves half of it — the list operations and
the sanitizing — and `readCubeSave` in `favorites.js` stays the one boundary
everything comes back in through. Four decisions in there are worth not
relitigating:

- **A solve names its scramble by that scramble's algorithm text**, which is
  §7's rule for favorites applied one level down. It is also what makes a solve
  independent of the star: **a solve does not need its scramble favourited**,
  because forcing a star before you are allowed to keep work is a rule nobody
  asked for. Loading a favorite brings its solves back because both key off the
  same text, not because one points at the other.
- **A solve has a generated `id`, and that is a departure from the rule above
  rather than a lapse from it.** Two saves of the same scramble are the same
  favorite, which is what a player means; two solves with the same moves are
  **two solves**, which is the entire point of Duplicate. So a solve has no
  natural key and is given one — minted by counting (`s1`, `s2`, one past the
  highest in the file) rather than by clock or dice, so the file and the tests
  stay deterministic.
- **`phases` was in the file before anything wrote one.** It was §8.5's slot,
  sanitized from the start, so the build that first wrote a phase found the field
  already there — which is exactly what happened in Step 6, and it cost that step
  no migration and no reshaping. `sanitizePhases` is now `clampPhases`, the same
  function the screen applies live.
- **`workspace` is the other half of "come back to what you left"** — which
  solve was open and whether solve mode was. Both are cross-checked against what
  survived sanitizing: an open solve has to exist and has to belong to the
  scramble on screen, and solve mode with nothing open is not a state the screen
  has.

**Neither direction of version skew needs a migration step.** A Step 5 file has
no `solves` key and `sanitizeSolves(undefined)` is the empty list — which is the
truth, because that build could not keep a solve. A Step 4 file opened by a
Step 5 build still has `scramble` and `favorites` exactly where they were.

## 8. Delivery steps

One branch per step, per `.github/dev-process.md`. Every step must ship something
the operator can open in Expo Go.

| Step | What lands | State |
|---|---|---|
| **1** | Scramble · 3D cube you can drag · favorites · hub tile | **shipped** |
| **2** | **Play the scramble.** Animated layer turns and a move-by-move scrubber | **shipped** |
| **3** | **Solve mode.** Enter moves and the cube turns — a move pad and a text field, on the scrambled cube | **shipped** |
| **4** | **The workspace survives.** Nothing you wrote is lost to a backgrounded app; several named solves per scramble | **shipped** |
| **5** | **Orientation.** Record how the cube is held before a solve starts — Roux's inspection step, "yellow up, blue left" | **shipped** (out of order, 2026-08-02) |
| **6** | **Annotate the move groups.** "These moves solve first block, these solve second block" — labelled spans, per-phase move counts, and a transport that plays one group | **shipped** |
| **7** | **Give the page back to the cube.** The chrome takes two thirds of the screen and the biggest piece of it grows as you drill; cut it to a budget | **shipped** (#92, 2026-08-05) |
| **8** | **The designed solve screen.** A spatial cross pad, hold-for-prime, and a phase-split tick scrubber — from a settled design bundle, and the answer to §9.8 | **shipped** (2026-08-05) |
| **9** | **Edit a solve you have already written.** Fix a move in the middle without undoing back to it — the oldest live gap in the feature | next |
| **10** | **Enter a cube by hand.** Paste an algorithm, or set the colours facelet by facelet, for a cube that came off a table rather than out of the generator | |
| **11** | **A solver**, if it is still wanted by then — and random-state scrambles off the back of the same search | |

**The table has now been re-ordered twice, and both were re-orderings rather
than new scope.** Step 6 landing (2026-08-02) moved *edit a solve* ahead of
*enter a cube by hand*: "the text field appends, it cannot edit" has been a known
gap since Step 3, was recorded as *overdue* when Step 4 kept solves it could not
fix a typo in, and Step 6 put **markers** on top of the same text.

Then the operator looked at the screen (2026-08-03): *"how much space all the
chrome is taking — I want more space for the cube."* So **layout goes first and
edit becomes Step 8**, and the ordering is doing real work rather than deferring
one annoyance for another. The Step 7 brief as written was already fighting the
page — *"the screen is full and Step 6 spent the last free slot… anything this
step adds has to replace something or live in a modal"* — which is a step being
designed around a budget instead of against the feature. Reclaiming the page
first means the edit affordance gets put where it belongs rather than where
there is room. §8.6 is the layout step; §8.7 keeps the edit brief so it is not
lost in the shuffle.

**Steps 3–6 all shipped, and they were the operator's actual goal.** Steps 4–6
are increments on Step 3:
once you can enter moves, keeping several attempts is a list, holding the cube a
certain way is a prefix of rotations, and naming the phases is a marker between
two moves. **None of them need a solver**, which is the whole point of the
replan below.

### 8.1 Why the solver moved to the end

The old plan had Step 4 compute a solution with a two-phase (Kociemba) search and
Steps 5–6 chop it into CFOP and Roux phases. It was a coherent plan for a
different product.

What the operator is doing with the tool is drilling: same scramble, over and
over, working out a Roux first block by hand and trying to remember what they
did. A computed solution does not help with that — it is not their solution, it
does not follow the method's logic (a shortest algorithm ignores what "first
block" even is), and open question §9.5 was already circling the problem before
the answer arrived from watching the thing be used.

So the epic becomes a notebook. That is *less* code, not more: no search, no
pruning tables, no megabyte of dependency, and every step from here is
recognisably the same shape — moves on a cube that the model and renderer
already animate. The solver stays in the table because random-state scrambles
(§6) still want the same search and it would be a good thing to have; it is just
no longer the thing everything else waits on.

### 8.2 What a solve is

A **solve** is what the operator writes down about one scramble:

- **An orientation** — how you are holding the cube when you start. Roux begins
  with inspection: find the pairs, pick a top colour and a left colour, and
  traditionally that is yellow on top and blue on the left. In notation this is a
  prefix of whole-cube rotations (`x`, `y`, `z`), which the model and renderer
  already handle and which cost nothing extra to store.

  **Shipped ahead of Step 4** (operator, 2026-08-02), because typing rotations
  turned out to be the wrong way to enter it. See §8.3.
- **The moves** — the solve itself, in standard notation.
- **A name**, so two attempts at the same scramble can be told apart. **Shipped
  in Step 4** — `Solve 1`, `Solve 2` by default, counting within the scramble,
  and renamable.

Several solves belong to one scramble, because trying it three ways is the
practice. **That is Step 4, and it shipped on 2026-08-02** with new, duplicate,
delete and a picker; Step 3 deliberately shipped **one** unsaved solve so there
was something to try before the save-file shape had to be settled (§7.2).
**Duplicate is the one that matters for drilling**: "same first block, try the
second block differently" starts by keeping what you already had.

**Colour neutrality is explicitly out of scope** (operator, 2026-08-01) — solving
from any starting colour is a real Roux topic and a real complication, and it is
not what this epic is for yet.

### 8.3 Inspection is a phase, and it is panning (Step 5)

The operator's verdict after using Step 3: *"it's really hard to do that right
now — we can pan the cube around and look at it and that's a lot easier than
using the keyboard."* Picking a hold by typing `z2 y'` is asking someone to
compute the answer to the question they are using the cube to answer.

So the orientation is **read off the view angle**. Pan until the cube looks the
way you want to hold it, tap **Set start**, and `games/cube/orientation.js`
converts the angle into the rotations that get there.

Three things about it are worth not rediscovering:

- **The camera and the model are not interchangeable.** Panning moves the
  camera; a hold moves the model. Leaving the camera somewhere and calling it
  the orientation looks right and is wrong the moment a move is entered — `R`
  would still turn the face the *model* calls R, not the one now on the right of
  the screen. So the angle is converted to rotations, applied, and the camera
  goes back to the default.
- ~~**The angle is thrown away and only the hold is kept.**~~ **Half reversed on
  2026-08-03, and it is the second time a Step 5 judgement has not survived use.**
  There are 24 holds and infinitely many angles to look at one from, so only the
  hold is *stored* — that part stands, and the angle is still not in the save
  file. What did not stand is the **jump**: setting a hold sent the camera back
  to the standard three-quarter view, deliberately, on the grounds that
  inspecting from directly overhead is a fine way to decide "blue up, white
  front" and a bad way to look at a cube you are about to solve. The operator's
  verdict after using it: *"when locking it in, can we remember the exact
  position of the cube. It currently repositions."*

  They are right, and the reasoning was subtly wrong rather than merely
  unpopular. **The angle you turned the cube to is information** — it is the
  view you decided you wanted to solve from, arrived at by hand — and throwing
  all of it away to avoid the bad part threw away the good part with it.

  `orientation.viewAfterHold` keeps the picture instead. Baking the hold is a
  rotation `R` on the model, so a camera `C` showing `C(M)` becomes `C · R⁻¹` to
  show the same picture of `R(M)`. `C` is yaw-then-pitch with no roll, so
  `C · R⁻¹` is not always in reach — **but it is far more often than you would
  guess.** Over a 15° sweep of every angle a finger can reach, more than half
  come back *pixel-exact*, and the camera is never left further from the picture
  than the old jump left it. Every ordinary inspection angle tried is exact,
  including turning the cube right over for the traditional yellow-up Roux hold,
  which is the angle the old behaviour moved furthest.

  When it cannot be exact, what is lost is the **roll** — the component that
  would have left the cube sitting at a tilt. That is the one part of an
  inspection angle worth discarding, so the approximation fails in the right
  direction, and the original argument survives inside the fix. A camera roll
  axis would make it exact everywhere and is still the change to make if colour
  neutrality lands; it is not needed for this.

  **`Start view` had to change with it.** It used to be the plain reset, because
  the view you chose and the default view were the same thing. They are not any
  more, so it returns to the angle Set start left the cube at — held in screen
  state, tagged with the solve it belongs to, and falling back to the default
  after a cold start, because the angle is still not in the file.
- **Front must be chosen among the faces perpendicular to up.** Taking "highest
  on screen" and "nearest the camera" as two independent argmaxes returns the
  *same face* for both when you look down a body diagonal — yaw 45°, pitch 45°,
  one drag from the opening view — and that pair is not an orientation at all.

The 24 orientations and the shortest rotations to each are found by breadth-first
search at module load, not written out: a hand-written table of 24 rotation
sequences is 24 chances to be wrong in a way no reviewer can see, which is the
same argument §3 makes about facelet permutations.

**Sixteen of the twenty-four holds are reachable, and that is a known limit.**
The camera is yaw-then-pitch with **no roll** — a two-parameter family — so the
holds it can land on are a surface through the 24, not all of them. Every hold
with **white or yellow on top is reachable, all four fronts each**, and those
are every hold this epic supports: colour neutrality is explicitly out of scope
(§8.2, §9.9), so a solve starts from white or yellow up. The missing eight all
have a *side* colour on top **and** a side colour in front — turning the cube
onto its side is fine, spinning it about the axis you are then looking down is
not. Reaching them means giving the camera a roll axis, which is the change to
make **if and when colour neutrality lands**, and not before.

**A hold is described in colours, never in rotations** — "yellow up · blue
front", live under the cube as you pan. Nobody inspecting a cube thinks in `z2`,
and reading colours off a 120-point cube is guesswork.

~~Because the hold is baked into the model, "the view I chose" and "the default
view" become the same thing.~~ **Not since 2026-08-03**: the camera stays where
you left it, so `Start view` goes back to the angle you set from rather than to
the opening one. It is no longer the same button as `Reset view`, and the two
now differ in solve mode by exactly the amount the operator panned before
tapping Set start.

**Locked once the solve has moves** (operator, 2026-08-02): re-orienting under
moves already written would silently change what every one of them does.

### 8.4 Swipe-to-turn, considered and declined

Turning layers by swiping the cube directly was raised and **dropped as too
complicated** (operator, 2026-08-02) — recorded so it is not re-proposed as new.
The finding that made it plausible is still true and still written down, if it
ever comes back: `buildScene` already returns screen-space polygons sorted
back-to-front, and each tile's key is `x,y,z|nx,ny,nz`, so hit-testing a finger
to a sticker is point-in-polygon with no raycasting. What stopped it is that the
cube already claims every pan for orbit, so the two would have to be told apart
by where the drag starts, and swipes cannot say `2`, wides, or rotations without
more gestures on top.

### 8.5 Annotating the move groups (Step 6, specified 2026-08-02)

The operator, thinking ahead: *"I want to be able to annotate the move groups.
Like these moves solve first block. This set solves second block."*

A solve is a flat list of moves; this gives it structure. Four decisions worth
making in the plan rather than in the moment:

- **Markers, not ranges.** A phase is `{ at, label }` — the move index it starts
  at — and the spans fall out of consecutive markers. Storing start-and-end
  invites the two to disagree, and every edit has to keep both honest.
- **Mark as you go, not afterwards.** The flow is *finish the first block, say
  so, carry on* — a single "end the phase here" control while writing, which
  closes the current group at the current position. Selecting ranges after the
  fact is a second interaction for the same information, and the moment you know
  a block is done is the moment you finish it.
- **Offer the method's own vocabulary.** Roux is First block · Second block ·
  CMLL · LSE; CFOP is Cross · F2L · OLL · PLL. One tap on the name beats typing
  it on a phone every time, and the names are the point — this is the operator's
  method talking back to them. Free text stays as the escape hatch.
- **Per-phase move counts fall out for free, and are half the value.** "First
  block in 8" versus "first block in 12" is exactly what a Roux learner is
  trying to improve, and once the spans exist the counts are a subtraction. The
  transport gains the other half: **play just the second block**, jump to where
  CMLL starts. Drilling one part of one solve is what the operator has been
  doing by hand all along.

This is why §7.1 says decide the save shape once: `phases` is a third field on a
solve, and it should exist in the file before it exists in the UI.

**Shipped 2026-08-02.** Three things it learned, all of them about the fact that
a marker is an index into a list that is still being edited:

- **Closing a group writes two markers, not one.** The name goes onto the
  boundary the group *started* at, and a fresh unnamed boundary is opened where
  it ended. The second one looks like bookkeeping and is not: without it the
  named span runs to the end of the solve, and `First block · 8` quietly becomes
  `First block · 12` as the second block is written. It is the same shape as the
  counts rule — the moment a number is stored rather than derived, something has
  to keep it honest.
- **The rule for what an edit does to a marker has to be one function.** Undo
  removes the last move; a marker at that index now points at nothing.
  `clampPhases` is the single answer, called live by the screen on every edit to
  the moves *and* by `sanitizeSolves` on the way out of the file. Two
  implementations of one rule is a marker that survives a reload but not an undo,
  or the reverse. Dropping is the honest answer rather than clamping: the move
  that closed the group is gone, so the group is open again and its name is still
  on it, counting up from where it was.
- **A one-tap control needs a way to take the tap back**, and the cheapest one
  turned out to be the same control. Naming a group whose boundary already
  exists can only mean the group behind it, so a second tap on the flag
  *renames*. The alternative — refusing, because there is nothing new to close —
  is a dead end that a headless driver found within a minute of the bin being
  added: remove a marker and the group it left behind could never be named again
  without writing another move.

### 8.6 Give the page back to the cube (Step 7, specified 2026-08-03)

The operator, looking at solve mode on a 393×852 phone: *"something that is
bothering me is how much space all the chrome is taking — I want to make more
space for the cube."*

They are right, and the measurement is worse than it looks. Here is that screen,
mid-drill on a 42-move solve:

| Row | pt | |
|---|---|---|
| Header | 75 | the title **wraps to two lines** |
| Scramble line | 20 | |
| Move card | 143 | five wrapped lines, **and it grows with the solve** |
| Phase strip | 24 | |
| Action row | 48 | |
| **Cube stage** | **228** | **31% of the page** |
| Scrubber | 39 | |
| Move pad | 115 | three rows |
| Solve bar | 21 | |

**485 points of chrome against 228 of cube.** The narrow case is already written
down and is worse: at 320×568 the cube gets 114–138.

#### The rule this step establishes

**The cube is the subject of this screen and it should be sized first, not
last.** Today every other row takes its natural height and `stage: { flex: 1 }`
gets the remainder — so the cube is the one element on the page with no floor,
and every row added since Step 2 has come out of it. That is exactly backwards
for a tool whose entire interaction is looking at and turning a cube.

So: **every row is on a budget, and the budget is justified against the cube.**
The doc discipline for this already exists and is good — §8.5 records that the
phase strip costs the cube 24 points, and the handoff records 138 → 114. Keep
that accounting; this step just makes the cube's share the number that has to
hold rather than the one that absorbs.

**Definition of done, and it is a sharp one: the cube should be limited by the
width of the phone, not by what is stacked above it.** At 320 points wide the
cube's square is about 300 and today it gets 114 — so the page is costing it more
than half of what the device could give. When `stage.height` stops being the
binding constraint in `cubeSize`'s `Math.min`, the chrome is no longer the
problem.

#### What gets cut, and why each one is honest

Roughly 200 points, which takes the stage from 228 to about 430 — **31% of the
page to 58%**, and the drawn cube from 164 points to something over 300.

- **The move card, capped at two lines that scroll.** ~143 → ~46, and this is
  the one that matters most because it is the only row that **grows as the
  operator drills**. A 42-move solve is five lines; a longer one is six. The
  block is doing three jobs — read the whole solve, see where you are, tap a
  token to turn there — and it is sized for the first, which is the job the
  *cube* is there to do. Windowing it to a fixed two-line track that scrolls to
  follow the current move keeps the other two intact.

  **This does not reopen §2's "the screen does not scroll" rule.** That rule is
  about the *page* competing with the cube for the same drag, and it stands. A
  bounded strip well clear of the cube's square is the same shape as the phase
  strip, which already scrolls sideways for the same reason (§8.5) — and Step 6
  shipped it without the pan ever noticing.

  **Two lines is the right resting size and the wrong size for reading a solve
  back**, which the operator said as soon as they had one in their hands: *"the
  solve display could be a drawer with a handle. Or a way to view the whole
  thing."* So it is a drawer. A 16-point grab bar under the moves; pull it down
  or tap it and the panel opens to **exactly** the height the whole solve needs,
  capped by what the stage can lend.

  Three things about it are the point:

  - **It opens over the cube rather than pushing it.** The panel is positioned
    out of the flow from a wrapper that keeps the closed height, so the stage
    never re-measures and `cubeSize` never changes. A drawer that resized the
    cube each time it was opened would be this step's own bug arriving by
    another door.
  - **The open height is measured, not estimated.** How many tokens fit on a
    line depends on the width of the phone and on how many of them are `M2`
    rather than `U`. The first cut guessed eight per line and opened onto a band
    of empty space.
  - **It costs the closed page 16 points** — the handle — and that is the honest
    price. Solve mode at 320×568 goes 210 → 194 rather than staying at 210. Say
    what a row costs; this one is worth it.

- **The header, halved.** ~75 → ~36. `ScreenHeader` gives the title a `flex: 2`
  centre column, which at 393 points is about 186 — and *"Cube Scramble"* at 24pt
  bold does not fit, so the title wraps and the header is two lines tall to say
  something the operator knew before they tapped the tile. A dense variant is the
  fix. **This is shared-component code** (`components/ScreenHeader.js`), which is
  a departure from the golden rule that cube work stays in `games/cube/` — so it
  wants an opt-in prop with the current behaviour as the default, and Fungiku's
  screen checked rather than assumed.

- **The action row, folded away in solve mode.** ~48 → 0. `Scramble` /
  `Start view` / turn-around are three buttons on a row of their own; the first
  is navigation that belongs beside the home button, and the other two are view
  controls that belong with the view. The row's own comment already admits the
  squeeze — one of the three is icon-only *because labelling it wraps the row and
  the 40 points come out of the cube*.

- **The scramble line, folded into what is already there.** ~20 → 0. While
  writing, "which scramble am I on" is one muted line above the card; the solve
  bar at the bottom already carries the page's identity and can carry this too.

- **Scramble mode gets the same treatment** (operator, 2026-08-03). It currently
  spends an action row, a permanent hint line and a *second* button row — about
  110 points for six buttons and a tip. One consolidated control row, and the
  hint goes: *"Drag the cube · tap a move to turn to it"* is a sentence that
  earns its 21 points on the first visit and never again. Doing both modes is not
  symmetry for its own sake — half-treating them makes two screens out of one.

#### Three things to get right

- **Do not buy the space by making the controls harder to hit.** The pad's keys
  and the transport are thumb targets on a phone; 44 points is the floor and the
  cube is not worth breaking it for. All ~200 points above come from text,
  padding and rows that duplicate each other, and none from a shrunk target.
- **A row that disappears is worse than a row that is short**, if what it said
  is still needed. Every cut above either moves the information somewhere that
  was already on screen or deletes information the operator no longer needs.
- **The cube must not resize as you type.** The stage is measured
  (`onLayout`), and a track that changes height at the fourth move would resize
  the cube mid-solve. The whole point of a *fixed* two-line track is that the
  cube's box stops moving.

#### Shipped 2026-08-03, and the measurement was worse than this section said

The table above was read off the operator's screenshot. Driving the export and
measuring every row found the case nobody had looked at: **at 320×568, on a
42-move annotated solve, the cube was four points tall.** Not 114 — the 114 in
these docs was measured on a shorter solve, and the move card is the row that
grows. A solve long enough to be worth annotating was the solve that crushed the
cube to nothing, which is to say the tool failed hardest exactly where it was
being used hardest.

| Solve mode, 42 moves, annotated | before | after |
|---|---|---|
| 320×568 | **4** | **194** |
| 375×667 | 125 | 293 |
| 393×852 | 318 | 373 (width-bound) |

Scramble mode: 166 → 300 at 320×568. Inspection, which was already the good
phase, went 247 → 300 and is now width-bound too at every size.

(Those numbers are 16 points off the first cut's — 210 / 309 — because the
drawer's handle came after them. The trade is stated where the drawer is.)

**The sharp definition of done is met**: at 393 the binding term in `cubeSize`'s
`Math.min` is the width rather than `stage.height`, at all three sizes for the
scramble and inspection, and at 320 solve mode is within about 90 points of it
with the pad, the transport and the phase strip all still on the page.

Five things it learned:

- **`flex: 0` is not "size to your content" on the web.** The dense header's two
  end columns used it and react-native-web read it as `flex-basis: 0%` with
  shrink still on, so both ends collapsed to their padding and their buttons hung
  off the right edge of the screen. Spell out `flexGrow` / `flexShrink` /
  `flexBasis`. Caught by the horizontal-overflow check the drivers have run since
  Step 1 — which had never once fired before, and paid for itself here.
- **A style variant has to be a whole style, not an override layered on the
  base one — and this is the cautionary one, because it only broke on the
  phone.** Written `[styles.leftSection, dense && styles.leftSectionDense]`, the
  flattened result carries *both* the base `flex: 1` and the variant's
  `flexGrow` / `flexShrink` / `flexBasis`, and **the two platforms do not agree
  on which wins**. Every browser check passed at three widths; on a real iPhone
  the home button was a sliver and the view controls were off the right of the
  screen, and the operator found it in the first screenshot they took. Pass one
  object or the other (`dense ? a : b`) and there is nothing to disagree about.
  The general lesson is older than this bug: **`expo export --platform all`
  proves it bundles, not that it lays out.** Only a device does that, which is
  why plan §8 has required a device pass since Fungiku.
- **A fixed-height track needs every child to be exactly one line tall.** The
  phase divider is a bar glyph, which fills its em where a letter does not, so it
  made its row a couple of points taller than `LINE` — and the auto-scroll, which
  is computed from `LINE`, drifted a little further out of step on every row and
  left a sliver of the previous line along the top edge. Fixed heights on every
  child, and the glyph a size smaller.
- **Neither of the two above is visible in anything but a screenshot.** No test
  failed, no overflow check for height fired, `expo-doctor` was 18/18 throughout.
  §10's entry — a wasteful page is not a failing one — turned out to describe the
  step's own bugs as well as the problem it was fixing.
- **The card had been drawing the open solve's phase markers across the
  scramble.** A red divider, in the middle of a scramble, which has no phases and
  cannot have any. It shipped in Step 6 and survived because you have to open a
  scramble that already has an annotated solve behind it to see one — which the
  driver's seeded save file does by construction. Fixed on the way past.

### 8.8 The designed solve screen (Step 8, specified 2026-08-04)

A settled design bundle, made in Claude Design and reachable from
**`claude.ai/design/p/2acc14f2-7f7e-434f-a29d-e0fe29fa876a`**. Read it with the
`DesignSync` MCP (`get_file`), which needs a design authorization (`/design-login`
in an interactive session).

| Path in the project | What it is |
|---|---|
| `Cube Solve Screen.dc.html` | **the spec** — the screen at 375pt, the four hold states drawn out, the tint table, the transport glyphs large |
| `design_handoff_cube_move_pad/README.md` | **read this first** — every measurement, colour, timing and interaction, written as a handoff |
| `design-decisions.md` | the platform-level decisions, with a settled "Cube move pad" section |
| `Cube Solve Screen - prime options.dc.html` | the **rejected** prime treatments, kept so they are not re-proposed |
| `support.js` | the design-doc runtime. Nothing to port — it renders the mock in a browser |

**The mock is not code to copy.** It is HTML/CSS in a browser, shares nothing
with the app, and its cube is a flat CSS isometric fake standing in for the real
renderer. The job is to rebuild it in React Native against the app's theme and
`StyleSheet`s, in the shape `CubeMovePad.js` / `CubeScrubber.js` /
`CubePhaseStrip.js` already have.

#### What it actually changes

Two things are the point, and the rest is dressing:

- **Prime is a press-and-hold**, not an armed modifier. Tap fires on *touch-up*
  and appends `R`; hold past **180ms** appends `R'`, with a 3pt hairline filling
  across the key's foot from 0ms, an accent ring and a `'` mark at the threshold,
  a haptic tick, and slide-off to cancel.
- **A second tap on the same key promotes the token already written** — `R` then
  `R` is one `R2`, never two `R`s. A third tap starts a fresh `R`.

Everything else follows from having the whole key face back: the pad becomes a
**spatial cross** where the faces sit where they are on a cube net, six columns
by three rows of 55.6 × 44pt keys, with `E` and `S` joining the slices and
column 3 row 1 deliberately **empty** — the gap is what makes the cross read as a
cross. Four tints group the keys (neutral faces, cool slices, green wides, sand
rotations); tools stay outlined; the flag is the only accent fill. The scrubber
gains a **phase-split tick track** — one tick per move, grouped by Roux phase, the
current move the only full-height one — and five transport glyphs redrawn as one
family at stroke 1.9 in a 24pt box.

#### This answers §9.8, which has been open since Step 3

*"How a move gets entered"* has been the epic's live question since the armed
modifier shipped, and the plan said it wanted a real drilling session rather than
an opinion. It got one. The design's rejected column is the same shortlist §9.8
wrote down, decided: **a standalone `'` key** works and costs two taps, and is
the fallback if hold tests badly; **swipe up** is unreliable in a dense grid;
**a 20pt prime strip per key** leaves 35.6pt for the letter at six columns, which
is under a thumb's contact patch — and a mis-hit there turns the cube *the wrong
way* rather than doing nothing. That last argument is the good one and it is why
the strip lost.

#### Where the design and this plan disagree, and who wins

**The design was drawn against the screen as it was before Step 7**, and four of
its decisions run into §8.6's budget rule. None of them is a reason not to build
it; all of them need deciding rather than discovering.

- **The cube's height.** The bundle budgets the cube **118pt** and says in the
  same breath *"the pad is fixed; the cube flexes"* and *"verify this against the
  real stack"* — which is §8.6's rule in the design's own words, so there is no
  real conflict, only arithmetic. But the new chrome is **heavier**: the scrubber
  card goes 42 → 86, the pad 126 → 142, a legend strip adds 34, and the phase
  chips gain padding. That is about **+95pt off the cube**, which at 375×667
  takes it from 293 back to roughly 200. **Step 7's rule holds: say what it
  costs, in points, in the PR.** If the legend is what pushes it over, the legend
  is the thing to question — four tints that need a permanent key may be four
  tints too many, and the key is the first row a returning operator stops
  reading.
- **The solve card.** The design draws it as an auto-height card with every token
  wrapped — which is *exactly* the card Step 7 removed, for the reason that it is
  the only row that grows as you drill, and at 42 moves and 320pt wide it had left
  the cube four points. **Keep the fixed two-line track and its drawer**, and take
  the design's token *styling* — 12pt mono, radius 4, played `#333`, unplayed
  `#a8adb8`, current white on accent at weight 700. The design was drawn at 21
  moves; the operator's real solves are twice that.
- **Clear, and the solves list.** The design removes Clear from the pad — *"nothing
  that edits the solve wears a move colour"* and clearing does not belong under a
  thumb — and puts it in a header settings control. Agreed, but note what else is
  homeless: the bottom **solve bar** is not in the design, and it is currently the
  **only** way into the solves list. Whatever the settings control becomes has to
  carry both, or the picker has to keep its bar.
- **The method chip.** Roux ↔ CFOP in the header, which the bundle says *"rewrites
  the pad's slice/wide complement and the phase grouping of the tick track"*.
  **That is a feature, not a chip.** CFOP is not in this epic yet and §8.5 only
  ships Roux and CFOP *names*. Build the chip if it reads as a label for the
  method already in use; do not build the switch.

Two smaller ones worth catching before they are built:

- **The keyboard key means something different in each.** On the pad today it
  opens the text field for a whole algorithm; the design describes it as a toggle
  that *"collapses the pad and gives the height to the cube"*. That second thing
  is a good idea and is most of open question 14 — but it is not the same button,
  and losing the way to paste an algorithm would be a regression.
- **The design is a set of light-mode hexes.** This screen is themed
  (`useAppTheme`), and `design-decisions.md` says the platform is heading for
  semantic tokens but is not there yet. Map onto `theme.colors` where a token
  exists, and where one does not, add it in the cube's own palette rather than
  hardcoding `#ffffff` into a screen that has a dark theme.

#### The parts to take unchanged

The measurements, the timings and the glyph family are the settled work and are
worth following to the point: 44pt rows, 5pt gaps, radius 10 keys, the four tint
triples, 180ms with a 120–320 range, backspace repeat at 120ms, and five
transport glyphs that differ only in chevron count with play as the only filled
glyph and only circle. **Backspace removes a token whole** — `R2` goes to nothing
in one press, not to `R`.

#### Two things use changed, the same day (2026-08-05)

**The operator drilled on it and sent back two corrections.** Both are the kind
only a hand finds, and both are recorded here because the reasoning is worth more
than the diff.

- ~~**The phase-split tick track.**~~ **Removed.** *"Let's remove the red
  segments above the scrub controls."* It was a reasonable thing to try and it
  was wrong: at 42 moves each tick is about six points wide, so the "picture of
  the solve" is a row of identical dashes, and the position it encodes is said
  exactly by `42 / 42` an inch below it. **It cost 22 points of cube to restate a
  number.** The phase *chips* above the cube already carry the part that was
  earning its keep — the counts, and tapping one to play that block.
  `tickTrack.js` and its tests went with it.
- **Prime is now two gestures, not one.** *"It's hard to see the prime symbols
  when your finger is on the button and holding."* Exactly right, and it is the
  one thing three viewport widths in a browser cannot show you: **the hold's
  entire confirmation — the fill, the ring, the `′` — is drawn on the key being
  held, which is the key under the thumb.** The browser has no thumb. So the
  armed `′` is back, in the cell the design left empty, as a *second route*
  rather than a replacement: tap `′`, then the key. Its feedback is everywhere
  the hand is not.

The armed route brings back **Step 3's one genuinely good idea about modifiers**:
while `′` is armed every move key relabels itself to `R'`, `U'`, `M'` … so the
second tap is aimed at a key that already reads the move it will make. What is
*not* brought back is filling those keys accent — that was tried and it erases
the four tints and the flag's status as the only accent fill. The relabelling
plus one lit key is enough, and it keeps the pad readable.

**The two routes differ on one rule, deliberately.** An armed prime beats a
pending promotion, because arming is a statement: you tapped `′` and then `R`,
and that can only mean `R'`. A *hold* still loses to a promotion, because a hold
is a duration and a finger resting a moment too long on the second tap should do
the harmless thing (`R2'` is `R2`). That asymmetry is in `applyPadPress`.

**The cube got the tick track's 22 points back:**

| Solve mode, 42 moves, annotated | Step 7 | Step 8 as designed | Step 8 as shipped |
|---|---|---|---|
| 320×568 | 194 | 123 | **145** |
| 375×667 | 293 | 222 | **244** |
| 393×852 | 373 | 373 | **373** (width-bound) |

So the designed screen costs the cube **49 points**, not 71.

#### What building it settled (2026-08-05)

**It shipped as specified**, including the four reconciliations above: the fixed
track kept its drawer and took only the design's token styling, Clear left the
pad, the method chip was not built, and the light-mode hexes went through a
palette instead of into a `StyleSheet`. Four things are worth not rediscovering.

- **The design's "10pt side margins" are measured from the screen edge, and the
  page already provides them.** Setting them on the scrubber card as well
  double-counted, and pushed the transport one point off the right edge of a
  320pt phone. The horizontal-overflow check caught it, as it caught Step 7's —
  that check has now found a real bug in two consecutive steps.
- **The transport row does not fit 320 at the design's spacing.** It was drawn at
  375, where the card has 333 points inside it and the row wants 292; at 320
  there are 282. The first fix let the two end labels shrink, and the position
  readout came out as `39 / …` — the one thing on that row that has to be read.
  **Air first, then labels, never the targets:** the gap went 10 → 6 and the
  buttons kept their size.
- **On a dark theme the four tints cannot live in the backgrounds.** Tinting them
  toward the theme surface far enough for a dark key leaves the four **ΔE 0.9–2.6
  apart**, against the 6.12 the design has between them on white — the exact
  mistake the Fungiku regions made. The grouping moved to the **border and the
  label**, which come out ΔE 6.3–6.9 apart, and `padPalette.test.js` now puts a
  number under both the separation and the label's contrast on all eight themes.
  It caught a third thing on the way: mixing the label toward the *theme's* text
  colour breaks on `twilight`, whose title is a mid-lightness purple — contrast
  3.1 on its own key. Lift toward white, not toward the theme.
- **The promotion is guarded by the text, not by the timer.** A promotion
  *rewrites* the last token where an append only adds one, so a stale one would
  resurrect a move an undo had just deleted — the race Step 3 shipped twice,
  pointed at something worse. `promoteLastToken` refuses on anything except a
  last token that is exactly the key, so the race is closed by construction
  rather than by the disarm-on-undo that also happens.

**What it cost the cube as first built**, on a 42-move annotated solve — see the
table above for what it cost once the tick track came out:

| Solve mode, 42 moves, annotated | Step 7 | Step 8 as designed |
|---|---|---|
| 320×568 | 194 | **123** |
| 375×667 | 293 | **222** |
| 393×852 | 373 | **373** (width-bound) |

−71 points at the two smaller sizes and nothing at the largest. The chrome grew
by about 100: the scrubber card 42 → 81, the pad 126 → 152. **The legend is the
row that gives**, exactly as this section predicted — it is drawn only where the
cube is already limited by the width of the phone rather than by the page
(`LEGEND_MIN_HEIGHT`), which is §8.6's budget rule made executable. Without that
the 320 case was a 94-point cube, which would have undone a third of Step 7.

**The operator answered it the same day**, and the answer was "not like that":
the tick track came out and the cube took its 22 points back, leaving the real
cost at **49**. What was bought for it: two routes to a prime rather than two
taps, and `E` and `S` on the pad.

### 8.7 Editing a solve you have already written (Step 9)

Written up when it was Step 7, moved to 8 by the layout work and to **9** by the
design bundle (§8.8, 2026-08-04). Kept here intact each time, because it is the
oldest live gap in the feature and only the ordering has ever changed.

**The text field appends; it cannot edit.** A typo in the middle of a solve is
fixed by undoing back to it and retyping everything after. Fine when the solve
was a scratchpad (Step 3), not fine once solves were kept (Step 4), and Step 6
put markers on top of the same text.

- **Replace the text rather than appending to it.** `CubeAlgInputModal` already
  validates a whole algorithm and says which token it choked on; the honest shape
  is that modal opened with the solve already in it. Appending stays — it is what
  the field is for mid-write.
- **Keep the markers on the moves they were put on.** A phase is an index
  (§8.5), and a wholesale replacement moves every index after the edit.
  `clampPhases` keeps them *legal*, not *right*: insert a move at position 3 and
  `First block · 8` should read `· 9`. A diff between the old and new token lists
  shifts each marker by how much the text before it grew or shrank; a marker
  inside a stretch rewritten wholesale has no honest answer and probably wants
  dropping. **This is the hard half of the step.**
- **An edit must not replay the solve.** `extendsAlg` asked at where the cube is
  (§5) already tells "grew" from "replaced" — the trap is bypassing it with a
  "this was an edit" flag, and a replacement that happens to be an extension is
  still an extension.

**Each re-order has made this step easier rather than staler.** Step 7's brief
used to say the screen was full and an edit control had to replace something or
live in a modal; §8.6 gave it a page to sit on. Then the design bundle (§8.8)
**put the affordance somewhere specific**: an `Edit` link on the solve card's
caption row, 10pt weight 600 in the accent, opposite `Solve 2 · 21 moves`. So
whoever takes this step no longer has to design its way in — that argument is
settled and the work is the marker arithmetic, which is where it always
belonged.

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
5. ~~**Where a solve comes from.**~~ **Answered, and it replanned the epic**
   (operator, 2026-08-01): solves are **written by the operator**, not computed.
   The question was whether a solver should optimize for move count or follow the
   method's own logic; the real answer was that neither is wanted yet. See §8.1.
6. **Left-handed drag.** The current mapping is "push the surface under your
   finger". Nobody has complained yet because nobody has used it yet.
7. **Turn speed.** Answered and shipped in Step 2 — a chip cycling 1× → 2× → 0.5×.
   Not persisted; see §7 and the note under Step 3 in the handoff.
8. ~~**How a move gets entered.**~~ **Answered by a design round** (2026-08-04)
   **and shipped in Step 8** (2026-08-05), and it was the epic's longest-running
   question — open since Step 3 shipped the armed modifier. The answer is
   **press-and-hold for prime, second tap for a half turn** (§8.8). The three
   alternatives this question listed are all decided in the bundle's rejected
   column: a standalone `'` key works, costs two taps, and is the fallback if
   hold tests badly; swipe-up is unreliable in a dense grid; and a per-key prime
   strip leaves 35.6pt for the letter at six columns — under a thumb's contact
   patch, where a mis-hit turns the cube *the wrong way* rather than doing
   nothing.

   **What is left is use, not design.** The hold has been driven as a timed
   gesture at three widths and behaves; whether **180ms** is the right threshold,
   and whether a hold reads as natural under a thumb mid-drill, are things only a
   real session answers. The fallback is written down and cheap — a standalone
   `'` key, which the pad now has a spare cell's worth of room for nowhere, so it
   would cost the layout a rethink rather than a slot.

   What the armed modifier got right and should be carried forward: **the pad
   showed the arming**, relabelling every key to `U'`, `R'`, `M'`, so the second
   tap aimed at a key that already read the move it would make. Hold-for-prime
   keeps that promise differently — the fill starts at 0ms, so the key is telling
   you what will happen before it happens. A hidden gesture with no fill would be
   worse than the two taps it replaces.

   Still true and unchanged: `x`/`y`/`z` **stay on the pad** (operator,
   2026-08-02), because a solve occasionally needs a rotation mid-way, even
   though the hold is panned to rather than typed since Step 5.
9. **Does the cube want a mode with no chrome at all?** New with Step 7
   (2026-08-03). §8.6 gets the cube from 31% of the page to about 58% by cutting
   rows; the remaining 42% is the pad, the transport and the moves, and every one
   of them is needed *while writing*. But **inspecting is already proof that
   dropping the lot works** — Step 5 gives the cube most of the page by taking
   the transport and the pad away, and the operator liked it. A tap on the cube
   that hides everything but the cube would extend that to reading a solve back.
   Step 7 deliberately does not build it: cutting the chrome that is there beats
   adding a way to hide it, and if 58% turns out to be enough this question
   answers itself.

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
- ~~**Pitch past the pole.**~~ **Reversed on 2026-08-02, and this is the
  cautionary one.** Pitch was clamped just short of ±90° so the cube could never
  roll over and invert the drag. The clamp was correct about the symptom and
  quietly made **yellow-up impossible to pick** — D is only the highest face on
  screen when `cos(pitch) < 0`, so the traditional Roux hold was unreachable *by
  construction*, and it was the first thing the operator tried once inspection
  shipped. The clamp is gone; the inversion is handled instead, by reversing the
  *horizontal* drag when `geometry.isUpsideDown(pitch)`. Only the horizontal
  needs it: increasing pitch applies its rotation directly in view space, so a
  vertical drag reads the same at every angle, while increasing yaw spins about
  the world's up-axis, which points down the screen once the cube is over.
  **A constraint added to prevent a feeling can silently remove a capability**,
  and nothing failed — there was simply a hold you could not name.
- **`faceBasis` only spans an *axis-aligned* normal.** It is a lookup on which
  component is non-zero, which is fine for a still cube and wrong for every
  frame of a turn — a square built from a half-turned normal comes out
  unrotated at a rotated centre, so the tiles come off the cube in the middle of
  every move while both ends stay perfect. The fix is the one that generalizes:
  build every square on the lattice and **carry its four corners** through the
  same rotation as the cubie. This got as far as a screenshot before it was
  caught, and no test that checks only `t = 0` and `t = 1` can see it — the ones
  that do are `moves smoothly` and `leaves and lands without a jump`.
- **A rotating square has no stable corner order.** Comparing two frames by
  sorting each polygon's corners looks reasonable and is not: which corner sorts
  first changes as the square turns, so the comparison reports a 40-point jump
  where the picture moved four. Compare each corner to the *nearest* corner of
  the other polygon.
- **An effect keyed on `scramble` fires during hydration, and hydration is not a
  change of mind.** The screen mounts with an *empty* scramble and fills it from
  storage, so `useEffect(…, [scramble])` runs once on the way in — which was
  harmless when all it cleared was an in-memory scratchpad and became a bug the
  moment there was a restored workspace for it to wipe. Changing the scramble is
  something two buttons do (New, and loading a favorite), so it belongs in those
  two callbacks, where hydration cannot reach it. This is the same shape as the
  cold-start replay in §5: **the empty first render is a state, and anything
  keyed on "it changed" sees it.**
- **Sizing from the window.** A cube sized as a share of the window looked right
  on a 6" phone and pushed its own caption through the buttons on a 4" one,
  because the space left over depends on how many lines the header and scramble
  took. The stage measures itself.
- **A row that wraps is a row that doubled, and nothing reports it.** The header
  has been two lines tall on a 393-point phone since Step 1 — `ScreenHeader`
  gives its title a `flex: 2` centre and "Cube Scramble" does not fit in it — and
  no test, no overflow check and no doctor run has ever mentioned it, because
  wrapping is not an error. The overflow checks the headless drivers run catch a
  page that is too *tall*; they cannot catch a page that is merely wasteful. The
  only instrument for that is looking at a screenshot and adding the rows up,
  which is what §8.6's table is.

## 11. Prior art and licensing

- **`cubing.js`** (<https://github.com/cubing/cubing.js>) is what
  `scramble.cubing.net` is built on — `randomScrambleForEvent` and the
  `<twisty-player>` element. Dual GPL/MPL; as a library it can be treated as
  MPL, which is file-level copyleft and fine to depend on. It is browser-first
  (Web Workers, WASM), so using it means the WebView route in §5.
- **Kociemba's two-phase algorithm** is the standard basis for a solver, which is
  now the last row of §8 rather than the middle of it (§8.1). There are
  permissively licensed JS ports; check the licence of whichever is picked, and
  prefer one small enough to read.
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
