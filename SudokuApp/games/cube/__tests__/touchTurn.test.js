import {
  AXIS,
  DEFAULT_PITCH,
  DEFAULT_YAW,
  buildScene,
  orbit,
  projector,
  rotateQuarter,
  shortWay,
} from '../geometry';
import { solvedCube } from '../cubeState';
import { parseMove } from '../moves';
import {
  TUNING,
  chooseMove,
  cornerMove,
  detectCorner,
  faceCornerMove,
  faceCornerZone,
  facingFace,
  moveForDrag,
  nearestFace,
  pickFace,
  shouldCommit,
  turnProgress,
} from '../touchTurn';

const SIZE = 300;

/** The six outward normals, and the four ways you can slide along each. */
const FACES = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

/**
 * A view that puts `normal` square on to the camera, so every one of its four
 * in-plane directions projects to a full-length arrow and none of them is
 * edge-on. `moveForDrag` is being tested, not the renderer's ability to draw a
 * face at a glancing angle.
 */
const viewFacing = (normal) => {
  const [x, y, z] = normal;
  if (z === 1) return { size: SIZE, yaw: 0, pitch: 0 };
  if (z === -1) return { size: SIZE, yaw: Math.PI, pitch: 0 };
  if (x === 1) return { size: SIZE, yaw: -Math.PI / 2, pitch: 0 };
  if (x === -1) return { size: SIZE, yaw: Math.PI / 2, pitch: 0 };
  if (y === 1) return { size: SIZE, yaw: 0, pitch: Math.PI / 2 };
  return { size: SIZE, yaw: 0, pitch: -Math.PI / 2 };
};

/** The two in-plane axis directions of a face, both signs — four in all. */
const directionsAlong = (normal) =>
  FACES.filter((candidate) => candidate.every((c, i) => c * normal[i] === 0));

/** The nine cubie positions whose outward face is `normal`. */
const positionsOn = (normal) => {
  const axis = normal.findIndex((c) => c !== 0);
  const out = [];
  [-1, 0, 1].forEach((a) => {
    [-1, 0, 1].forEach((b) => {
      const pos = [0, 0, 0];
      pos[axis] = normal[axis];
      const others = [0, 1, 2].filter((i) => i !== axis);
      pos[others[0]] = a;
      pos[others[1]] = b;
      out.push(pos);
    });
  });
  return out;
};

/** The screen arrow a model-space direction points along, from a sticker's
 *  centre — the drag a finger would have to make to mean it. */
const dragAlong = (pos, normal, direction, view, points = 40) => {
  const project = projector(view);
  const centre = [
    pos[0] + normal[0] * 0.5,
    pos[1] + normal[1] * 0.5,
    pos[2] + normal[2] * 0.5,
  ];
  const from = project(centre);
  const to = project([
    centre[0] + direction[0] * 0.5,
    centre[1] + direction[1] * 0.5,
    centre[2] + direction[2] * 0.5,
  ]);
  const arrow = [to[0] - from[0], to[1] - from[1]];
  const span = Math.hypot(arrow[0], arrow[1]);
  return [(arrow[0] / span) * points, (arrow[1] / span) * points];
};

const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Where the dragged sticker actually ends up, in the model, if the returned move
 * is applied.
 *
 * `2 * pos + normal` is the sticker's centre scaled to integers, so it can go
 * through `rotateQuarter` — the very function the move engine applies moves
 * with. That is what makes this an *independent* check of the sign rather than
 * the same arithmetic asserted twice: the question "did the sticker move the way
 * the finger went" is answered by the model, not by `touchTurn`.
 */
const carriedBy = (pos, normal, move) => {
  const at = [
    2 * pos[0] + normal[0],
    2 * pos[1] + normal[1],
    2 * pos[2] + normal[2],
  ];
  const after = rotateQuarter(at, move.axis, move.amount);
  return [after[0] - at[0], after[1] - at[1], after[2] - at[2]];
};

