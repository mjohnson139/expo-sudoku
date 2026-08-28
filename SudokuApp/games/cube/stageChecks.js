import { applyMoves, facelets, isSolved, solvedCube } from './cubeState';
import { moveCount, parseAlg } from './moves';
import { phaseSpans } from './solveList';

const SIDES = ['F', 'R', 'B', 'L'];

const matchesCentre = (faces, face, indices) =>
  indices.every((index) => faces[face][index] === faces[face][4]);

const matches = (faces, selections) =>
  selections.every(([face, indices]) => matchesCentre(faces, face, indices));

const cross = (cube) => {
  const faces = facelets(cube);
  return matches(faces, [
    ['D', [1, 3, 5, 7]],
    ...SIDES.map((face) => [face, [7]]),
  ]);
};

const f2l = (cube) => {
  const faces = facelets(cube);
  return matches(faces, [
    ['D', [0, 1, 2, 3, 4, 5, 6, 7, 8]],
    ...SIDES.map((face) => [face, [3, 4, 5, 6, 7, 8]]),
  ]);
};

const oll = (cube) => {
  if (!f2l(cube)) return false;
  const faces = facelets(cube);
  return matchesCentre(faces, 'U', [0, 1, 2, 3, 4, 5, 6, 7, 8]);
};

const LEFT_BLOCK = [
  ['D', [0, 3, 6]],
  ['L', [3, 4, 5, 6, 7, 8]],
  ['F', [3, 6]],
  ['B', [5, 8]],
];
const RIGHT_BLOCK = [
  ['D', [2, 5, 8]],
  ['R', [3, 4, 5, 6, 7, 8]],
  ['F', [5, 8]],
  ['B', [3, 6]],
];

const rouxBlocks = (cube, includeRight) => {
  const faces = facelets(cube);
  return matches(faces, includeRight ? [...LEFT_BLOCK, ...RIGHT_BLOCK] : LEFT_BLOCK);
};

const cmll = (cube) => {
  if (!rouxBlocks(cube, true)) return false;
  const faces = facelets(cube);
  return matches(faces, [
    ['U', [0, 2, 6, 8]],
    ...SIDES.map((face) => [face, [0, 2]]),
  ]);
};

const PRESET_CHECKS = {
  roux: {
    'First block': (cube) => rouxBlocks(cube, false),
    'Second block': (cube) => rouxBlocks(cube, true),
    CMLL: cmll,
    LSE: isSolved,
  },
  cfop: { Cross: cross, F2L: f2l, OLL: oll, PLL: isSolved },
  'beginner-lbl': {
    Cross: cross,
    'F2L basic': f2l,
    'OLL 2-look': oll,
    'PLL 2-look': isSolved,
  },
};

/** Check a shipped stage on an already replayed cube. User stages have no opinion. */
export const checkStage = (method, stage, cube) => {
  const predicate = PRESET_CHECKS[method]?.[stage];
  return predicate ? predicate(cube) : null;
};

/** Replay one solve only as far as a marker and check that marker's stage. */
export const checkStageAt = (solve, phase) => {
  const predicate = PRESET_CHECKS[solve?.method]?.[phase?.label];
  if (!predicate) return null;
  try {
    const scramble = parseAlg(solve.scramble || '');
    const orientation = typeof solve.orientation === 'string' ? parseAlg(solve.orientation) : [];
    const moves = parseAlg(solve.alg || '').slice(0, phase.at);
    return predicate(applyMoves(solvedCube(), [...scramble, ...orientation, ...moves]));
  } catch (error) {
    return false;
  }
};

/** Results stay attached to marker identity, never to the live scrubber. */
export const stageResults = (solve) =>
  phaseSpans(solve?.phases || [], moveCount(solve?.alg || '')).filter((span) => span.label).map((span) => ({
    at: span.end,
    label: span.label,
    result: checkStageAt(solve, { at: span.end, label: span.label }),
  }));

export default { checkStage, checkStageAt, stageResults };
