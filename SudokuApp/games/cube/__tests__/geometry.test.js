/**
 * The 3D math.
 *
 * Two halves, tested differently. `rotateQuarter` is exact integer arithmetic
 * and gets exact assertions — it is the foundation the whole move engine stands
 * on. `buildScene` produces floating-point screen coordinates that nobody should
 * pin to four decimal places, so it is tested on the properties that would
 * actually break the picture: how many faces survive culling, that they are
 * ordered back to front, and that the cube always fits its viewport.
 */

import {
  AXIS,
  DEFAULT_PITCH,
  DEFAULT_YAW,
  buildScene,
  isUpsideDown,
  orbit,
  partialTurn,
  rotateQuarter,
  shortWay,
  turnAngle,
  wrapAngle,
} from '../geometry';
import { STICKER_COLORS, applyMove, cubeFromAlg, solvedCube } from '../cubeState';
import { parseMove } from '../moves';
import { orientationAt } from '../orientation';

const SIZE = 300;

/** `"1,-1,0"` → `[1, -1, 0]`. */
const numbers = (text) => text.split(',').map(Number);

/** Which way a polygon's face points, straight out of its key. */
const normalOf = (polygon) => polygon.key.split(':')[0].split('|')[1];

const scene = (options = {}) =>
  buildScene(solvedCube(), {
    size: SIZE,
    yaw: DEFAULT_YAW,
    pitch: DEFAULT_PITCH,
    colors: STICKER_COLORS,
    ...options,
  });

describe('rotateQuarter', () => {
  it('turns clockwise as seen from the positive end of the axis', () => {
    // Looking down at the cube from above (+y), the front goes to the left.
    expect(rotateQuarter([0, 1, 1], AXIS.y, 1)).toEqual([-1, 1, 0]);
    // Looking at the right face from outside (+x), the front goes up.
    expect(rotateQuarter([1, 0, 1], AXIS.x, 1)).toEqual([1, 1, 0]);
    // Looking at the front face from outside (+z), the top goes to the right.
    expect(rotateQuarter([0, 1, 1], AXIS.z, 1)).toEqual([1, 0, 1]);
  });

  it('comes back to where it started after four', () => {
    const v = [1, -1, 1];
    [AXIS.x, AXIS.y, AXIS.z].forEach((axis) => {
      expect(rotateQuarter(v, axis, 4)).toEqual(v);
      expect(rotateQuarter(v, axis, 0)).toEqual(v);
    });
  });

  it('takes negative and out-of-range turn counts', () => {
    const v = [1, -1, 1];
    [AXIS.x, AXIS.y, AXIS.z].forEach((axis) => {
      expect(rotateQuarter(v, axis, -1)).toEqual(rotateQuarter(v, axis, 3));
      expect(rotateQuarter(v, axis, 7)).toEqual(rotateQuarter(v, axis, 3));
      expect(rotateQuarter(v, axis, -5)).toEqual(rotateQuarter(v, axis, 3));
    });
  });

  it('leaves the axis it turns about alone', () => {
    expect(rotateQuarter([0, 1, 0], AXIS.y, 1)).toEqual([0, 1, 0]);
    expect(rotateQuarter([1, 0, 0], AXIS.x, 3)).toEqual([1, 0, 0]);
  });

  it('stays on the integer lattice, so the model never drifts', () => {
    let v = [1, -1, 1];
    for (let i = 0; i < 37; i += 1) {
      v = rotateQuarter(v, i % 3, 1);
      v.forEach((component) => expect(Number.isInteger(component)).toBe(true));
    }
  });
});

describe('orbit', () => {
  it('is the identity at zero', () => {
    expect(orbit([1, 2, 3], 0, 0).map(Math.round)).toEqual([1, 2, 3]);
  });

  it('preserves length — it is a rotation, not a transform', () => {
    const p = [1, -2, 3];
    const out = orbit(p, 0.7, -0.3);
    expect(Math.hypot(...out)).toBeCloseTo(Math.hypot(...p), 10);
  });
});

