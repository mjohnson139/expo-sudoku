/**
 * The cube's 3D math — everything that turns "a cube in a state" into "polygons
 * on a screen", plus the one integer rotation the move engine is built on
 * (docs/cube-plan.md §3, §5).
 *
 * Pure JS: no React, no react-native, no SVG. That is deliberate — this is the
 * part worth unit-testing, and the test runner is a plain node environment (see
 * package.json's jest config). `CubeView` renders whatever `buildScene` returns
 * and knows nothing about projection.
 *
 * ### Coordinates
 *
 * Right-handed, one unit per cubie, origin at the cube's centre:
 *
 *   +x → R      +y → U      +z → F   (toward the viewer at rest)
 *
 * So every cubie sits at integer `[x, y, z]` with each coordinate in `{-1,0,1}`,
 * and every sticker's outward normal is one of the six axis unit vectors. Both
 * stay exactly integral for the life of a cube, because a quarter turn maps axis
 * vectors to axis vectors — no floating point ever enters the model, which is
 * what makes `isSolved` an exact comparison rather than an epsilon test.
 */

import { mix } from '../../utils/color';

/** Axis indices, as used by every move and by `rotateQuarter`. */
export const AXIS = { x: 0, y: 1, z: 2 };

/**
 * One quarter turn of `v` about the **positive** `axis`, clockwise as seen from
 * that axis's positive end — the direction a face turn goes when you look
 * straight at it. In right-handed coordinates that is −90°, hence the sign.
 */
/**
 * Negate without producing `-0`.
 *
 * `-0` compares equal to `0` everywhere the cube model actually looks — `===`,
 * `Array#includes`, `String(…)` — so this is not fixing a bug today. It is
 * keeping one out: cubie positions get joined into strings to key a lookup and
 * to key the renderer's polygons, and the day a `-0` reaches somewhere that
 * distinguishes it (`Object.is`, a `Set` of tuples, a serialized save compared
 * for equality) the failure would be a cube missing one sticker, which is a
 * miserable thing to trace back to a sign.
 */
const negate = (n) => (n === 0 ? 0 : -n);

const rotateOnce = (v, axis) => {
  const [x, y, z] = v;
  if (axis === AXIS.x) return [x, z, negate(y)];
  if (axis === AXIS.y) return [negate(z), y, x];
  return [y, negate(x), z];
};

/**
 * Rotate an integer vector by `turns` quarter turns about `axis`.
 *
 * `turns` is signed and taken mod 4, so a move can carry `-1` for a
 * counter-clockwise turn without the caller normalizing first.
 *
 * @param {number[]} v axis-aligned or lattice vector
 * @param {number} axis one of `AXIS`
 * @param {number} turns signed quarter turns, clockwise-from-outside positive
 */
export const rotateQuarter = (v, axis, turns) => {
  let out = v;
  const n = ((turns % 4) + 4) % 4;
  for (let i = 0; i < n; i += 1) out = rotateOnce(out, axis);
  return out;
};

// ---------------------------------------------------------------------------
// Partial turns — the same rotation, mid-flight
// ---------------------------------------------------------------------------

/** One quarter turn in radians. `rotateQuarter`'s "clockwise seen from the
 *  positive end of the axis" is −90° in right-handed coordinates. */
const QUARTER = Math.PI / 2;

/**
 * A move's quarter-turn count as a **signed** number: the short way round.
 *
 * `amount` is always 0–3 because the model only ever needs to know where a turn
 * *lands*, and 3 lands where −1 does. An animation cares about the difference:
 * spinning a `D` (which carries 3) through +270° is three quarters of a second
 * of the cube going the wrong way before it arrives at the right place.
 */
export const shortWay = (amount) => {
  const n = ((amount % 4) + 4) % 4;
  return n > 2 ? n - 4 : n;
};

