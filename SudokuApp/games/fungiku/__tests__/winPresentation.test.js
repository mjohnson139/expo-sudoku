import {
  WIN_DIALOG_DELAY_MS,
  WIN_DIALOG_ENTER_MS,
  AWARD_START_MS,
  visibleAwardSteps,
  shownAwardTotal,
  isAwardComplete,
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

  test('the count-up starts only once the dialog is on screen', () => {
    // The payout is narrated inside the dialog, so counting before it exists
    // would spend the reasons on an empty screen.
    expect(AWARD_START_MS).toBe(WIN_DIALOG_DELAY_MS + WIN_DIALOG_ENTER_MS);
    expect(AWARD_START_MS).toBeGreaterThan(WIN_DIALOG_DELAY_MS);
  });

  // Bounded rather than pinned: the operator lengthened the wave (2026-07-30)
  // and this number followed it, which is the point of deriving it. What it must
  // not become is a cutscene the player sits through before they can act — the
  // dialog and its "Next puzzle" button are already on screen by then, so this
  // is only about when the coins start moving.
  test('the coins start once the wave is essentially done, and not much later', () => {
    expect(AWARD_START_MS).toBeGreaterThan(WAVE_DELAY_MS + WAVE_DURATION_MS * 0.7);
    expect(AWARD_START_MS).toBeLessThan(WAVE_DELAY_MS + WAVE_DURATION_MS + 600);
  });
});

describe('visibleAwardSteps', () => {
  test('shows nothing before the first reason lands', () => {
    expect(visibleAwardSteps(reward, -1)).toEqual([]);
  });

  test('builds up one reason at a time, in order', () => {
    expect(visibleAwardSteps(reward, 0)).toEqual([reward.steps[0]]);
    expect(visibleAwardSteps(reward, 1)).toEqual([reward.steps[0], reward.steps[1]]);
    expect(visibleAwardSteps(reward, 2)).toEqual(reward.steps);
  });

  test('clamps past the end — stepIndex runs beyond the list by design', () => {
    // useCoinAward sets stepIndex to steps.length to mean "all in, showing the
    // total", so the index is *expected* to exceed the array.
    expect(visibleAwardSteps(reward, 3)).toEqual(reward.steps);
    expect(visibleAwardSteps(reward, 99)).toEqual(reward.steps);
  });

  test('a board that has already been paid has no reasons to show', () => {
    // Redo across the win line, or relaunching onto a finished board.
    expect(visibleAwardSteps(null, 2)).toEqual([]);
    expect(visibleAwardSteps({ total: 0 }, 2)).toEqual([]);
  });
});

describe('shownAwardTotal', () => {
  test('is the sum of what is actually on screen, never the eventual total', () => {
    // The failure mode this exists to prevent: a total that disagrees with the
    // rows above it.
    expect(shownAwardTotal(reward, -1)).toBe(0);
    expect(shownAwardTotal(reward, 0)).toBe(3);
    expect(shownAwardTotal(reward, 1)).toBe(6);
    expect(shownAwardTotal(reward, 2)).toBe(8);
  });

  test('lands on the payout the wallet actually granted', () => {
    expect(shownAwardTotal(reward, reward.steps.length)).toBe(reward.total);
  });

  test('is zero for a board with nothing to pay', () => {
    expect(shownAwardTotal(null, 5)).toBe(0);
  });
});

describe('isAwardComplete', () => {
  test('is false while reasons are still landing', () => {
    expect(isAwardComplete(reward, -1)).toBe(false);
    expect(isAwardComplete(reward, 0)).toBe(false);
    expect(isAwardComplete(reward, 1)).toBe(false);
  });

  test('is true once every reason is in', () => {
    expect(isAwardComplete(reward, 2)).toBe(false);
    expect(isAwardComplete(reward, 3)).toBe(true);
  });

  test('a board with no payout is complete immediately', () => {
    // Otherwise the dialog would sit waiting for a count-up that never comes.
    expect(isAwardComplete(null, -1)).toBe(true);
  });
});
