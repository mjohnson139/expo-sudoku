# Cube touch — turning the cube by dragging its stickers

**This began as an exploration and is now a Cube Flow step.** It was written to
be started cold and abandoned cheaply; it was not abandoned. What it is now is
**Step 3.5 of the Cube Flow epic** (tracker #107), landing between Step 3 (the
solve cards) and Step 4 (method as data).

**Read §8 before §3.** The spike ran four rounds past the build this step
carries, and §8 is the record of which of them are in and which are deliberately
not — including one that was built, reverted, and must not be rebuilt from
first principles.

## What the operator asked for

> I want the cube to respond to multi-touch, multi-pressure — so you can slide
> your fingers over the cube and it won't completely turn it unless you push the
> pressure a little more; then the direction of the finger moving dictates which
> rotation, forward or prime, and which face is turning based on the position of
> the finger.

In one sentence: **the cube stops being a picture you orbit and a pad you type
at, and becomes the thing you turn.** Put a finger on a sticker, push, drag —
that layer goes round the way your finger went.

It was not on the Cube Flow roadmap (`docs/cube-flow-plan.md`) and did not
block it. The spike's question was *does this feel right on a phone*; enough of
the answer came back yes that it earned a step. §8 is where that decision and
its cut line are written down.

## Standing context

- **Repo:** `mjohnson139/expo-sudoku`, app in `SudokuApp/` (Expo SDK 54 ·
  React Native · JavaScript). The cube is `SudokuApp/games/cube/`.
- **Read `docs/cube-plan.md` first** — the V1 epic's plan, and the reasoning
  behind every file this touches. §5 is the renderer, §8.3 is the hold, §8.6 is
  the layout budget. Then skim `docs/cube-flow-plan.md` for what is being built
  in parallel.
- **No lint, no typecheck.** `npm test` (node environment, no renderer) and the
  device are the whole net. Anything that could be *wrong* goes in a pure module
  with its own suite — `trackLayout.js` and `compareLayout.js` are the pattern.
- **Expo Go is the test loop.** A custom native module would break it, and the
  whole habit of testing on a real phone with it. That constraint decides §2
  below more than anything else.

### Where to branch

Branch from **`epic/cube-flow`**, not `main`: the epic is where the cube is
being actively restructured, and a spike built on the pre-navigator app will
have to be rebuilt anyway. The spike ran on `feature/cube-touch-spike` (PR #112,
closed unmerged — see §8); the step it became is a fresh branch off the epic.

**Expect `CubeScreen.js` to move under you.** Cube Flow Step 2 splits its 1525
lines into `CubeHome` / `CubeSolve` over a `CubeContext`. So: **put everything
you can into new files** — a pure module and a hook — and touch `CubeScreen.js`
in as few places as possible. If the spike proves out, it gets rebuilt as a
proper step on top of the split, and a spike made of two new files survives that
rebuild almost intact.

---

## 1. What the codebase already gives you (this is the good news)

Three things are already built that this feature would otherwise have to invent.
Read these before designing anything.

### 1.1 Picking a sticker is already solved, and exactly

`buildScene` (`games/cube/geometry.js:397`) returns every visible face as a flat
polygon **in screen coordinates**, already **sorted back to front**
(`geometry.js:516`). So "which sticker is under this finger" is not ray casting
against a 3D model — it is a point-in-polygon test against a list you already
have, and because the list is depth-sorted, **the last polygon that contains the
point is the frontmost one**. That is not an approximation: the comment at
`:397` explains why painter's order is exact here (only outward faces exist, on
a convex solid, back-facing ones culled).

What is missing is only *identity*. A polygon today carries `{ key, points,
fill }`, and the key is a string: `` `${keyPos.join(',')}|${keyNormal.join(',')}` ``
(`geometry.js:474`) — the cubie's lattice position and the sticker's outward
normal. **Do not parse that string.** Add the fields to the polygon instead
(`pos`, `normal`, and `kind: 'tile' | 'body' | 'seam'`), which is a two-line
change at `geometry.js:520-521` and costs the renderer nothing.

### 1.2 A turn that follows your finger is already renderable

`buildScene` takes `turn = { axis, layers, amount, t, turns }` and draws the
cube **part-way through a move** at any `t` from 0 to 1 (`spinFor`,
`geometry.js:324`), seams and all. The docstring's promise is the one that
matters here: at `t = 0` and `t = 1` the frame is identical, polygon for
polygon, to the still cube before and after.

So a finger-driven turn is **not new rendering work**. It is a `t` computed from
drag distance instead of from a clock. The animation this repo already runs
(`useScramblePlayer.js`) is the same `turn` object fed from `requestAnimationFrame`.
Yours is fed from `onPanResponderMove`. That is the entire difference.

### 1.3 Writing the move has one door, and you must use it