describe('buildScene', () => {
  it('shows exactly three faces of nine at the opening angle', () => {
    // 27 stickers visible, each drawn as plastic plus tile.
    expect(scene().polygons).toHaveLength(27 * 2);
  });

  it('never shows more than three faces, at any angle', () => {
    // One assertion over the whole sweep rather than one per angle: the numbers
    // are what matter, and 900 passing expects only slow the suite down.
    const counts = [];
    for (let yaw = -Math.PI; yaw < Math.PI; yaw += 0.31) {
      for (let pitch = -1.5; pitch < 1.5; pitch += 0.29) {
        counts.push(scene({ yaw, pitch }).polygons.length / 2);
      }
    }
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(9);
    expect(Math.max(...counts)).toBeLessThanOrEqual(27);
  });

  it('shows exactly one face when looking straight down an axis', () => {
    expect(scene({ yaw: 0, pitch: 0 }).polygons).toHaveLength(9 * 2);
    expect(scene({ yaw: Math.PI / 2, pitch: 0 }).polygons).toHaveLength(9 * 2);
  });

  it('opens on Up, Front and Left — the faces a Roux hold is named by', () => {
    // It opened on Up, Front and *Right* until 2026-08-06, which is how a cube
    // is conventionally drawn and which showed the one side face the operator
    // had no use for. A hold is named by its top and its left (plan §8.3), and
    // a readout naming a face that is off screen is one you have to take on
    // trust. `0,1,0` is U, `0,0,1` is F, `-1,0,0` is L.
    expect(new Set(scene().polygons.map(normalOf))).toEqual(
      new Set(['0,1,0', '0,0,1', '-1,0,0'])
    );
  });

  it('is still the identity hold, which is what makes mirroring the yaw safe', () => {
    // U is still the highest face and F is still the nearest, so the opening
    // view is still "no rotation" and every `R` still means the same face.
    expect(orientationAt(DEFAULT_YAW, DEFAULT_PITCH)).toBe('');
  });

  it('orders faces back to front, so the painter can just draw them', () => {
    // Painter's algorithm is only correct if the list is sorted by depth, so
    // recompute each polygon's depth from its key and check the sequence.
    const depths = scene().polygons.map((polygon) => {
      const [pos, normal] = polygon.key.split(':')[0].split('|').map(numbers);
      return orbit(
        [pos[0] + normal[0] * 0.5, pos[1] + normal[1] * 0.5, pos[2] + normal[2] * 0.5],
        DEFAULT_YAW,
        DEFAULT_PITCH
      )[2];
    });

    depths.forEach((depth, i) => {
      if (i > 0) expect(depth).toBeGreaterThanOrEqual(depths[i - 1] - 1e-9);
    });
  });

  it('keeps the cube inside its viewport at every angle', () => {
    // The reason the fit is computed from a bounding *sphere*: a fit to the
    // cube's own corners would be tighter at some angles and would clip at
    // others, and clipping is invisible in a screenshot taken at rest.
    let lowest = Infinity;
    let highest = -Infinity;

    for (let yaw = -Math.PI; yaw < Math.PI; yaw += 0.23) {
      for (let pitch = -1.5; pitch < 1.5; pitch += 0.27) {
        scene({ yaw, pitch }).polygons.forEach((polygon) => {
          polygon.points.forEach((point) => {
            lowest = Math.min(lowest, point[0], point[1]);
            highest = Math.max(highest, point[0], point[1]);
          });
        });
      }
    }

    expect(lowest).toBeGreaterThanOrEqual(0);
    expect(highest).toBeLessThanOrEqual(SIZE);
  });

  it('keeps the cube the same scale as it spins', () => {
    const spread = (yaw) => {
      const xs = scene({ yaw }).polygons.flatMap((p) => p.points.map(([x]) => x));
      return Math.max(...xs) - Math.min(...xs);
    };
    // Corner-on is the widest a cube gets; face-on the narrowest. The bounding
    // sphere fit means the *scale* is constant even though the silhouette is not,
    // so the two stay within the ratio of those silhouettes rather than drifting.
    expect(spread(0)).toBeLessThan(spread(Math.PI / 4));
    expect(spread(Math.PI / 4) / spread(0)).toBeLessThan(1.5);
  });

  it('draws plastic before the tile on it, so tiles are never buried', () => {
    scene().polygons.forEach((polygon, i) => {
      if (i % 2 === 0) expect(polygon.key.endsWith(':body')).toBe(true);
      else expect(polygon.key.endsWith(':tile')).toBe(true);
    });
  });

  it('gives every polygon a key unique within the frame', () => {
    const built = scene();
    expect(new Set(built.polygons.map((p) => p.key)).size).toBe(built.polygons.length);
  });

  it('shades a face by which way it points, not by which face it is', () => {
    // The same face, seen from two angles, is drawn at two brightnesses — that
    // is what makes the three visible sides read as three planes rather than as
    // a flat hexagon of colours.
    const frontTile = (pitch) =>
      scene({ yaw: 0, pitch }).polygons.find(
        (polygon) => normalOf(polygon) === '0,0,1' && polygon.key.endsWith(':tile')
      ).fill;

    expect(frontTile(0)).not.toBe(frontTile(1.2));
  });

  it('leaves the still cube alone when handed a turn that has not started', () => {
    // Not the same assertion as the `t = 0` one below: this is the *absence* of
    // a turn, and it is what every frame of the scrubbed-but-not-playing cube
    // goes through.
    expect(scene({ turn: null })).toEqual(scene());
  });

  it('scrambles change the picture', () => {
    const solved = buildScene(solvedCube(), {
      size: SIZE,
      yaw: DEFAULT_YAW,
      pitch: DEFAULT_PITCH,
      colors: STICKER_COLORS,
    });
    const scrambled = buildScene(cubeFromAlg("R U R' U' F2 L D' B"), {
      size: SIZE,
      yaw: DEFAULT_YAW,
      pitch: DEFAULT_PITCH,
      colors: STICKER_COLORS,
    });

    expect(scrambled.polygons).toHaveLength(solved.polygons.length);
    expect(scrambled.polygons.map((p) => p.fill)).not.toEqual(
      solved.polygons.map((p) => p.fill)
    );
  });

  /**
   * **The promotion's frame, at the seam the renderer actually reads.**
   *
   * `turnAngle` and `partialTurn` have pinned the signed sweep since Step 8, and
   * they kept passing while the promotion animated backwards on a phone — because
   * the value was computed correctly and then **dropped one spread short of
   * `buildScene`** (operator, 2026-08-07: *"double tapping for moves like L and
   * D, the animation seems to reverse the direction"*).
   *
   * So this asserts the thing that was broken rather than the arithmetic under
   * it: **the first frame of the promoted half turn is the frame the cube is
   * already showing.** A `D` that has finished its quarter and a `D2` picked up
   * at `t = 0.5` must draw the same 27 stickers in the same 27 places.
   *
   * Vertices are compared as a set per polygon: the same square listed from a
   * different corner is the same square, which is exactly what carrying corners
   * round by 90° does to the ordering.
   */
  describe('a promoted half turn picks up where the quarter left off', () => {
    const stickers = (turn) =>
      new Set(
        scene({ turn })
          .polygons.filter((polygon) => polygon.key.endsWith(':tile'))
          .map(
            (polygon) =>
              `${polygon.fill}|${polygon.points
                .map((point) => point.map((n) => n.toFixed(1)).join(','))
                .sort()
                .join(' ')}`
          )
      );

    const overlap = (a, b) => [...a].filter((entry) => b.has(entry)).length;

    it.each([
      ['R', 2],
      ['U', 2],
      ['F', 2],
      ['L', -2],
      ['D', -2],
      ['B', -2],
    ])('%s2 continues the %s it grew from', (face, turns) => {
      const finished = stickers({ ...parseMove(face), t: 1 });
      const promoted = stickers({ ...parseMove(`${face}2`), t: 0.5, turns });

      expect(promoted.size).toBe(27);
      expect(overlap(finished, promoted)).toBe(27);
    });

    /**
     * And the half that would go unnoticed. `R`, `U` and `F` carry `amount: 1`
     * and sweep `+2`, so the default is already the right way round and the bug
     * was invisible on them — which is why the report named L and D.
     */
    it.each(['R', 'U', 'F'])('%s2 is continuous even without the sweep', (face) => {
      const finished = stickers({ ...parseMove(face), t: 1 });
      const naive = stickers({ ...parseMove(`${face}2`), t: 0.5 });

      expect(overlap(finished, naive)).toBe(27);
    });

    /**
     * The three that broke. `L`, `D` and `B` look down the negative end of their
     * axis, so they carry `amount: 3` and turn anticlockwise — and the default
     * `shortWay(2)` of `+2` puts the layer 180° from where the cube is standing.
     * Six of the 27 stickers land somewhere else entirely, which is the reversal
     * a thumb sees.
     */
    it.each(['L', 'D', 'B'])('%s2 visibly jumps without the sweep', (face) => {
      const finished = stickers({ ...parseMove(face), t: 1 });
      const naive = stickers({ ...parseMove(`${face}2`), t: 0.5 });

      expect(overlap(finished, naive)).toBe(21);
    });
  });
});

