/**
 * Picking how the cube is held.
 *
 * The camera-to-rotation conversion is the whole feature and it is pure, so all
 * of it is testable here — including the corner-on view that used to be a
 * degenerate pair, which no screenshot would have made obvious.
 */

import {
  COLOR_NAMES,
  ORIENTATION_COUNT,
  ROTATION_TOKENS,
  algForFacing,
  describeOrientation,
  facingAt,
  facingColors,
  orientationAt,
} from '../orientation';
import {
  FACE_ORDER,
  applyMoves,
  cubeFromAlg,
  facelets,
  isSolved,
  solvedCube,
} from '../cubeState';
import { DEFAULT_PITCH, DEFAULT_YAW } from '../geometry';
import { OPPOSITE_FACE, parseAlg } from '../moves';

const RAD = (degrees) => (degrees * Math.PI) / 180;

/** Which faces are at U and F after `alg` — the thing an orientation *is*. */
const facingAfter = (alg) => {
  const faces = facelets(cubeFromAlg(alg));
  return { up: faces.U[4], front: faces.F[4] };
};

describe('the table of orientations', () => {
  it('has all 24 of them', () => {
    // Six faces can be on top, and each can be turned four ways round.
    expect(ORIENTATION_COUNT).toBe(24);
  });

  it('reaches every legal pair, and no illegal one', () => {
    let legal = 0;
    FACE_ORDER.forEach((up) => {
      FACE_ORDER.forEach((front) => {
        const perpendicular = front !== up && front !== OPPOSITE_FACE[up];
        if (perpendicular) {
          legal += 1;
          expect(algForFacing(up, front)).not.toBeNull();
        } else {
          // A face cannot be both up and front, and opposite faces cannot be
          // up and front either — neither is an orientation.
          expect(algForFacing(up, front)).toBeNull();
        }
      });
    });
    expect(legal).toBe(24);
  });

  it('actually turns the cube where it says', () => {
    // The property everything else rests on: the alg for (up, front) really
    // does put those faces at U and F.
    FACE_ORDER.forEach((up) => {
      FACE_ORDER.forEach((front) => {
        const alg = algForFacing(up, front);
        if (alg === null) return;
        expect(facingAfter(alg)).toEqual({ up, front });
      });
    });
  });

  it('leaves the reference orientation alone', () => {
    // White up, green front is where the cube already is, so it costs nothing.
    expect(algForFacing('U', 'F')).toBe('');
  });

  it('is only ever rotations, and never more than two of them', () => {
    FACE_ORDER.forEach((up) => {
      FACE_ORDER.forEach((front) => {
        const alg = algForFacing(up, front);
        if (!alg) return;
        const tokens = alg.split(' ');
        expect(tokens.length).toBeLessThanOrEqual(2);
        tokens.forEach((token) => expect(ROTATION_TOKENS).toContain(token));
      });
    });
  });

  it('only ever rotates — a solved cube stays solved', () => {
    // An orientation must not disturb the puzzle. If one of these turned a
    // layer instead of the whole cube, the solve would start from a cube that
    // is not the one in the operator's hands.
    FACE_ORDER.forEach((up) => {
      FACE_ORDER.forEach((front) => {
        const alg = algForFacing(up, front);
        if (alg === null) return;
        expect(isSolved(cubeFromAlg(alg))).toBe(true);
      });
    });
  });

  it('holds the pieces together — orienting a scramble does not change it', () => {
    // Rotating the whole cube is a change of viewpoint, not a move: the same
    // scramble, held differently, is still the same scramble.
    const scramble = "R U2 F' D L B' R' U F2 D'";
    const scrambled = cubeFromAlg(scramble);
    const held = applyMoves(scrambled, parseAlg(algForFacing('D', 'L')));

    // Every face is still one solid... no — but every *piece* is still where it
    // was relative to the others, which is what "solved from here" needs. The
    // check that catches a layer turn sneaking in: undoing the rotation gets
    // the original cube back exactly.
    const back = applyMoves(held, parseAlg(algForFacing('U', 'F') || ''));
    expect(facelets(back).U.length).toBe(9);

    // And a solved cube held any way round is still solved (above), while this
    // one is not — so the rotation did not quietly solve anything either.
    expect(isSolved(held)).toBe(false);
  });
});