A move entered by gesture has to land in the solve exactly as a pad tap does, or
it will not be undoable, phase-clamped, persisted or comparable. The path is
`tapKey` → `editOpen(withMoves(current, applyPadPress(...)))`
(`CubeScreen.js:708`, `solve.js:223`). **`editOpen` is the only edit funnel and
`withMoves` the only moves-edit contract** — the plan says so in three places
and means it. Your gesture ends by calling the same thing `tapKey` calls, with a
token string.

---

## 2. The pressure problem — settled, and not the way this document expected

> **Superseded on 2026-08-17, before the probe was built.** The operator
> withdrew the pressure requirement outright:
>
> > "I don't need it to be pressure sensitive so really all we need is the
> > location identifies the face that will move, in the direction of the finger
> > moving … and then we give it a little spring or kinda loaded, so all I have
> > to do is move it towards that turn a little bit."
>
> So **there is no engage signal to detect** — the finger's *starting position*
> is the whole of it. Land on a sticker and drag, and that layer turns. §3.1 and
> §3.2 below are rewritten to match; the analysis kept underneath is still the
> reason nobody should go looking for `force` again.

**Step 0, the probe, was never built and should not be.** It existed to answer
one question — *is `force` real on this phone* — and nothing now depends on the
answer. That is the finding, and it is worth as much as a measurement would have
been: the feature does not need the sensor.

The analysis it was going to test, kept because it is still true and still the
argument against reaching for pressure later:

**The literal request may not be implementable on your phone, and it is cheap to
find out.**

What I believe, stated so the probe can prove me wrong:

- React Native exposes `force` on a touch **only on iOS**, and only on
  **3D Touch** hardware — iPhone 6s through iPhone X / XS / XS Max. Apple
  dropped the force sensor with the **iPhone XR (2018)**; everything from the
  **iPhone 11 onward has Haptic Touch**, which is a long-press with a haptic and
  reports **no force at all**. On those devices `force` is `0`.
- **Android touch events carry no pressure through React Native.** Android's
  `MotionEvent.getPressure()` exists natively, but RN's `nativeEvent` does not
  surface it, and many capacitive digitizers report a contact-area proxy or a
  flat `1.0` anyway.
- Reading it natively means a native module, which means **no Expo Go**, which
  means losing the test loop this whole project runs on. That trade is not worth
  it for a spike.

### Step 0 — the probe (cancelled)

*Was: a throwaway debug overlay rendering `identifier`, `pageX/Y` and `force`
for every active touch, shipped as a preview and pressed hard on a real phone.*

Cancelled by the operator before it was built, for the best possible reason —
the design stopped needing what it was going to measure. **If a later step is
ever tempted back toward pressure, build the probe first;** the analysis above
is a prediction, not a measurement, and the whole point of it was that the
prediction is cheap to check and expensive to assume.

---

## 3. The design

### 3.1 The gesture vocabulary

The hard problem is not the maths, it is that **one finger dragging on the cube
already means orbit** (`CubeView.js:55-95`), and that gesture is good and is not
being taken away. Something has to give. The proposal:

| Gesture | Means |
|---|---|
| One finger, starting **on a sticker** | Turn that layer |
| **Two fingers**, anywhere | Orbit, always — the escape hatch |
| One finger starting **off the cube** | Orbit |

Two-finger orbit is the load-bearing part: it means there is always a way to
look around that can never be mistaken for a turn, which is what makes it safe
for a single finger to be unambiguous in the *other* direction.

**One finger on the cube no longer orbits, and that is the real cost of dropping
pressure.** The cube fills most of the screen, so orbiting is now two fingers or
the two view buttons that were already on the header. This is the single thing
most worth having an opinion about after using it: if reaching for a second
finger to look around turns out to be worse than reaching for a harder press,
the trade was wrong.

### 3.2 The detent — spring-loaded, not pressure-gated

There is no engagement function and nothing to threshold on the way *in*: a
finger that lands on a sticker is turning that layer, full stop. The threshold
moved to the way *out*, which is where the operator put it — "move it towards
that turn a little bit".

The layer follows the finger the whole way, and letting go asks one question:

- **Past `COMMIT_T`** (about a quarter of a quarter turn, ~26 points of travel)
  — carry on round and write the move.
- **Short of it** — spring back, write nothing.
- **Or a flick still travelling faster than `FLING_SPEED`** — commit without
  having got there, which is the other half of what a detent feels like.

All four numbers live in one exported `TUNING` object in `touchTurn.js`, because
every one of them is a guess until it has been in a hand (§7.4).

**The commit is a handoff, not a second animation.** `player.handoff(t)` tells
the transport the move it is about to be handed is already `t` of the way round,
so the turn the finger started is the turn that finishes. Appending without it
snaps the layer back to zero and turns it again, which is the one bug in this
area you will definitely write if you do not know about it.

### 3.3 From a drag to a move

Given a picked sticker — cubie position `p` and outward normal `n`, both integer
vectors in the model frame — and a screen-space drag direction:

1. **Two candidate directions.** `faceBasis(n)` (`geometry.js:266`) gives the
   two in-plane unit vectors of that face. Project each through
   `orbit(v, yaw, pitch)` and the same perspective divide `buildScene` uses, and
   you have two screen-space arrows. Pick the one the drag is most parallel to;
   its sign is the direction the finger went. Call the result `d`, a signed
   model-space axis vector.
2. **The rotation axis is `n × d`.** Cross product of two axis vectors is a
   third axis vector — no floating point, which is the invariant `geometry.js`
   protects at :18.
3. **The layer is `p[axis]`** — the coordinate of the picked cubie along the
   rotation axis. −1, 0 or +1: outer layer, slice, other outer layer. A drag on
   a centre sticker turning the M slice falls straight out of this and needs no
   special case.
4. **The amount is the sign** that makes the turn go the way the finger went.
   This repo's convention is at `geometry.js:30`: a quarter turn about the
   **positive** axis is clockwise **as seen from that axis's positive end**.
   Get this wrong and every move comes out primed — which is exactly the bug
   Cube Scramble Step 10a shipped and had to fix (`docs/cube-review.md`), so
   **pin it with a test per face rather than by feel**.
5. **Then, and only then, notation.** `(axis, layer, amount)` → a token like
   `R`, `U'`, `M`. The face letter comes from `FACE_NORMALS` (`cubeState.js:28`).

**The trap in step 5** is that the app writes moves relative to the hold the
operator locked in, not to the world, and not to the current viewing angle
(V1 §8.3; `orientation.js:127,179`). Before writing any token, **verify which
frame the rendered cube is actually in** — whether the hold has been baked into
the cube state by prepending its rotation alg, or is carried separately.

**Checked: the hold is baked in.** `CubeSolve` builds the cube move 1 starts
from as `applyMoves(scrambledCube, parseAlg(orientation))`, so the model
`buildScene` draws is already in the hold frame, and a `pos`/`normal` read off a
polygon is too. A token derived from them therefore comes out in the operator's
frame **for free** — `yaw` and `pitch` only ever convert a drag on the glass into
a direction along a face, and never touch the letter. Looking at the cube from
somewhere else does not rename the move, which is the property that was at risk.

Still worth the ugliest possible test on the phone: hold the cube yellow-up, drag
the top layer, and check the token that appears is the one a solver would write.
The reasoning above is an argument, and this document's whole thesis is that
arguments about this repo's animation and orientation code have been wrong
before.

### 3.3a Which face — decided by the whole gesture, not the first pixel

*Added 2026-08-17, after the first build was on a phone.* §3.3 answers "given
this sticker, what does this drag mean". Asking that once, of the sticker the
finger landed on, is not enough, and the operator found both reasons in one
session:

> "I might put my finger kind of in the middle on the left and then kind of
> round up and over which would be moving the front face … we should make a
> little vector of like touchdown and then direction and the angle and that
> should determine which face, and it can change."

- **A fingertip is wider than the edge between two faces.** Land near a corner
  meaning the front face and the pick may well be the left one.
- **A drag is not a straight line and does not arrive all at once.** Push up,
  then curve over, and what you meant changed while your finger was down.

So `chooseMove` reads the gesture rather than the landing: the sticker under the
**start** and the sticker under the **finger now** are both asked what the drag
means, and the question is asked again on every frame until the turn passes the
detent.

**The tie-break is the whole design, and picking the best-looking reading is not
it.** Two faces that share an edge frequently read a drag along that edge
*identically* — slide horizontally across the seam between the top face and the
front one and both readings are built from the same `+x` direction, so their
scores differ only by perspective rounding. Deciding by score there is a coin
flip that lands differently frame to frame, which is the wobble this was meant to
remove.

So the **sticker you started on holds the gesture**, and a rival takes it only by
beating it by `SWITCH_MARGIN`. Near-ties stay put, which is also what a real cube
does — your fingertip stays on the sticker it pushed and the layer carries it
onto the next face — while a genuinely better reading still wins, which is the
fat-finger landing: start just inside the left face, sweep well onto the front
one, and the front face wins by a mile rather than by a rounding error. Once a
layer is turning it becomes the holder, on the same margin.

**Past the detent the reading is locked.** A layer that swapped for another one
that far round would be taking back a turn the operator has already watched
happen.

One consequence worth knowing before you go hunting for bugs: **adjacent faces
usually agree.** A drag near a shared edge lies in the plane of both faces, so
most of the time the two readings name the same move and the tie-break never
runs. The cases where they differ are the ones where the drag runs *along* the
seam.

### 3.3b Wide turns — landing on the line between two pieces

*Added 2026-08-17.* A wide turn (`r`, `l`) is an outer face **plus the slice
behind it**, and the operator's framing is the whole specification:

> "How do we do a lowercase r or lowercase l — so two faces together, one face
> plus the middle face. This is a precise landing of the finger right on the
> line between two pieces, an edge piece and a corner piece. My finger has to go
> in between them on the line."

Land in the middle of a sticker and you turn the one layer it is in. Land on the
seam and you turn **both the pieces you are touching**. It needs no new gesture
and no modifier key — it is the same drag, landed more precisely, which is why
it is the right answer.

The maths is one more line off §3.3, because the layer was always a coordinate:
measure how far the landing is from the sticker's centre **along the rotation
axis**, in half-cubies, so 0 is the middle of the face and ±1 is exactly a seam.
Past `WIDE_BAND` of the way out, take the neighbouring layer too.

Three things about it that are easy to get wrong:

- **Only the seam along the rotation axis counts**, and *which seam that is
  depends on the drag*. A sideways drag on the front face spins about the
  vertical axis, so the seam between two **rows** is the one that means wide; the
  seam between two columns runs across the layers that drag turns and says
  nothing. The same landing point means different things for different drags,
  and that is correct.
- **The pair is always an outer layer and the middle one.** Those are the only
  two layers adjacent to each other, and the only wide turns notation has, so
  there is nothing to validate beyond "the neighbour is still on the cube" — the
  outside edge of a face has a seam with nothing past it, and stays narrow.
- **Only the landing point can ask for it.** Wideness is a fact about where the
  finger went down; reading it from where the finger *is* would flip the move
  between wide and narrow every time the drag crossed a seam.

Spelled **lowercase** — `r`, not `Rw` — because that is what the pad's two wide
keys are spelled and what Roux is written in (docs/cube-plan.md §4). All six
faces can be turned wide this way, though only `r` and `l` are on the pad.

`WIDE_BAND` is the number that decides whether this feels precise or accidental,
and it is a guess: 0.25, so the quarter of the sticker nearest the line, about 12
points on a 300-point cube. **Take it to a drilling session before anything
else.**

### 3.3c The face you are looking at, and why it needed its own gesture

*Added 2026-08-17.* The operator could turn everything except the one face most
in front of them:

> "I still can't move the front face — the face that is pointing directly at me.
> The finger touches down on one side, goes up just a little bit and then starts
> to go in a horizontal direction — a little vertical up and then kind of a right
> angle, and whatever direction that right angle goes in, that face is going to
> move that way. This is specifically about the front face, or whatever face is
> facing the user at the time, so based on the camera."

**This is geometry, not an oversight, and it is worth understanding before
touching the code.** §3.3 derives the rotation axis as `normal × direction`. With
a finger on the face nearest the camera, both of those lie in the plane of the
screen, so their cross product never comes back out of it. Every straight drag
across the front face turns some layer *through* the cube — a row, a column, a
slice — and **none of them is `F`**. The face nearest the camera is precisely the
one face its own stickers cannot turn. Until now `F` could only be asked for from
the faces around it, which is why it felt missing.

So it is asked for **by shape rather than by direction**: a short leg, a right
angle, and the way that angle went round is the way the face goes round. That is
also the gesture a hand makes on a real cube, where turning the front face is a
twist rather than a push.

- **The corner is the most bent point of the path** — the sample furthest from
  the straight line between where the finger started and where it is now. No
  threshold is needed to find it, no assumption about which way the first leg
  went, and it fails safely: a straight drag's furthest point is a hair off the
  line, so the two legs come out nearly parallel and the squareness test rejects
  it.
- **Screen coordinates run y-down**, so a positive 2D cross product between the
  legs is a turn *clockwise on the glass* — the direction the operator is
  drawing.
- **Clockwise on the glass is `amount` +1 only for the three faces on the
  positive end of their axis.** `turns = clockwise ? layer : -layer` covers all
  six, and there is a test that walks the camera round every face making the same
  clockwise corner and expects each face's own clockwise turn.
- **Progress is measured from the corner along the second leg**, not from where
  the finger went down. The first leg was how you asked, not how far round you
  have got.
- **The layer is never in doubt.** Every sticker of the facing face shares its
  coordinate along its own axis, so this is always that outer layer.

It is tried **before** the straight reading, or the first leg would have already
claimed the gesture, and it only applies when the finger went down on the facing
face. Once the corner is drawn the move locks — a shape that deliberate is not
something to talk the operator out of a few frames later.

**The known rough edge:** the first leg has usually started turning some other
layer before the corner arrives, so drawing the corner snaps that layer back and
starts the face turning instead. The first leg is short, so the snap is small,
but it is the thing to watch for on the phone. If it reads badly, the fix is to
hold the first `CORNER_LEG` points back from the transport rather than to turn
something during them.

### 3.4 Committing, and taking it back

- Release past ~50% of a quarter turn (or fast enough): **commit** — write the
  token through `editOpen`, and let the cube settle the rest of the way.
- Release short of it: **snap back**, write nothing.
- While dragging, `t` follows the finger and the cube is not "playing" — call
  `pause()` on engage, as `tapKey` does at `CubeScreen.js:711`, for the same
  reason.