describe('pickFace', () => {
  const scene = buildScene(solvedCube(), {
    size: SIZE,
    yaw: 0.4,
    pitch: 0.3,
    colors: { U: '#fff', D: '#ff0', F: '#0f0', B: '#00f', R: '#f00', L: '#f80' },
  });

  it('finds a sticker under a point in the middle of the cube', () => {
    const pick = pickFace(scene.polygons, SIZE / 2, SIZE / 2);
    expect(pick).not.toBeNull();
    expect(pick.pos.every((c) => [-1, 0, 1].includes(c))).toBe(true);
    // Whatever it picked has to be a face pointing at the camera, or it was
    // picked through the cube.
    expect(orbit(pick.normal, 0.4, 0.3)[2]).toBeGreaterThan(0);
  });

  it('answers null on the background', () => {
    expect(pickFace(scene.polygons, 2, 2)).toBeNull();
    expect(pickFace(scene.polygons, SIZE - 2, SIZE - 2)).toBeNull();
  });

  it('takes the frontmost polygon, not the one behind it at the same point', () => {
    const square = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    // Back to front, exactly as `buildScene` sorts them.
    const polygons = [
      { kind: 'tile', pos: [0, 0, -1], normal: [0, 0, -1], points: square },
      { kind: 'tile', pos: [0, 0, 1], normal: [0, 0, 1], points: square },
    ];
    expect(pickFace(polygons, 5, 5).normal).toEqual([0, 0, 1]);
  });

  it('does not pick a seam — there is no sticker on the inside of a cube', () => {
    const square = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    const polygons = [{ kind: 'seam', pos: [0, 0, 1], normal: [0, 1, 0], points: square }];
    expect(pickFace(polygons, 5, 5)).toBeNull();
  });

  it('picks the plastic rim as part of its own face, so there are no dead gaps', () => {
    // Every point inside the cube's silhouette belongs to some face: walk a grid
    // over the middle of the view and require a pick at each point that is on
    // the cube at all.
    const hits = [];
    for (let x = SIZE * 0.35; x <= SIZE * 0.65; x += SIZE * 0.05) {
      for (let y = SIZE * 0.35; y <= SIZE * 0.65; y += SIZE * 0.05) {
        hits.push(pickFace(scene.polygons, x, y));
      }
    }
    expect(hits.every((hit) => hit !== null)).toBe(true);
  });
});

describe('nearestFace — touching the cube, generously', () => {
  const scene = buildScene(solvedCube(), {
    size: SIZE,
    yaw: 0.4,
    pitch: 0.3,
    colors: { U: '#fff', D: '#ff0', F: '#0f0', B: '#00f', R: '#f00', L: '#f80' },
  });

  it('is a direct hit where pickFace is a hit', () => {
    const at = [SIZE / 2, SIZE / 2];
    expect(nearestFace(scene.polygons, at[0], at[1], 40)).toEqual(pickFace(scene.polygons, at[0], at[1]));
  });

  it('catches a point just outside a sticker, which pickFace misses', () => {
    // Walk in from a corner of the view until pickFace first finds the cube; the
    // point one step before that is off the silhouette but within a fingertip of
    // it, and nearestFace should still call it the cube.
    let edgePoint = null;
    for (let d = 0; d < SIZE / 2; d += 2) {
      const at = [d, d];
      if (pickFace(scene.polygons, at[0], at[1])) {
        edgePoint = [d - 4, d - 4];
        break;
      }
    }
    expect(edgePoint).not.toBeNull();
    expect(pickFace(scene.polygons, edgePoint[0], edgePoint[1])).toBeNull();
    expect(nearestFace(scene.polygons, edgePoint[0], edgePoint[1], SIZE * 0.12)).not.toBeNull();
  });

  it('still says null when the finger is nowhere near the cube', () => {
    expect(nearestFace(scene.polygons, 2, 2, SIZE * 0.12)).toBeNull();
  });

  it('honours the margin — a point beyond it is not the cube', () => {
    const square = [
      [100, 100],
      [110, 100],
      [110, 110],
      [100, 110],
    ];
    const polygons = [{ kind: 'tile', pos: [0, 0, 1], normal: [0, 0, 1], points: square }];
    // 20 points from the nearest edge.
    expect(nearestFace(polygons, 130, 105, 10)).toBeNull();
    expect(nearestFace(polygons, 130, 105, 30)).toEqual({ pos: [0, 0, 1], normal: [0, 0, 1] });
  });

  it('does not catch a seam', () => {
    const square = [
      [100, 100],
      [110, 100],
      [110, 110],
      [100, 110],
    ];
    const polygons = [{ kind: 'seam', pos: [0, 0, 1], normal: [0, 1, 0], points: square }];
    expect(nearestFace(polygons, 115, 105, 40)).toBeNull();
  });
});

