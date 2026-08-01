/**
 * The cube itself (docs/cube-plan.md §3).
 *
 * ### Why cubies and not 54 facelets
 *
 * The obvious model is a 54-character string plus a permutation table per move.
 * It is compact, and it is also six hand-written 20-element index tables that
 * are wrong in ways no reviewer can see. This model instead stores the 26 moving
 * pieces as *positions and outward normals*, and a move rotates both by the same
 * quarter turn. There are no tables to get wrong: correctness reduces to one
 * 3×3 rotation, which `geometry.rotateQuarter` owns and the tests pin down.
 *
 * It also happens to be exactly what the renderer wants — a cubie already knows
 * where it is and which way each of its stickers faces — and it is what will
 * make animated layer turns a partial rotation of a subset of cubies rather than
 * a new representation.
 *
 * A cube is immutable: every move returns a new one.
 */

import { rotateQuarter } from './geometry';
import { parseAlg } from './moves';

/** Reading order for facelet strings — the Singmaster/Kociemba convention. */
export const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'];

/** Outward normal of each face on a solved, unrotated cube. */
export const FACE_NORMALS = {
  U: [0, 1, 0],
  R: [1, 0, 0],
  F: [0, 0, 1],
  D: [0, -1, 0],
  L: [-1, 0, 0],
  B: [0, 0, -1],
};

/**
 * The standard (WCA) colour scheme: white up, green front, red right — the one
 * every tutorial, every solve method and every physical speedcube assumes. The
 * hexes are the familiar Rubik's-brand values rather than the app's palette,
 * because this is a picture of an object the player owns, not a themed surface.
 */
export const STICKER_COLORS = {
  U: '#f4f4f4',
  R: '#c41e1e',
  F: '#009b48',
  D: '#ffd500',
  L: '#ff5800',
  B: '#0051ba',
};

/** Human names, for the face legend and for screen readers. */
export const FACE_NAMES = {
  U: 'Up (white)',
  R: 'Right (red)',
  F: 'Front (green)',
  D: 'Down (yellow)',
  L: 'Left (orange)',
  B: 'Back (blue)',
};

/** Which face an outward normal belongs to, on a solved cube. */
const faceForNormal = (n) =>
  FACE_ORDER.find((face) => {
    const f = FACE_NORMALS[face];
    return f[0] === n[0] && f[1] === n[1] && f[2] === n[2];
  }) || null;

/**
 * A solved cube: 26 cubies (the invisible core is omitted), each carrying one
 * sticker per outward-facing side — 54 in total, which is the check the tests
 * make on this.
 */
export const solvedCube = () => {
  const cubies = [];

  for (let cx = -1; cx <= 1; cx += 1) {
    for (let cy = -1; cy <= 1; cy += 1) {
      for (let cz = -1; cz <= 1; cz += 1) {
        if (cx === 0 && cy === 0 && cz === 0) continue;

        const pos = [cx, cy, cz];
        const stickers = [];

        [0, 1, 2].forEach((axis) => {
          if (pos[axis] === 0) return;
          const normal = [0, 0, 0];
          normal[axis] = pos[axis];
          stickers.push({ normal, face: faceForNormal(normal) });
        });

        cubies.push({ pos, stickers });
      }
    }
  }

  return { cubies };
};

/**
 * Apply one move.
 *
 * Cubies outside the move's layers are passed through by reference — a move
 * touches at most nine of twenty-six pieces, and copying the rest would be work
 * done only to be thrown away.
 */
export const applyMove = (cube, move) => ({
  cubies: cube.cubies.map((cubie) => {
    if (!move.layers.includes(cubie.pos[move.axis])) return cubie;

    return {
      pos: rotateQuarter(cubie.pos, move.axis, move.amount),
      stickers: cubie.stickers.map((sticker) => ({
        face: sticker.face,
        normal: rotateQuarter(sticker.normal, move.axis, move.amount),
      })),
    };
  }),
});

/** Apply a list of moves, left to right. */
export const applyMoves = (cube, moves) => moves.reduce(applyMove, cube);

/**
 * A solved cube with `alg` applied — what the scramble screen shows.
 *
 * @param {string} alg notation, e.g. `R U R' U'`. Empty means solved.
 * @throws {Error} if `alg` is not valid notation (see `moves.parseAlg`)
 */
export const cubeFromAlg = (alg) => applyMoves(solvedCube(), parseAlg(alg || ''));

/**
 * Where each facelet lives, as `(face, row, col) → [position, normal]`.
 *
 * Rows run top to bottom and columns left to right **as that face is seen from
 * outside, with U up** — the reading every diagram and every solver uses. U is
 * read with B at the top of the page and D with F at the top, which is the part
 * that is easy to get backwards.
 */
const FACE_READING = {
  U: { row: [0, 0, 1], col: [1, 0, 0] },
  R: { row: [0, -1, 0], col: [0, 0, -1] },
  F: { row: [0, -1, 0], col: [1, 0, 0] },
  D: { row: [0, 0, -1], col: [1, 0, 0] },
  L: { row: [0, -1, 0], col: [0, 0, 1] },
  B: { row: [0, -1, 0], col: [-1, 0, 0] },
};

const positionKey = (v) => `${v[0]},${v[1]},${v[2]}`;

/** Index a cube by `position|normal` so facelet reads are a lookup, not a scan. */
const stickerIndex = (cube) => {
  const index = new Map();
  cube.cubies.forEach((cubie) => {
    cubie.stickers.forEach((sticker) => {
      index.set(`${positionKey(cubie.pos)}|${positionKey(sticker.normal)}`, sticker.face);
    });
  });
  return index;
};

/**
 * The cube as six 9-letter faces, in reading order.
 *
 * This is the model's canonical form: it is what the tests compare, and it is
 * the shape an external solver would want.
 *
 * @returns {Object<string, string[]>} face letter → 9 face letters
 */
export const facelets = (cube) => {
  const index = stickerIndex(cube);
  const out = {};

  FACE_ORDER.forEach((face) => {
    const normal = FACE_NORMALS[face];
    const { row, col } = FACE_READING[face];
    const squares = [];

    for (let r = -1; r <= 1; r += 1) {
      for (let c = -1; c <= 1; c += 1) {
        const pos = [
          normal[0] + row[0] * r + col[0] * c,
          normal[1] + row[1] * r + col[1] * c,
          normal[2] + row[2] * r + col[2] * c,
        ];
        squares.push(index.get(`${positionKey(pos)}|${positionKey(normal)}`) || '?');
      }
    }

    out[face] = squares;
  });

  return out;
};

/** The 54-character facelet string, `U` face first — the Kociemba ordering. */
export const faceletString = (cube) => {
  const faces = facelets(cube);
  return FACE_ORDER.map((face) => faces[face].join('')).join('');
};

/** Solved means every face is one colour — checked on the facelets, so it holds
 *  for a cube that has been rotated as a whole as well as for one at rest. */
export const isSolved = (cube) => {
  const faces = facelets(cube);
  return FACE_ORDER.every((face) => faces[face].every((sticker) => sticker === faces[face][0]));
};

export default { solvedCube, applyMove, applyMoves, cubeFromAlg, facelets, isSolved };
