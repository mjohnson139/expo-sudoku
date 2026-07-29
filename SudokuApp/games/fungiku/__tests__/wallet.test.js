import {
  COIN_COSTS,
  DAILY_FLOOR_COINS,
  MAX_COINS,
  STARTING_COINS,
  applyDailyFloor,
  balance,
  canAfford,
  createWallet,
  grant,
  normalizeWallet,
  payOutWin,
  puzzleKey,
  rewardForWin,
  spend,
  today,
} from '../wallet';
import { MAX_LIVES } from '../reducer';
import { DIFFICULTY_IDS, difficultyLabel } from '../difficulty';

/** A wallet holding exactly this many coins, and nothing else interesting. */
const walletWith = (coins) => ({ ...createWallet(), coins });

describe('the price list', () => {
  // The operator set these on 2026-07-29: "hints should cost 20 coins if we are
  // revealing a mushroom and 5 if it's a simple thing" (plan §12.9). Pinned as
  // numbers rather than only as relationships, because they are a *decision*
  // and a future tuning pass should have to change this line on purpose.
  it('is the operator’s: rule-out 1, hint 5, reveal 20', () => {
    expect(COIN_COSTS.RULE_OUT).toBe(1);
    expect(COIN_COSTS.HINT).toBe(5);
    expect(COIN_COSTS.REVEAL).toBe(20);
  });

  it('is still a ladder — each rung costs more than the last (§11.2)', () => {
    expect(COIN_COSTS.RULE_OUT).toBeLessThan(COIN_COSTS.HINT);
    expect(COIN_COSTS.HINT).toBeLessThan(COIN_COSTS.REVEAL);
  });
});

describe('createWallet', () => {
  it('starts with something to spend, so metering is a feature and not a wall', () => {
    const wallet = createWallet();

    expect(balance(wallet)).toBe(STARTING_COINS);
    expect(canAfford(wallet, COIN_COSTS.RULE_OUT)).toBe(true);
    expect(canAfford(wallet, COIN_COSTS.HINT)).toBe(true);
  });

  it('cannot afford a reveal on day one — the dearest rung is saved for', () => {
    // This flipped with the operator's repricing (reveal 4 → 20, plan §12.9).
    // It is the *point* of the new price rather than a regression: a reveal
    // solves a cell outright, and one that a brand-new wallet can buy twice is
    // not a rung, it is the default. Pinned so that a future rate change makes
    // this choice consciously.
    expect(canAfford(createWallet(), COIN_COSTS.REVEAL)).toBe(false);
  });

  it('has paid for nothing yet', () => {
    expect(createWallet().paidPuzzle).toBeNull();
  });
});

describe('normalizeWallet', () => {
  it('hands back a fresh wallet for anything unreadable', () => {
    [null, undefined, 'nonsense', 42].forEach((raw) => {
      expect(balance(normalizeWallet(raw))).toBe(STARTING_COINS);
    });
  });

  it('replaces a non-numeric balance rather than letting NaN reach the screen', () => {
    expect(balance(normalizeWallet({ coins: 'lots' }))).toBe(STARTING_COINS);
    expect(balance(normalizeWallet({ coins: 7 }))).toBe(7);
  });

  it('clamps a hand-edited balance into range', () => {
    expect(balance(normalizeWallet({ coins: -5 }))).toBe(0);
    expect(balance(normalizeWallet({ coins: 10 ** 6 }))).toBe(MAX_COINS);
  });

  /**
   * The two-currency wallet that briefly shipped on this branch. Its tokens are
   * worth what they could have bought, so they convert at the price list rather
   * than being summed as if a hint token and a rule-out token were the same thing.
   */
  it('converts an old two-balance wallet at the price list', () => {
    const wallet = normalizeWallet({ balances: { hint: 3, ruleOut: 2 } });

    expect(balance(wallet)).toBe(3 * COIN_COSTS.HINT + 2 * COIN_COSTS.RULE_OUT);
  });

  it('survives an old wallet with a missing or junk balance', () => {
    expect(balance(normalizeWallet({ balances: {} }))).toBe(0);
    expect(balance(normalizeWallet({ balances: { hint: 'x', ruleOut: 2 } }))).toBe(
      2 * COIN_COSTS.RULE_OUT
    );
  });

  it('keeps the paid-puzzle record, which is what stops a win paying twice', () => {
    expect(normalizeWallet({ coins: 1, paidPuzzle: '6:3' }).paidPuzzle).toBe('6:3');
    expect(normalizeWallet({ coins: 1, paidPuzzle: 17 }).paidPuzzle).toBeNull();
  });
});