describe('moveForDrag — every face, every direction', () => {
  FACES.forEach((normal) => {
    directionsAlong(normal).forEach((direction) => {
      const view = viewFacing(normal);
      const label = `[${normal}] dragged toward [${direction}]`;

      it(`${label} turns the layer the sticker is in, the way the finger went`, () => {
        positionsOn(normal).forEach((pos) => {
          const drag = dragAlong(pos, normal, direction, view);
          const move = moveForDrag({ pos, normal }, drag, view);

          expect(move).not.toBeNull();

          // A quarter turn, one way or the other — never a half or a nothing.
          expect([1, 3]).toContain(move.amount);

          // The layer that turns is the one the picked cubie is in.
          expect(move.layers).toEqual([pos[move.axis]]);

          // The axis is perpendicular to the face: you cannot turn a layer about
          // the normal of a sticker you are pushing sideways.
          expect(normal[move.axis]).toBe(0);

          // The invariant the whole module exists to get right: the sticker under
          // the finger travels the way the finger did.
          expect(dot3(carriedBy(pos, normal, move), direction)).toBeGreaterThan(0);
        });
      });

      it(`${label} writes a token that means exactly that move`, () => {
        positionsOn(normal).forEach((pos) => {
          const drag = dragAlong(pos, normal, direction, view);
          const move = moveForDrag({ pos, normal }, drag, view);
          const parsed = parseMove(move.token);

          expect(parsed).not.toBeNull();
          expect(parsed.axis).toBe(move.axis);
          expect(parsed.layers).toEqual(move.layers);
          expect(parsed.amount).toBe(move.amount);
        });
      });

      it(`${label} is the inverse of the same drag backwards`, () => {
        positionsOn(normal).forEach((pos) => {
          const forward = moveForDrag(
            { pos, normal },
            dragAlong(pos, normal, direction, view),
            view
          );
          const back = moveForDrag(
            { pos, normal },
            dragAlong(pos, normal, direction.map((c) => -c), view),
            view
          );

          expect(back.axis).toBe(forward.axis);
          expect(back.layers).toEqual(forward.layers);
          expect(shortWay(back.amount)).toBe(-shortWay(forward.amount));
        });
      });
    });
  });

  it('turns a slice when the sticker dragged is a centre', () => {
    // The middle of the F face, pushed right: nothing but the E slice can carry
    // it, and no special case in the module says so.
    const view = viewFacing([0, 0, 1]);
    const move = moveForDrag(
      { pos: [0, 0, 1], normal: [0, 0, 1] },
      dragAlong([0, 0, 1], [0, 0, 1], [1, 0, 0], view),
      view
    );

    expect(move.layers).toEqual([0]);
    expect(move.axis).toBe(AXIS.y);
    expect(['E', "E'"]).toContain(move.token);
  });

  it('names the three slices between them, and only those', () => {
    const centres = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];
    const tokens = new Set();
    centres.forEach((normal) => {
      const view = viewFacing(normal);
      directionsAlong(normal).forEach((direction) => {
        const move = moveForDrag(
          { pos: normal, normal },
          dragAlong(normal, normal, direction, view),
          view
        );
        tokens.add(move.token.replace("'", ''));
      });
    });
    expect([...tokens].sort()).toEqual(['E', 'M', 'S']);
  });

  it('is undecided about a drag that has not moved', () => {
    const view = viewFacing([0, 0, 1]);
    expect(moveForDrag({ pos: [0, 0, 1], normal: [0, 0, 1] }, [0, 0], view)).toBeNull();
  });

  it('reads the drag through the current view, not through the cube at rest', () => {
    // The same finger movement on the same sticker means different moves
    // depending on which way the cube is being looked at — that is the whole
    // reason `yaw` and `pitch` are arguments. Looking down at the U centre and
    // pushing right turns one slice; spin the cube a quarter turn underneath you
    // and the same push turns the other one.
    const pos = [0, 1, 0];
    const normal = [0, 1, 0];
    const overhead = { size: SIZE, yaw: 0, pitch: Math.PI / 2 };
    const spun = { size: SIZE, yaw: Math.PI / 2, pitch: Math.PI / 2 };

    const before = moveForDrag({ pos, normal }, [40, 0], overhead);
    const after = moveForDrag({ pos, normal }, [40, 0], spun);

    expect(before.axis).toBe(AXIS.z);
    expect(after.axis).toBe(AXIS.x);
  });
});

/**
 * The gesture as a whole — which is where the operator's first phone session
 * sent this module back for another pass (§3.3a).
 *
 * These run at the view the cube actually opens at, with U, F and L in sight,
 * because "which face did my finger mean" is a question about a real screen.
 */