**Do not implement multi-finger simultaneous turns.** `buildScene` takes exactly
one `turn`, and two layers going round at once is a renderer change, not a
gesture change. Multi-touch here earns its place by *disambiguating* (two
fingers = orbit), not by turning two layers at once. If the spike succeeds,
that is the natural sequel, and it starts with `spinFor` taking a list.

---

## 4. What was built

Two new files, and the smallest edits that would do to four existing ones.

- **`games/cube/touchTurn.js` — new, pure, and where all the risk lives.**
  - `pickFace(polygons, x, y)` → `{ pos, normal } | null` — frontmost non-seam
    polygon containing the point. The plastic rim counts as part of its own face,
    so there is no dead gutter between stickers where a fingertip lands.
  - `moveForDrag({ pos, normal }, drag, { size, yaw, pitch })` →
    `{ axis, layers, amount, token, screen, alignment }`.
  - `chooseMove({ polygons, from, to, view, current })` → the move the *gesture*
    means, re-asked every frame and free to change (§3.3a). This is the one that
    the screen actually calls.
  - `turnProgress(drag, screen)` → `t`, and `shouldCommit(t, speed)`.
  - `TUNING` — the four numbers of §3.2, in one place to be argued with.
- **`games/cube/useCubeTouch.js` — new.** The `PanResponder` that owns the
  gesture and the `orbit | undecided | turn` state it walks. **Passing no
  `turning` prop gives back exactly the old orbit-only behaviour**, which is the
  "one prop away from switched off" this document asked for — it turned out to be
  cleaner as a default than as a flag, so there is no debug toggle.
- **`geometry.js`** — polygons carry `pos`, `normal`, `kind` (§1.1), and
  `projector` is exported so a drag can be turned into a direction using the same
  camera the cube is drawn with rather than an approximation of it.
- **`useScramblePlayer.js`** — `handoff(t)`, §3.2. The one change here that is
  not additive-and-obvious, and the reason a committed turn does not replay
  itself.
- **`CubeView.js`** — takes `turning`, hands the gesture to the hook.
- **`CubeSolve.js`** — builds `turning`, renders the gesture's turn in front of
  the transport's, and commits through `editOpen`/`withMoves` (§1.3).

**Only the solve screen turns layers.** The scramble screen has no algorithm to
write into — a gesture there would have nowhere to land — so it is orbit-only
and unchanged. Inspection is orbit-only too, and must stay that way: that phase
*is* panning to pick the hold, and a layer turning during it would change the
thing being chosen.

### Tests (`__tests__/touchTurn.test.js`)

The runner cannot render, which is the argument for the split above. 89 tests,
of which the ones that matter:

- **A move per face, per drag direction — all 24 combinations, at all nine
  positions on each face.** Rather than 24 expected answers written out by hand,
  each case is checked against the *model*: apply the returned move with
  `rotateQuarter` and assert the dragged sticker moved the way the finger went.
  That is an independent check of the sign convention rather than the same
  arithmetic asserted twice, and it is what makes "every move comes out primed"
  (§5.1) a test rather than a phone session.
- Every token round-trips through `parseMove` to the same axis, layers and
  amount — the turn drawn before it lands is the turn re-parsed afterwards.
- The same drag backwards is the inverse move.
- Picking: frontmost wins over the polygon behind it, background is `null`,
  seams are never picked, and no point on the cube's face is unpickable.
- The slice case: a drag on a centre sticker produces `M`/`E`/`S` and the three
  slices between them, with no special case in the module.

---

## 5. Things that will go wrong

1. **Every move comes out primed.** The sign convention. Test per face; do not
   reason it out twice.
2. **The token is right and the cube turns the wrong layer** — you used the
   *view* frame where the app uses the *hold* frame. §3.3.
3. **Orbit and turn fight.** If a light drag sometimes turns a layer, the cube
   feels broken in a way no amount of polish fixes. When in doubt, **make
   engaging harder**, not easier: a missed turn is an annoyance, an unwanted one
   destroys a solve you were writing.
4. **The web build has neither force nor a second finger.** `react-native-web`
   gets mouse events. The spike should degrade to today's orbit on web rather
   than half-working; `Platform.OS === 'web'` is a legitimate answer here.
5. **A style *variant* must be a whole style.** `[base, variant]` flattens to
   something Yoga and `react-native-web` disagree about, and this repo has
   shipped a phone-only bug because of it — relevant the moment you draw a
   highlight on the engaged sticker.
6. **The device is the only evidence that counts.** Both animation bugs this
   repo has shipped were invisible in a browser. **Write down which findings
   came from the phone.**

## 5a. What the first build actually did — and what is still unknown

Written 2026-08-17, from the desk. **Nothing below has been on a phone yet**, and
§5.6 is emphatic about what that is worth.

Settled, with tests behind them:

