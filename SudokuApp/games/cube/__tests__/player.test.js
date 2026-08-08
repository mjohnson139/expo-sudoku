/**
 * Playing a scramble back.
 *
 * The scrubber's React half is a clock and five buttons; everything that could
 * be *wrong* about it — which cube belongs at which position, how long a turn
 * runs, where a nonsense position lands — is here, where the node test runner
 * can reach it without a renderer.
 */

import {
  DEFAULT_SPEED,
  HALF_TURN_SCALE,
  MOVE_GAP_MS,
  SPEEDS,
  TURN_MS,
  announcePosition,
  buildPlayback,
  clampIndex,
  describePosition,
  describeSpeed,
  ease,
  extendsAlg,
  promotedTurn,
  renderTurn,
  gapDuration,
  nextSpeed,
  turnDuration,
} from '../player';
import { faceletString, isSolved, cubeFromAlg } from '../cubeState';
import { moveCount, parseMove } from '../moves';

describe('buildPlayback', () => {
  it('gives one more cube than there are moves', () => {
    const { moves, states } = buildPlayback("R U R' U'");
    expect(moves).toHaveLength(4);
    expect(states).toHaveLength(5);
  });

  it('starts solved and ends on the scrambled cube', () => {
    const alg = "R U2 F' D L B' M";
    const { states } = buildPlayback(alg);

    expect(isSolved(states[0])).toBe(true);
    expect(faceletString(states[states.length - 1])).toBe(faceletString(cubeFromAlg(alg)));
  });

  it('has the cube after every prefix of the algorithm at that index', () => {
    // The property the whole scrubber rests on: position `i` is the cube after
    // `i` moves, so stepping, seeking and tapping a token are all the same
    // lookup and none of them can disagree with the others.
    const tokens = ["R", "U2", "F'", "D", "L", "B'"];
    const { states } = buildPlayback(tokens.join(' '));

    tokens.forEach((_token, i) => {
      expect(faceletString(states[i])).toBe(
        faceletString(cubeFromAlg(tokens.slice(0, i).join(' ')))
      );
    });
  });

  it('is a solved cube and no moves for text it cannot read', () => {
    // The screen's whole job is to show a cube. Unparseable text has already
    // been filtered twice over by the time it gets here, and if it somehow has
    // not, a solved cube beats a crash.
    ['not notation', 'R U banana', null, undefined].forEach((alg) => {
      const { moves, states } = buildPlayback(alg);
      expect(moves).toHaveLength(0);
      expect(states).toHaveLength(1);
      expect(isSolved(states[0])).toBe(true);
    });
  });

  it('reads the empty scramble as a solved cube with nowhere to go', () => {
    const { moves, states } = buildPlayback('');
    expect(moves).toHaveLength(0);
    expect(isSolved(states[0])).toBe(true);
  });

  it('hands back the tokens as written alongside the moves they mean', () => {
    // A solve typed `r U r'` reads back `r U r'`; the model still turns `Rw`.
    const { tokens, moves } = buildPlayback("r U r'");
    expect(tokens).toEqual(['r', 'U', "r'"]);
    expect(moves.map((move) => move.token)).toEqual(['Rw', 'U', "Rw'"]);
  });

  it('starts from the cube it was given, which is what a solve needs', () => {
    const scramble = "R U2 F' D L B'";
    const from = cubeFromAlg(scramble);
    const { states } = buildPlayback("r U r'", { from });

    // Position 0 of a solve is the scrambled cube, not a solved one.
    expect(faceletString(states[0])).toBe(faceletString(from));
    expect(isSolved(states[0])).toBe(false);

    // And the end is the scramble and the solve run one after the other, which
    // is the property that makes "enter a move and the cube turns" true.
    expect(faceletString(states[states.length - 1])).toBe(
      faceletString(cubeFromAlg(`${scramble} r U r'`))
    );
  });

  it('undoes a scramble when the solve is its inverse', () => {
    const scramble = "R U R' U'";
    const { states } = buildPlayback("U R U' R'", { from: cubeFromAlg(scramble) });
    expect(isSolved(states[states.length - 1])).toBe(true);
  });

  it('is still solved-by-default when no starting cube is given', () => {
    expect(isSolved(buildPlayback("R U R'").states[0])).toBe(true);
    expect(isSolved(buildPlayback("R U R'", {}).states[0])).toBe(true);
  });

  it('leaves the cube it was handed alone', () => {
    // States are shared by reference where a move does not touch them, so a
    // starting cube that got mutated would rewrite the scramble the solve is
    // being written against.
    const from = cubeFromAlg('R U');
    const before = faceletString(from);
    buildPlayback("M2 U M2 r U r'", { from });
    expect(faceletString(from)).toBe(before);
  });
});