describe('shortWay', () => {
  it('reads a quarter turn as the short way round', () => {
    // The model stores 0–3 because it only cares where a turn *lands*. An
    // animation cares which way it goes to get there, and 3 is −1.
    expect(shortWay(1)).toBe(1);
    expect(shortWay(2)).toBe(2);
    expect(shortWay(3)).toBe(-1);
    expect(shortWay(0)).toBe(0);
  });
});

describe('turnAngle', () => {
  it('is the angle rotateQuarter turns through', () => {
    // Clockwise seen from the positive end of the axis is −90° in right-handed
    // coordinates, which is the sign `rotateOnce` is built on.
    expect(turnAngle(1, 1)).toBeCloseTo(-Math.PI / 2, 12);
    expect(turnAngle(2, 1)).toBeCloseTo(-Math.PI, 12);
    expect(turnAngle(3, 1)).toBeCloseTo(Math.PI / 2, 12);
  });

  it('is exactly zero before a turn starts', () => {
    expect(turnAngle(3, 0)).toBe(0);
  });

  describe('with a signed sweep, for a promotion carrying on mid-turn', () => {
    // `R` then `R` on the pad grows the token to `R2` while the cube is already
    // a quarter of the way through it. The continuation is only seamless if the
    // half turn travels the way the quarter turn went — see `promotedTurn`.
    it('starts the second half exactly where the first quarter finished', () => {
      // `R`: amount 1, and `+2` sweeps the same way.
      expect(turnAngle(2, 0.5, 2)).toBeCloseTo(turnAngle(1, 1), 12);
      // `D`: amount 3, turning the other way — `-2` is what keeps it seamless,
      // and the default `+2` is a 180° jump away from where the cube is.
      expect(turnAngle(2, 0.5, -2)).toBeCloseTo(turnAngle(3, 1), 12);
      expect(turnAngle(2, 0.5)).not.toBeCloseTo(turnAngle(3, 1), 6);
    });

    it('lands a half turn either way round', () => {
      // ±180° are the same permutation, so the sign changes the journey and
      // never the destination.
      expect(Math.abs(turnAngle(2, 1, 2))).toBeCloseTo(Math.PI, 12);
      expect(Math.abs(turnAngle(2, 1, -2))).toBeCloseTo(Math.PI, 12);
    });

    it('is the plain short way when no sweep is given', () => {
      expect(turnAngle(3, 0.4)).toBe(turnAngle(3, 0.4, undefined));
      expect(turnAngle(3, 0.4)).toBeCloseTo(turnAngle(3, 0.4, shortWay(3)), 12);
    });
  });
});