describe('chooseMove — the front face, and changing its mind', () => {
  const view = { size: SIZE, yaw: DEFAULT_YAW, pitch: DEFAULT_PITCH };
  const scene = buildScene(solvedCube(), {
    ...view,
    colors: { U: '#fff', D: '#ff0', F: '#0f0', B: '#00f', R: '#f00', L: '#f80' },
  });
  const polygons = scene.polygons;
  const project = projector(view);

  /** Where a sticker's centre sits on screen, so a drag can start on it. */
  const centreOf = (pos, normal) =>
    project([
      pos[0] + normal[0] * 0.5,
      pos[1] + normal[1] * 0.5,
      pos[2] + normal[2] * 0.5,
    ]);

  const drag = (from, [dx, dy]) =>
    chooseMove({ polygons, from, to: [from[0] + dx, from[1] + dy], view });

  const F = [0, 0, 1];

  // Nine drags on the face the operator asked to concentrate on. Every answer
  // here is checkable against a cube in your hand: push the middle row right and
  // the equator goes with it; push the left column up and the left face does.
  it.each([
    [[0, 0, 1], 'right', 'E'],
    [[0, 0, 1], 'up', "M'"],
    [[0, 1, 1], 'right', "U'"],
    [[-1, 0, 1], 'up', "L'"],
    [[1, 0, 1], 'up', 'R'],
    [[0, -1, 1], 'right', 'D'],
  ])('a drag %s-ward from the front face at %s turns %s', (pos, way, token) => {
    const move = drag(centreOf(pos, F), way === 'right' ? [45, 0] : [0, -45]);
    expect(move.token).toBe(token);
  });

  it('takes the top-left corner dragged right as a front-face turn', () => {
    // The operator's own example. The finger lands on the top face's front-left
    // corner — the "top left corner" of the cube as drawn — and goes right. That
    // is the front layer turning, not the left one.
    const move = drag(centreOf([-1, 1, 1], [0, 1, 0]), [45, 0]);
    expect(move.token).toBe('F');
    expect(move.layers).toEqual([1]);
    expect(move.axis).toBe(AXIS.z);
  });

  it('changes its mind when the drag curves away', () => {
    const from = centreOf(F, F);
    const first = drag(from, [22, 0]);
    expect(first.token).toBe('E');

    // Same finger, still down, now heading up instead.
    const second = chooseMove({
      polygons,
      from,
      to: [from[0] + 22, from[1] - 70],
      view,
      current: first,
    });
    expect(second.token).not.toBe(first.token);
    expect(second.axis).toBe(AXIS.x);
  });

  it('does not change its mind over a wobble', () => {
    const from = centreOf(F, F);
    const first = drag(from, [40, 0]);
    const wobbled = chooseMove({
      polygons,
      from,
      to: [from[0] + 44, from[1] - 7],
      view,
      current: first,
    });
    expect(wobbled.token).toBe(first.token);
  });

  it('lets the sticker it started on hold a near tie, rather than flickering', () => {
    // Sliding along the seam between two faces is the case that has no honest
    // winner: both faces read the drag from the same in-plane direction, so
    // their scores differ only by perspective rounding. The start has to win, or
    // the same gesture gives different moves on different frames.
    const from = centreOf([-1, 1, 1], [0, 1, 0]);
    const startPick = pickFace(polygons, from[0], from[1]);

    // Walk right until the face under the finger changes, then keep going a
    // little, so the drag genuinely ends on the other side of the seam.
    let crossing = null;
    for (let step = 1; step < 120 && crossing === null; step += 1) {
      const pick = pickFace(polygons, from[0] + step, from[1]);
      if (pick && pick.normal.join() !== startPick.normal.join()) crossing = step;
    }
    expect(crossing).not.toBeNull();

    const to = [from[0] + crossing + 20, from[1]];
    const endPick = pickFace(polygons, to[0], to[1]);
    // The premise: the finger really has crossed onto another face.
    expect(endPick.normal).not.toEqual(startPick.normal);

    const chosen = chooseMove({ polygons, from, to, view });
    const fromStart = moveForDrag(startPick, [to[0] - from[0], to[1] - from[1]], view);
    const fromEnd = moveForDrag(endPick, [to[0] - from[0], to[1] - from[1]], view);

    expect(fromEnd.token).not.toBe(fromStart.token);
    expect(Math.abs(fromEnd.alignment - fromStart.alignment)).toBeLessThan(
      TUNING.SWITCH_MARGIN
    );
    expect(chosen.token).toBe(fromStart.token);
  });

  it('keeps what it was doing when the drag shrinks back under the threshold', () => {
    const from = centreOf(F, F);
    const held = drag(from, [40, 0]);
    expect(chooseMove({ polygons, from, to: [from[0] + 1, from[1]], view, current: held }))
      .toBe(held);
  });

  /**
   * Wide turns — an outer face and the slice behind it, asked for by landing on
   * the line between two pieces (§3.3b).
   */
  describe('landing on the line between two pieces', () => {
    /** The point on screen where two cubies of the front face meet, at the seam
     *  `x = boundary` and height `y`. */
    const seamOnFront = (boundary, y) => project([boundary, y, 1.5]);

    it('turns two layers when the finger lands between the right column and the middle', () => {
      const from = seamOnFront(0.5, 0);
      const move = drag(from, [0, -50]);

      expect(move.token).toBe('r');
      expect(move.layers).toEqual([1, 0]);
      expect(move.axis).toBe(AXIS.x);
    });

    it('turns two layers on the left seam, and names it the left wide turn', () => {
      const move = drag(seamOnFront(-0.5, 0), [0, -50]);

      expect(move.token).toBe("l'");
      expect(move.layers).toEqual([-1, 0]);
    });

    it('gives the same answer whichever side of the line the pick lands on', () => {
      // The point is on the seam, so `pickFace` may legitimately return the
      // cubie on either side of it. The move must not depend on which.
      const from = seamOnFront(0.5, 0);
      const nudged = [from[0] - 1, from[1]];
      const other = [from[0] + 1, from[1]];

      expect(pickFace(polygons, nudged[0], nudged[1]).pos).not.toEqual(
        pickFace(polygons, other[0], other[1]).pos
      );
      expect(drag(nudged, [0, -50]).token).toBe('r');
      expect(drag(other, [0, -50]).token).toBe('r');
    });

    it('is still a single layer in the middle of a sticker', () => {
      expect(drag(centreOf([1, 0, 1], F), [0, -50]).token).toBe('R');
      expect(drag(centreOf([-1, 0, 1], F), [0, -50]).token).toBe("L'");
    });

    it('reads the seam that matters for the way the finger went', () => {
      // Which seam is the wide one depends on the drag, because it is the one
      // along the rotation axis. Dragging *sideways* spins about the vertical
      // axis, so it is the seam between two **rows** that asks for a wide turn.
      const move = drag(project([0, 0.5, 1.5]), [50, 0]);

      expect(move.token).toBe("u'");
      expect(move.layers).toEqual([1, 0]);
      expect(move.axis).toBe(AXIS.y);
    });

    it('ignores the seam that does not lie along the axis being turned', () => {
      // The same sideways drag, now landing on the seam between two *columns*.
      // That seam runs across the layers this drag turns and says nothing about
      // how many of them to take.
      const move = drag(project([0.5, 0, 1.5]), [50, 0]);

      expect(move.layers).toEqual([0]);
      expect(move.token).toBe('E');
    });

    it('does not invent a layer off the edge of the cube', () => {
      // The outer edge of the right column is a seam with nothing beyond it.
      const move = drag(seamOnFront(1.5, 0), [0, -50]);
      expect(move).not.toBeNull();
      expect(move.layers).toEqual([1]);
      expect(move.token).toBe('R');
    });

    it('writes a wide token that means exactly the two layers it turned', () => {
      const move = drag(seamOnFront(0.5, 0), [0, -50]);
      const parsed = parseMove(move.token);

      expect(parsed.axis).toBe(move.axis);
      expect(parsed.layers).toEqual(move.layers);
      expect(parsed.amount).toBe(move.amount);
      // Lowercase in, `Rw` out — the pad's spelling and Roux's, normalizing to
      // the same move.
      expect(parsed.token).toBe('Rw');
    });

    it('turns the wide turn the same way its outer face would go', () => {
      const wide = drag(seamOnFront(0.5, 0), [0, -50]);
      const narrow = drag(centreOf([1, 0, 1], F), [0, -50]);
      expect(shortWay(wide.amount)).toBe(shortWay(narrow.amount));
    });
  });

  it('means nothing at all until the finger has actually gone somewhere', () => {
    const from = centreOf(F, F);
    expect(chooseMove({ polygons, from, to: [from[0] + 1, from[1]], view })).toBeNull();
  });

  it('answers null when the finger never touched the cube', () => {
    expect(chooseMove({ polygons, from: [3, 3], to: [60, 3], view })).toBeNull();
  });
});