describe('extendsAlg', () => {
  it('is true when moves were added to the end', () => {
    expect(extendsAlg('R U', "R U R'")).toBe(true);
    expect(extendsAlg('', 'R')).toBe(true);
    expect(extendsAlg('R U', 'R U')).toBe(true);
  });

  it('is false when the algorithm was replaced, shortened or edited', () => {
    // Undo, clear, and loading a favorite: three ways of saying "this is a
    // different algorithm now", which is what makes the transport reset.
    expect(extendsAlg("R U R'", 'R U')).toBe(false);
    expect(extendsAlg('R U', '')).toBe(false);
    expect(extendsAlg('R U', "R U' R")).toBe(false);
    expect(extendsAlg('R U', 'U R F')).toBe(false);
  });

  it('compares the moves, not the spelling', () => {
    // `r` and `Rw` are the same turn, so a solve respelled mid-write is still
    // the same prefix — the cubes are identical either way, and that is what
    // "walk forward from here" actually depends on.
    expect(extendsAlg("r U", "Rw U R'")).toBe(true);
    expect(extendsAlg("R2'", 'R2 U')).toBe(true);
  });

  it('is false for text either side cannot read', () => {
    expect(extendsAlg('R banana', 'R banana U')).toBe(false);
    expect(extendsAlg('R', 'R banana')).toBe(false);
  });

  it('treats null and undefined as the empty algorithm', () => {
    expect(extendsAlg(null, 'R')).toBe(true);
    expect(extendsAlg(undefined, '')).toBe(true);
    expect(extendsAlg('R', null)).toBe(false);
  });

  describe('asked from where the cube actually is', () => {
    it('ignores moves the cube has not reached yet', () => {
      // Undo, then type a different move: the cube has already turned back to
      // move 2, and both algorithms agree everywhere it has been — so the new
      // move is walked to rather than applied behind your back.
      expect(extendsAlg("R U F", "R U D", 2)).toBe(true);
      expect(extendsAlg("R U F", "R U", 2)).toBe(true);
    });

    it('still refuses when the cube is standing somewhere that changed', () => {
      expect(extendsAlg("R U F", "R D F", 2)).toBe(false);
      expect(extendsAlg("R U F", "U R F", 1)).toBe(false);
    });

    it('refuses a position the new algorithm does not reach', () => {
      // Clearing a solve, or undoing twice at once: there is nowhere to walk
      // forward to from where the cube is standing.
      expect(extendsAlg("R U F", 'R', 3)).toBe(false);
      expect(extendsAlg("R U F", '', 1)).toBe(false);
    });

    it('is true from position 0 for anything at all', () => {
      // The cube is on the starting position, which every algorithm shares —
      // including the first key pressed into an empty solve.
      expect(extendsAlg('', 'R', 0)).toBe(true);
      expect(extendsAlg('R U F', "D2 L' B", 0)).toBe(true);
    });

    it('agrees with the two-argument form at the end of `before`', () => {
      ["R U", '', "r U r'"].forEach((before) => {
        ["R U R'", 'R U', 'F', ''].forEach((after) => {
          expect(extendsAlg(before, after, moveCount(before))).toBe(
            extendsAlg(before, after)
          );
        });
      });
    });

    it('refuses a position that is not a position', () => {
      [-1, 1.5, NaN, 'two', null].forEach((at) => {
        expect(extendsAlg('R U F', 'R U F D', at)).toBe(false);
      });
    });
  });
});