describe('a promotion carrying on mid-turn', () => {
  // **The invariant, stated exactly.** Halfway through a half turn swept the
  // way its quarter turn went, every point is where the quarter turn left it.
  // This is what makes the second quarter of an `R2` a continuation rather than
  // a snap, and it is worth pinning here rather than sampling in a browser: the
  // continuation lasts about 130ms, which is shorter than it takes to ask a
  // headless page what it is drawing.
  const CORNERS = [
    [1, 1, 1],
    [1, -1, 1],
    [-1, 1, 1],
    [1, 1, -1],
    [0, 1, 1],
    [1, 0, -1],
  ];

  // Every quarter turn the pad can promote, on each axis, both directions —
  // `R`/`U`/`F` carry 1 and `D`/`L`/`B` carry 3.
  const QUARTERS = [
    ['R', AXIS.x, 1],
    ['L', AXIS.x, 3],
    ['U', AXIS.y, 1],
    ['D', AXIS.y, 3],
    ['F', AXIS.z, 1],
    ['B', AXIS.z, 3],
  ];

  it.each(QUARTERS)('starts %s2 exactly where %s left the cube', (name, axis, amount) => {
    const turns = 2 * shortWay(amount);
    CORNERS.forEach((v) => {
      const halfway = partialTurn(v, axis, 2, 0.5, turns);
      const quarter = rotateQuarter(v, axis, amount);
      halfway.forEach((coord, i) => expect(coord).toBeCloseTo(quarter[i], 10));
    });
  });

  it.each(QUARTERS)('and still lands %s2 exactly where the model puts it', (name, axis) => {
    CORNERS.forEach((v) => {
      const turns = 2 * shortWay(1);
      // `t = 1` hands off to the integer path, so the sign cannot move the
      // landing — only the journey.
      expect(partialTurn(v, axis, 2, 1, turns)).toEqual(rotateQuarter(v, axis, 2));
      expect(partialTurn(v, axis, 2, 1, -turns)).toEqual(rotateQuarter(v, axis, 2));
    });
  });

  it('would snap without the signed sweep, which is the bug it fixes', () => {
    // The default `+2` sweep put a `D2` on the opposite side of the cube from
    // the `D` it grew from — 180° away — so the layer jumped before it turned.
    const v = [1, 1, 1];
    const naive = partialTurn(v, AXIS.y, 2, 0.5);
    const whereTheCubeIs = rotateQuarter(v, AXIS.y, 3);
    const apart = Math.hypot(...naive.map((c, i) => c - whereTheCubeIs[i]));
    expect(apart).toBeGreaterThan(1);
  });
});

