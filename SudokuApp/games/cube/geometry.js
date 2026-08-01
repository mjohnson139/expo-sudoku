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

/** Past this the cube would roll past its own pole and the drag would invert. */
export const MAX_PITCH = (89 * Math.PI) / 180;

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
 *
 * @param {{cubies: Array}} cube from `cubeState.js`
 * @param {Object} options
 * @param {number} options.size viewport edge in points (square)
 * @param {number} options.yaw radians about Y
 * @param {number} options.pitch radians about X
 * @param {Object<string,string>} options.colors face letter → hex
 * @returns {{polygons: Array<{key: string, points: number[][], fill: string}>}}
 */
export const buildScene = (cube, { size, yaw, pitch, colors }) => {
  const focal = focalFor(size);
  const half = size / 2;

  const project = (p) => {
    const s = focal / (CAMERA_DISTANCE - p[2]);
    return [half + p[0] * s, half - p[1] * s];
  };

  const faces = [];

  cube.cubies.forEach((cubie) => {
    cubie.stickers.forEach((sticker) => {
      const n = orbit(sticker.normal, yaw, pitch);
      const centre = orbit(
        [
          cubie.pos[0] + sticker.normal[0] * BODY_HALF,
          cubie.pos[1] + sticker.normal[1] * BODY_HALF,
          cubie.pos[2] + sticker.normal[2] * BODY_HALF,
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

      faces.push({
        key: `${cubie.pos.join(',')}|${sticker.normal.join(',')}`,
        depth: centre[2],
        body: quad(cubie.pos, sticker.normal, BODY_HALF, BODY_HALF).map((p) =>
          project(orbit(p, yaw, pitch))
        ),
        tile: quad(cubie.pos, sticker.normal, STICKER_LIFT, STICKER_HALF).map((p) =>
          project(orbit(p, yaw, pitch))
        ),
        fill: mix(colors[sticker.face], '#000000', darken),
        bodyFill: mix(CUBE_BODY, '#000000', darken * 0.5),
      });
    });
  });

  faces.sort((a, b) => a.depth - b.depth);

  const polygons = [];
  faces.forEach((face) => {
    polygons.push({ key: `${face.key}:body`, points: face.body, fill: face.bodyFill });
    polygons.push({ key: `${face.key}:tile`, points: face.tile, fill: face.fill });
  });

  return { polygons };
};

export default { AXIS, rotateQuarter, orbit, buildScene };