describe('the price list', () => {
  /**
   * §11.2: each rung of the hint ladder should cost more than the last. Rule-out
   * is the cheap one because it reveals nothing a player could not derive
   * mechanically; a reveal solves a cell outright.
   */
  it('climbs with the strength of the help', () => {
    expect(COIN_COSTS.RULE_OUT).toBeLessThan(COIN_COSTS.HINT);
    expect(COIN_COSTS.HINT).toBeLessThan(COIN_COSTS.REVEAL);
  });

  it('means a balance that buys a hint does not necessarily buy the answer', () => {
    const wallet = walletWith(COIN_COSTS.HINT);

    expect(canAfford(wallet, COIN_COSTS.HINT)).toBe(true);
    expect(canAfford(wallet, COIN_COSTS.REVEAL)).toBe(false);
  });
});

describe('spend and grant', () => {
  it('takes the cost off, and never below zero', () => {
    expect(balance(spend(walletWith(5), COIN_COSTS.HINT))).toBe(5 - COIN_COSTS.HINT);
  });

  it('refuses a spend it cannot cover, and leaves the wallet untouched', () => {
    const broke = walletWith(1);

    expect(canAfford(broke, COIN_COSTS.REVEAL)).toBe(false);
    expect(spend(broke, COIN_COSTS.REVEAL)).toBe(broke);
    expect(spend(walletWith(0), COIN_COSTS.RULE_OUT)).toEqual(walletWith(0));
  });

  it('grants, capped, and ignores nonsense', () => {
    expect(balance(grant(walletWith(1), 4))).toBe(5);
    expect(balance(grant(walletWith(MAX_COINS), 10))).toBe(MAX_COINS);

    const wallet = walletWith(1);
    expect(grant(wallet, 0)).toBe(wallet);
    expect(grant(wallet, -3)).toBe(wallet);
    expect(grant(wallet, 'five')).toBe(wallet);
  });
});

describe('rewardForWin', () => {
  it('returns a breakdown, because the payout is narrated rather than reported', () => {
    const reward = rewardForWin({ difficulty: 'easy', lives: MAX_LIVES, hintsUsed: 0 });

    expect(reward.steps.length).toBeGreaterThan(1);
    expect(reward.steps.every((step) => step.label && step.coins > 0)).toBe(true);
    // The total is the steps — the animation counts up to it one reason at a
    // time, so a total that did not match would leave coins unaccounted for.
    expect(reward.total).toBe(reward.steps.reduce((sum, step) => sum + step.coins, 0));
  });

  it('names the board it is paying for', () => {
    DIFFICULTY_IDS.forEach((difficulty) => {
      const reward = rewardForWin({ difficulty, lives: 1, hintsUsed: 4 });
      expect(reward.steps[0].label).toBe(`${difficultyLabel(difficulty)} board`);
    });
  });

  it('pays something for every rung', () => {
    DIFFICULTY_IDS.forEach((difficulty) => {
      expect(rewardForWin({ difficulty, lives: 1, hintsUsed: 4 }).total).toBeGreaterThan(0);
    });
  });

  it('pays a harder board more, so Easy is not the efficient farm', () => {
    const worth = (difficulty) =>
      rewardForWin({ difficulty, lives: MAX_LIVES, hintsUsed: 0 }).total;

    DIFFICULTY_IDS.slice(1).forEach((difficulty, index) => {
      expect(worth(difficulty)).toBeGreaterThanOrEqual(worth(DIFFICULTY_IDS[index]));
    });
    expect(worth('expert')).toBeGreaterThan(worth('easy'));
  });

  it('pays a coin per life still standing, and names how many', () => {
    const two = rewardForWin({ difficulty: 'easy', lives: 2, hintsUsed: 1 });
    const three = rewardForWin({ difficulty: 'easy', lives: 3, hintsUsed: 1 });

    expect(three.total).toBe(two.total + 1);
    expect(two.steps.map((s) => s.label)).toContain('2 lives left');
    expect(three.steps.map((s) => s.label)).toContain('3 lives left');
  });

  it('says "1 life left", not "1 lives left"', () => {
    const one = rewardForWin({ difficulty: 'easy', lives: 1, hintsUsed: 1 });
    expect(one.steps.map((s) => s.label)).toContain('1 life left');
  });

  it('pays a bonus for finishing without a hint, and says so', () => {
    const helped = rewardForWin({ difficulty: 'easy', lives: 2, hintsUsed: 3 });
    const unaided = rewardForWin({ difficulty: 'easy', lives: 2, hintsUsed: 0 });

    expect(unaided.total).toBeGreaterThan(helped.total);
    expect(unaided.steps.map((s) => s.label)).toContain('No hints used');
    expect(helped.steps.map((s) => s.label)).not.toContain('No hints used');
  });

  it('falls back to the default rung rather than paying nothing for a bad one', () => {
    expect(rewardForWin({ difficulty: 'impossible', lives: 1, hintsUsed: 1 }).total).toBeGreaterThan(
      0
    );
  });
});