describe('partialTurn', () => {
  it('is the model itself at both ends, integers and all', () => {
    const v = [0, -1, 1];

    expect(partialTurn(v, AXIS.y, 3, 0)).toEqual(v);
    expect(partialTurn(v, AXIS.y, 3, 1)).toEqual(rotateQuarter(v, AXIS.y, 3));

    // Not 6.1e-17 — the ends hand off to the integer path rather than trusting
    // `Math.cos(Math.PI / 2)`.
    partialTurn(v, AXIS.y, 1, 1).forEach((c) => expect(Number.isInteger(c)).toBe(true));
  });

  it('goes the short way round for a counter-clockwise turn', () => {
    // D carries `amount: 3`. Half way through, the F-D edge must be a *quarter*
    // turn from where it started, in the direction of where it lands — animating
    // 3 as a raw angle sends it three quarters of the way round the other way,
    // which is the bug this pins.
    const from = [0, -1, 1];
    const to = rotateQuarter(from, AXIS.y, 3);
    expect(to).toEqual([1, -1, 0]);

    const mid = partialTurn(from, AXIS.y, 3, 0.5);

    // Between the two, not diametrically opposite them.
    expect(mid[0]).toBeGreaterThan(0);
    expect(mid[2]).toBeGreaterThan(0);
    expect(mid[1]).toBe(-1);
  });

  it('is a rotation, so nothing stretches part-way through a move', () => {
    const v = [1, -1, 1];
    [0.1, 0.37, 0.5, 0.9].forEach((t) => {
      expect(Math.hypot(...partialTurn(v, AXIS.x, 2, t))).toBeCloseTo(Math.hypot(...v), 10);
    });
  });
});