/**
 * How far through a turn of `amount` quarter turns a fraction `t` is, in
 * radians about the move's axis. Exactly the angle `rotateQuarter` would give
 * at `t = 1`, and exactly zero at `t = 0`.
 *
 * `turns` overrides the direction, and exists for one caller: the pad's second
 * tap, which grows `R` into `R2` **while the cube is already a quarter of the
 * way through it**. `shortWay(2)` is always `+2` — a half turn has no direction
 * of its own — so a `D2` animates the opposite way to the `D` it grew from, and
 * continuing it would jump the layer 180° before turning. Handing the animation
 * a signed sweep lets the second quarter carry on the way the first one went.
 *
 * It only ever changes *which way round* a half turn travels, never where it
 * lands: ±2 quarter turns are the same permutation, and `t = 1` still hands off
 * to the exact integer path.
 */
export const turnAngle = (amount, t, turns) =>
  (turns === undefined ? shortWay(amount) : turns) * -QUARTER * t;

/**
 * Rotate `v` about `axis` by `angle` radians, right-handed — the floating-point
 * sibling of `rotateQuarter`, and the *only* place a non-integer rotation is
 * allowed to touch the cube.
 *
 * It never touches the model: `buildScene` calls it on a copy on its way to the
 * screen, so a cube part-way through a turn is a picture, not a state. The model
 * gets the move once, exactly, when the animation ends.
 */
const rotateAxis = (v, axis, angle) => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const [x, y, z] = v;
  if (axis === AXIS.x) return [x, y * c - z * s, y * s + z * c];
  if (axis === AXIS.y) return [x * c + z * s, y, -x * s + z * c];
  return [x * c - y * s, x * s + y * c, z];
};

/**
 * `v`, a fraction `t` of the way through a turn of `amount` quarter turns.
 *
 * The two ends are handed off to the exact integer path rather than computed:
 * `Math.cos(Math.PI / 2)` is 6.1e-17, not 0, and a turn that ends 6.1e-17 short
 * of where the model puts the cube is a frame that does not match the one after
 * it. `t = 0` gives `v` back, and `t = 1` gives exactly `rotateQuarter`.
 */
export const partialTurn = (v, axis, amount, t, turns) => {
  if (!(t > 0)) return v;
  if (t >= 1) return rotateQuarter(v, axis, amount);
  return rotateAxis(v, axis, turnAngle(amount, t, turns));
};

// ---------------------------------------------------------------------------
// Floating-point view math
// ---------------------------------------------------------------------------

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Turn the world by `yaw` about Y then `pitch` about X — the camera stays put at
 * `[0, 0, CAMERA_DISTANCE]` looking down −z.
 *
 * Rotating the *model* rather than orbiting a camera keeps the projection to one
 * multiply and one divide, and makes the drag mapping obvious: yaw is "spin it",
 * pitch is "tip it toward me".
 */
export const orbit = (p, yaw, pitch) => {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cx = Math.cos(pitch);
  const sx = Math.sin(pitch);

  // Ry(yaw)
  const x1 = p[0] * cy + p[2] * sy;
  const y1 = p[1];
  const z1 = -p[0] * sy + p[2] * cy;

  // Rx(pitch)
  return [x1, y1 * cx - z1 * sx, y1 * sx + z1 * cx];
};

/** The view the cube opens at: U, F and R all in sight, F to the left of R. */
export const DEFAULT_YAW = (-30 * Math.PI) / 180;
export const DEFAULT_PITCH = (25 * Math.PI) / 180;

/**
 * Fold an angle into (−π, π], so turning the cube all the way over and round
 * again does not accumulate revolutions in the state.
 */
export const wrapAngle = (angle) => {
  const turn = Math.PI * 2;
  return (((angle + Math.PI) % turn) + turn) % turn - Math.PI;
};

/**
 * Whether the cube is past upright — the thing the pitch clamp used to prevent
 * and now merely has to cope with.
 *
 * **Pitch was clamped just short of ±90° until 2026-08-02**, so that a drag
 * could never take the cube over its own pole and invert. That turned out to
 * make **yellow-up unreachable** — D is only the highest face on screen when
 * `cos(pitch) < 0` — and yellow-up is the traditional Roux hold, so it was the
 * first thing the operator tried and could not do.
 *
 * The clamp is gone and the inversion is handled instead. Only the *horizontal*
 * drag needs it: increasing pitch applies its rotation directly in view space,
 * so a vertical drag reads the same at every angle, while increasing yaw spins
 * about the world's up-axis, which points *down the screen* once the cube is
 * over. Reversing the horizontal drag there keeps "push the surface under your
 * finger" true all the way round.
 */