/**
 * Turning the face that is looking at you (§3.3c) — the one thing no straight
 * drag can ask for.
 */
describe('the corner gesture', () => {
  /** A path: start, go `first`, turn the corner, go `second`. Sampled the way a
   *  finger's would be. */
  const elbow = (start, first, second, step = 3) => {
    const path = [start];
    const walk = (from, leg) => {
      const length = Math.hypot(leg[0], leg[1]);
      const steps = Math.max(1, Math.round(length / step));
      for (let i = 1; i <= steps; i += 1) {
        path.push([from[0] + (leg[0] * i) / steps, from[1] + (leg[1] * i) / steps]);
      }
      return [from[0] + leg[0], from[1] + leg[1]];
    };
    walk(walk(start, first), second);
    return path;
  };

  const front = { yaw: 0, pitch: 0 };

  describe('facingFace', () => {
    it('is the front at rest, and follows the camera round', () => {
      expect(facingFace(0, 0)).toEqual([0, 0, 1]);
      expect(facingFace(Math.PI, 0)).toEqual([0, 0, -1]);
      expect(facingFace(-Math.PI / 2, 0)).toEqual([1, 0, 0]);
      expect(facingFace(Math.PI / 2, 0)).toEqual([-1, 0, 0]);
      expect(facingFace(0, Math.PI / 2)).toEqual([0, 1, 0]);
      expect(facingFace(0, -Math.PI / 2)).toEqual([0, -1, 0]);
    });

    it('still names a face at the angle the cube opens at', () => {
      expect(facingFace(DEFAULT_YAW, DEFAULT_PITCH)).toEqual([0, 0, 1]);
    });
  });

  describe('detectCorner', () => {
    it('finds the bend, and which way it went round', () => {
      // Up the screen, then right: on the glass that is a clockwise turn.
      const found = detectCorner(elbow([150, 150], [0, -30], [40, 0]));
      expect(found).not.toBeNull();
      expect(found.clockwise).toBe(true);
      expect(found.screen[0]).toBeCloseTo(1);
      expect(found.corner[1]).toBeCloseTo(120);
    });

    it('reads the other way round when the corner goes the other way', () => {
      const found = detectCorner(elbow([150, 150], [0, -30], [-40, 0]));
      expect(found.clockwise).toBe(false);
    });

    it('is not fooled by a straight drag', () => {
      expect(detectCorner(elbow([150, 150], [0, -30], [0, -40]))).toBeNull();
      expect(detectCorner(elbow([150, 150], [40, 0], [40, 0]))).toBeNull();
    });

    it('is not fooled by a drag that merely drifts', () => {
      // A 20° lean is a wobble, not a right angle.
      expect(detectCorner(elbow([150, 150], [0, -40], [14, -38]))).toBeNull();
    });

    it('waits for both legs to have been travelled', () => {
      expect(detectCorner(elbow([150, 150], [0, -4], [40, 0]))).toBeNull();
      expect(detectCorner(elbow([150, 150], [0, -30], [4, 0]))).toBeNull();
    });

    it('has nothing to say about a path that has barely started', () => {
      expect(detectCorner([[150, 150]])).toBeNull();
      expect(detectCorner([])).toBeNull();
      expect(detectCorner(null)).toBeNull();
    });
  });

  describe('cornerMove', () => {
    it('turns the front face when the front is what you are looking at', () => {
      const move = cornerMove({
        path: elbow([150, 150], [0, -30], [40, 0]),
        ...front,
      });
      expect(move.token).toBe('F');
      expect(move.layers).toEqual([1]);
      expect(move.axis).toBe(AXIS.z);
    });

    it('turns it back the other way for the other corner', () => {
      const move = cornerMove({
        path: elbow([150, 150], [0, -30], [-40, 0]),
        ...front,
      });
      expect(move.token).toBe("F'");
    });

    it('turns whichever face the camera is actually looking at', () => {
      const path = elbow([150, 150], [0, -30], [40, 0]);
      expect(cornerMove({ path, yaw: Math.PI, pitch: 0 }).token).toBe('B');
      expect(cornerMove({ path, yaw: -Math.PI / 2, pitch: 0 }).token).toBe('R');
      expect(cornerMove({ path, yaw: Math.PI / 2, pitch: 0 }).token).toBe('L');
      expect(cornerMove({ path, yaw: 0, pitch: Math.PI / 2 }).token).toBe('U');
      expect(cornerMove({ path, yaw: 0, pitch: -Math.PI / 2 }).token).toBe('D');
    });

    it('turns clockwise on the glass whichever face is in front', () => {
      // The same clockwise corner, at every face. Each token has to be its own
      // face's clockwise turn — which is `amount` +1 for the three faces on the
      // positive end of their axis and −1 for the three on the negative end.
      const path = elbow([150, 150], [0, -30], [40, 0]);
      [
        [{ yaw: 0, pitch: 0 }, 'F'],
        [{ yaw: Math.PI, pitch: 0 }, 'B'],
        [{ yaw: -Math.PI / 2, pitch: 0 }, 'R'],
        [{ yaw: Math.PI / 2, pitch: 0 }, 'L'],
        [{ yaw: 0, pitch: Math.PI / 2 }, 'U'],
        [{ yaw: 0, pitch: -Math.PI / 2 }, 'D'],
      ].forEach(([view, token]) => {
        const move = cornerMove({ path, ...view });
        expect(move.token).toBe(token);
        expect(parseMove(token).amount).toBe(move.amount);
      });
    });

    it('writes a token that means exactly the move it turned', () => {
      const move = cornerMove({ path: elbow([150, 150], [0, -30], [40, 0]), ...front });
      const parsed = parseMove(move.token);
      expect(parsed.axis).toBe(move.axis);
      expect(parsed.layers).toEqual(move.layers);
      expect(parsed.amount).toBe(move.amount);
    });

    it('measures progress from the corner, not from where the finger went down', () => {
      const move = cornerMove({ path: elbow([150, 150], [0, -30], [40, 0]), ...front });
      // The first leg was how you asked, not how far round you got. Measured
      // from the corner the second leg is 40 points; measured from the start it
      // would be the diagonal, and wrong.
      expect(move.corner[1]).toBeCloseTo(120);
      expect(turnProgress([190 - move.corner[0], 150 - move.corner[1]], move.screen))
        .toBeCloseTo(40 / TUNING.QUARTER_POINTS);
    });

    it('says nothing when the drag has no corner in it', () => {
      expect(cornerMove({ path: elbow([150, 150], [0, -30], [0, -40]), ...front }))
        .toBeNull();
    });
  });
});