- The sign convention (§5.1). All 24 face-and-direction combinations, at all nine
  positions per face, checked against the model rather than by eye.
- The frame (§5.2). §3.3 above.
- The commit not replaying itself — `handoff`, §3.2.
- **Which face a gesture is about** (§3.3a), including the nine front-face drags
  spelled out as a table you can check against a cube in your hand, and the
  operator's own case: top-left corner, dragged right, turns the front layer.

Open, and only a hand can close them:

1. **Is two-finger orbit an acceptable price?** §3.1. The most likely reason this
   spike gets rejected.
2. **Is `COMMIT_T = 0.22` the detent?** Guessed. Too low and the cube turns when
   you meant to look; too high and it feels stuck. `QUARTER_POINTS = 118` is the
   other half of the same feel — how far a full quarter turn is if you drag it
   all the way.
2b. **Does the corner gesture read as a twist?** (§3.3c.) `CORNER_LEG = 9` and
   `CORNER_SQUARE = 0.8` (about 53°) decide how deliberate the right angle has to
   be, and the snap at the end of the first leg is the known rough edge. Draw a
   few `F`s and see whether the corner catches when you meant it and stays out of
   the way when you did not.
2a. **Is `WIDE_BAND = 0.25` a precise landing or an accidental one?** (§3.3b.)
   The two failures are opposite and both bad: too narrow and `r` cannot be hit
   on purpose, too wide and every turn near a seam comes out wide. Drill `r U r'`
   and count the ones that came out `R`.
3. **Does a gesture-entered move want a haptic?** (§7.2.) `expo-haptics` is
   already a dependency and nothing was spent on this yet. A light impact on the
   commit is the obvious candidate.
4. **No highlight on the engaged sticker.** The layer visibly turning is the only
   feedback. That may be enough — it is the feedback a real cube gives — or the
   first thing to add. §5.5's warning about style variants applies the moment it
   is.
