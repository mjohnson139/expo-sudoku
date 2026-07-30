import {
  confettiPieces,
  confettiX,
  confettiY,
  CONFETTI_COUNT,
  CONFETTI_COLORS,
  CONFETTI_DURATION_MS,
  CONFETTI_FALL,
  CONFETTI_INPUT,
  CONFETTI_OPACITY,
  CONFETTI_PEAK,
} from '../confetti';

describe('confettiPieces', () => {
  test('is deterministic — the same burst twice', () => {
    // Not a style preference. A component re-renders, and rolling fresh values
    // each time would make every piece jump to a new trajectory mid-flight.
    expect(confettiPieces()).toEqual(confettiPieces());
  });

  test('makes the number of pieces asked for', () => {
    expect(confettiPieces()).toHaveLength(CONFETTI_COUNT);
    expect(confettiPieces(6)).toHaveLength(6);
  });

  test('goes in every direction — a burst, not a spray', () => {
    const pieces = confettiPieces();
    expect(pieces.some((p) => p.dx > 20)).toBe(true);
    expect(pieces.some((p) => p.dx < -20)).toBe(true);
    expect(pieces.some((p) => p.dy > 20)).toBe(true);
    expect(pieces.some((p) => p.dy < -20)).toBe(true);
  });

  test('spreads evenly rather than clumping', () => {
    // Quarter by quarter: every quadrant gets pieces. Pure randomness at this
    // count leaves gaps, which is why the angles are spread and then jittered.
    const pieces = confettiPieces();
    const quadrants = [0, 0, 0, 0];
    pieces.forEach(({ dx, dy }) => {
      quadrants[(dx >= 0 ? 0 : 1) + (dy >= 0 ? 0 : 2)] += 1;
    });
    quadrants.forEach((n) => expect(n).toBeGreaterThan(1));
  });

  test('every piece travels a visible distance', () => {
    confettiPieces().forEach(({ dx, dy }) => {
      const distance = Math.hypot(dx, dy);
      expect(distance).toBeGreaterThan(60);
      expect(distance).toBeLessThan(170);
    });
  });

  test('spins both ways, so the burst does not appear to rotate as one', () => {
    const pieces = confettiPieces();
    expect(pieces.some((p) => p.spin > 0)).toBe(true);
    expect(pieces.some((p) => p.spin < 0)).toBe(true);
    pieces.forEach((p) => expect(Math.abs(p.spin)).toBeGreaterThan(200));
  });

  test('pieces are small, and coloured from the confetti palette', () => {
    confettiPieces().forEach(({ size, color }) => {
      expect(size).toBeGreaterThanOrEqual(5);
      expect(size).toBeLessThanOrEqual(9);
      expect(CONFETTI_COLORS).toContain(color);
    });
  });
});

describe('the trajectory', () => {
  test('the input range is strictly increasing, as interpolate requires', () => {
    for (let i = 1; i < CONFETTI_INPUT.length; i += 1) {
      expect(CONFETTI_INPUT[i]).toBeGreaterThan(CONFETTI_INPUT[i - 1]);
    }
    expect(CONFETTI_INPUT[0]).toBe(0);
    expect(CONFETTI_INPUT[CONFETTI_INPUT.length - 1]).toBe(1);
  });

  test('every output range lines up with the input range', () => {
    expect(confettiX(50)).toHaveLength(CONFETTI_INPUT.length);
    expect(confettiY(50)).toHaveLength(CONFETTI_INPUT.length);
    expect(CONFETTI_OPACITY).toHaveLength(CONFETTI_INPUT.length);
  });

  test('a piece starts at the origin and ends up below where it peaked', () => {
    const y = confettiY(-80);
    expect(y[0]).toBe(0);
    // It rose to -80 and then gravity took it well past that.
    expect(y[2]).toBe(-80);
    expect(y[3]).toBe(-80 + CONFETTI_FALL);
    expect(y[3]).toBeGreaterThan(y[2]);
  });

  test('sideways travel never reverses', () => {
    const right = confettiX(90);
    for (let i = 1; i < right.length; i += 1) expect(right[i]).toBeGreaterThan(right[i - 1]);

    const left = confettiX(-90);
    for (let i = 1; i < left.length; i += 1) expect(left[i]).toBeLessThan(left[i - 1]);
  });

  test('nothing is left on screen when it is over', () => {
    // The dialog stays up long after the burst; a piece stranded at opacity > 0
    // would sit on it permanently.
    expect(CONFETTI_OPACITY[0]).toBe(0);
    expect(CONFETTI_OPACITY[CONFETTI_OPACITY.length - 1]).toBe(0);
  });

  test('peaks partway through, leaving room to fall', () => {
    expect(CONFETTI_PEAK).toBeGreaterThan(0.2);
    expect(CONFETTI_PEAK).toBeLessThan(0.6);
  });

  test('is over quickly — it greets the dialog rather than delaying it', () => {
    expect(CONFETTI_DURATION_MS).toBeGreaterThan(800);
    expect(CONFETTI_DURATION_MS).toBeLessThan(2500);
  });
});
