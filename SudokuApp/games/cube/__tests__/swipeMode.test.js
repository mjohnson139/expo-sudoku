import {
  PAD_EVENTS,
  initialPadVisibility,
  drawerEvent,
  drawerHeightForDrag,
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

  test('the scrubber handle opens up and closes down', () => {
    expect(drawerEvent(-24)).toBe(PAD_EVENTS.SHOW);
    expect(drawerEvent(24)).toBe(PAD_EVENTS.HIDE);
    expect(drawerEvent(8)).toBeNull();
  });

  test('the drawer edge follows the finger between its two detents', () => {
    expect(drawerHeightForDrag(true, 40, 152)).toBe(112);
    expect(drawerHeightForDrag(true, -40, 152)).toBe(152);
    expect(drawerHeightForDrag(false, -40, 152)).toBe(40);
    expect(drawerHeightForDrag(false, 40, 152)).toBe(0);
    expect(drawerHeightForDrag(true, 300, 152)).toBe(0);
    expect(drawerHeightForDrag(false, -300, 152)).toBe(152);
  });

});