describe('turnProgress', () => {
  const screen = [1, 0];

  it('is zero at the start and one at a full quarter turn', () => {
    expect(turnProgress([0, 0], screen)).toBe(0);
    expect(turnProgress([TUNING.QUARTER_POINTS, 0], screen)).toBe(1);
  });

  it('counts only the travel along the arrow, so sideways drift does not turn it', () => {
    const straight = turnProgress([30, 0], screen);
    expect(turnProgress([30, 60], screen)).toBeCloseTo(straight);
  });

  it('parks at zero rather than going negative when the finger comes back', () => {
    expect(turnProgress([-80, 0], screen)).toBe(0);
  });

  it('does not run past a full turn however far the finger goes', () => {
    expect(turnProgress([10000, 0], screen)).toBe(1);
  });
});

describe('shouldCommit', () => {
  it('turns the rest of the way once the layer is far enough round', () => {
    expect(shouldCommit(TUNING.COMMIT_T)).toBe(true);
    expect(shouldCommit(TUNING.COMMIT_T + 0.3)).toBe(true);
  });

  it('springs back from a nudge', () => {
    expect(shouldCommit(TUNING.COMMIT_T - 0.05)).toBe(false);
    expect(shouldCommit(0)).toBe(false);
  });

  it('takes a flick that was still travelling', () => {
    expect(shouldCommit(0.1, TUNING.FLING_SPEED + 50)).toBe(true);
  });

  it('does not take a fast drag that never left the start', () => {
    expect(shouldCommit(0, 4000)).toBe(false);
  });
});

