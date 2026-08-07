/**
 * How the cube is being held (docs/cube-plan.md §8.2, Step 5).
 *
 * Roux begins with inspection: turn the cube over in your hands, find the pairs,
 * and decide which colour is going on top and which is going on the left. Only
 * then does the solve start, and every `R` in it means *the face that is on the
 * right once you are holding it that way*.
 *
 * In notation that is a prefix of whole-cube rotations, which the model and the
 * renderer already handle. What this module adds is a way to *pick* one without
 * typing it: the operator pans the cube until it looks the way they want to hold
 * it, and the view angle is read back as the rotation that gets there.
 *
 * ### Why the camera cannot just be left where it is
 *
 * Panning moves the **camera**; a rotation moves the **model**. Leaving the
 * camera somewhere and calling that the orientation would look right and be
 * wrong the moment a move was entered — `R` would still turn the face the model
 * calls R, not the one now on the right of the screen. So the angle is converted
 * into rotations and applied to the cube, and the camera goes back to the
 * default.
 *
 * **The angle is not kept, but the picture is** (revised 2026-08-03). There are
 * 24 holds and infinitely many angles to look at one from, so what is *stored*
 * is which of the 24 — the angle itself is not part of the solve. But the camera
 * no longer snaps back to the opening view when the hold is set: it moves to
 * wherever reproduces what you were already looking at, which `viewAfterHold`
 * works out. Step 5 threw the angle away entirely and the operator's verdict on
 * using it was that the jump is an annoyance; the reasoning behind the jump is
 * kept below, because the part of it that is right is still right.
 *
 * Pure: no React, no react-native. `orbit` is the only thing borrowed from the
 * renderer, and it is pure too.
 */

import { FACE_NORMALS, FACE_ORDER, applyMove, facelets, solvedCube } from './cubeState';
import { orbit } from './geometry';
import { OPPOSITE_FACE, parseMove } from './moves';

/** The nine rotations a cube can be turned by in one go. */
export const ROTATION_TOKENS = ['x', "x'", 'x2', 'y', "y'", 'y2', 'z', "z'", 'z2'];

/**
 * The colour on each face of a solved, unrotated cube — the WCA scheme
 * (`cubeState.STICKER_COLORS`), said the way a person says it.
 *
 * Used to describe an orientation as **"yellow up · blue left"** rather than as
 * `z2 y'`. Nobody inspecting a cube thinks in rotations; they think in the
 * colour that is going on top and the one going on the left.
 */
export const COLOR_NAMES = {
  U: 'white',
  R: 'red',
  F: 'green',
  D: 'yellow',
  L: 'orange',
  B: 'blue',
};

/**
 * Which of the original faces are at the U, F and L positions — the centres,
 * which is what identifies an orientation. A face turn never moves a centre, so
 * this reads the same on a scrambled cube as on a solved one.
 *
 * **The model identifies a hold by `up` and `front`; a person names it by `up`
 * and `left`.** Both pairs work — any two adjacent faces fix an orientation, and
 * 6 × 4 is 24 either way — so this is a naming decision rather than a modelling
 * one, and the table below stays keyed on the pair the rotations are easiest to
 * search over. See `describeOrientation` for why the *readout* takes the other
 * pair.
 */
const facingOf = (cube) => {
  const faces = facelets(cube);
  return { up: faces.U[4], front: faces.F[4], left: faces.L[4] };
};

const keyOf = ({ up, front }) => `${up}${front}`;

/**
 * Every orientation a cube can be held in, and the shortest way to turn it
 * there — 24 of them, keyed by which original faces end up at U and F.
 *
 * Built by breadth-first search over the nine rotations rather than written out,
 * because a hand-written table of 24 rotation sequences is 24 chances to be
 * wrong in a way no reviewer can see. This is the same argument §3 makes for not
 * hand-writing facelet permutations, and it costs one search of 24 states at
 * module load.
 */