export const isUpsideDown = (pitch) => Math.cos(pitch) < 0;

/** Radians of rotation per point of finger travel (≈ a half turn per 160pt). */
export const RADIANS_PER_POINT = 0.011;

/** Camera distance in cubie units. Far enough that perspective reads as depth
 *  rather than as a fisheye; near enough that the cube still looks solid. */
const CAMERA_DISTANCE = 8;

/** Radius of the sphere the cube fits inside: half-diagonal of a 3×3×3. */
const CUBE_RADIUS = Math.sqrt(3) * 1.5;

/** How much of the viewport's half-width the cube's silhouette may take. */
const FILL = 0.94;

/** Half-width of a cubie's outer face — cubies are flush, so this is exactly ½. */
const BODY_HALF = 0.5;

/** Half-width of the coloured tile on it. The remainder reads as plastic. */
const STICKER_HALF = 0.5 - 0.075;

/** Tiles sit a hair proud of the plastic so they can never z-fight with it. */
const STICKER_LIFT = 0.502;

/**
 * The plastic between the tiles.
 *
 * Not themed: a cube is a physical object, and a cube whose body followed the
 * app's theme stopped looking like one. It is also what makes the renderer need
 * no backdrop — every visible cubie face is drawn body-first, edge to edge with
 * its neighbours, so the gaps between tiles are plastic rather than holes.
 */
export const CUBE_BODY = '#1b1b1d';

/** Light direction in *view* space — fixed to the screen, not to the cube, so
 *  the face pointing up is always the bright one however you spin it. */
const LIGHT = (() => {
  const v = [-0.35, 0.78, 0.52];
  const len = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / len, v[1] / len, v[2] / len];
})();

/** Floor of the shading ramp: how dark a face pointing away from the light gets. */
const AMBIENT = 0.66;

/**
 * Two in-plane unit vectors for an axis-aligned face normal. Any orthonormal
 * pair works — the polygons are filled from an explicit normal, so winding
 * carries no meaning here.
 */
const faceBasis = (n) => {
  if (n[0] !== 0) return [[0, 0, 1], [0, 1, 0]];
  if (n[1] !== 0) return [[1, 0, 0], [0, 0, 1]];
  return [[1, 0, 0], [0, 1, 0]];
};

/**
 * The four corners of a square of half-width `half`, centred `lift` out along
 * `n` from cubie centre `pos`.
 */
const quad = (pos, n, lift, half) => {
  const [u, w] = faceBasis(n);
  const c = [
    pos[0] + n[0] * lift,
    pos[1] + n[1] * lift,
    pos[2] + n[2] * lift,
  ];
  const corner = (su, sw) => [
    c[0] + u[0] * half * su + w[0] * half * sw,
    c[1] + u[1] * half * su + w[1] * half * sw,
    c[2] + u[2] * half * su + w[2] * half * sw,
  ];
  return [corner(1, 1), corner(-1, 1), corner(-1, -1), corner(1, -1)];
};

/** The 27 lattice positions — the 26 cubies **and the core**. Only the seam
 *  pass below walks this, and only there does the core matter: a slice turn
 *  swings it away from the middle of the cube, and if nothing plugged the hole
 *  you would see the background through the middle of a turning cube. */
const LATTICE = (() => {
  const out = [];
  for (let x = -1; x <= 1; x += 1) {
    for (let y = -1; y <= 1; y += 1) {
      for (let z = -1; z <= 1; z += 1) out.push([x, y, z]);
    }
  }
  return out;
})();

/** The six directions a cubie has a neighbour in. */
const NEIGHBOURS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

/**
 * A move in flight: which cubies it carries, where they are *now*, and where
 * they land. `null` when there is nothing to animate, which is what keeps the
 * still cube's code path — and its output — exactly what it was.
 *
 * @param {{axis: number, layers: number[], amount: number, t: number,
 *   turns?: number}|null} turn `turns` is an optional signed quarter-turn count
 *   overriding the direction — see `turnAngle`.
 */