describe('turnDuration', () => {
  it('gives a quarter turn the base duration', () => {
    ['R', "R'", 'U', "D'", 'M'].forEach((token) => {
      expect(turnDuration(parseMove(token))).toBe(TURN_MS);
    });
  });

  it('stretches a half turn rather than doubling it', () => {
    // Twice the distance in twice the time makes playback lurch; the same speed
    // for twice the distance makes a half turn look like a flick.
    const half = turnDuration(parseMove('R2'));
    expect(half).toBe(Math.round(TURN_MS * HALF_TURN_SCALE));
    expect(half).toBeGreaterThan(TURN_MS);
    expect(half).toBeLessThan(TURN_MS * 2);
  });

  it('keeps a whole scramble watchable rather than a wait', () => {
    const { moves } = buildPlayback(
      "R U2 F' D L B' R' U F2 D' L2 B R2 U' F D2 L' B2 R F'"
    );
    const total = moves.reduce(
      (sum, move) => sum + turnDuration(move) + MOVE_GAP_MS,
      0
    );
    expect(total).toBeLessThan(10000);
  });

  it('divides by the rate, so 2× is twice as quick', () => {
    // The chip says "2×". A rate that multiplied the duration would make it
    // half speed while the label promised double — the one way to get this
    // backwards, and invisible until someone taps it.
    const move = parseMove('R');
    expect(turnDuration(move, 2)).toBe(Math.round(TURN_MS / 2));
    expect(turnDuration(move, 0.5)).toBe(TURN_MS * 2);
    expect(turnDuration(move, 1)).toBe(turnDuration(move));
  });

  it('scales half turns and the beat between moves by the same rate', () => {
    // Otherwise double speed is a stutter: quick turns with a full-length pause
    // between them, which reads as the cube hesitating rather than hurrying.
    SPEEDS.forEach((rate) => {
      expect(turnDuration(parseMove('R2'), rate)).toBe(
        Math.round((TURN_MS * HALF_TURN_SCALE) / rate)
      );
      expect(gapDuration(rate)).toBe(Math.round(MOVE_GAP_MS / rate));
    });
  });

  it('falls back to normal speed rather than dividing by zero', () => {
    [0, -1, undefined].forEach((rate) => {
      expect(turnDuration(parseMove('R'), rate)).toBe(TURN_MS);
      expect(gapDuration(rate)).toBe(MOVE_GAP_MS);
    });
  });
});

describe('nextSpeed', () => {
  it('cycles and comes back round', () => {
    let rate = DEFAULT_SPEED;
    const seen = SPEEDS.map(() => {
      rate = nextSpeed(rate);
      return rate;
    });
    expect(new Set(seen)).toEqual(new Set(SPEEDS));
    expect(rate).toBe(DEFAULT_SPEED);
  });

  it('lands back at normal speed from anywhere it does not recognize', () => {
    [3, 0, NaN, undefined].forEach((rate) => {
      expect(nextSpeed(rate)).toBe(DEFAULT_SPEED);
    });
  });

  it('opens at a speed that is in the cycle', () => {
    expect(SPEEDS).toContain(DEFAULT_SPEED);
  });
});

describe('describeSpeed', () => {
  it('is what the chip says', () => {
    // No trailing zero: "2×", not "2.0×", in 34 points of chip.
    expect(describeSpeed(1)).toBe('1×');
    expect(describeSpeed(2)).toBe('2×');
    expect(describeSpeed(0.5)).toBe('0.5×');
  });
});

