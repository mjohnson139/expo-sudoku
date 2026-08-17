# Turning the face that looks at you — a brief for the next attempt

**Read this cold, in a new session, before writing a line.** It is the record of
four rounds on one problem: everything that is settled, everything that has been
tried and failed, and why. The point of it is that nobody spends a fifth round
rediscovering the third.

- **Repo:** `mjohnson139/expo-sudoku`, app in `SudokuApp/` (Expo SDK 54 · React
  Native · JavaScript). Cube in `SudokuApp/games/cube/`.
- **Branch:** `feature/cube-touch-spike`, off `epic/cube-flow`. PR #112.
- **Read first:** `docs/cube-touch-exploration.md` (the spike's own plan, now
  carrying §3.3a–c), then `docs/cube-plan.md` §5 for the renderer.
- **Start from `413657c`.** That is the revert of the last attempt and is
  byte-identical to `5707ae6`, **the best build this spike has produced**. Do not
  build on `1c9ecc1`.
- **No lint, no typecheck.** `npm test` (node, no renderer) and a phone are the
  whole net. Anything that could be *wrong* goes in a pure module with a suite.

---

## 1. The problem, stated exactly

**You cannot turn the face nearest the camera by dragging across it, and that is
geometry rather than a bug.** A drag's rotation axis is `normal × direction`
(exploration doc §3.3). With a finger on the front face, `normal` and the
in-plane `direction` both lie in the plane of the screen, so their cross product
never comes back out of it. Every straight drag on the front face turns a row, a
column or a slice — **never `F`**. That one face is the only one its own stickers
cannot turn.

So it needs a gesture that is a *shape*, not a direction. The operator's brief,
in their words across three rounds:

> "I still can't move the front face — the face that is pointing directly at me…
> a little vertical up and then kind of a right angle, and whatever direction
> that right angle goes in, that face is going to move that way. This is
> specifically about the front face, or whatever face is facing the user at the
> time, so based on the camera."

> "I wanna be able to make circles with my finger and that would move that front
> face, and that would move it multiple times."

> "We really need to be able to move our finger a small amount in two directions
> making kind of a right angle, but it's a curve, and that would turn that face."

---

## 2. Where it stands at `413657c` — this part works, do not restart it

The current gesture is in `touchTurn.js` (`facingFace`, `startSweep`,
`advanceSweep`, `arcSweep`, `circleMove`) and `useCubeTouch.js`.

It tracks **the curvature of the finger's own path** — not an angle about some
pivot, which is what lets it work anywhere on the cube with nothing to guess at.
A finger tracing a curve of any size turns its own heading by exactly the angle
it goes round; a straight drag turns it by nothing. One number both tells a curve
from a push and says how far round it has got.

Operator's verdict on this build, and it is the bar to clear:

> "I tested the front face turns and it's working a lot better." · "That's smooth
> enough."

**What is settled and should survive any rewrite:**

1. **Curvature, not a pivot.** No centre to guess, works anywhere on the cube.
2. **The curve may start anywhere on the cube**, not only on the face it turns.
   Requiring it to start inside the front face was half of why it was hard to
   invoke — at the default angle that face is only part of what is on screen.
3. **`CIRCLE_ENGAGE = 20°`, `CIRCLE_GAIN = 1.5`.** 1:1 gain is what a real cube
   does and it was *far* too much finger for a phone (~125° of arc per quarter
   turn, twice rejected as "super hard"). At these values a bent flick of ~50° of
   arc is a quarter turn.
4. **Measure exactly; smooth only what is drawn.** See §3.1 — this one is a trap.
5. **Clockwise on the glass is `amount` +1 only for the three faces on the
   positive end of their axis**: `unit = clockwise ? layer : -layer`. Screen
   coordinates are y-down, so a positive 2D cross product is clockwise. There is
   a test that walks the camera round all six faces drawing the same curve.
6. **The layer is never in doubt** — every sticker of the facing face shares its
   coordinate along its own axis, so it is always that outer layer.
7. **Draw where the finger is; commit the nearest quarter.** Releasing springs
   the face from wherever the finger stopped to that quarter, then hands over
   already settled. A cube does not stop at 40°.
8. **`handoff(t, turns)` on `useScramblePlayer`** — the committed move is already
   part-way round, and the *short way* round is not necessarily the way the finger
   went. Without it the layer snaps back to zero and turns again.

---

## 3. What has been tried and did not work

### 3.1 Smoothing the measurement instead of the picture — **wrong, and subtly**

The heading is noisy and the noise alternates in sign. The obvious fix is to ease
the heading before accumulating it. **It loses real rotation**: a heading that
lags a finger which is still turning never catches up. Measured, it read a 90°
curve as 75° and a full circle as 285° — which silently undoes the triggering
that took three rounds to get right.

The measurement must stay exact (the sum telescopes, so wobble cancels and the
*total* is already right). Only the **drawn** angle gets filtered, in the hook.
Because the drawn angle is also what gets committed, what you see is what you
get. The `arcSweep` tests in `touchTurn.test.js` pin this — they caught it on the
first run and they will catch it again.

### 3.2 Right-angle / corner detection — **replaced, do not go back**

The round before circles looked for the most-bent point of the path and required
the two legs to be near-square. It worked in tests and was *"a little successful,
but still really hard"* on a phone. Curvature accumulation subsumes it — an L is
a curve that stopped after ninety degrees — and needs no corner to find.

### 3.0 Drawing more than one quarter turn at a time — **this was the flashing**

> "The turning isn't really that bad, it's working mostly… but the animation is
> really bad. The colors flash and abruptly change and it's not a good turning
> experience."

