import {
  PAD_EVENTS,
  initialPadVisibility,
  reducePadVisibility,
} from '../swipeMode';

describe('move pad visibility', () => {
  test('a solve screen starts with the move pad shown', () => {
    expect(initialPadVisibility).toBe(true);
  });

  test('only a committed finger turn auto-hides the pad', () => {
    const excluded = ['orbit', 'turn-cancelled', 'playback', 'seek', 'typed-algorithm'];

    excluded.forEach((event) => {
      expect(reducePadVisibility(true, event)).toBe(true);
    });
    expect(reducePadVisibility(true, PAD_EVENTS.FINGER_TURN_COMMITTED)).toBe(false);
  });

  test('manual show is the escape from the hidden state', () => {
    expect(reducePadVisibility(false, PAD_EVENTS.SHOW)).toBe(true);
  });
});

