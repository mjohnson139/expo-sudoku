import { Easing, Platform } from 'react-native';

/**
 * The house motion vocabulary — durations, easings, springs and a stagger
 * interval — ported from the sibling color-loop app (its `docs/identity.md`,
 * and docs/colorloop-merge-plan.md §3).
 *
 * Three rules everything built on it follows:
 *  1. Movement is physical: springs and settles, never bare linear fades.
 *  2. Entrances stagger like objects set down on a desk, top to bottom.
 *  3. Celebration is earned light: the board shines first, chrome arrives after.
 *
 * **Nothing already in this app is retrofitted onto it.** Fungiku's celebration
 * timings stay constants inside `games/fungiku/celebration.js` and the cube has
 * no entrance motion at all; whether those should be rewritten on top of this is
 * a *finding* for the epic's Step 5, not a change this file is licensed to make
 * (plan §3). It lands now because two games arriving already use it.
 */

/**
 * react-native-web only has the JS driver, and mixing `setValue()` with
 * `useNativeDriver: true` is a known trap on this stack
 * (docs/fungiku-plan.md §2). This is that rule spelled once — do not
 * "simplify" it to `true`.
 */
export const USE_NATIVE = Platform.OS !== 'web';

export const DUR = {
  tap: 120, // pressed-state feedback
  snap: 180, // small state changes (toggles, chips)
  enter: 380, // element entrances
  hero: 600, // one-per-screen hero moments (win card, cover lift)
};

export const EASE = {
  /** Fast start, long settle — the house easing for entrances. */
  settle: Easing.bezier(0.22, 1, 0.36, 1),
  /** For elements leaving the screen. */
  exit: Easing.bezier(0.4, 0, 1, 1),
  standard: Easing.bezier(0.4, 0, 0.2, 1),
};

export const SPRING = {
  /** Win card and overlays: soft, one small overshoot. */
  card: { friction: 7, tension: 65 },
  /** Press feedback: tight and immediate. */
  press: { friction: 6, tension: 300 },
  /** Badge pops (NEW RECORD): springy, visibly playful. */
  pop: { friction: 4, tension: 180 },
};

/** Stagger interval between siblings entering together. */
export const STAGGER = 90;
