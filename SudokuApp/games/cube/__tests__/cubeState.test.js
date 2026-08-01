/**
 * The cube model.
 *
 * The tests that matter here are the ones a wrong rotation cannot pass. Rather
 * than asserting on hand-written facelet tables — which would just be the same
 * guess twice — these lean on properties every real cube has: known algorithm
 * orders, the invariants of a quarter turn, and the standard colour scheme.
 */

import {
  FACE_ORDER,
  applyMoves,
  cubeFromAlg,
  facelets,
  faceletString,
  isSolved,
  solvedCube,
} from '../cubeState';
import { parseAlg } from '../moves';

/** How many times `alg` has to be repeated to come back to solved. */
const orderOf = (alg) => {
  const moves = parseAlg(alg);
  let cube = solvedCube();
  for (let i = 1; i <= 1400; i += 1) {
    cube = applyMoves(cube, moves);
    if (isSolved(cube)) return i;
  }
  return Infinity;
};

describe('solvedCube', () => {
  it('has 26 cubies and 54 stickers', () => {
    const cube = solvedCube();
    expect(cube.cubies).toHaveLength(26);
    expect(cube.cubies.reduce((n, c) => n + c.stickers.length, 0)).toBe(54);
  });

  it('has 8 corners, 12 edges and 6 centers', () => {
    const cube = solvedCube();
    const byStickerCount = cube.cubies.reduce((counts, cubie) => {
      counts[cubie.stickers.length] = (counts[cubie.stickers.length] || 0) + 1;
      return counts;
    }, {});
    expect(byStickerCount).toEqual({ 1: 6, 2: 12, 3: 8 });
  });

  it('reads as six solid faces', () => {
    expect(faceletString(solvedCube())).toBe(
      'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB'
    );
    expect(isSolved(solvedCube())).toBe(true);
  });
});

describe('facelets, pinned against the published values', () => {
  // These three strings are not derived from this implementation — they are the
  // facelet strings the Singmaster/Kociemba convention gives for a single move,
  // and they are what an outside solver would hand back. Everything else in this
  // file is a property test, which can be satisfied by a model that is
  // *self-consistently* wrong: a cube whose reading order is transposed, or
  // whose scheme is mirrored, passes every order test above. These do not.
  it('matches the standard result for R', () => {
    expect(faceletString(cubeFromAlg('R'))).toBe(
      'UUFUUFUUF' + 'RRRRRRRRR' + 'FFDFFDFFD' + 'DDBDDBDDB' + 'LLLLLLLLL' + 'UBBUBBUBB'
    );
  });

  it('matches the standard result for U', () => {
    expect(faceletString(cubeFromAlg('U'))).toBe(
      'UUUUUUUUU' + 'BBBRRRRRR' + 'RRRFFFFFF' + 'DDDDDDDDD' + 'FFFLLLLLL' + 'LLLBBBBBB'
    );
  });

  it('matches the standard result for M, the slice that follows L', () => {
    expect(faceletString(cubeFromAlg('M'))).toBe(
      'UBUUBUUBU' + 'RRRRRRRRR' + 'FUFFUFFUF' + 'DFDDFDDFD' + 'LLLLLLLLL' + 'BDBBDBBDB'
    );
  });
});

describe('applying moves', () => {
  it('leaves every face with nine stickers, whatever the scramble', () => {
    const faces = facelets(cubeFromAlg("R U R' U' F2 L D' B M' E S x y' z2"));
    FACE_ORDER.forEach((face) => expect(faces[face]).toHaveLength(9));

    const counts = faceletString(cubeFromAlg("R U R' U' F2 L D' B"))
      .split('')
      .reduce((acc, letter) => ({ ...acc, [letter]: (acc[letter] || 0) + 1 }), {});
    expect(counts).toEqual({ U: 9, R: 9, F: 9, D: 9, L: 9, B: 9 });
  });

  it('undoes a move with its inverse', () => {
    ['U', 'D', 'L', 'R', 'F', 'B', 'M', 'E', 'S', 'Rw', 'x'].forEach((token) => {
      expect(isSolved(cubeFromAlg(`${token} ${token}'`))).toBe(true);
      expect(isSolved(cubeFromAlg(`${token}2 ${token}2`))).toBe(true);
      expect(isSolved(cubeFromAlg(`${token} ${token} ${token} ${token}`))).toBe(true);
    });
  });

  it('gives the sexy move an order of 6', () => {
    // The best-known identity in cubing: (R U R' U') six times is solved.
    expect(orderOf("R U R' U'")).toBe(6);
  });

  it('gives the Sune an order of 6 and the T-perm an order of 2', () => {
    expect(orderOf("R U R' U R U2 R'")).toBe(6);
    expect(orderOf("R U R' U' R' F R2 U' R' U' R U R' F'")).toBe(2);
  });

  it('gives a superflip an order of 2', () => {
    // The superflip is its own inverse — every edge flipped in place.
    expect(
      orderOf("U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2")
    ).toBe(2);
  });

  it('gives R U an order of 105', () => {
    // The other identity every cuber has heard: repeat `R U` 105 times and the
    // cube comes back. Nothing about a *nearly* right rotation survives this one.
    expect(orderOf('R U')).toBe(105);
  });
});

describe('whole-cube rotations', () => {
  it('leave the cube solved', () => {
    ['x', 'y', 'z', "x'", 'y2'].forEach((token) => {
      expect(isSolved(cubeFromAlg(token))).toBe(true);
    });
  });

  it('move the colours around, so they are not no-ops', () => {
    // y turns the cube so the old front face is now on the left.
    expect(facelets(cubeFromAlg('y')).L[4]).toBe('F');
    // x tips the front face up to the top.
    expect(facelets(cubeFromAlg('x')).U[4]).toBe('F');
  });
});

describe('the colour scheme', () => {
  it('is the standard one: white up, green front, red right', () => {
    // Centers never move relative to each other, so the center of each face is
    // what fixes the scheme.
    const faces = facelets(solvedCube());
    expect([faces.U[4], faces.F[4], faces.R[4]]).toEqual(['U', 'F', 'R']);
  });

  it('puts U1 at the back-left of the up face', () => {
    // A quarter turn of B drags the up face's back row away, and only its back
    // row — which is what pins the reading order down.
    const faces = facelets(cubeFromAlg('B'));
    expect(faces.U.slice(0, 3)).toEqual(['R', 'R', 'R']);
    expect(faces.U.slice(3)).toEqual(['U', 'U', 'U', 'U', 'U', 'U']);
  });

  it('puts F1 at the top-left of the front face', () => {
    // U drags the front face's top row to the left face.
    const faces = facelets(cubeFromAlg('U'));
    expect(faces.F.slice(0, 3)).toEqual(['R', 'R', 'R']);
    expect(faces.L.slice(0, 3)).toEqual(['F', 'F', 'F']);
  });
});

describe('cubeFromAlg', () => {
  it('treats empty and whitespace as solved', () => {
    expect(isSolved(cubeFromAlg(''))).toBe(true);
    expect(isSolved(cubeFromAlg('   '))).toBe(true);
    expect(isSolved(cubeFromAlg(undefined))).toBe(true);
  });

  it('throws on notation it cannot apply, rather than showing a wrong cube', () => {
    expect(() => cubeFromAlg('R Q U')).toThrow();
  });
});
