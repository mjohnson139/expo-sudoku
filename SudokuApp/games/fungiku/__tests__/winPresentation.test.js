import {
  WIN_DIALOG_DELAY_MS,
  WIN_DIALOG_ENTER_MS,
  AWARD_START_MS,
  awardSteps,
  awardTotal,
} from '../winPresentation';
import { WAVE_DELAY_MS, WAVE_DURATION_MS } from '../celebration';

const reward = {
  total: 8,
  steps: [
    { label: 'Easy board', coins: 3 },
    { label: 'All lives kept', coins: 3 },
    { label: 'No hints used', coins: 2 },
  ],
};

describe('when the dialog arrives', () => {
  test('waits for the win wave, but overlaps its tail', () => {
    // Before the ripple ends, so the two run into each other rather than
    // leaving a beat of dead air — but well after it starts.
    expect(WIN_DIALOG_DELAY_MS).toBeGreaterThan(WAVE_DELAY_MS);
    expect(WIN_DIALOG_DELAY_MS).toBeLessThan(WAVE_DELAY_MS + WAVE_DURATION_MS);
    expect(WIN_DIALOG_DELAY_MS).toBeGreaterThan(WAVE_DELAY_MS + WAVE_DURATION_MS * 0.5);
  });

  test('arrives without dawdling — it is a fade, not a performance', () => {
    // Shortened on the operator's "pretty clunky when it animates in".
    expect(WIN_DIALOG_ENTER_MS).toBeLessThanOrEqual(280);
  });

  test('the payout lands *with* the dialog — one moment, not two', () => {
    // **The last trace of the narration, removed.** The reasons were walked one
    // at a time (~4s), then collapsed to one beat 420ms after the box, and the
    // operator's verdict on that beat was that it read as the rewards being
    // delayed. There is no offset left: the dialog, its rewards and the confetti
    // are one arrival, and the coin balance behind moves on the same frame.
    expect(AWARD_START_MS).toBe(WIN_DIALOG_DELAY_MS);
  });

  // Bounded rather than pinned: the operator lengthened the wave and this
  // followed it, which is the point of deriving it. What it must not become is a
  // cutscene the player sits through before they can act — the dialog and its
  // "Next puzzle" button are on screen well before this.
  test('the coins land once the wave is essentially done, and not much later', () => {
    expect(AWARD_START_MS).toBeGreaterThan(WAVE_DELAY_MS + WAVE_DURATION_MS * 0.7);
    expect(AWARD_START_MS).toBeLessThan(WAVE_DELAY_MS + WAVE_DURATION_MS + 900);
  });
});

describe('awardSteps', () => {
  test('shows every reason, always — there is no partial state left', () => {
    // The reasons used to arrive one at a time, then all-at-once-but-later.
    // Neither survives: the dialog is never half-drawn, so there is not even a
    // `revealed` argument to pass.
    expect(awardSteps(reward)).toEqual(reward.steps);
  });

  test('a board that has already been paid has no reasons to show', () => {
    // Redo across the win line, or relaunching onto a finished board.
    expect(awardSteps(null)).toEqual([]);
    expect(awardSteps({ total: 0 })).toEqual([]);
  });
});

describe('awardTotal', () => {
  test('is the sum of the rows on screen, never a separately held number', () => {
    // The failure mode this exists to prevent: a total that disagrees with the
    // rows above it.
    expect(awardTotal(reward)).toBe(8);
  });

  test('lands on the payout the wallet actually granted', () => {
    expect(awardTotal(reward)).toBe(reward.total);
  });

  test('is zero for a board with nothing to pay', () => {
    expect(awardTotal(null)).toBe(0);
  });
});