describe('ease', () => {
  it('is exactly 0 and exactly 1 at the ends', () => {
    // Those are the two frames the renderer draws with integer arithmetic. A
    // 0.9999999 would put the last frame of a turn a hair off the still cube
    // it is about to be replaced by.
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
  });

  it('clamps rather than overshooting, however late a frame arrives', () => {
    expect(ease(-0.5)).toBe(0);
    expect(ease(1.5)).toBe(1);
  });

  it('only ever moves forwards', () => {
    let previous = -1;
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const value = ease(p);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it('starts and finishes slower than it runs', () => {
    expect(ease(0.1)).toBeLessThan(0.1);
    expect(ease(0.9)).toBeGreaterThan(0.9);
    expect(ease(0.5)).toBeCloseTo(0.5, 10);
  });
});

describe('clampIndex', () => {
  it('keeps a position inside the algorithm', () => {
    expect(clampIndex(5, 20)).toBe(5);
    expect(clampIndex(-3, 20)).toBe(0);
    expect(clampIndex(99, 20)).toBe(20);
    expect(clampIndex(0, 0)).toBe(0);
    expect(clampIndex(4, 0)).toBe(0);
  });

  it('lands nonsense at the start instead of passing a NaN to the renderer', () => {
    [NaN, Infinity, undefined, null, 'seven'].forEach((value) => {
      expect(clampIndex(value, 20)).toBe(0);
    });
  });
});

describe('describePosition', () => {
  it('is the label between the buttons', () => {
    expect(describePosition(7, 20)).toBe('7 / 20');
    expect(describePosition(0, 20)).toBe('0 / 20');
  });
});

describe('announcePosition', () => {
  it('says where you are out loud', () => {
    expect(announcePosition(0, 20)).toBe('Solved cube, before move 1 of 20');
    expect(announcePosition(7, 20)).toBe('After move 7 of 20');
    expect(announcePosition(20, 20)).toBe('End of the scramble, all 20 moves played');
    expect(announcePosition(0, 0)).toBe('No moves to play');
  });

  it('does not call the start of a solve a solved cube', () => {
    // Position 0 of a solve is the *scrambled* cube. Saying "solved" there is a
    // lie in the one place a screen reader user has nothing else to go on.
    expect(announcePosition(0, 8, 'solve')).toBe('The scrambled cube, before move 1 of 8');
    expect(announcePosition(8, 8, 'solve')).toBe('End of the solve, all 8 moves played');
    expect(announcePosition(0, 0, 'solve')).toBe('No moves entered yet');
    expect(announcePosition(3, 8, 'solve')).toBe('After move 3 of 8');
  });
});

describe('promotedTurn', () => {
  // The pad's second tap: `R` becomes `R2` in place, and the cube is already a
  // quarter of the way through the half turn it has just become.
  it('spots the last move growing from a quarter to a half turn', () => {
    expect(promotedTurn('R U R', 'R U R2', 3)).toEqual({ at: 2, turns: 2 });
  });

  it('is null for an ordinary append', () => {
    expect(promotedTurn('R U', 'R U F', 2)).toBeNull();
  });

  it('is null when an earlier move changed', () => {
    // Everything the cube has already been through has to be untouched, or
    // carrying on from here would be carrying on from the wrong cube.
    expect(promotedTurn('R U R', 'R D R2', 3)).toBeNull();
  });

  it('is null for a different face, even at the right place', () => {
    expect(promotedTurn('R U R', 'R U F2', 3)).toBeNull();
  });

  it('is null when the move was already a half turn', () => {
    expect(promotedTurn('R U R2', 'R U R2', 3)).toBeNull();
  });

  it('carries on from a prime too, which is what makes it a rule and not a case', () => {
    // The pad cannot reach this — `promoteLastToken` only promotes a bare `R` —
    // but the geometry is the same question and has the same answer: `R'` sits
    // at −90°, so the sweep continues anticlockwise to −180°, which is where
    // `R2` lands. Step 9 edits a solve's text directly and will meet it.
    expect(promotedTurn("R U R'", 'R U R2', 3)).toEqual({ at: 2, turns: -2 });
  });

  it('does not confuse a wide turn with its face', () => {
    expect(promotedTurn('r', 'R2', 1)).toBeNull();
    expect(promotedTurn('r', 'r2', 1)).toEqual({ at: 0, turns: 2 });
  });

  /**
   * **The seam the sweep was actually lost at.**
   *
   * `promotedTurn` has returned the right signed sweep since Step 8 and every
   * test of it passed — while the promotion animated backwards on a phone,
   * because `useScramblePlayer` built the renderer's turn with a spread that
   * left `turns` behind. A line inside a hook is a line no test here can reach,
   * so it is a function now and this is it.
   */
  describe('renderTurn', () => {
    const move = parseMove('D2');

    it('carries the signed sweep out to the renderer', () => {
      // Without this the renderer falls back to `shortWay(2)`, which is `+2`,
      // and a `D` that turned anticlockwise jumps 180° before carrying on.
      expect(renderTurn(move, { at: 0, t: 0.5, turns: -2 })).toEqual({
        ...move,
        t: 0.5,
        turns: -2,
      });
    });

    it('leaves an ordinary turn undefined, which is what "the short way" is', () => {
      const turn = renderTurn(parseMove('R'), { at: 0, t: 0.25 });
      expect(turn.t).toBe(0.25);
      expect(turn.turns).toBeUndefined();
    });

    it('is null when nothing is turning, or when the move is gone', () => {
      // A move index left over from a longer algorithm reaches the renderer
      // before the effect that clears it — as `undefined`.
      expect(renderTurn(move, null)).toBeNull();
      expect(renderTurn(undefined, { at: 9, t: 0.5 })).toBeNull();
    });

    it('hands the move on whole, so the renderer still gets axis and layers', () => {
      const turn = renderTurn(move, { at: 0, t: 1, turns: -2 });
      expect(turn.axis).toBe(move.axis);
      expect(turn.layers).toEqual(move.layers);
      expect(turn.amount).toBe(move.amount);
    });

    /**
     * The round trip that would have caught it: what `promotedTurn` decided has
     * to be what the renderer is told, for every face on the pad — and the three
     * that turn anticlockwise are the ones that broke.
     */
    it.each(['R', 'U', 'F', 'L', 'D', 'B'])(
      'preserves the sweep %s2 was promoted with',
      (face) => {
        const carry = promotedTurn(face, `${face}2`, 1);
        const turn = renderTurn(parseMove(`${face}2`), { at: carry.at, t: 0.5, turns: carry.turns });
        expect(turn.turns).toBe(carry.turns);
      }
    );
  });

  it('carries on the way the first quarter went', () => {
    // **The whole reason the sweep is signed.** `D` carries `amount: 3` and
    // turns anticlockwise; `D2` carries `2` and would animate clockwise, so a
    // naive continuation would snap the layer 180° and then turn.
    expect(promotedTurn('D', 'D2', 1)).toEqual({ at: 0, turns: -2 });
    expect(promotedTurn('L', 'L2', 1)).toEqual({ at: 0, turns: -2 });
    expect(promotedTurn('B', 'B2', 1)).toEqual({ at: 0, turns: -2 });
    expect(promotedTurn('U', 'U2', 1)).toEqual({ at: 0, turns: 2 });
  });

  it('ignores moves past where the cube is standing', () => {
    // They have not been played, so whether they changed cannot matter.
    expect(promotedTurn('R U F', 'R2 U F', 1)).toEqual({ at: 0, turns: 2 });
  });

  it('has nothing to say about text it cannot read', () => {
    expect(promotedTurn('not notation', 'R2', 1)).toBeNull();
  });

  it('is null at the start of an algorithm, where there is no last move', () => {
    expect(promotedTurn('', 'R2', 0)).toBeNull();
  });
});
