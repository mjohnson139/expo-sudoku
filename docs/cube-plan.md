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

## 8. Delivery steps

One branch per step, per `.github/dev-process.md`. Every step must ship something
the operator can open in Expo Go.

| Step | What lands | State |
|---|---|---|
| **1** | Scramble · 3D cube you can drag · favorites · hub tile | **shipped** |
| **2** | **Play the scramble.** Animated layer turns and a move-by-move scrubber | **shipped** |
| **3** | **Solve mode.** Enter moves and the cube turns — a move pad and a text field, on the scrambled cube | **shipped** |
| **4** | **The workspace survives.** Nothing you wrote is lost to a backgrounded app; several named solves per scramble | next |
| **5** | **Orientation.** Record how the cube is held before a solve starts — Roux's inspection step, "yellow up, blue left" | **shipped** (out of order, 2026-08-02) |
| **6** | **Annotate the move groups.** "These moves solve first block, these solve second block" — labelled spans, per-phase move counts, and a transport that steps phase by phase | |
| **7** | **Enter a cube by hand.** Paste an algorithm, or set the colours facelet by facelet, for a cube that came off a table rather than out of the generator | |
| **8** | **A solver**, if it is still wanted by then — and random-state scrambles off the back of the same search | |

Steps 3–6 are the operator's actual goal. Steps 4–6 are increments on Step 3:
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
- **A name**, eventually, so two attempts at the same scramble can be told apart.

Several solves belong to one scramble, because trying it three ways is the
practice. That is Step 4; Step 3 deliberately ships **one** unsaved solve so
there is something to try before the save-file shape has to be settled (§7).

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
- **The angle is thrown away and only the hold is kept.** There are 24 holds and
  infinitely many angles to look at one from, so setting one is a visible jump
  back to the standard three-quarter view — deliberately. Inspecting from
  directly overhead is a fine way to decide "blue up, white front" and a bad way
  to look at a cube you are about to solve.
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

Because the hold is baked into the model, **"the view I chose" and "the default
view" become the same thing** — so the shortcut back to it is the reset that
already existed, under the name it now deserves (`Start view`).

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
8. **How a move gets entered.** Rotations came off the critical path in Step 5 —
   the hold is panned to, not typed — but `x`/`y`/`z` **stay on the pad**
   (operator, 2026-08-02) because a solve occasionally needs one mid-way. Step 3
   ships a pad with `'` and `2` as modifier
   keys you arm before the face. Roux is prime-heavy, so that is two taps for a
   very common move, and it is the first thing to revisit once the operator has
   drilled a real solve on it. The alternatives are written up in the handoff.
   What makes two taps bearable in the meantime is that **the pad relabels
   itself** while a modifier is armed — every key reads `U'`, `R'`, `M'` — so
   the second tap is aimed at a key that already says the move it will make.

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