5. ~~**Two gesture turns in a row are `R R`, not `R2`.**~~ **Done** — turning the
   same layer the same way twice folds into a half turn (`condenseRepeat`, beside
   the pad's `promoteLastToken` in `solve.js`). It compares the *moves* rather
   than a key's name, so `r` folds into `r2` and `R'` twice comes out `R2` rather
   than the `R'2` a string concatenation would give. Quarters only: three in a
   row leaves `R2 R`, exactly as a third tap on the pad does, and `R R'` is left
   alone rather than silently eating a move that is still on screen.

   The transport needed one line for it. A fold *rewrites* the last token instead
   of adding one, which `promotedTurn` already recognises as the pad's second tap
   — but a gesture has carried the layer part-way into that second quarter
   before letting go, so the handoff's `t` is folded into where the half turn
   picks up rather than the pad's flat halfway.

## 6. How to know it worked

Not "the moves are correct" — that is the test suite's job. The question is
whether **writing a solve by turning the cube is faster and more natural than
tapping the pad**, and there is only one way to find out: write a real solve
both ways, on a phone, and see which one you reach for the second time.

If it wins, the sequels are obvious and each is its own step: two-handed turns,
wide turns from a two-finger drag on one face, and the pad shrinking to the keys
the fingers cannot reach.

If it loses, this document is the record of why, and the probe's finding is
worth keeping regardless.

## 7. Open questions

1. **Does the pad stay?** If turning the cube works, the pad is still the only
   way to write a rotation (`x`, `y`, `z`) or a wide turn. It probably shrinks
   rather than goes.
2. **Should an engaged turn be haptic?** `expo-haptics` is already a dependency
   and a light impact on engage is exactly the "it caught" feedback that
   pressure would have given you for free.
3. **What does an accidental turn cost?** Cube Flow Step 6 builds undo/redo of
   whole actions. Until it lands, an accidental gesture-entered move is undone
   by the pad's backspace, which removes the token — acceptable for a spike,
   probably not acceptable to ship without Step 6 underneath it.
   **Now a prerequisite rather than a question — see §8.5.1.**
4. **Is 50% the right commit point?** Guessed, and it is `COMMIT_T = 0.22` rather
   than 50% as this line originally assumed. A drilling session settles it, and
   §8.4 is how it stops being a round trip per number.
5. **Is two-finger orbit an acceptable price?** One finger on the cube no longer
   orbits, and the cube fills most of the screen. §3.1 calls this the most likely
   reason to reject the whole approach, and it is still unanswered.
6. **Does the corner gesture need announcing?** Step 3b's lesson generalises:
   discoverability is not "will they find it if they look", it is "is anything
   giving them a reason to look". Nothing on the solve screen says a finger turns
   the cube, and nothing says the facing face wants a right angle. The build note
   is the whole of the answer today.

---

## 8. From spike to step — the cut line, and what is deliberately not here

*Added 2026-08-18, when the spike became Step 3.5.*

The spike ran twelve commits on `feature/cube-touch-spike` (PR #112). **This step
carries five of them.** The cut is not "the last good build" in the sense of the
newest one that worked — it is a deliberate line, and the reason matters more
than the line.

### 8.1 What is in

| From | What it gives you |
|---|---|
| `c5bed96` | The spike: pick a sticker, drag, spring-loaded detent, `handoff`, two-finger orbit |
| `aa15f0e` | The face decided by the **whole gesture**, re-asked every frame, with a `SWITCH_MARGIN` tie-break so near-ties stay still |
| `ebe26f3` | Wide turns (`r`, `l`, …) by landing on the **seam** between two pieces |
| `f18ef6a` | The **right-angle corner** gesture for the face you are looking at |
| `8a57df7` | `condenseRepeat` — turning the same layer the same way twice writes `R2` |

The four gesture commits are contiguous. `condenseRepeat` is not — it sat two
commits later and is independent of everything between, so it was lifted out.
**It needed one adaptation**, and that is the one line in this step that no test
covers: it was written against a `handoff(t, turns)` that carried an object,
which only exists in the branch this step does not take. Here `handoff(t)` is
still a scalar, so the fold's pick-up point is
`resumeFrom !== null ? 0.5 + resumeFrom * 0.5 : 0.5` — the first quarter has
landed (0.5) and the finger is `t` of the way into the second, which is half of
`t` of the whole half turn. `useScramblePlayer` is a hook and the runner has no
renderer, so **this is device evidence or nothing.** Turn a layer, then turn it
the same way again, and watch that the half turn carries on round rather than
jumping.

### 8.2 What is out, and why it is not lost work

The seven commits after `f18ef6a` are one story with a loop in it:

1. `b266d4c` replaced the corner gesture with **curvature** — circle a finger and
   the front face keeps going round.
2. Circling let the face draw **more than one quarter** mid-gesture.
3. `buildScene` keys every polygon by *where the move sends it*, which depends on
   the quarter-turn count. A count that changes under a live finger **re-keys all
   fifty-four faces**, React remounts every one, and the cube flashes.
4. Two rounds of reasoned-but-unobserved fixes, one revert (`413657c`), a debug
   readout, and finally `ff7847c` — which pins the draw back to **one quarter at
   a time**.

**That is the property this cut already has.** There is no `ceil(quarters)`
anywhere in `f18ef6a`: `amount` is ±1 and `t` runs 0 to 1, because the corner
gesture measures progress along its second leg only. So taking this cut does not
discard a fix — it never opens the wound. Anyone tempted to bring the circle
gesture back should read step 3 above first: **multi-quarter drawing is a
renderer question — what a polygon's key should be, in `geometry.js` — and not a
gesture question.**

Two findings from that stretch are worth more than the code they came in, and
are recorded here so the branch can be left behind:

- **Smooth the drawn angle, never the measured one** (`5707ae6`). Easing the
  *heading* before accumulating looks like the same idea and is not: a heading
  that lags a finger which is still turning never catches up, so real rotation is
  silently lost — it measured a 90° curve as 75° and a full circle as 285°.
- **A reverted commit should not bundle** a feature with fixes for a problem
  nobody observed (`1c9ecc1`). It did, so the revert had to take all three.

### 8.3 Still recoverable, if wanted

Nothing below is in this step. All of it is in `feature/cube-touch-spike`'s
history and can be lifted commit by commit:

- **The curvature reading** (`b266d4c`) — as a *second* way to ask for the facing
  face, not as a replacement for the corner. See §8.4.
- **The tuning panel and gesture readout** (`4cdb4ff`) — the right UI shape for
  §8.4's picker, but it writes into a mutable module-level `TUNING`, which is
  fine for a spike and wrong for a stored preference.
- **`docs/cube-front-face-prompt.md`** (`1611cca`) — the brief written between
  rounds. Its findings are folded into §8.2; the file itself is not carried.

### 8.4 Configurable gesture profiles — designed, deliberately not built

The operator's ask, 2026-08-18: *different versions of the multi-touch handlers —
how specific turns are identified, how fast the cube turns, and the hit targets
on the cube.* **Deferred to its own step so this one can get onto a phone**, and
written down here because the shape is already decided and half-built.

It is three axes, and they want different mechanisms:

1. **Numbers (feel)** — `QUARTER_POINTS`, `COMMIT_T`, `FLING_SPEED`,
   `DECIDE_POINTS`, `SWITCH_MARGIN`, `WIDE_BAND`, `CORNER_LEG`, `CORNER_SQUARE`.
   **Already parameterised**: `moveForDrag`, `chooseMove`, `detectCorner`,
   `cornerMove` and `shouldCommit` all take a `tuning` argument that defaults to
   the module object. Only **three sites** read `TUNING` directly — two in
   `useCubeTouch`, one default argument in `turnProgress`.
2. **How a turn is identified (strategy)** — this is the axis the spike thrashed
   across without ever giving it a seam. `corner` and `circle` are not a bug and
   a fix, they are **two implementations of one interface**:
   `recognize(gesture, snapshot, tuning) -> move | null`, tried in order, first
   non-null wins. Give it that seam and "which reading is right?" stops being a
   revert and becomes a setting.
3. **Hit targets (picking)** — `pickFace` is an exact point-in-polygon test
   today. A forgiving picker (inflated polygon, or nearest sticker centre within
   a radius) is a second implementation of a one-function interface plus one
   number.

The shape: **`games/cube/touchProfiles.js`**, new and pure —
`{ id, name, description, pick, recognizers, tuning }` — shipping `corner`
(exactly this step's behaviour, and the baseline), `circle` (the curvature
reading, clamped to one quarter per §8.2), and `forgiving`. `touchTurn.js` drops
the mutable module `TUNING` and takes tuning everywhere.

**The payoff is the test suite, not the panel.** `touchTurn.test.js` already pins
the sign convention at all twenty-four face-and-direction combinations against an
independent check. Once a profile is just an argument, **that suite runs against
every shipped profile** — so a new handler cannot quietly ship primed moves,
which is the bug this repo has already shipped once (`docs/cube-review.md`).

**One decision is still open** and should be taken before it is built: a profile
choice is neither authored work nor view state, so V1 §7.1 does not rule on it.
It is a *preference*. There is no settings store in the app (`contexts/` has only
`GameContext`), so the honest home is a small `preferences` slice on
`CubeContext`'s save file — one string, migrating by shape like everything else
on that read path.

### 8.5 What this changes about the rest of the epic

Six interactions, in descending order of how much they matter. **None of them are
edits to `docs/cube-flow-plan.md` yet** — see §8.6.

1. **Step 6 (undo/redo) stops being a nicety and becomes a prerequisite.** §7's
   open question 3 already said an accidental gesture move is undone only by
   backspace dropping a token — acceptable for a spike, not to ship. Gesture
   input makes accidental moves *routine* in a way a keypad never did.
   **Gesture input is not finished until Step 6 lands.**
2. **Step 8 (layout budget) gains a lever it did not have.** V1's open question 13
   said the next win must come from *hiding* chrome rather than cutting it. If
   the cube is the primary input, the 152pt pad becomes secondary — it shrinks
   rather than goes, since it is still the only way to write `x`/`y`/`z`.
   **This step deliberately does not touch `PAD_LAYOUT`.** Step 8 inherits the
   option with drilling sessions as evidence.
3. **The browser net has a second hole in it.** This degrades to orbit-only on
   web (no second finger), so **no browser pass can check the primary input path**
   — the same class of blind spot as Step 3a's finding that
   `react-native-screens` no-ops under `react-native-web`. Two of the three
   things this epic most needs to verify are now device-only.
4. **Steps 5 and 7 need no structural change, and get easier.** The gesture
   commits through `editOpen` + `withMoves` + `appendToken` — the sanctioned
   funnel, no second door — so Step 5's rail counts a gesture move for free
   (worth one pinning test), and Step 7's "retrying always forks" is worth far
   more with a cheap input.
5. **Zero sanctioned edits outside `games/cube/`.** Against an epic that has had
   to sanction three exceptions, this step adds none. Only `utils/buildNotes.js`,
   which the plan mandates and explicitly does not count.
6. **Layout cost: zero points.** No new rows on either screen.

One honest note on framing: Cube Flow's thesis is *the structure a drilling
session has*. This is an **input** change, not a structure change — it is a guest
in the epic, sharing its branch and its preview machinery because that is where
it has to land. Saying so keeps the epic's own story legible.

### 8.6 Two things found by merging Step 3 in

Step 3 (PR #111) merged while this step was being built, so the branch carries a
merge of it rather than being written against it. Both files they both touch
merged cleanly on the text and **needed a fix anyway** — the class of bug that
only exists because two steps were written apart:

- **`rewind` did not clear `handoffRef`.** Step 3a's `rewind` is the function
  that says what the transport looks like when you come back, and it drops
  `pendingRef` and `retractRef`. The handoff arrived in this step and is the same
  kind of state, so it is dropped there too. Narrow in practice — a gesture hands
  off and appends in one tick — but the omission was in the shape of the code,
  not in the odds.
- **A gesture interrupted by leaving the app never gets its release.**
  `PanResponder` is not promised a terminate on background, so a layer half-way
  round would come back frozen there with nothing to finish or spring it.
  `CubeSolve` now drops `gestureTurn` on background, beside the `resetGesture`
  Step 3a wired to the same event for the pad's half-finished presses.

Neither is covered by a test — `useScramblePlayer` and `CubeSolve` are a hook and
a component, and the runner has no renderer. **Background the app mid-drag** on
the device pass.

`SudokuApp/utils/buildNotes.js` conflicted exactly as expected, and resolved
keep-both with Step 3's notes first.
