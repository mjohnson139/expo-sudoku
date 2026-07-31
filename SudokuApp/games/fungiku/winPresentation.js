/**
 * winPresentation.js — the timing of the win dialog (docs/fungiku-plan.md
 * §12.8, §12.11).
 *
 * Pure, and separate from the dialog that draws it, for the same reason
 * `celebration.js` is: Jest here is plain node with no React Native, so the only
 * way this arithmetic gets tested is if it lives outside the component.
 *
 * ### Why the delays are derived rather than typed
 *
 * The win is a **sequence**: the board lifts, the mushrooms ripple, the dialog
 * arrives with a burst of confetti, and the payout lands. If each delay were its
 * own number they would drift the first time anyone retuned the wave — and the
 * failure is silent, because a dialog that opens early just covers a celebration
 * nobody notices is missing. Each is computed from the one before it, so the
 * chain moves in step: when the operator lengthened the wave (2026-07-30) every
 * number below followed it without an edit.
 */

import { WAVE_DELAY_MS, WAVE_DURATION_MS } from './celebration';

/**
 * How long after the win the dialog opens.
 *
 * Deliberately a little *before* the ripple finishes: the last diagonal is still
 * landing as the dialog arrives, so the two overlap instead of leaving a beat of
 * dead air where the player wonders whether anything else is coming.
 */
export const WIN_DIALOG_DELAY_MS = Math.round(WAVE_DELAY_MS + WAVE_DURATION_MS * 0.78);

/**
 * How long the dialog takes to arrive.
 *
 * **Shortened and un-sprung** on the operator's report that it was *"pretty
 * clunky when it animates in"* (§12.11). It was a 360 ms `Easing.back` overshoot
 * plus a slide — and a dialog that bounces is a dialog that arrives twice. It is
 * now a plain fade and a slight scale.
 */
export const WIN_DIALOG_ENTER_MS = 240;

/**
 * When the coin balance jumps to its new value and the coin pill pops:
 * **exactly as the dialog lands**, with no beat of its own.
 *
 * There used to be a pause here (`AWARD_REVEAL_MS`, 420 ms) so the payout rows
 * faded in a moment after the box — the last surviving trace of the narration
 * this dialog began as. The operator's verdict on it: *"don't delay the rewards
 * view… it's kind of weird, the confetti goes and the thing shows up, but then
 * the rewards are delayed and show up later. Just show it altogether."*
 *
 * So there is **one moment** now, not two. The dialog, its rewards and the
 * confetti all arrive together, and this is that same instant — so the balance
 * behind the dialog moves on the same frame as the rows inside it.
 */
export const AWARD_START_MS = WIN_DIALOG_DELAY_MS;

/**
 * The reasons the dialog draws.
 *
 * It stays a function rather than becoming `reward.steps` at the call site
 * because the guards are real — a board that has **already been paid** (a redo
 * across the win line, or relaunching onto a finished board) has no reward at
 * all, and the dialog has to show a payout of nothing rather than crash or claim
 * one.
 *
 * **There is no `revealed` argument any more**: nothing is ever half-shown.
 */
export function awardSteps(reward) {
  if (!reward || !Array.isArray(reward.steps)) return [];
  return reward.steps;
}

/** What those reasons add up to — summed from the rows, never held separately. */
export function awardTotal(reward) {
  return awardSteps(reward).reduce((sum, step) => sum + step.coins, 0);
}