describe('buildScene, part-way through a turn', () => {
  const still = (cube) =>
    buildScene(cube, {
      size: SIZE,
      yaw: DEFAULT_YAW,
      pitch: DEFAULT_PITCH,
      colors: STICKER_COLORS,
    });

  const turning = (token, t, cube = solvedCube()) =>
    buildScene(cube, {
      size: SIZE,
      yaw: DEFAULT_YAW,
      pitch: DEFAULT_PITCH,
      colors: STICKER_COLORS,
      turn: { ...parseMove(token), t },
    });

  const seams = (built) => built.polygons.filter((p) => p.key.startsWith('seam|'));

  // Faces, slices, wides, rotations and a half turn: the shapes of `layers` and
  // `amount` that exist, rather than one representative that would let a sign
  // error hide in the other five.
  const EVERY_SHAPE = ['U', 'D', 'R', 'L', 'F', 'B', 'M', 'E', 'S', 'Rw', 'y', 'R2', "D'"];

  it('draws the cube it started from, exactly, at t = 0', () => {
    // No jump on the frame an animation begins.
    const before = still(solvedCube());
    EVERY_SHAPE.forEach((token) => {
      expect(turning(token, 0)).toEqual(before);
    });
  });

  it('draws the cube with the move applied, exactly, at t = 1', () => {
    // The other half of the same property, and the one that catches a turn
    // animating the wrong way: it would still *land* here, but only because the
    // last frame is computed by the model rather than by the animation — so the
    // test is only worth anything alongside `partialTurn`'s direction test.
    EVERY_SHAPE.forEach((token) => {
      const move = parseMove(token);
      expect(turning(token, 1)).toEqual(still(applyMove(solvedCube(), move)));
    });
  });

  it('is somewhere else in between', () => {
    const mid = turning('R', 0.5);
    expect(mid).not.toEqual(turning('R', 0));
    expect(mid).not.toEqual(turning('R', 1));
  });

  it('opens the seams the move cuts, and only while it is open', () => {
    // Half way through a turn the layer has swung off the one under it. Without
    // plastic in the gap you would see the app's background through the middle
    // of the cube — the one thing a renderer with no backdrop cannot survive.
    expect(seams(turning('R', 0.5)).length).toBeGreaterThan(0);
    expect(seams(turning('R', 0))).toHaveLength(0);
    expect(seams(turning('R', 1))).toHaveLength(0);
  });

  it('plugs the hole a slice leaves in the middle of the cube', () => {
    // The core is not a cubie — it is invisible on a closed cube — but an M
    // turn swings it away from the centre, and the gap it leaves is looked
    // straight into from the standard view.
    const keys = seams(turning('M', 0.5)).map((p) => p.key);
    expect(keys.some((key) => key.startsWith('seam|0,0,0|'))).toBe(true);
  });

  it('opens nothing for a whole-cube rotation', () => {
    // Every cubie goes the same way, so there is no seam to cut.
    [0.25, 0.5, 0.75].forEach((t) => {
      expect(seams(turning('y', t))).toHaveLength(0);
      expect(seams(turning('x', t))).toHaveLength(0);
    });
  });

  it('puts no sticker on the inside of the cube', () => {
    turning('U', 0.4).polygons.forEach((polygon) => {
      if (polygon.key.startsWith('seam|')) expect(polygon.key.endsWith(':body')).toBe(true);
    });
  });

  it('keeps every key unique through the whole turn', () => {
    [0, 0.2, 0.5, 0.8, 1].forEach((t) => {
      const built = turning('F', t);
      expect(new Set(built.polygons.map((p) => p.key)).size).toBe(built.polygons.length);
    });
  });

  it('names a moving face by where it lands, not by where it is', () => {
    // Which faces survive culling changes as a layer swings round, so the *list*
    // of keys moves — but every key in it is one the cube will still be using
    // when the turn is over. That is what lets React re-render the cube each
    // frame and hand the last frame's polygons straight to the frame after it,
    // rather than remounting 54 views twenty times a scramble.
    // Every sticker the cube will have once the move lands, visible or not —
    // culling picks a different 27 of them each frame, which is exactly why the
    // comparison is against the whole set rather than against one frame's.
    const after = new Set(
      applyMove(solvedCube(), parseMove('U')).cubies.flatMap((cubie) =>
        cubie.stickers.map(
          (sticker) => `${cubie.pos.join(',')}|${sticker.normal.join(',')}`
        )
      )
    );

    [0.1, 0.3, 0.7, 1].forEach((t) => {
      turning('U', t).polygons.forEach((polygon) => {
        if (polygon.key.startsWith('seam|')) return;
        expect(after.has(polygon.key.split(':')[0])).toBe(true);
      });
    });
  });

  /**
   * How far a corner is from the nearest corner of `points`.
   *
   * Nearest rather than same-index, because the corner *cycle* is not
   * meaningful: the same square listed from a different vertex fills
   * identically, and a rotating square's vertices swap places under any fixed
   * ordering. Distance to the nearest corner is continuous in the rotation,
   * which is the whole point of measuring it.
   */
  const nearest = (point, points) =>
    Math.min(...points.map((p) => Math.hypot(point[0] - p[0], point[1] - p[1])));

  const byKey = (built) => new Map(built.polygons.map((p) => [p.key, p.points]));

  /** The furthest any square moves between two frames, in points. */
  const travel = (a, b) => {
    const to = byKey(b);
    let worst = 0;

    byKey(a).forEach((points, key) => {
      const other = to.get(key);
      if (!other) return; // Culled in one of the two frames; nothing to compare.
      points.forEach((point) => {
        worst = Math.max(worst, nearest(point, other));
      });
    });

    return worst;
  };

  it('moves smoothly, with no frame the cube jumps between', () => {
    // The property that catches a turn whose *squares* are wrong even though
    // its centres are right. A face square is spanned from its normal, and a
    // normal half-way through a turn is not axis-aligned — build the square
    // from the carried normal instead of carrying the square and the tiles come
    // off the cube in the middle of every move while both ends stay perfect.
    // Nothing that checks only `t = 0` and `t = 1` can see it.
    //
    // Stepped by angle rather than by `t`, so a half turn is sampled twice as
    // often as a quarter one and the bound means the same thing for both: 4.5°
    // moves a corner at the cube's radius by about 11 points on a 300-point
    // viewport. The sweep starts just past zero because that is where a turn's
    // keys begin — at `t = 0` there is no turn at all, and its faces are named
    // for where they are rather than where they are going.
    const MOST = 15;

    EVERY_SHAPE.forEach((token) => {
      const step = 0.05 / Math.abs(shortWay(parseMove(token).amount));
      let previous = turning(token, 0.0001);

      for (let t = step; t <= 1 + step / 2; t += step) {
        const next = turning(token, Math.min(1, t));
        expect(travel(previous, next)).toBeLessThan(MOST);
        previous = next;
      }
    });
  });

  it('leaves and lands without a jump', () => {
    // The two joins between the animation and the still cube either side of it.
    // Compared corner by corner over the whole frame rather than face by face,
    // because a turn renames its faces the moment it starts.
    const tileCorners = (built) =>
      built.polygons
        .filter((polygon) => polygon.key.endsWith(':tile'))
        .flatMap((polygon) => polygon.points);

    EVERY_SHAPE.forEach((token) => {
      const start = tileCorners(turning(token, 0));
      const moved = tileCorners(turning(token, 0.0001));
      expect(moved).toHaveLength(start.length);
      moved.forEach((point) => expect(nearest(point, start)).toBeLessThan(1));

      expect(travel(turning(token, 0.999), turning(token, 1))).toBeLessThan(1);
    });
  });

  it('keeps the cube inside its viewport all the way through', () => {
    // A layer rotating about an axis through the centre keeps every point at
    // the same distance from it, so the bounding-sphere fit is still exact
    // mid-turn — but that is a claim worth a test rather than an argument.
    let lowest = Infinity;
    let highest = -Infinity;

    EVERY_SHAPE.forEach((token) => {
      [0.15, 0.35, 0.5, 0.65, 0.85].forEach((t) => {
        turning(token, t).polygons.forEach((polygon) => {
          polygon.points.forEach((point) => {
            lowest = Math.min(lowest, point[0], point[1]);
            highest = Math.max(highest, point[0], point[1]);
          });
        });
      });
    });

    expect(lowest).toBeGreaterThanOrEqual(0);
    expect(highest).toBeLessThanOrEqual(SIZE);
  });

  it('still orders faces back to front', () => {
    // Mid-turn the cube is no longer one convex solid, so this is the property
    // that would degrade first if the seam faces were sorted wrongly.
    const built = turning('R', 0.5);
    expect(built.polygons.length).toBeGreaterThan(0);
    // Plastic before the tile on it, for every face that has one.
    built.polygons.forEach((polygon, i) => {
      if (polygon.key.endsWith(':tile')) {
        expect(built.polygons[i - 1].key).toBe(polygon.key.replace(':tile', ':body'));
      }
    });
  });

  it('turns a scrambled cube, not just a solved one', () => {
    const scrambled = cubeFromAlg("R U R' U' F2 L D' B");
    const move = parseMove('L2');
    expect(turning('L2', 1, scrambled)).toEqual(still(applyMove(scrambled, move)));
    expect(turning('L2', 0, scrambled)).toEqual(still(scrambled));
  });
});