const spinFor = (turn) => {
  if (!turn) return null;

  const { axis, layers, amount, turns } = turn;
  const t = Number.isFinite(turn.t) ? Math.max(0, Math.min(1, turn.t)) : 0;
  if (t === 0) return null;

  const settle = (v) => rotateQuarter(v, axis, amount);

  // The last frame of a turn is not a turn: at `t = 1` the move has landed, so
  // the frame is built on the settled lattice by exactly the code a still cube
  // goes through. Carrying the corners round by 90° instead would put the same
  // square on the screen with its vertices listed from a different one, which
  // draws identically and compares unequal — and "the last frame of a turn *is*
  // the still cube after it" is a property worth being able to assert.
  const landed = t === 1;

  return {
    // Part-way through, the move has cut the cube open along the seams either
    // side of the layers it carries. Landed, it is closed again.
    open: !landed,
    carries: (pos) => layers.includes(pos[axis]),
    /** The lattice a carried cubie's squares are built on. */
    place: landed ? settle : (v) => v,
    /** Where those squares are carried afterwards — null once it has landed. */
    carry: landed ? null : (v) => partialTurn(v, axis, amount, t, turns),
    settle,
  };
};

/**
 * Scale that keeps the cube the same size at every angle.
 *
 * Fitting the cube's *own* eight corners each frame would be tighter, but the
 * fit would then change as it spins — the cube would visibly breathe. Fitting
 * the bounding sphere instead is angle-independent by construction.
 */
const focalFor = (size) =>
  ((size / 2) * FILL * Math.sqrt(CAMERA_DISTANCE ** 2 - CUBE_RADIUS ** 2)) / CUBE_RADIUS;

/**
 * Build one frame: every visible face of the cube, as flat polygons in screen
 * coordinates, ordered back to front.
 *
 * Painter's algorithm is *exact* here rather than approximate. Only outward
 * faces exist, they all lie on the surface of a convex solid, and back-facing
 * ones are culled — so no two remaining polygons can overlap in a way that
 * centroid depth gets wrong.
 *
 * Each visible face contributes two polygons, plastic then tile, so the caller
 * can draw the returned list start to finish without thinking about layering.
 * A seam opened by a turn contributes plastic only — there is no sticker on the
 * inside of a cube.
 *
 * ### Turns
 *
 * `turn` draws the cube part-way through a move without the model knowing
 * anything about it: the cubies the move carries are rotated by `t` of the way
 * round on their way to the screen, and everything else is drawn where it is.
 * At `t = 0` and `t = 1` the frame is **identical** — polygon for polygon, key
 * for key — to the still cube before and after the move, which is what makes an
 * animation that starts and lands without a jump a property rather than a hope.
 *
 * @param {{cubies: Array}} cube from `cubeState.js` — the cube *before* the move
 * @param {Object} options
 * @param {number} options.size viewport edge in points (square)
 * @param {number} options.yaw radians about Y
 * @param {number} options.pitch radians about X
 * @param {Object<string,string>} options.colors face letter → hex
 * @param {{axis: number, layers: number[], amount: number, t: number}} [options.turn]
 *   a move in progress, `t` from 0 (not started) to 1 (landed)
 * @returns {{polygons: Array<{key: string, points: number[][], fill: string}>}}
 */