describe('payOutWin', () => {
  const board = { size: 6, seed: 3, difficulty: 'easy', lives: MAX_LIVES, hintsUsed: 0 };

  it('pays the first time and adds the reward to the balance', () => {
    const { wallet, reward } = payOutWin(walletWith(0), board);

    expect(reward).not.toBeNull();
    expect(balance(wallet)).toBe(reward.total);
    expect(wallet.paidPuzzle).toBe(puzzleKey(board));
  });

  /**
   * The guard the whole step turns on. `solved` is derived from `marks`, so undo
   * and redo cross the win line as often as the player likes and each crossing
   * is a fresh "the board is solved" — which, with the payout animated, would
   * also replay the celebration every time.
   */
  it('pays a board exactly once, however many times the win line is crossed', () => {
    const first = payOutWin(walletWith(0), board);
    const second = payOutWin(first.wallet, board);
    const third = payOutWin(second.wallet, board);

    expect(second.reward).toBeNull();
    expect(third.reward).toBeNull();
    expect(second.wallet).toBe(first.wallet);
    expect(balance(third.wallet)).toBe(first.reward.total);
  });

  it('pays the next board, because it is a different board', () => {
    const first = payOutWin(walletWith(0), board);
    const next = payOutWin(first.wallet, { ...board, seed: board.seed + 1 });

    expect(next.reward).not.toBeNull();
    expect(balance(next.wallet)).toBe(first.reward.total + next.reward.total);
  });

  it('tells two same-seed boards of different sizes apart', () => {
    expect(puzzleKey({ size: 5, seed: 1 })).not.toBe(puzzleKey({ size: 6, seed: 1 }));
  });
});

describe('applyDailyFloor', () => {
  it('raises an empty wallet to the floor, so no board is ever a dead end', () => {
    expect(balance(applyDailyFloor(walletWith(0), '2026-07-28'))).toBe(DAILY_FLOOR_COINS);
  });

  // **The floor's whole claim is "this game cannot become unwinnable."** A
  // stranded player does not need tedium saved, they need to be told something —
  // so a floor that clears the rule-out price but not the hint price has quietly
  // stopped keeping its promise. It was a flat 4 while a hint cost 2; the
  // operator's repricing (hint 2 → 5, plan §12.9) would have left it buying
  // nothing but rule-outs. Deriving it from the price is what stops the next
  // reprice doing the same thing silently.
  it('always clears the price of a hint, whatever a hint costs', () => {
    const topped = applyDailyFloor(walletWith(0), '2026-07-28');
    expect(canAfford(topped, COIN_COSTS.HINT)).toBe(true);
    expect(DAILY_FLOOR_COINS).toBeGreaterThanOrEqual(COIN_COSTS.HINT);
  });

  it('raises *to* the floor and never above it, so idling is not an income', () => {
    expect(balance(applyDailyFloor(walletWith(40), '2026-07-28'))).toBe(40);
  });

  it('runs once a day, not once a launch', () => {
    const first = applyDailyFloor(walletWith(0), '2026-07-28');
    const spent = spend(first, COIN_COSTS.RULE_OUT);
    const again = applyDailyFloor(spent, '2026-07-28');

    // Same object back: nothing to write, and no top-up between two launches on
    // the same day.
    expect(again).toBe(spent);
    expect(balance(again)).toBe(DAILY_FLOOR_COINS - COIN_COSTS.RULE_OUT);

    expect(balance(applyDailyFloor(again, '2026-07-29'))).toBe(DAILY_FLOOR_COINS);
  });

  it('does nothing without a day to record it against', () => {
    const wallet = walletWith(0);
    expect(applyDailyFloor(wallet, null)).toBe(wallet);
    expect(applyDailyFloor(wallet, '')).toBe(wallet);
  });

  it('leaves the paid-puzzle record alone', () => {
    const paid = { ...walletWith(0), paidPuzzle: '6:3' };
    expect(applyDailyFloor(paid, '2026-07-28').paidPuzzle).toBe('6:3');
  });

  it('always leaves enough for the cheapest assist', () => {
    expect(DAILY_FLOOR_COINS).toBeGreaterThanOrEqual(COIN_COSTS.RULE_OUT);
  });
});

describe('today', () => {
  it('is the local calendar day, not UTC', () => {
    // 21:30 on the 28th, local. `toISOString()` would call this the 29th for
    // anyone west of UTC, which would hand out the floor mid-evening.
    expect(today(new Date(2026, 6, 28, 21, 30))).toBe('2026-07-28');
    expect(today(new Date(2026, 0, 5, 0, 5))).toBe('2026-01-05');
  });
});