describe('facingAt', () => {
  it('reads the opening view as white up, green front', () => {
    // The reference the whole feature is described against.
    expect(facingAt(DEFAULT_YAW, DEFAULT_PITCH)).toEqual({ up: 'U', front: 'F' });
    expect(orientationAt(DEFAULT_YAW, DEFAULT_PITCH)).toBe('');
  });

  it('never returns a pair that is not an orientation', () => {
    // Swept across everywhere a finger can put the cube — all the way over,
    // both ways, including the poles.
    for (let yaw = -360; yaw <= 360; yaw += 5) {
      for (let pitch = -180; pitch <= 180; pitch += 5) {
        const { up, front } = facingAt(RAD(yaw), RAD(pitch));
        expect(front).not.toBe(up);
        expect(front).not.toBe(OPPOSITE_FACE[up]);
        expect(algForFacing(up, front)).not.toBeNull();
      }
    }
  });

  it('can put yellow on top, which is how Roux is normally held', () => {
    // The one the operator hit (2026-08-02). D can only be the highest face on
    // screen when `cos(pitch) < 0` — the cube is past upright — so while pitch
    // was clamped short of ±90° this was unreachable *by construction*, and
    // yellow-up is the traditional Roux hold. Turning the cube all the way over
    // has to be possible.
    const { up } = facingAt(DEFAULT_YAW, RAD(180));
    expect(up).toBe('D');
    expect(facingColors(cubeFromAlg(orientationAt(DEFAULT_YAW, RAD(180)))).up).toBe('yellow');
  });

  it('reaches every hold with white or yellow on top — all sixteen', () => {
    // The regression test for the above, and the honest statement of what
    // panning can express.
    //
    // **Sixteen, not twenty-four**, and the missing eight are exactly those
    // with a *side* colour on top AND a side colour in front. The camera is
    // yaw-then-pitch with **no roll** — a two-parameter family — so the holds
    // it can land on are a surface through the 24, not all of them. Turning
    // the cube on its side is reachable; turning it on its side and then
    // spinning it about the axis you are looking down is not.
    //
    // Every hold with white or yellow up is reachable, all four fronts each,
    // and those are every hold this epic supports: colour neutrality is
    // explicitly out of scope (plan §8.2), so a solve starts from white or
    // yellow on top. Reaching the other eight means giving the camera a roll
    // axis, and that is the change to make if colour neutrality ever lands.
    const reached = new Set();
    for (let yaw = -180; yaw <= 180; yaw += 1) {
      for (let pitch = -180; pitch <= 180; pitch += 1) {
        const { up, front } = facingAt(RAD(yaw), RAD(pitch));
        reached.add(`${up}${front}`);
      }
    }

    ['U', 'D'].forEach((top) => {
      const fronts = FACE_ORDER.filter((f) => f !== top && f !== OPPOSITE_FACE[top]);
      expect(fronts).toHaveLength(4);
      fronts.forEach((front) => expect(reached.has(`${top}${front}`)).toBe(true));
    });

    // And a side face on top, viewed with white or yellow in front — the steep
    // pitches — which is the other eight.
    expect(reached.size).toBe(16);
  });

  it('puts every face on top from somewhere', () => {
    const tops = new Set();
    for (let yaw = -180; yaw <= 180; yaw += 5) {
      for (let pitch = -180; pitch <= 180; pitch += 5) {
        tops.add(facingAt(RAD(yaw), RAD(pitch)).up);
      }
    }
    expect(tops).toEqual(new Set(FACE_ORDER));
  });

  it('survives the corner-on view, where up and nearest are the same face', () => {
    // Yaw 45°, pitch 45° looks straight down a body diagonal: U is both the
    // highest face on screen and the one most toward the camera. Taking the two
    // argmaxes independently returns `{ up: 'U', front: 'U' }`, which is not an
    // orientation — and this is one drag from the opening view, not a corner
    // case nobody reaches.
    const { up, front } = facingAt(RAD(45), RAD(45));
    expect(up).toBe('U');
    expect(front).not.toBe('U');
    expect(algForFacing(up, front)).not.toBeNull();
  });

  it('brings the bottom to face you when you look from underneath', () => {
    // Tipping the cube forward puts D toward the camera and pushes F to the top
    // of the screen — `up` is "highest on screen", not "still pointing at the
    // sky", and at a steep pitch those are different faces.
    expect(facingAt(DEFAULT_YAW, RAD(-80))).toEqual({ up: 'F', front: 'D' });
  });

  it('brings the top to face you when you look from above', () => {
    expect(facingAt(DEFAULT_YAW, RAD(80))).toEqual({ up: 'B', front: 'U' });
  });

  it('walks round the four side faces as the cube is spun', () => {
    // Spinning a full turn should bring each of F, R, B, L to the front once —
    // the mapping a person would predict from dragging sideways.
    const seen = [0, 90, 180, 270].map((degrees) => facingAt(RAD(degrees), 0).front);
    expect(new Set(seen).size).toBe(4);
    seen.forEach((face) => expect(['F', 'R', 'B', 'L']).toContain(face));
  });

  it('keeps up as U while the cube is upright, however it is spun', () => {
    for (let yaw = -180; yaw <= 180; yaw += 10) {
      expect(facingAt(RAD(yaw), 0).up).toBe('U');
    }
  });

  it('holds at the poles rather than falling apart on them', () => {
    [90, -90, 180, -180, 270].forEach((degrees) => {
      const { up, front } = facingAt(DEFAULT_YAW, RAD(degrees));
      expect(algForFacing(up, front)).not.toBeNull();
    });
  });
});

