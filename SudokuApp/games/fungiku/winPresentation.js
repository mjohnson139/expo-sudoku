/**
 * winPresentation.js — when the win dialog arrives, and how much of the payout
 * it is showing (docs/fungiku-plan.md §12.8).
 *
 * Pure, and separate from the dialog that draws it, for the same reason
 * `celebration.js` is: Jest here is plain node with no React Native, so the only
 * way this arithmetic gets tested is if it lives outside the component.
 *
 * ### Why the delay is derived rather than typed
 *
 * The win is a **sequence**: the board lifts, the mushrooms ripple, and only then
 * does the dialog arrive. If the dialog's delay were its own number it would drift
 * the first time anyone retuned the wave — and the failure is silent, because a
 * dialog that opens 200 ms early just covers a celebration nobody notices is
 * missing. It is computed from the wave's own timing instead, so the two cannot
 * come apart.
 */

import { WAVE_DELAY_MS, WAVE_DURATION_MS } from './celebration';

/**
 * How long after the win the dialog opens.
 *
 * Deliberately a little *before* the ripple finishes: the last diagonal is still
 * landing as the dialog springs in, so the two overlap instead of leaving a beat
 * of dead air where the player wonders whether anything else is coming.
 */
export const WIN_DIALOG_DELAY_MS = Math.round(WAVE_DELAY_MS + WAVE_DURATION_MS * 0.78);

/** How long the dialog takes to spring in once it starts. */
export const WIN_DIALOG_ENTER_MS = 360;

/**
 * When the coin count-up may start: once the dialog is actually on screen.
 *
 * `useCoinAward` imports this rather than keeping its own start delay. The
 * payout is narrated *inside* the dialog now, so counting before the dialog
 * exists would spend the reasons on an empty screen.
 */
export const AWARD_START_MS = WIN_DIALOG_DELAY_MS + WIN_DIALOG_ENTER_MS;

/**
 * The payout reasons that have landed so far — the rows the dialog draws.
 *
 * `stepIndex` is `useCoinAward`'s: -1 before the first reason, then the index of
 * the reason showing, then `steps.length` once they are all in and the total is
 * up. Clamped rather than trusted, because it runs past the end by design.
 */
export function visibleAwardSteps(reward, stepIndex) {
  if (!reward || !reward.steps || stepIndex < 0) return [];
  return reward.steps.slice(0, Math.min(stepIndex + 1, reward.steps.length));
}

/**
 * What the reasons on screen add up to.
 *
 * **Not the wallet balance, and not `reward.total` until the last row is in.**
 * It is the sum of what the player has actually been shown, so the number in the
 * dialog and the rows above it can never disagree — the failure mode of holding a
 * separate display total.
 */
export function shownAwardTotal(reward, stepIndex) {
  return visibleAwardSteps(reward, stepIndex).reduce((sum, step) => sum + step.coins, 0);
}

/** Whether every reason has landed, so the dialog can show the total as final. */
export function isAwardComplete(reward, stepIndex) {
  if (!reward || !reward.steps) return true;
  return stepIndex >= reward.steps.length;
}
