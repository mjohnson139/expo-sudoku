/**
 * The move pad's visibility rule (Cube Flow Step 9).
 *
 * Visibility is view state, not authored solve data or a remembered preference:
 * every solve screen starts with the pad shown. Visibility changes only through
 * the drawer handle; writing a move never changes the surrounding layout.
 */
export const PAD_EVENTS = Object.freeze({
  SHOW: 'show',
  HIDE: 'hide',
});

export const initialPadVisibility = true;

export const reducePadVisibility = (shown, event) => {
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

/** The handle follows a finger, without wandering out of its 44-point target. */
export const drawerHandleOffset = (dy, limit = 14) =>
  Math.max(-limit, Math.min(dy, limit));
