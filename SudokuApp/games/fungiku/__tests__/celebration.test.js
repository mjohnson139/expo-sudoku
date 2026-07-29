import {
  wavePhase,
  waveKeyframes,
  waveOutputRange,
  WAVE_DURATION_MS,
  WAVE_DELAY_MS,
} from '../celebration';
import { SIZES } from '../engine';

describe('wavePhase', () => {
  test('runs 0 → 1 from the top-left corner to the bottom-right', () => {
    SIZES.forEach((size) => {
      expect(wavePhase(0, size)).toBe(0);
      expect(wavePhase(size * size - 1, size)).toBe(1);
    });
  });

  test('is the anti-diagonal, so cells with the same row+col ripple together', () => {
    // On a 5×5 board, (0,2), (1,1) and (2,0) are one diagonal.
    expect(wavePhase(2, 5)).toBe(wavePhase(6, 5));
    expect(wavePhase(6, 5)).toBe(wavePhase(10, 5));
  });

  test('never leaves 0..1, for every cell of every playable size', () => {
    SIZES.forEach((size) => {
      for (let index = 0; index < size * size; index += 1) {
        const phase = wavePhase(index, size);
        expect(phase).toBeGreaterThanOrEqual(0);
        expect(phase).toBeLessThanOrEqual(1);
      }
    });
  });

  test('does not divide by zero on a degenerate one-cell board', () => {
    expect(wavePhase(0, 1)).toBe(0);
    expect(Number.isFinite(wavePhase(0, 1))).toBe(true);
  });
});

describe('waveKeyframes', () => {
  // Animated.interpolate requires a monotonically increasing input range, and a
  // stop that collided with either end of the progress would drop a cell's
  // resting keyframe — leaving it stranded mid-hop when the wave finished.
  test('is strictly increasing, and both ends are the resting pose', () => {
    SIZES.forEach((size) => {
      for (let index = 0; index < size * size; index += 1) {
        const stops = waveKeyframes(index, size);
        expect(stops[0]).toBe(0);
        expect(stops[stops.length - 1]).toBe(1);
        for (let i = 1; i < stops.length; i += 1) {
          expect(stops[i]).toBeGreaterThan(stops[i - 1]);
        }
      }
    });
  });

  test('every cell gets a hop with a peak strictly inside its window', () => {
    SIZES.forEach((size) => {
      for (let index = 0; index < size * size; index += 1) {
        const stops = waveKeyframes(index, size);
        const start = stops[1];
        const peak = stops[3];
        const end = stops[stops.length - 2];
        expect(peak).toBeGreaterThan(start);
        expect(peak).toBeLessThan(end);
      }
    });
  });

  test('later cells peak later — the ripple has a direction', () => {
    const size = 7;
    let previous = -Infinity;
    // One cell per diagonal, walking the top row then the last column.
    for (let col = 0; col < size; col += 1) {
      const peak = waveKeyframes(col, size)[3];
      expect(peak).toBeGreaterThan(previous);
      previous = peak;
    }
    for (let row = 1; row < size; row += 1) {
      const peak = waveKeyframes(row * size + (size - 1), size)[3];
      expect(peak).toBeGreaterThan(previous);
      previous = peak;
    }
  });

  test('windows overlap, so the board ripples rather than taking turns', () => {
    const size = 10;
    const first = waveKeyframes(0, size);
    const second = waveKeyframes(1, size);
    // The next diagonal starts before this one has finished.
    expect(second[1]).toBeLessThan(first[first.length - 2]);
  });

  test('the input and output ranges are the same length', () => {
    // Animated.interpolate requires it, and the two are built by separate
    // functions that have to stay in step.
    SIZES.forEach((size) => {
      expect(waveOutputRange(0, -10)).toHaveLength(waveKeyframes(0, size).length);
    });
  });
});

describe('waveOutputRange', () => {
  test('rests at both ends and reaches the peak exactly once', () => {
    const lift = waveOutputRange(0, -12);
    expect(lift[0]).toBe(0);
    expect(lift[lift.length - 1]).toBe(0);
    expect(Math.min(...lift)).toBe(-12);
    expect(lift.filter((value) => value === -12)).toHaveLength(1);
  });

  test('rests at the identity for a property that is not zero at rest', () => {
    const scale = waveOutputRange(1, 1.18);
    expect(scale[0]).toBe(1);
    expect(scale[scale.length - 1]).toBe(1);
    expect(Math.max(...scale)).toBeCloseTo(1.18);
  });

  test('rises and falls without a plateau — it is an arc, not a step', () => {
    const lift = waveOutputRange(0, -1);
    const peakAt = lift.indexOf(-1);
    for (let i = 2; i <= peakAt; i += 1) expect(lift[i]).toBeLessThan(lift[i - 1]);
    for (let i = peakAt + 1; i < lift.length - 1; i += 1) {
      expect(lift[i]).toBeGreaterThan(lift[i - 1]);
    }
  });
});

describe('the wave fits the win sequence', () => {
  // The board's lift is 300ms and the banner springs in at 220ms; the wave has
  // to start between them and be over before the celebration outstays itself.
  test('starts after the board lift begins and is not a loop', () => {
    expect(WAVE_DELAY_MS).toBeGreaterThan(0);
    expect(WAVE_DELAY_MS).toBeLessThan(300);
    expect(WAVE_DURATION_MS).toBeGreaterThan(0);
    expect(WAVE_DELAY_MS + WAVE_DURATION_MS).toBeLessThan(2000);
  });
});