describe('the corner-zone gesture (§3.3d)', () => {
  // The two in-plane axes of a face, and a corner cubie of it (both +1).
  const inFaceAxes = (normal) => [0, 1, 2].filter((i) => normal[i] === 0);
  const cornerPos = (normal) => {
    const pos = [...normal];
    inFaceAxes(normal).forEach((ax) => {
      pos[ax] = 1;
    });
    return pos;
  };

  // A screen point out in a corner sticker's outer quadrant, `out` half-cubies
  // toward the cube's corner along both of the face's axes.
  const cornerLanding = (pos, normal, view, out = 0.6) => {
    const project = projector(view);
    const centre = [
      pos[0] + normal[0] * 0.5,
      pos[1] + normal[1] * 0.5,
      pos[2] + normal[2] * 0.5,
    ];
    const origin = project(centre);
    let at = [...origin];
    inFaceAxes(normal).forEach((ax) => {
      const along = [0, 0, 0];
      along[ax] = 1;
      const tip = project([
        centre[0] + along[0] * 0.5,
        centre[1] + along[1] * 0.5,
        centre[2] + along[2] * 0.5,
      ]);
      const arrow = [tip[0] - origin[0], tip[1] - origin[1]];
      const dir = Math.sign(pos[ax]);
      at = [at[0] + dir * out * arrow[0], at[1] + dir * out * arrow[1]];
    });
    return at;
  };

  // Where the sticker point travels on screen if the move is applied — the
  // independent check that it went the way the finger dragged.
  const screenTravel = (pos, normal, move, view) => {
    const project = projector(view);
    const at = [2 * pos[0] + normal[0], 2 * pos[1] + normal[1], 2 * pos[2] + normal[2]];
    const after = rotateQuarter(at, move.axis, move.amount);
    const before = project([at[0] / 2, at[1] / 2, at[2] / 2]);
    const moved = project([after[0] / 2, after[1] / 2, after[2] / 2]);
    return [moved[0] - before[0], moved[1] - before[1]];
  };

  describe('faceCornerZone — when a landing is a corner of the facing face', () => {
    it('catches the outer corner of every facing face', () => {
      FACES.forEach((normal) => {
        const view = viewFacing(normal);
        const pos = cornerPos(normal);
        const at = cornerLanding(pos, normal, view);
        const zone = faceCornerZone({ pos, normal }, at, view);
        expect(zone).not.toBeNull();
        expect(zone.facing).toEqual(normal);
      });
    });

    it('leaves the middle of a corner sticker to the straight reading', () => {
      const normal = [0, 0, 1];
      const view = viewFacing(normal);
      const pos = cornerPos(normal);
      // Barely off centre — nowhere near the outer corner.
      expect(faceCornerZone({ pos, normal }, cornerLanding(pos, normal, view, 0.1), view)).toBeNull();
    });

    it('is not a corner on an edge or a centre sticker', () => {
      const normal = [0, 0, 1];
      const view = viewFacing(normal);
      // An edge cubie (one in-face coord is 0) landed far out is still not a corner.
      const edge = [1, 0, 1];
      expect(faceCornerZone({ pos: edge, normal }, cornerLanding(edge, normal, view), view)).toBeNull();
      const centre = [0, 0, 1];
      expect(faceCornerZone({ pos: centre, normal }, cornerLanding(centre, normal, view), view)).toBeNull();
    });

    it('ignores a corner of a face that is not the one in front', () => {
      // Looking at the front; a corner sticker of the right face is not eligible.
      const view = viewFacing([0, 0, 1]);
      const rightPos = [1, 1, 1];
      const rightNormal = [1, 0, 0];
      expect(
        faceCornerZone({ pos: rightPos, normal: rightNormal }, cornerLanding(rightPos, rightNormal, view), view)
      ).toBeNull();
    });
  });

  describe('faceCornerMove — spinning that face the way the finger goes', () => {
    it('turns the facing face, and the corner sticker goes the way the finger did', () => {
      FACES.forEach((normal) => {
        const view = viewFacing(normal);
        const pos = cornerPos(normal);
        const from = cornerLanding(pos, normal, view);
        const zone = faceCornerZone({ pos, normal }, from, view);

        // A clockwise-on-glass tangential drag: r rotated +90° in screen coords.
        const r = [from[0] - zone.pivot[0], from[1] - zone.pivot[1]];
        const to = [from[0] - r[1] * 0.5, from[1] + r[0] * 0.5];

        const move = faceCornerMove({ zone, from, to });
        expect(move).not.toBeNull();
        // It is the facing face's own layer — the axis perpendicular to nothing,
        // the one every sticker of the face shares.
        expect(normal[move.axis]).not.toBe(0);
        expect(move.layers).toEqual([normal[move.axis]]);
        expect([1, 3]).toContain(move.amount);

        // The invariant: apply the move and the corner sticker travels the way
        // the finger dragged.
        const drag = [to[0] - from[0], to[1] - from[1]];
        const travel = screenTravel(pos, normal, move, view);
        expect(travel[0] * drag[0] + travel[1] * drag[1]).toBeGreaterThan(0);
      });
    });

    it('turns the other way for the other way round', () => {
      const normal = [0, 0, 1];
      const view = viewFacing(normal);
      const pos = cornerPos(normal);
      const from = cornerLanding(pos, normal, view);
      const zone = faceCornerZone({ pos, normal }, from, view);
      const r = [from[0] - zone.pivot[0], from[1] - zone.pivot[1]];

      const cw = faceCornerMove({ zone, from, to: [from[0] - r[1] * 0.5, from[1] + r[0] * 0.5] });
      const ccw = faceCornerMove({ zone, from, to: [from[0] + r[1] * 0.5, from[1] - r[0] * 0.5] });
      expect(cw.axis).toBe(ccw.axis);
      expect(shortWay(cw.amount)).toBe(-shortWay(ccw.amount));
    });

    it('writes a token that means exactly the move it turned', () => {
      const normal = [0, 0, 1];
      const view = viewFacing(normal);
      const pos = cornerPos(normal);
      const from = cornerLanding(pos, normal, view);
      const zone = faceCornerZone({ pos, normal }, from, view);
      const r = [from[0] - zone.pivot[0], from[1] - zone.pivot[1]];
      const move = faceCornerMove({ zone, from, to: [from[0] - r[1] * 0.5, from[1] + r[0] * 0.5] });
      const parsed = parseMove(move.token);
      expect(parsed.axis).toBe(move.axis);
      expect(parsed.layers).toEqual(move.layers);
      expect(parsed.amount).toBe(move.amount);
    });

    it('waits for a tangential pull rather than flipping a coin on a radial poke', () => {
      const normal = [0, 0, 1];
      const view = viewFacing(normal);
      const pos = cornerPos(normal);
      const from = cornerLanding(pos, normal, view);
      const zone = faceCornerZone({ pos, normal }, from, view);
      const r = [from[0] - zone.pivot[0], from[1] - zone.pivot[1]];
      const radius = Math.hypot(r[0], r[1]);
      // Straight out along the radius: no spin.
      const out = [from[0] + (r[0] / radius) * 40, from[1] + (r[1] / radius) * 40];
      expect(faceCornerMove({ zone, from, to: out })).toBeNull();
    });

    it('is null until the drag is long enough to mean anything', () => {
      const normal = [0, 0, 1];
      const view = viewFacing(normal);
      const pos = cornerPos(normal);
      const from = cornerLanding(pos, normal, view);
      const zone = faceCornerZone({ pos, normal }, from, view);
      expect(faceCornerMove({ zone, from, to: [from[0] + 1, from[1] + 1] })).toBeNull();
    });
  });
});
