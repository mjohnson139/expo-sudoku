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
  orbit,
  rotateQuarter,
} from '../geometry';
import { STICKER_COLORS, cubeFromAlg, solvedCube } from '../cubeState';

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

  it('opens on Up, Front and Right — the standard inspection view', () => {
    expect(new Set(scene().polygons.map(normalOf))).toEqual(
      new Set(['0,1,0', '0,0,1', '1,0,0'])
    );
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
});
