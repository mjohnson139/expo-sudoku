/**
 * The move pad's visibility rule (Cube Flow Step 9).
 *
 * Visibility is view state, not authored solve data or a remembered preference:
 * every solve screen starts with the pad shown. Only a turn that the cube's
 * gesture recogniser has actually committed may hide it. Keeping this rule pure
 * makes the exclusions explicit instead of relying on which component happened
 * to emit an event.
 */
export const PAD_EVENTS = Object.freeze({
  FINGER_TURN_COMMITTED: 'finger-turn-committed',
  SHOW: 'show',
  HIDE: 'hide',
});

export const initialPadVisibility = true;

export const reducePadVisibility = (shown, event) => {
  if (event === PAD_EVENTS.FINGER_TURN_COMMITTED) return false;
  if (event === PAD_EVENTS.SHOW) return true;
  if (event === PAD_EVENTS.HIDE) return false;
  return shown;
};

/** Turn a vertical handle drag into an action, ignoring incidental movement. */
export const drawerEvent = (dy, threshold = 18) => {
  if (dy <= -threshold) return PAD_EVENTS.SHOW;
  if (dy >= threshold) return PAD_EVENTS.HIDE;
  return null;
};

/**
 * Height of the pad while the drawer edge is under a finger.
 *
 * A shown pad follows a downward pull; a hidden pad follows an upward pull.
 * Pulling the other way does not stretch it beyond either detent.
 */
export const drawerHeightForDrag = (shown, dy, height) =>
  Math.max(0, Math.min(height, shown ? height - dy : -dy));