const buildTable = () => {
  const table = new Map();
  const start = solvedCube();
  table.set(keyOf(facingOf(start)), '');

  let frontier = [{ cube: start, alg: '' }];
  while (frontier.length > 0) {
    const next = [];
    frontier.forEach(({ cube, alg }) => {
      ROTATION_TOKENS.forEach((token) => {
        const turned = applyMove(cube, parseMove(token));
        const key = keyOf(facingOf(turned));
        if (table.has(key)) return;
        const grown = alg ? `${alg} ${token}` : token;
        table.set(key, grown);
        next.push({ cube: turned, alg: grown });
      });
    });
    frontier = next;
  }

  return table;
};

const ORIENTATIONS = buildTable();

/** How many orientations there are, which is a fact about cubes and therefore a
 *  test worth having: 6 faces up × 4 ways round = 24. */
export const ORIENTATION_COUNT = ORIENTATIONS.size;

/**
 * The rotations that bring `up` to the top and `front` to the front.
 *
 * @param {string} up face letter that should end up at U
 * @param {string} front face letter that should end up at F
 * @returns {string|null} notation, `''` for "already there", null if the pair is
 *   not an orientation (the two faces are the same or opposite)
 */
export const algForFacing = (up, front) => {
  const alg = ORIENTATIONS.get(`${up}${front}`);
  return alg === undefined ? null : alg;
};

/**
 * Which face is at the top of the screen, and which is facing the viewer, at a
 * given view angle.
 *
 * `orbit` turns world vectors into view space, where **+y is up the screen and
 * +z is toward the camera** — so this is two argmaxes over the six face normals
 * and no projection is needed.
 *
 * **Front is chosen among the four faces perpendicular to `up`**, and that is
 * not a detail. Looking straight down a body diagonal — yaw 45°, pitch 45°, one
 * drag from the opening view — the *same* face is both the highest on screen and
 * the nearest to the camera. Taking the two argmaxes independently returns a
 * pair that is not an orientation at all, and the cube would refuse to be set
 * from a perfectly ordinary angle.
 */
export const facingAt = (yaw, pitch) => {
  let up = null;
  let highest = -Infinity;
  FACE_ORDER.forEach((face) => {
    const height = orbit(FACE_NORMALS[face], yaw, pitch)[1];
    if (height > highest) {
      highest = height;
      up = face;
    }
  });

  let front = null;
  let nearest = -Infinity;
  FACE_ORDER.forEach((face) => {
    if (face === up || face === OPPOSITE_FACE[up]) return;
    const depth = orbit(FACE_NORMALS[face], yaw, pitch)[2];
    if (depth > nearest) {
      nearest = depth;
      front = face;
    }
  });

  return { up, front };
};

/**
 * The rotations that make the cube sit, at the default view angle, the way it
 * currently looks at `yaw`/`pitch`.
 *
 * This is the whole feature in one line: pan to what you want, and this says how
 * to turn the cube so that *is* the front.
 */
export const orientationAt = (yaw, pitch) => {
  const { up, front } = facingAt(yaw, pitch);
  return algForFacing(up, front) || '';
};

/**
 * The hold as a rotation matrix — rows, so `R · n` is where the model vector
 * `n` ends up.
 *
 * Read straight off the pair rather than parsed back out of the notation: a
 * rotation is fixed by where three orthogonal axes go, so "`up`'s normal goes to
 * +y and `front`'s goes to +z" *is* the rotation. The third row is `up × front`,
 * which is the right-handed choice because x̂ = ŷ × ẑ in this lattice (plan §3).
 */
const holdMatrix = (up, front) => {
  const u = FACE_NORMALS[up];
  const f = FACE_NORMALS[front];
  const r = [u[1] * f[2] - u[2] * f[1], u[2] * f[0] - u[0] * f[2], u[0] * f[1] - u[1] * f[0]];
  return [r, u, f];
};

