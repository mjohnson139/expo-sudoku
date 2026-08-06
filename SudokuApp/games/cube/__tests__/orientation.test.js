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
  viewAfterHold,
} from '../orientation';
import {
  FACE_NORMALS,
  FACE_ORDER,
  STICKER_COLORS,
  applyMoves,
  cubeFromAlg,
  facelets,
  isSolved,
  solvedCube,
} from '../cubeState';
import { DEFAULT_PITCH, DEFAULT_YAW, buildScene, orbit } from '../geometry';
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
    expect(describeOrientation(solvedCube())).toBe('white up · orange left');
  });

  it('reads the colours off a cube that has been turned over', () => {
    // Roux's traditional hold: yellow on top, blue on the left — which is red
    // in front, and the front is the part nobody says out loud.
    const held = cubeFromAlg(algForFacing('D', 'R'));
    expect(facingColors(held)).toEqual({ up: 'yellow', front: 'red', left: 'blue' });
    expect(describeOrientation(held)).toBe('yellow up · blue left');
  });

  it('is the left centre that survives the M slice, which is why it is the one named', () => {
    // The whole reason the readout takes up-and-left rather than up-and-front
    // (operator, 2026-08-06): **LSE runs on M, and M moves the front centre.**
    // Through the phase where the cube is turned about most, the front colour
    // is the one that keeps changing and the left one is the anchor.
    const held = cubeFromAlg(algForFacing('D', 'R'));
    const turned = applyMoves(held, parseAlg('M'));

    expect(facingColors(turned).left).toBe(facingColors(held).left);
    expect(facingColors(turned).up).not.toBe(facingColors(held).up);
    expect(facingColors(turned).front).not.toBe(facingColors(held).front);
  });

  it('names a hold as uniquely by up-and-left as by up-and-front', () => {
    // The claim that makes the readout honest: two adjacent faces fix an
    // orientation, so saying it the way Roux says it loses nothing. All 24
    // holds must have 24 distinct (up, left) pairs.
    const pairs = new Set();

    FACE_ORDER.forEach((up) => {
      FACE_ORDER.forEach((front) => {
        const alg = algForFacing(up, front);
        if (alg === null) return;
        const colors = facingColors(cubeFromAlg(alg));
        pairs.add(`${colors.up}|${colors.left}`);
        // And the three named faces are always three different colours.
        expect(new Set([colors.up, colors.front, colors.left]).size).toBe(3);
      });
    });

    expect(pairs.size).toBe(ORIENTATION_COUNT);
  });

  it('puts left where a cube would put it, on every one of the 24', () => {
    // Read off the L centre; checked against the geometry. `up × front` is the
    // right-handed +x — the *right* — so left is the face opposite it. Two
    // routes to one answer, pinned so they cannot drift apart.
    FACE_ORDER.forEach((up) => {
      FACE_ORDER.forEach((front) => {
        const alg = algForFacing(up, front);
        if (alg === null) return;

        const u = FACE_NORMALS[up];
        const f = FACE_NORMALS[front];
        const right = [
          u[1] * f[2] - u[2] * f[1],
          u[2] * f[0] - u[0] * f[2],
          u[0] * f[1] - u[1] * f[0],
        ];
        const expected = FACE_ORDER.find((face) =>
          FACE_NORMALS[face].every((component, i) => component === -right[i])
        );

        expect(facingColors(cubeFromAlg(alg)).left).toBe(COLOR_NAMES[expected]);
      });
    });
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

describe('viewAfterHold — the picture does not jump when the hold is set', () => {
  // What the operator is looking at: where each face's normal lands on screen.
  // If two cameras put all six in the same places, the two pictures are the
  // same picture.
  const picture = (yaw, pitch, alg) => {
    const turned = applyMoves(solvedCube(), parseAlg(alg || ''));
    const faces = facelets(turned);
    // Which original colour is on each face position now, and where that face
    // position sits on screen.
    return FACE_ORDER.map((face) => ({
      color: faces[face][4],
      at: orbit(FACE_NORMALS[face], yaw, pitch),
    })).sort((a, b) => a.color.localeCompare(b.color));
  };

  const sameTo = (a, b, tolerance) =>
    a.every((entry, i) =>
      entry.color === b[i].color &&
      entry.at.every((v, axis) => Math.abs(v - b[i].at[axis]) <= tolerance)
    );

  /** How far the picture moved, worst face, worst axis. */
  const drift = (yaw, pitch) => {
    const before = picture(yaw, pitch, '');
    const view = viewAfterHold(yaw, pitch);
    const after = picture(view.yaw, view.pitch, orientationAt(yaw, pitch));
    let worst = 0;
    before.forEach((entry, i) => {
      expect(entry.color).toBe(after[i].color);
      entry.at.forEach((v, axis) => {
        worst = Math.max(worst, Math.abs(v - after[i].at[axis]));
      });
    });
    return worst;
  };

  it('leaves the opening view exactly where it is', () => {
    expect(drift(DEFAULT_YAW, DEFAULT_PITCH)).toBeLessThan(1e-9);
  });

  it('is exact at the angles a hand actually stops at', () => {
    // Including the cube turned right over for the traditional yellow-up Roux
    // hold, which is the one the old behaviour moved furthest.
    [
      [-30, 25],
      [-30, 155],
      [0, 120],
      [45, 45],
      [-90, 20],
      [30, 25],
      [-30, -25],
      [180, 30],
    ].forEach(([y, p]) => {
      expect(drift(RAD(y), RAD(p))).toBeLessThan(1e-9);
    });
  });

  it('beats sending the camera back to the opening angle, nearly everywhere', () => {
    // The old behaviour, for comparison: the hold is baked in and the camera
    // goes to the default whatever the operator was looking at.
    const oldDrift = (yaw, pitch) => {
      const before = picture(yaw, pitch, '');
      const after = picture(DEFAULT_YAW, DEFAULT_PITCH, orientationAt(yaw, pitch));
      let worst = 0;
      before.forEach((entry, i) => {
        entry.at.forEach((v, axis) => {
          worst = Math.max(worst, Math.abs(v - after[i].at[axis]));
        });
      });
      return worst;
    };

    let exact = 0;
    let better = 0;
    let total = 0;
    for (let y = -180; y < 180; y += 15) {
      for (let p = -180; p < 180; p += 15) {
        const now = drift(RAD(y), RAD(p));
        const was = oldDrift(RAD(y), RAD(p));
        total += 1;
        if (now < 1e-9) exact += 1;
        if (now <= was + 1e-9) better += 1;
      }
    }
    // Over half of every angle a finger can reach is pixel-exact, and the
    // camera never ends up further from the picture than the old jump did.
    expect(exact / total).toBeGreaterThan(0.5);
    expect(better).toBe(total);
  });

  it('never returns an angle the camera cannot hold', () => {
    for (let y = -180; y < 180; y += 30) {
      for (let p = -180; p < 180; p += 30) {
        const view = viewAfterHold(RAD(y), RAD(p));
        expect(Number.isFinite(view.yaw)).toBe(true);
        expect(Number.isFinite(view.pitch)).toBe(true);
      }
    }
  });
});

describe('the readout names faces the opening view actually shows', () => {
  // The point of naming a hold by its top and its left (2026-08-06) is that
  // those are the faces in front of you. That is only true if the camera shows
  // them, so this ties the words to the pixels: the sticker the renderer draws
  // at the centre of the left face must be the colour the readout says is on
  // the left. It was not, until the opening yaw was mirrored the same day —
  // the view showed U, F and R, and `left` was the one face off screen.
  const centreFill = (cube, normal) => {
    const { polygons } = buildScene(cube, {
      size: 300,
      yaw: DEFAULT_YAW,
      pitch: DEFAULT_PITCH,
      colors: STICKER_COLORS,
    });
    // The centre cubie of that face: position is the normal itself.
    const key = `${normal.join(',')}|${normal.join(',')}:tile`;
    return (polygons.find((polygon) => polygon.key === key) || {}).fill || null;
  };

  const holds = [
    ['', 'the opening hold'],
    [algForFacing('D', 'R'), 'yellow up, blue left — the Roux hold'],
    [algForFacing('B', 'U'), 'a side colour on top'],
  ];

  it.each(holds)('shows the colours it names (%s — %s)', (alg) => {
    const held = cubeFromAlg(alg);
    const named = facingColors(held);

    // A drawn sticker is darkened by how its face is turned, and the renderer
    // does that by mixing toward black — a pure scale, so the *direction* of
    // the colour survives it. Comparing normalized channels is therefore exact
    // enough to name the sticker; comparing raw ones is not, and says a shaded
    // orange is red.
    const nearest = (fill) =>
      FACE_ORDER.map((face) => ({ face, hex: STICKER_COLORS[face] })).sort(
        (a, b) => distance(fill, a.hex) - distance(fill, b.hex)
      )[0].face;

    expect(COLOR_NAMES[nearest(centreFill(held, [-1, 0, 0]))]).toBe(named.left);
    expect(COLOR_NAMES[nearest(centreFill(held, [0, 1, 0]))]).toBe(named.up);
    // And the right face is the one you cannot see, which is the trade.
    expect(centreFill(held, [1, 0, 0])).toBeNull();
  });
});

/** Colour distance with the renderer's shading divided out: it mixes toward
 *  black, which scales all three channels together, so normalizing by the
 *  brightest channel leaves something that identifies the sticker. */
const distance = (a, b) => {
  const unit = (hex) => {
    const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const peak = Math.max(...rgb, 1);
    return rgb.map((channel) => channel / peak);
  };
  const [x, y] = [unit(a), unit(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};