The circle gesture originally let the face keep going round as you kept
circling — `turns = ±ceil(quarters)`, so a long circle drew `F2` and then `F'`
live. **That is what makes the cube blink**, and the cause is in the renderer
rather than in the gesture: `buildScene` keys every polygon by *where the move
sends it*, which depends on the quarter-turn count. A count that changes
mid-gesture re-keys all fifty-four faces at once, React remounts every one of
them, and they flash.

Circles were the first gesture in this app ever to change that count while a
finger was down. Every gesture before them held one quarter from beginning to
end, and none of them flashed — which is why this looked fine in tests and was
the worst thing in the app in a hand.

`circleMove` now draws **one quarter, fixed, for the whole gesture** — the same
shape a straight drag renders. Circling past a quarter pins the face there and
waits. Multiple turns per gesture is what that gives up, and it should come back,
but **the prerequisite is a renderer that can be handed a changing sweep without
remounting** — a question about what a polygon's key should be, in `geometry.js`,
not a question about gestures. Do not re-open it from the gesture side.

Note this also retires the `atLeast` idea from §3.3: it was a patch on the same
wound (pinning a count that should not have been varying) and is unnecessary once
the count never varies.

### 3.3 The last pass, `1c9ecc1` — **reverted, animation broken**

This is the one to be careful about, because it was aimed at a **real** problem
that is still open (see §4) and its diagnosis was *reasoned, not observed*. Two
changes went in together and at least one of them made the animation worse:

- **`ARC_MAX_TURN` (115°) clamp on a single sample.** Rationale: a fast finger is
  sampled once a frame, so one sample can span a lot of arc, and `atan2` cannot
  tell 190° one way from 170° the other — past half a turn the reading comes back
  *reversed*.
- **`atLeast`, pinning the drawn sweep so it never shrinks within a gesture.**
  Rationale: `buildScene` keys every polygon by where the move sends it, which
  depends on the quarter-turn count; a reading wobbling across a quarter boundary
  flips it between 1 and 2 and re-keys all 54 faces, which was the suspected
  cause of the reported colour flicker.

Both rationales are plausible and neither was confirmed on a device before
shipping. **Do not re-apply them as a pair.** If either is worth having, land it
alone and get it looked at.

The **tuning panel** (`CubeTuningPanel.js`) went out in the same revert and is
independent of the animation — it can be cherry-picked back from `1c9ecc1` on its
own, and probably should be, because it makes every remaining question a dial
instead of a round trip.

---

## 4. The open problem

Fast movement. The operator, on `5707ae6`:

> "It's really weird — if I move my finger a small amount it will turn at the
> right kind of speed following my finger, but if I move any faster it's just
> kinda like goes berserk and the animation is not good, like I could see the
> colors kinda flicker on the cube."

Two distinct symptoms in that sentence, and they may have different causes:

- **"Goes berserk"** — the turn does something violent or wrong at speed.
- **"Colors flicker"** — a *rendering* symptom, not a maths one.

**Diagnose before fixing. That is the whole lesson of §3.3.**

**The tools for it are now in the app** (`CubeTuningPanel`, `CubeTouchDebug`,
behind the tune icon on the solve header — the readout has its own toggle inside
the panel). Both are spike-only, neither is persisted, and both go when the spike
does. So the next round starts with evidence rather than with a theory:

1. **`peak samp` is the number that settles §3.3's first theory.** It is the
   largest angle any single sample contributed during the gesture, and it stays
   on screen after the finger lifts, because a live readout during a fast flick
   is unreadable. If it never approaches 180°, **aliasing is not the cause** and
   `ARC_MAX_TURN` should not come back. If it does, the theory is confirmed and
   the clamp can be landed on its own.
2. **`sweep` against `drawn`** says whether the display filter is the problem:
   if the measured sweep is calm and the drawn angle is not, the filter is
   wrong; if the measured sweep itself lurches, it is not.
3. **`peak spd` and `samples @ ms`** say how fast the gesture that misbehaves
   actually is, and how many samples it got. A fast gesture with very few
   samples is a different bug from a fast gesture with many.
4. **Separate the two symptoms.** Does the flicker happen when the *maths* is
   calm — e.g. during a slow but multi-quarter turn? If so it is the renderer and
   §3.3's `atLeast` theory is right for the wrong reason. Does the berserk
   behaviour survive a very high `ARC_STEP`, which all but removes per-sample
   aliasing?
5. **Suspects worth checking, none confirmed:** per-sample angle aliasing past
   180°; polygon re-keying as the quarter count changes; the seam pass switching
   on and off as `t` crosses exactly 1; `spinFor`'s `landed` branch at `t === 1`;
   React state churn from `onTurn` on every frame.

---

## 5. How to know it worked

Not "the tests pass" — they did for every one of the four attempts. The bar is
the operator's own, and it has two halves that have never both been true at once:

- **It triggers when meant.** A small movement in two directions, curving, turns
  the front face — and keeps turning it if you keep curving.
- **It looks right while it does.** No jerk, no flicker, no lurch, at any speed a
  hand actually moves.

`5707ae6` cleared the first and half of the second. The remaining work is the
fast case, and only a phone can say whether it is done.

## 6. Standing rules for this spike

- **The device is the only evidence that counts.** Both animation bugs this repo
  has shipped were invisible in a browser, and both of this spike's wrong turns
  were confident reasoning that a phone would have refused in a minute.
- **Land one change at a time.** `1c9ecc1` bundled two fixes and a feature, and
  the revert had to take all three.
- **A move entered by gesture goes through `editOpen` / `withMoves`**, the same
  two doors as every other edit (exploration doc §1.3). No exceptions.
- **`CubeView` with no `turning` prop is the old orbit-only behaviour**, so the
  whole spike stays one prop from off.