export const buildScene = (cube, { size, yaw, pitch, colors, turn = null }) => {
  const focal = focalFor(size);
  const half = size / 2;
  const spin = spinFor(turn);

  const project = (p) => {
    const s = focal / (CAMERA_DISTANCE - p[2]);
    return [half + p[0] * s, half - p[1] * s];
  };

  const faces = [];

  /**
   * One outward face of one cubie: the square at `home` facing `normal` on a
   * cube at rest, carried into the frame by `carry`.
   *
   * The square is always *built* on the lattice and carried afterwards, never
   * built where the turn has got to. `faceBasis` only knows how to span an
   * axis-aligned normal, so a face built from a half-turned normal comes out as
   * an unrotated square at a rotated centre — which draws a layer whose tiles
   * have come off it. Carrying the four corners through the same rotation as
   * the cubie is both correct and, since a rotation about the origin is linear,
   * the same square.
   *
   * `fill` is the sticker colour, or null for a seam, which is bare plastic.
   */
  const addFace = (key, home, homeNormal, fill, carry) => {
    const at = carry ? carry(home) : home;
    const normal = carry ? carry(homeNormal) : homeNormal;

    const n = orbit(normal, yaw, pitch);
    const centre = orbit(
      [
        at[0] + normal[0] * BODY_HALF,
        at[1] + normal[1] * BODY_HALF,
        at[2] + normal[2] * BODY_HALF,
      ],
      yaw,
      pitch
    );

    // Back-face cull against the vector from this face to the camera, not
    // against the view axis: with perspective those differ near the silhouette,
    // and using the view axis leaves a sliver of edge-on faces showing through.
    const toCamera = [-centre[0], -centre[1], CAMERA_DISTANCE - centre[2]];
    if (dot(n, toCamera) <= 0) return;

    const shade = AMBIENT + (1 - AMBIENT) * Math.max(0, dot(n, LIGHT));
    const darken = 1 - shade;

    const points = (lift, size2) =>
      quad(home, homeNormal, lift, size2).map((p) =>
        project(orbit(carry ? carry(p) : p, yaw, pitch))
      );

    faces.push({
      key,
      depth: centre[2],
      body: points(BODY_HALF, BODY_HALF),
      tile: fill ? points(STICKER_LIFT, STICKER_HALF) : null,
      fill: fill ? mix(fill, '#000000', darken) : null,
      bodyFill: mix(CUBE_BODY, '#000000', darken * 0.5),
    });
  };

  cube.cubies.forEach((cubie) => {
    const carried = spin ? spin.carries(cubie.pos) : false;
    const carry = carried ? spin.carry : null;
    const home = carried ? spin.place(cubie.pos) : cubie.pos;
    // The key names where the face is *going*, not where it is. That holds it
    // still across the whole turn and hands the same polygon straight to the
    // frame after it, so React re-renders the cube each frame rather than
    // remounting 54 views.
    const keyPos = carried ? spin.settle(cubie.pos) : cubie.pos;

    cubie.stickers.forEach((sticker) => {
      const keyNormal = carried ? spin.settle(sticker.normal) : sticker.normal;
      addFace(
        `${keyPos.join(',')}|${keyNormal.join(',')}`,
        home,
        carried ? spin.place(sticker.normal) : sticker.normal,
        colors[sticker.face],
        carry
      );
    });
  });

  // The seams a turn cuts open. A cubie's inward faces carry no sticker and are
  // never drawn on a still cube, because a closed cube has no inside — but a
  // layer half-way round has swung away from the one under it, and without
  // these you would see the app's background through the gap.
  if (spin && spin.open) {
    LATTICE.forEach((home) => {
      const carried = spin.carries(home);

      NEIGHBOURS.forEach((direction) => {
        const neighbour = [
          home[0] + direction[0],
          home[1] + direction[1],
          home[2] + direction[2],
        ];
        // Outside the cube: that face is on the surface and has a sticker.
        if (neighbour.some((c) => c < -1 || c > 1)) return;
        // Both sides go the same way, so this seam never opens.
        if (carried === spin.carries(neighbour)) return;

        const keyPos = carried ? spin.settle(home) : home;
        const keyNormal = carried ? spin.settle(direction) : direction;
        addFace(
          `seam|${keyPos.join(',')}|${keyNormal.join(',')}`,
          home,
          direction,
          null,
          carried ? spin.carry : null
        );
      });
    });
  }

  faces.sort((a, b) => a.depth - b.depth);

  const polygons = [];
  faces.forEach((face) => {
    polygons.push({ key: `${face.key}:body`, points: face.body, fill: face.bodyFill });
    if (face.tile) polygons.push({ key: `${face.key}:tile`, points: face.tile, fill: face.fill });
  });

  return { polygons };
};

export default { AXIS, rotateQuarter, shortWay, turnAngle, partialTurn, orbit, buildScene };
