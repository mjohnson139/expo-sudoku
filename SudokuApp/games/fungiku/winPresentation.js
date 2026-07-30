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
 * The pause between the dialog landing and the payout appearing.
 *
 * **This is the whole of what is left of the narration.** The payout used to be
 * walked one reason at a time — five beats, about four seconds — and the
 * operator's verdict was that it did not have to animate each thing: *"I can just
 * kind of show some confetti and then show the results."* So there is exactly one
 * beat now: the confetti bursts, and a moment later the whole result appears at
 * once.
 *
 * Long enough that the result reads as *arriving* rather than as having always
 * been there; short enough that nobody is waiting for it.
 */
export const AWARD_REVEAL_MS = 420;

/**
 * When the payout lands: the coin balance jumps to its new value, the coin pill
 * pops once, and every reason appears together.
 *
 * `useCoinAward` imports this rather than keeping a delay of its own, so the
 * balance behind the dialog and the rows inside it change on the same frame.
 */
export const AWARD_START_MS = WIN_DIALOG_DELAY_MS + WIN_DIALOG_ENTER_MS + AWARD_REVEAL_MS;

/**
 * The reasons the dialog draws: all of them, or none.
 *
 * There is no partial state any more. It stays a function rather than becoming
 * `reward.steps` at the call site because the guards are real — a board that has
 * **already been paid** (a redo across the win line, or relaunching onto a
 * finished board) has no reward at all, and the dialog has to show a payout of
 * nothing rather than crash or claim one.
 */
export function awardSteps(reward, revealed) {
  if (!revealed || !reward || !Array.isArray(reward.steps)) return [];
  return reward.steps;
}

/** What those reasons add up to — summed from the rows, never held separately. */
export function awardTotal(reward, revealed) {
  return awardSteps(reward, revealed).reduce((sum, step) => sum + step.coins, 0);
}
