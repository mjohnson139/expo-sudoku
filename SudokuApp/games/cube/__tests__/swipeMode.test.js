import {
  PAD_EVENTS,
  initialPadVisibility,
  drawerEvent,
  drawerHandleOffset,
  reducePadVisibility,
} from '../swipeMode';

describe('move pad visibility', () => {
  test('a solve screen starts with the move pad shown', () => {
    expect(initialPadVisibility).toBe(true);
  });

  test('writing and transport events never change pad visibility', () => {
    const events = [
      'finger-turn-committed',
      'pad-move',
      'orbit',
      'turn-cancelled',
      'playback',
      'seek',
      'typed-algorithm',
    ];

    events.forEach((event) => {
      expect(reducePadVisibility(true, event)).toBe(true);
      expect(reducePadVisibility(false, event)).toBe(false);
    });
  });

  test('manual show is the escape from the hidden state', () => {
    expect(reducePadVisibility(false, PAD_EVENTS.SHOW)).toBe(true);
  });

  test('the scrubber handle opens up and closes down', () => {
    expect(drawerEvent(-24)).toBe(PAD_EVENTS.SHOW);
    expect(drawerEvent(24)).toBe(PAD_EVENTS.HIDE);
    expect(drawerEvent(8)).toBeNull();
  });

  test('the drawer handle follows the finger inside its target', () => {
    expect(drawerHandleOffset(-8)).toBe(-8);
    expect(drawerHandleOffset(9)).toBe(9);
    expect(drawerHandleOffset(-40)).toBe(-14);
    expect(drawerHandleOffset(40)).toBe(14);
  });

});
