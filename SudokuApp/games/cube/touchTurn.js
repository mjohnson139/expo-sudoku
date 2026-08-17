/**
 * Turning a layer by dragging a sticker — the maths, with no React in it
 * (docs/cube-touch-exploration.md §3.3).
 *
 * Pure JS, like `geometry.js` and for the same reason: the test runner is a
 * plain node environment with no renderer in it, and **every sign in here is a
 * move that comes out backwards if it is wrong**. `__tests__/touchTurn.test.js`
 * pins all twenty-four face-and-direction combinations against an independent
 * check rather than against twenty-four answers written out by hand.
 *
 * ### The frame this works in, which is the trap worth reading twice
 *
 * `pos` and `normal` come off a polygon `buildScene` emitted, so they are in the
 * **model** frame — and on the solve screen the model has already had the hold
 * baked into it (`CubeSolve.js`: the cube move 1 starts on is the scramble with
 * the hold's rotation alg applied). So a token derived from them is *already*
 * written the way the operator is holding the cube, which is what the exploration
 * doc §3.3 warns you to check before trusting a single letter of it.
 *
 * `yaw` and `pitch` never touch the token. They convert a drag on the glass into
 * a direction along a face, and nothing else — which is why looking at the cube
 * from somewhere else does not rename the move.
 */

import { AXIS, faceBasis, projector, shortWay } from './geometry';
import { parseMove } from './moves';

/**
 * The feel, in one object, because all four of these are guesses until the
 * operator has had it in their hands (exploration doc §7.4).
 *
 * - `DECIDE_POINTS` — how far a finger travels before the gesture stops being
 *   undecided and picks a layer. Small: the first few points of a drag are the
 *   ones that say which way you meant to go, and spending them deciding is what
 *   makes a gesture feel like it starts late.
 * - `QUARTER_POINTS` — the drag that would carry a layer a full quarter turn if
 *   you took it all the way round by hand.
 * - `COMMIT_T` — how far round is far enough. Past it, releasing turns the rest
 *   of the way; short of it, releasing springs back and writes nothing. At the
 *   values below that is about 26 points of travel — "move it towards that turn
 *   a little bit" (operator, 2026-08-17).
 * - `FLING_SPEED` — a flick that is going fast enough commits without having got
 *   there, which is the other half of what a spring detent feels like.
 */
export const TUNING = {
  DECIDE_POINTS: 5,
  QUARTER_POINTS: 118,
  COMMIT_T: 0.22,
  FLING_SPEED: 520,
  /**
   * How much better a different reading of the drag has to be before the cube
   * changes its mind (§3.3a). Zero would flicker between two moves every time
   * the finger wandered across the angle that separates them; too high and the
   * gesture stops listening once it has decided.
   */
  SWITCH_MARGIN: 0.12,
  /**
   * How near the line between two pieces counts as *on* it, and so means a wide
   * turn (§3.3b). Measured in half-cubies out from a sticker's centre, where 1
   * is exactly the seam — so 0.25 is the quarter of the sticker nearest the
   * line, about 12 points on a 300-point cube.
   *
   * This is the number that decides whether wide turns feel precise or
   * accidental, and it is the one to bring to a drilling session first.
   */
  WIDE_BAND: 0.25,
};

/**
 * Is `(x, y)` inside this polygon? Crossing number, the standard one.
 *
 * The polygons are convex quads, so a cheaper half-plane test would do — but
 * they arrive as a plain point list and nothing in `buildScene` promises
 * convexity in its contract, so the general test is the one that stays true if
 * the renderer ever emits something else.
 */
