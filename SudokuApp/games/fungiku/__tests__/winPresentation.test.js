import {
  WIN_DIALOG_DELAY_MS,
  WIN_DIALOG_ENTER_MS,
  AWARD_REVEAL_MS,
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

  test('the payout lands one beat after the dialog, not five', () => {
    // **The whole of what is left of the narration.** It used to walk the
    // reasons one at a time over ~4s; now the confetti bursts and the result
    // appears. This asserts the beat exists (so the result reads as arriving)
    // and that it is short (so nobody is waiting for it).
    expect(AWARD_REVEAL_MS).toBeGreaterThan(150);
    expect(AWARD_REVEAL_MS).toBeLessThan(800);
    expect(AWARD_START_MS).toBe(WIN_DIALOG_DELAY_MS + WIN_DIALOG_ENTER_MS + AWARD_REVEAL_MS);
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
  test('shows nothing until the payout is revealed', () => {
    expect(awardSteps(reward, false)).toEqual([]);
  });

  test('shows every reason at once — there is no partial state', () => {
    // The reasons used to arrive one at a time. This is the assertion that says
    // that is gone: revealing is all-or-nothing.
    expect(awardSteps(reward, true)).toEqual(reward.steps);
  });

  test('a board that has already been paid has no reasons to show', () => {
    // Redo across the win line, or relaunching onto a finished board.
    expect(awardSteps(null, true)).toEqual([]);
    expect(awardSteps({ total: 0 }, true)).toEqual([]);
  });
});

describe('awardTotal', () => {
  test('is the sum of the rows on screen, never a separately held number', () => {
    // The failure mode this exists to prevent: a total that disagrees with the
    // rows above it.
    expect(awardTotal(reward, false)).toBe(0);
    expect(awardTotal(reward, true)).toBe(8);
  });

  test('lands on the payout the wallet actually granted', () => {
    expect(awardTotal(reward, true)).toBe(reward.total);
  });

  test('is zero for a board with nothing to pay', () => {
    expect(awardTotal(null, true)).toBe(0);
  });
});
