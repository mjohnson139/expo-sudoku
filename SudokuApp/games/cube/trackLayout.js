/**
 * The move track's geometry (docs/cube-plan.md §8.6, Step 7).
 *
 * Pure, and in its own module for the reason everything else in this feature is:
 * the test runner is a plain node environment with no React Native in it, so
 * anything worth pinning has to live somewhere it can be imported. What is worth
 * pinning here is small and was got wrong twice — where the track scrolls to
 * when the cube moves, and how far the drawer opens.
 */

/** One line of moves. */
export const LINE = 20;

/** How many of them are on screen with the drawer shut. */
export const LINES = 2;

/** The breathing room inside the panel, top and bottom. */
export const PAD = 5;

/** The grab bar under the moves. Small, and the whole drawer hangs off it. */
export const HANDLE = 16;

/**
 * What the track costs the page — **a constant, and that is a requirement**.
 *
 * The stage measures itself (`onLayout`), so a track whose height depended on
 * how many moves there were would resize the cube in the middle of a solve.
 * That is the bug this step exists to kill, and a growing track is the door it
 * would come back in through. The drawer opens *over* the cube instead, which
 * is why opening it does not change this number.
 */
export const TRACK_HEIGHT = LINES * LINE + PAD * 2 + HANDLE;

/**
 * Where to scroll so the move just played sits on the bottom of the two visible
 * lines, with the line it came from above it.
 *
 * `y` is the token's offset from the content container's padding edge. The
 * arithmetic is only exact because **every child of the track is exactly `LINE`
 * tall** — let the phase dividers size themselves to their own glyph and the
 * rows drift a point or two apart, and this drifts with them, leaving a sliver
 * of the previous row along the top edge on every scroll.
 *
 * @param {number} y the token's offset in the scrolled content
 * @returns {number} the scroll offset, never negative
 */
export const followScrollTop = (y) => Math.max(0, y - LINE);

/**
 * How tall the drawer stands.
 *
 * `content` is **measured, not estimated**: how many tokens fit on a line
 * depends on the width of the phone and on how many of them are `M2` rather
 * than `U`, and a guess opens the drawer onto a band of empty space.
 *
 * `room` is what the stage can lend — the drawer covers the cube and stops
 * there, so it never reaches the transport. Both bounds matter: a four-move
 * solve opens to one line rather than to a screenful of nothing, and a
 * hundred-move one stops at the cube and scrolls inside itself.
 *
 * @param {{open: boolean, content: number, room: number}} state
 * @returns {number} the panel's height in points
 */
export const drawerHeight = ({ open, content, room }) => {
  if (!open) return TRACK_HEIGHT;
  const wanted = content + HANDLE;
  return Math.max(TRACK_HEIGHT, Math.min(wanted, TRACK_HEIGHT + Math.max(0, room)));
};

export default { LINE, LINES, PAD, HANDLE, TRACK_HEIGHT, followScrollTop, drawerHeight };