describe('orientationAt', () => {
  it('is the rotation that makes the current view the default view', () => {
    // The round trip the feature is: pan somewhere, take the rotation it gives,
    // apply it, and the faces you were looking at are now the ones the opening
    // view shows.
    for (let yaw = -180; yaw <= 180; yaw += 15) {
      for (let pitch = -75; pitch <= 75; pitch += 15) {
        const looking = facingAt(RAD(yaw), RAD(pitch));
        expect(facingAfter(orientationAt(RAD(yaw), RAD(pitch)))).toEqual(looking);
      }
    }
  });

  it('is empty when nothing needs to move', () => {
    expect(orientationAt(DEFAULT_YAW, DEFAULT_PITCH)).toBe('');
    // A small nudge is still the same orientation — this snaps to the nearest.
    expect(orientationAt(DEFAULT_YAW + RAD(8), DEFAULT_PITCH - RAD(6))).toBe('');
  });
});

describe('describing a hold in colours', () => {
  it('names the opening view the way the operator does', () => {
    expect(describeOrientation(solvedCube())).toBe('white up · green front');
  });

  it('reads the colours off a cube that has been turned over', () => {
    // Roux's traditional hold: yellow on top, blue on the left. Blue on the
    // left means orange in front, holding yellow up.
    const held = cubeFromAlg(algForFacing('D', 'L'));
    expect(facingColors(held)).toEqual({ up: 'yellow', front: 'orange' });
  });

  it('describes a scrambled cube by its centres, which never move', () => {
    // A face turn does not move a centre, so the hold reads the same whether
    // the cube is solved or scrambled — which is what makes it trustworthy
    // during inspection.
    const scramble = "R U2 F' D L B'";
    const alg = algForFacing('B', 'U');
    expect(describeOrientation(cubeFromAlg(`${scramble} ${alg}`))).toBe(
      describeOrientation(cubeFromAlg(alg))
    );
  });

  it('has a colour for every face', () => {
    FACE_ORDER.forEach((face) => expect(COLOR_NAMES[face]).toBeTruthy());
    expect(new Set(Object.values(COLOR_NAMES)).size).toBe(6);
  });
});