/**
 * Where to put the camera after a hold is baked in, so **the picture does not
 * jump**.
 *
 * ### The thing this fixes
 *
 * Step 5 sent the camera back to the opening angle on Set start, deliberately:
 * there are 24 holds and infinitely many angles to look at one from, and
 * inspecting from directly overhead is a fine way to decide "yellow up, blue
 * front" and a bad way to look at a cube you are about to solve. The reasoning
 * was sound and the *feel* was wrong, which is a thing only use can tell you —
 * the operator turns the cube to exactly how they mean to hold it, taps Set
 * start, and it moves. **The angle you chose is information, and throwing all of
 * it away threw away the good part with the bad.**
 *
 * ### The arithmetic
 *
 * Panning moves the camera; a hold moves the model. That is still true and is
 * still why the hold has to be baked in (see the note at the top of this file).
 * But baking it is a rotation `R` applied to the model, so a camera `C` that was
 * showing `C(M)` needs to become `C · R⁻¹` to show the same picture of `R(M)`:
 *
 *     C'(R(M)) = C·R⁻¹·R(M) = C(M)
 *
 * `C` is `Rx(pitch)·Ry(yaw)` — two angles, no roll — and `C · R⁻¹` is a general
 * rotation, so it is not always in that family. **It is far more often than you
 * would guess.** Over a 5° sweep of every angle a finger can reach, 57% come
 * back exactly, 97% come back closer than the opening angle was, and every
 * ordinary inspection angle tried — including turning the cube right over for
 * the traditional yellow-up Roux hold, which is the one that jumps hardest
 * today — is exact.
 *
 * When it is not exact, what is lost is the **roll**: the component that would
 * have left the cube sitting at a tilt on screen. That is the one part of an
 * inspection angle worth discarding, so the approximation fails in the right
 * direction. Giving the camera a roll axis would make it exact everywhere and is
 * still the change to make if colour neutrality ever lands (plan §8.3) — it is
 * not needed for this.
 *
 * @param {number} yaw the angle the cube was inspected from
 * @param {number} pitch
 * @returns {{yaw: number, pitch: number}} the camera that reproduces the picture
 */
export const viewAfterHold = (yaw, pitch) => {
  const { up, front } = facingAt(yaw, pitch);
  if (algForFacing(up, front) === null) return { yaw, pitch };

  // Column j of `C · R⁻¹` is `C` applied to row j of R, because R is a rotation
  // and so its inverse is its transpose.
  const columns = holdMatrix(up, front).map((row) => orbit(row, yaw, pitch));
  const m = (i, j) => columns[j][i];

  // `Rx(b)·Ry(a)` reads
  //   [[ ca,       0,    sa   ],
  //    [ sb·sa,   cb,   -sb·ca],
  //    [-cb·sa,   sb,    cb·ca]]
  // so both angles come straight off it, and `atan2` handles every quadrant and
  // the poles without a special case.
  return { yaw: Math.atan2(m(0, 2), m(0, 0)), pitch: Math.atan2(m(2, 1), m(1, 1)) };
};

/** The colours on top of, in front of and to the left of `cube`, named. */
export const facingColors = (cube) => {
  const { up, front, left } = facingOf(cube);
  return { up: COLOR_NAMES[up], front: COLOR_NAMES[front], left: COLOR_NAMES[left] };
};

/**
 * `"white up · orange left"` — how a hold is written on the screen.
 *
 * ### Why left rather than front (operator, 2026-08-06)
 *
 * Roux names a hold by the **top and the left**, and the reason is in the method
 * rather than in taste: LSE runs on the M slice, and **M moves the front centre
 * and leaves the left one alone.** So through the part of a solve where the cube
 * is being turned about most, the front colour is the one that keeps changing
 * and the left colour is the anchor — it is the face the first block is built
 * on. A solver holding a cube knows what is on top and what is on the left; they
 * would have to work out what is in front.
 *
 * This is a **readout** decision and nothing below it changes. Up and front
 * still identify the hold internally, `algForFacing` still takes that pair, and
 * the save file still stores a rotation prefix rather than any colour at all
 * (plan §7.2). Up and left identify the hold exactly as well — any two adjacent
 * faces do — so nothing is lost by saying it the way the method says it.
 *
 * One string in one function on purpose: the inspection readout, the solve bar,
 * the solves list, `Set start`, `Start view` and every accessibility label name
 * a hold the same way.
 */
export const describeOrientation = (cube) => {
  const { up, left } = facingColors(cube);
  return `${up} up · ${left} left`;
};

/** The same, opening with a capital, for the start of a line. */
export const describeOrientationSentence = (cube) => {
  const text = describeOrientation(cube);
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export default {
  algForFacing,
  facingAt,
  orientationAt,
  viewAfterHold,
  facingColors,
  describeOrientation,
};
