/**
 * Playing a scramble back.
 *
 * The scrubber's React half is a clock and five buttons; everything that could
 * be *wrong* about it — which cube belongs at which position, how long a turn
 * runs, where a nonsense position lands — is here, where the node test runner
 * can reach it without a renderer.
 */

import {
  HALF_TURN_SCALE,
  MOVE_GAP_MS,
  TURN_MS,
  announcePosition,
  buildPlayback,
  clampIndex,
  describePosition,
  ease,
  turnDuration,
} from '../player';
import { faceletString, isSolved, cubeFromAlg } from '../cubeState';
import { parseMove } from '../moves';

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
});
