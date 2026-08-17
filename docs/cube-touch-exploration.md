# Cube touch — turning the cube by dragging its stickers

**An exploration, not an epic step.** It is written to be started cold in a new
session, and to be abandoned cheaply if the hardware does not cooperate.

## What the operator asked for

> I want the cube to respond to multi-touch, multi-pressure — so you can slide
> your fingers over the cube and it won't completely turn it unless you push the
> pressure a little more; then the direction of the finger moving dictates which
> rotation, forward or prime, and which face is turning based on the position of
> the finger.

In one sentence: **the cube stops being a picture you orbit and a pad you type
at, and becomes the thing you turn.** Put a finger on a sticker, push, drag —
that layer goes round the way your finger went.

This is not on the Cube Flow roadmap (`docs/cube-flow-plan.md`) and does not
block it. It is a spike: build the smallest thing that answers *does this feel
right on a phone*, and decide afterwards whether it earns a step.

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
have to be rebuilt anyway. Name it `feature/cube-touch-spike`.

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

## 2. The pressure problem — settle this before writing a line

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

### Step 0 — the probe (do this first, it is an hour)

A throwaway debug overlay on the cube screen that renders, live, for every
active touch: `identifier`, `pageX/Y`, `force` (and `Object.keys(nativeEvent)`
once, to catch anything I have not listed). Ship it as an EAS preview, open it
**on the actual phone**, and press hard.

- **If `force` reports a real range** — congratulations, build the literal
  design: `force` is the engage signal, and §3 stands as written.
- **If it reports `0` or nothing** — which is what I expect — the request still
  gets built, with a different engage signal. See §3.2. **The feel the operator
  described is achievable; the sensor is what may not be there.**

Write the probe's finding down in this document. It is the most valuable thing
the spike produces, whichever way it goes, and nobody should have to discover it
twice.

---

## 3. The design

### 3.1 The gesture vocabulary

The hard problem is not the maths, it is that **one finger dragging on the cube
already means orbit** (`CubeView.js:55-95`), and that gesture is good and is not
being taken away. Something has to give. The proposal:

| Gesture | Means |
|---|---|
| One finger, starting **on a sticker**, engaged (§3.2) | Turn that layer |
| One finger, starting on a sticker, **not** engaged | Orbit, exactly as today |
| **Two fingers**, anywhere | Orbit, always — the escape hatch |
| One finger starting **off the cube** | Orbit |

Two-finger orbit is the load-bearing part: it means there is always a way to
look around that can never be mistaken for a turn, which is what makes it safe
for a single finger to be ambiguous.

### 3.2 "Engagement" — one number, two possible sources

Do not scatter `force > 0.3` through a component. Define, in the pure module:

```
engagement(touch, gestureState, now) -> 0..1
```

- **Where force exists:** `nativeEvent.force`, normalised.
- **Where it does not:** *dwell plus deliberateness*. A finger that has been
  down more than ~120ms and has moved slowly (under some points/second) is
  engaged; a quick flick is not. This is the same distinction a person means by
  "pushing a little harder" — pressing harder makes your finger *slower and
  stickier*, and the screen can see that even when it cannot see the force.

Cross the threshold and the cube commits to a layer: the sticker under the
finger picks the layer, a highlight appears, and from then on the drag drives
`t`. Below it, the drag orbits. **One threshold, one place, testable in node.**

The nice property: if the probe says force is available on one device and not
another, nothing above this function changes.

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
the cube state by prepending its rotation alg, or is carried separately. Prove
it with the ugliest possible test: hold the cube yellow-up, drag the top layer,
and check the token that appears is the one a solver would write.

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

## 4. What to build

Two new files and the smallest possible edits to two existing ones.

- **`games/cube/touchTurn.js` — new, pure, and where all the risk lives.**
  - `pickFace(polygons, x, y)` → `{ pos, normal } | null` (frontmost tile whose
    polygon contains the point).
  - `engagement(...)` → `0..1` per §3.2.
  - `moveForDrag({ pos, normal }, dragVector, { yaw, pitch })` →
    `{ axis, layers, amount, token }`.
  - `turnProgress(dragVector, ...)` → `t`.
- **`games/cube/useCubeTouch.js` — new.** The `PanResponder` that owns the
  gesture, holding "orbiting or turning" and the live `turn`. It should be
  possible to hand `CubeView` this hook's handlers *instead of* its built-in
  ones, so the spike is one prop away from being switched off.
- **`geometry.js`** — polygons carry `pos`, `normal`, `kind` (§1.1).
- **`CubeView.js` / `CubeScreen.js`** — wire the hook, behind a flag. **A debug
  toggle, not a setting** — this is a spike, and a preference is a promise.

### Tests (`__tests__/touchTurn.test.js`)

The runner cannot render, which is the argument for the split above. Test:

- **A move per face, per drag direction — all 24 combinations.** Drag up on the
  R face's centre-right sticker → `R`? Down → `R'`? This is the suite that
  catches the sign error before the phone does.
- Picking: a point inside a front tile returns it, not the tile behind it at the
  same screen position; a point on the background returns `null`.
- `engagement`'s threshold, both sources, including the "quick flick is not
  engaged" case.
- The slice case: a drag on a centre sticker produces `M`/`E`/`S`, not a face
  turn.

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
4. **Is 50% the right commit point?** Guessed. A drilling session settles it.
