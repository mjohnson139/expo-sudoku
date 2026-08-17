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

/** `(axis, layer, signed quarter turns)` → notation, or null if that is not a
 *  layer of this cube. */
const tokenFor = (axis, layer, turns) => {
  const base = BASE_BY_LAYER.get(`${axis}:${layer}`);
  if (!base) return null;
  return turns === base.turns ? base.letter : `${base.letter}'`;
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
 * @param {{pos: number[], normal: number[]}} pick from `pickFace`
 * @param {number[]} drag `[dx, dy]` in screen points, y down
 * @param {{size: number, yaw: number, pitch: number}} view what the cube is drawn with
 * @returns {{axis: number, layers: number[], amount: number, token: string,
 *   screen: number[]}|null} `screen` is the unit arrow the chosen direction
 *   points along, which is what `turnProgress` measures the drag against.
 */
export const moveForDrag = (pick, drag, view) => {
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
  const token = tokenFor(axis, pos[axis], turns);
  if (!token) return null;

  return {
    axis,
    layers: [pos[axis]],
    // 0–3, exactly as `parseMove` normalizes it — the token this returns is
    // going into the algorithm, and the turn drawn before it lands has to be the
    // same turn the player re-parses afterwards.
    amount: normalizeAmount(turns),
    token,
    screen: best.unit,
  };
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

export default { TUNING, pickFace, moveForDrag, turnProgress, shouldCommit, AXIS };