const contains = (points, x, y) => {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const straddles = yi > y !== yj > y;
    if (straddles && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

/**
 * Which sticker is under this point, or null for a miss.
 *
 * **Not a ray cast.** `buildScene` hands back every visible face as a flat
 * polygon in screen coordinates, already sorted back to front, so this is a
 * point-in-polygon test walked from the end — and the first hit going backwards
 * is the frontmost one. That is exact rather than approximate for the reason the
 * renderer is: only outward faces exist, on a convex solid, back-facing ones
 * culled (docs/cube-plan.md §5).
 *
 * Seams are skipped and the plastic is not. A seam is the inside of a cube a
 * turn has cut open and there is no sticker there to grab; the plastic *rim*
 * around a tile is part of the face it belongs to, and excluding it would put a
 * dead gutter between every pair of stickers exactly where a fingertip lands.
 *
 * @param {Array<{kind: string, pos: number[], normal: number[], points: number[][]}>} polygons
 * @param {number} x screen point, in the cube view's own coordinates
 * @param {number} y
 * @returns {{pos: number[], normal: number[]}|null}
 */
export const pickFace = (polygons, x, y) => {
  for (let i = polygons.length - 1; i >= 0; i -= 1) {
    const polygon = polygons[i];
    if (polygon.kind === 'seam') continue;
    if (contains(polygon.points, x, y)) {
      return { pos: polygon.pos, normal: polygon.normal };
    }
  }
  return null;
};

const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

const normalizeAmount = (amount) => ((amount % 4) + 4) % 4;

/**
 * `axis:layer` → the token that turns it, and which signed quarter turn that
 * token *is*.
 *
 * Built by asking `moves.js` rather than written out again here. The convention
 * that D, L, B and the M and E slices carry −1 — because their faces look down
 * the negative axis — is a rule this module must agree with exactly, and the
 * only way to be sure of that is to not hold a second copy of it.
 */
const BASE_BY_LAYER = (() => {
  const out = new Map();
  ['U', 'D', 'R', 'L', 'F', 'B', 'M', 'E', 'S'].forEach((letter) => {
    const move = parseMove(letter);
    out.set(`${move.axis}:${move.layers[0]}`, { letter, turns: shortWay(move.amount) });
  });
  return out;
})();

/**
 * The same, for the **wide** turns — an outer face and the slice behind it.
 *
 * Spelled lowercase (`r`, `l`, `u`, …) rather than `Rw`, because that is what
 * the pad's two wide keys are spelled and what Roux is written in. `parseMove`
 * normalizes both to the same move, and `scanAlg` keeps tokens as they were
 * written, so the algorithm reads back in the notation the operator's method
 * actually uses (docs/cube-plan.md §4).
 */
const WIDE_BY_LAYER = (() => {
  const out = new Map();
  ['u', 'd', 'r', 'l', 'f', 'b'].forEach((letter) => {
    const move = parseMove(letter);
    const outer = move.layers.find((layer) => layer !== 0);
    out.set(`${move.axis}:${outer}`, { letter, turns: shortWay(move.amount) });
  });
  return out;
})();

/** `(axis, layer, signed quarter turns)` → notation, or null if that is not a
 *  layer of this cube. `wide` takes the slice behind the face with it. */
const tokenFor = (axis, layer, turns, wide = false) => {
  const base = (wide ? WIDE_BY_LAYER : BASE_BY_LAYER).get(`${axis}:${layer}`);
  if (!base) return null;
  return turns === base.turns ? base.letter : `${base.letter}'`;
};

/**
 * Did the finger land *on the line between two pieces*, along the axis this move
 * turns? If so, which layer it is asking to take along.
 *
 * This is how a wide turn is asked for (§3.3b), and the operator's framing is
 * the specification: **"a precise landing of the finger right on the line
 * between two pieces — an edge piece and a corner piece. My finger has to go in
 * between them on the line."** Land in the middle of a sticker and you turn one
 * layer; land on the seam and you turn both the pieces you are touching.
 *
 * The offset is measured in **half-cubies out from the sticker's centre**, so it
 * is 0 in the middle of a face and ±1 exactly on a seam, whatever the cube's
 * size and however foreshortened the face is. That the band is a fraction rather
 * than a distance in points is deliberate: a face seen edge-on is a face you
 * cannot land on precisely anyway, and its band shrinks to match.
 *
 * Only the seam **along the rotation axis** counts. The other seam on that face
 * runs parallel to the way the finger is about to travel, and straddling it says
 * nothing about how many layers should come along.
 */
const straddledLayer = (pos, normal, axis, at, project, centre, band) => {
  const along = faceBasis(normal).find((basis) => basis[axis] !== 0);
  if (!along) return null;

  const origin = project(centre);
  const tip = project([
    centre[0] + along[0] * 0.5,
    centre[1] + along[1] * 0.5,
    centre[2] + along[2] * 0.5,
  ]);
  const arrow = [tip[0] - origin[0], tip[1] - origin[1]];
  const span = Math.hypot(arrow[0], arrow[1]);
  if (!(span > 0)) return null;

  const reach = [at[0] - origin[0], at[1] - origin[1]];
  const offset = (reach[0] * arrow[0] + reach[1] * arrow[1]) / (span * span);
  if (Math.abs(offset) < 1 - band) return null;

  // `faceBasis` only ever returns positive axis vectors, so the sign of the
  // offset is the direction along the axis without any further thought.
  const neighbour = pos[axis] + Math.sign(offset);
  return neighbour >= -1 && neighbour <= 1 ? neighbour : null;
};

/**
 * A picked sticker plus the way the finger went → the move that means.
 *
 * The whole derivation, and each step is one line because the model is integers
 * (docs/cube-plan.md §3):
 *
 * 1. **Which way along the face.** `faceBasis` gives the two in-plane unit
 *    vectors; both signs of both, projected through the same camera the cube is
 *    drawn with, are four arrows on the screen. The drag is nearest exactly one
 *    of them, and that one is `direction` — a signed *model-space* axis vector.
 * 2. **The axis is `normal × direction`.** A cross product of two axis vectors
 *    is a third axis vector, so no floating point enters the move.
 * 3. **The layer is the picked cubie's coordinate along that axis** — −1, 0 or
 *    +1. A drag on a centre sticker turning a slice falls straight out of this
 *    and needs no special case.
 * 4. **The direction is `-sign(axis component)`.** Rotating a point at `normal`
 *    by a right-handed +90° about `normal × direction` carries it toward
 *    `direction`; this repo's `amount` is *clockwise seen from the positive end*
 *    of the axis, which is right-handed −90° (`geometry.js:30`). Hence the minus,
 *    and hence the test.
 *
 * 5. **And how many layers.** One, unless the finger landed on the line between
 *    two pieces, which asks for both of them — see `straddledLayer`.
 *
 * @param {{pos: number[], normal: number[]}} pick from `pickFace`
 * @param {number[]} drag `[dx, dy]` in screen points, y down
 * @param {{size: number, yaw: number, pitch: number}} view what the cube is drawn with
 * @param {number[]|null} [at] where on screen the finger picked this sticker.
 *   Omit it and every turn is a single layer; supply it and a landing on a seam
 *   is read as a wide turn.
 * @returns {{axis: number, layers: number[], amount: number, token: string,
 *   screen: number[], alignment: number}|null} `screen` is the unit arrow the
 *   chosen direction points along, which is what `turnProgress` measures the
 *   drag against. `alignment` is the cosine between the drag and that arrow —
 *   *how much this reading looks like what the finger did*, which is what lets
 *   `chooseMove` compare two of them.
 */
export const moveForDrag = (pick, drag, view, at = null, tuning = TUNING) => {
  const { pos, normal } = pick;
  const reach = Math.hypot(drag[0], drag[1]);
  if (!(reach > 0)) return null;

  const project = projector(view);
  const centre = [
    pos[0] + normal[0] * 0.5,
    pos[1] + normal[1] * 0.5,
    pos[2] + normal[2] * 0.5,
  ];
  const origin = project(centre);

  let best = null;
  faceBasis(normal).forEach((basis) => {
    [1, -1].forEach((sign) => {
      const direction = [basis[0] * sign, basis[1] * sign, basis[2] * sign];
      // A half-cubie step rather than a derivative: it is the distance a finger
      // actually drags a sticker, so the arrow carries the same perspective
      // foreshortening the operator can see.
      const tip = project([
        centre[0] + direction[0] * 0.5,
        centre[1] + direction[1] * 0.5,
        centre[2] + direction[2] * 0.5,
      ]);
      const arrow = [tip[0] - origin[0], tip[1] - origin[1]];
      const span = Math.hypot(arrow[0], arrow[1]);
      if (!(span > 0)) return;

      const unit = [arrow[0] / span, arrow[1] / span];
      const alignment = (drag[0] * unit[0] + drag[1] * unit[1]) / reach;
      if (!best || alignment > best.alignment) best = { direction, unit, alignment };
    });
  });

  if (!best) return null;

  const spin = cross(normal, best.direction);
  const axis = spin.findIndex((component) => component !== 0);
  if (axis < 0) return null;

  const turns = -Math.sign(spin[axis]);

  // A finger on the seam takes the piece on the other side of it with them.
  const neighbour = at
    ? straddledLayer(pos, normal, axis, at, project, centre, tuning.WIDE_BAND)
    : null;
  // The pair is always an outer layer and the middle one — those are the only
  // two layers that are next to each other and the only wide turns notation has.
  const outer = neighbour === null ? null : pos[axis] || neighbour;

  const token = outer
    ? tokenFor(axis, outer, turns, true)
    : tokenFor(axis, pos[axis], turns);
  if (!token) return null;

  return {
    axis,
    layers: outer ? [outer, 0] : [pos[axis]],
    // 0–3, exactly as `parseMove` normalizes it — the token this returns is
    // going into the algorithm, and the turn drawn before it lands has to be the
    // same turn the player re-parses afterwards.
    amount: normalizeAmount(turns),
    token,
    screen: best.unit,
    alignment: best.alignment,
  };
};

/** How much a move already in progress still looks like the drag, now that the
 *  drag has grown. The same number `moveForDrag` reports as `alignment`, asked
 *  of a reading that was chosen a moment ago. */
const alignmentOf = (move, drag, reach) =>
  (drag[0] * move.screen[0] + drag[1] * move.screen[1]) / reach;

/**
 * The move a *gesture* means — start point, finger now, and the freedom to
 * change its mind (§3.3a).
 *
 * `moveForDrag` answers "given this sticker, what does this drag mean". That is
 * the wrong question to ask only once, and only of the sticker the finger landed
 * on, for two reasons the operator hit immediately:
 *
 * - **A fingertip is wider than the edge between two faces.** Land near the
 *   corner meaning the front face, and the pick may well be the left one. The
 *   direction you then drag says which face you meant far more clearly than the
 *   pixel you started on did.
 * - **A drag is not a straight line and does not arrive all at once.** Push up,
 *   then curve over, and the move you meant changed while your finger was down.
 *
 * So both the sticker under the **start** and the sticker under the **finger
 * now** are read as candidates, each is asked what the drag means, and it is
 * asked again on every frame until the turn locks, so it can change.
 *
 * ### Everything here is a tie-break, and the tie-break is what matters
 *
 * Picking whichever reading merely *looks* most like the drag is not enough, and
 * the reason is worth keeping: **two faces that share an edge often read a drag
 * along that edge identically.** Slide horizontally across the seam between the
 * top face and the front one and both readings are built from the same `+x`
 * direction, so their scores differ only by perspective rounding — a coin flip,
 * landing differently from one frame to the next. That is exactly the wobble
 * this function exists to remove, so it cannot be decided by score alone.
 *
 * The order is therefore: **the sticker you started on holds the gesture**, and
 * a rival only takes it by beating it by `SWITCH_MARGIN`. That keeps the
 * near-ties stable and matches what a real cube does — your fingertip stays on
 * the sticker it pushed, and the layer carries it onto the next face — while
 * still letting a genuinely better reading win, which is the fat-finger landing
 * the operator hit: start just inside the left face, sweep well onto the front
 * one, and the front face's reading wins by a mile rather than by a rounding
 * error.
 *
 * `current` takes over as the holder once a layer is actually turning, for the
 * same reason and with the same margin.
 *
 * @param {Object} options
 * @param {Array} options.polygons the **still** cube's polygons — see the note
 *   in `useCubeTouch` about why this must not be the frame with the turn in it
 * @param {number[]} options.from where the finger went down
 * @param {number[]} options.to where the finger is now
 * @param {{size: number, yaw: number, pitch: number}} options.view
 * @param {Object|null} [options.current] the move being turned, if any
 * @returns {Object|null} the move to turn, `current` if nothing better is on
 *   offer, or null if the drag is still too short to mean anything
 */
export const chooseMove = ({ polygons, from, to, view, current = null, tuning = TUNING }) => {
  const drag = [to[0] - from[0], to[1] - from[1]];
  const reach = Math.hypot(drag[0], drag[1]);
  if (reach < tuning.DECIDE_POINTS) return current;

  const readings = [];
  const seen = new Set();

  // The start goes in first, so it is the one that holds the gesture when
  // nothing is turning yet.
  //
  // **Only the start carries a landing point**, so only it can ask for a wide
  // turn. A wide turn is a *precise landing* (§3.3b), which is a fact about
  // where the finger went down; reading it from where the finger is now would
  // switch the move between wide and narrow every time the drag crossed a seam.
  [
    { pick: pickFace(polygons, from[0], from[1]), at: from },
    { pick: pickFace(polygons, to[0], to[1]), at: null },
  ].forEach(({ pick, at }) => {
    if (!pick) return;
    // The finger usually has not left the sticker it started on, and asking the
    // same question twice would only cost time.
    const key = `${pick.pos.join(',')}|${pick.normal.join(',')}`;
    if (seen.has(key)) return;
    seen.add(key);

    const move = moveForDrag(pick, drag, view, at, tuning);
    if (move) readings.push(move);
  });

  if (readings.length === 0) return current;

  let best = readings[0];
  readings.forEach((move) => {
    if (move.alignment > best.alignment) best = move;
  });

  // Whoever has to be beaten: the layer already turning, or failing that the
  // reading taken where the finger went down.
  const holder = current || readings[0];
  if (best.token === holder.token) return holder;

  return best.alignment > alignmentOf(holder, drag, reach) + tuning.SWITCH_MARGIN
    ? best
    : holder;
};

/**
 * How far round the layer is, for a drag of `drag` along the chosen arrow.
 *
 * Only the component *along* the arrow counts, so drifting sideways mid-drag
 * neither speeds the turn up nor slows it down — the finger has already said
 * which way it meant, and a turn that wobbled with the drift would feel like it
 * was arguing. Clamped at both ends: dragging back past the start parks at 0
 * rather than going negative into the opposite turn, which would be a second
 * move nobody asked for.
 */
export const turnProgress = (drag, screen, quarter = TUNING.QUARTER_POINTS) => {
  const along = drag[0] * screen[0] + drag[1] * screen[1];
  return Math.max(0, Math.min(1, along / quarter));
};

/**
 * Let go here — does the layer carry on round, or spring back?
 *
 * Two ways to say yes, which is what a detent feels like: far enough round, or
 * still travelling fast enough that it was clearly on its way. `speed` is the
 * release speed along the arrow in points per second.
 */
export const shouldCommit = (t, speed = 0, tuning = TUNING) =>
  t >= tuning.COMMIT_T || (t > 0.05 && speed >= tuning.FLING_SPEED);

export default {
  TUNING,
  pickFace,
  moveForDrag,
  chooseMove,
  turnProgress,
  shouldCommit,
  AXIS,
};
