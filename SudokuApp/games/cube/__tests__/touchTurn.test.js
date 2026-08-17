import {
  AXIS,
  buildScene,
  orbit,
  projector,
  rotateQuarter,
  shortWay,
} from '../geometry';
import { solvedCube } from '../cubeState';
import { parseMove } from '../moves';
import { TUNING, moveForDrag, pickFace, shouldCommit, turnProgress } from '../touchTurn';

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