describe('wrapAngle', () => {
  it('folds an angle into half a turn either way', () => {
    expect(wrapAngle(0)).toBeCloseTo(0, 10);
    expect(wrapAngle(Math.PI / 2)).toBeCloseTo(Math.PI / 2, 10);
    expect(wrapAngle(-Math.PI / 2)).toBeCloseTo(-Math.PI / 2, 10);
  });

  it('keeps a cube turned over and over from accumulating revolutions', () => {
    // Pitch is no longer clamped, so a finger can wind it up indefinitely.
    [1, 5, 20, -37].forEach((turns) => {
      const wound = 0.7 + turns * 2 * Math.PI;
      expect(wrapAngle(wound)).toBeCloseTo(0.7, 8);
      expect(Math.abs(wrapAngle(wound))).toBeLessThanOrEqual(Math.PI + 1e-9);
    });
  });

  it('does not change where anything is drawn', () => {
    // The whole point: wrapping is a no-op through cos/sin, so it can be
    // applied to state without moving the cube.
    [0.3, 2.9, -4.5, 12.7].forEach((angle) => {
      expect(Math.cos(wrapAngle(angle))).toBeCloseTo(Math.cos(angle), 10);
      expect(Math.sin(wrapAngle(angle))).toBeCloseTo(Math.sin(angle), 10);
    });
  });
});

describe('isUpsideDown', () => {
  it('is false while the cube is upright, whatever the yaw', () => {
    [0, 0.4, -0.4, Math.PI / 2 - 0.01].forEach((pitch) => {
      expect(isUpsideDown(pitch)).toBe(false);
    });
  });

  it('is true once the cube has gone over its pole', () => {
    // Which is where yellow-up lives, and where a horizontal drag has to be
    // reversed to keep pushing the surface under the finger.
    [Math.PI / 2 + 0.01, Math.PI, -Math.PI, -2.5].forEach((pitch) => {
      expect(isUpsideDown(pitch)).toBe(true);
    });
  });
});

describe('which way a horizontal drag has to go', () => {
  // Why `isUpsideDown` exists, proved rather than asserted. "Push the surface
  // under your finger" means the face you are looking at moves the way your
  // finger does — and increasing yaw stops doing that once the cube is over.
  //
  // Measured on whichever of the four *side* faces is nearest the camera. They
  // are the faces yaw actually moves: U and D sit on the yaw axis, so their
  // centres do not drift at all however far the cube is spun, and picking "the
  // nearest face of six" would silently measure one of them near the poles.
  const SIDES = [
    [0, 0, 1],
    [0, 0, -1],
    [1, 0, 0],
    [-1, 0, 0],
  ];

  const centreAt = (normal, yaw, pitch) =>
    orbit([normal[0] * 1.5, normal[1] * 1.5, normal[2] * 1.5], yaw, pitch);

  const nearestSide = (yaw, pitch) =>
    SIDES.reduce((best, normal) =>
      !best || centreAt(normal, yaw, pitch)[2] > centreAt(best, yaw, pitch)[2] ? normal : best
    , null);

  /** How far the near side face slides across the screen for a nudge of yaw. */
  const screenDriftOnYaw = (yaw, pitch) => {
    const face = nearestSide(yaw, pitch);
    return centreAt(face, yaw + 0.02, pitch)[0] - centreAt(face, yaw, pitch)[0];
  };

  it('moves the near surface right as yaw grows, while upright', () => {
    [0, 0.3, -0.3, 1.2, -1.4].forEach((pitch) => {
      expect(isUpsideDown(pitch)).toBe(false);
      expect(screenDriftOnYaw(0.4, pitch)).toBeGreaterThan(0);
    });
  });

  it('moves it left instead, once the cube is upside down', () => {
    // The inversion the pitch clamp used to hide by making this unreachable.
    // Without reversing the drag here, dragging right spins the cube left.
    [Math.PI, 2.4, -2.4, -Math.PI, 1.9].forEach((pitch) => {
      expect(isUpsideDown(pitch)).toBe(true);
      expect(screenDriftOnYaw(0.4, pitch)).toBeLessThan(0);
    });
  });

  it('agrees with isUpsideDown everywhere, which is what makes it one flag', () => {
    for (let pitch = -3.1; pitch <= 3.1; pitch += 0.05) {
      const drift = screenDriftOnYaw(0.4, pitch);
      // At the poles the drift passes through zero; there is no direction to
      // be right or wrong about in the flat spot.
      if (Math.abs(drift) < 1e-6) continue;
      expect(drift < 0).toBe(isUpsideDown(pitch));
    }
  });
});
