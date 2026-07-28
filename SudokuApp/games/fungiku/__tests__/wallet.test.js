import {
  ASSIST_COSTS,
  ASSIST_KINDS,
  DAILY_FLOOR,
  MAX_BALANCE,
  STARTING_BALANCE,
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
import { DIFFICULTY_IDS } from '../difficulty';

const { HINT, RULE_OUT } = ASSIST_KINDS;

/** A wallet holding exactly these balances, and nothing else interesting. */
const walletWith = (hint, ruleOut) => ({
  ...createWallet(),
  balances: { [HINT]: hint, [RULE_OUT]: ruleOut },
});

describe('createWallet', () => {
  it('starts with something to spend, so metering is a feature and not a wall', () => {
    const wallet = createWallet();

    expect(balance(wallet, HINT)).toBe(STARTING_BALANCE[HINT]);
    expect(balance(wallet, RULE_OUT)).toBe(STARTING_BALANCE[RULE_OUT]);
    expect(balance(wallet, HINT)).toBeGreaterThan(0);
    expect(balance(wallet, RULE_OUT)).toBeGreaterThan(0);
  });

  it('has paid for nothing yet', () => {
    expect(createWallet().paidPuzzle).toBeNull();
  });
});

describe('normalizeWallet', () => {
  it('hands back a fresh wallet for anything unreadable', () => {
    [null, undefined, 'nonsense', 42, []].forEach((raw) => {
      expect(normalizeWallet(raw).balances).toEqual(createWallet().balances);
    });
  });

  it('replaces a non-numeric balance rather than letting NaN reach a button', () => {
    const wallet = normalizeWallet({ balances: { [HINT]: 'lots', [RULE_OUT]: 4 } });

    expect(wallet.balances[HINT]).toBe(STARTING_BALANCE[HINT]);
    expect(wallet.balances[RULE_OUT]).toBe(4);
  });

  it('clamps a hand-edited balance into range', () => {
    const wallet = normalizeWallet({ balances: { [HINT]: -5, [RULE_OUT]: 10 ** 6 } });

    expect(wallet.balances[HINT]).toBe(0);
    expect(wallet.balances[RULE_OUT]).toBe(MAX_BALANCE);
  });

  it('keeps the paid-puzzle record, which is what stops a win paying twice', () => {
    expect(normalizeWallet({ paidPuzzle: '6:3' }).paidPuzzle).toBe('6:3');
    expect(normalizeWallet({ paidPuzzle: 17 }).paidPuzzle).toBeNull();
  });
});

describe('spend and grant', () => {
  it('takes the cost off, and never below zero', () => {
    const wallet = spend(walletWith(3, 3), HINT, ASSIST_COSTS.NUDGE);
    expect(balance(wallet, HINT)).toBe(3 - ASSIST_COSTS.NUDGE);
    expect(balance(wallet, RULE_OUT)).toBe(3);
  });

  it('refuses a spend it cannot cover, and leaves the wallet untouched', () => {
    const broke = walletWith(1, 0);

    expect(canAfford(broke, HINT, ASSIST_COSTS.REVEAL)).toBe(false);
    expect(spend(broke, HINT, ASSIST_COSTS.REVEAL)).toBe(broke);
    expect(spend(broke, RULE_OUT, ASSIST_COSTS.RULE_OUT)).toBe(broke);
  });

  it('prices the reveal above the nudge — §11.2 wants each rung to cost more', () => {
    expect(ASSIST_COSTS.REVEAL).toBeGreaterThan(ASSIST_COSTS.NUDGE);

    // The consequence the UI has to draw: a balance that buys a nudge does not
    // necessarily buy the answer.
    const wallet = walletWith(1, 1);
    expect(canAfford(wallet, HINT, ASSIST_COSTS.NUDGE)).toBe(true);
    expect(canAfford(wallet, HINT, ASSIST_COSTS.REVEAL)).toBe(false);
  });

  it('grants, capped, and ignores nonsense', () => {
    expect(balance(grant(walletWith(1, 1), HINT, 4), HINT)).toBe(5);
    expect(balance(grant(walletWith(MAX_BALANCE, 1), HINT, 10), HINT)).toBe(MAX_BALANCE);

    const wallet = walletWith(1, 1);
    expect(grant(wallet, HINT, 0)).toBe(wallet);
    expect(grant(wallet, HINT, -3)).toBe(wallet);
    expect(grant(wallet, 'coins', 3)).toBe(wallet);
  });

  it('reads an unknown kind as zero rather than undefined', () => {
    expect(balance(createWallet(), 'coins')).toBe(0);
    expect(canAfford(createWallet(), 'coins')).toBe(false);
  });
});

describe('rewardForWin', () => {
  it('pays something for every rung', () => {
    DIFFICULTY_IDS.forEach((difficulty) => {
      const reward = rewardForWin({ difficulty, lives: 1, hintsUsed: 4 });
      expect(reward[HINT] + reward[RULE_OUT]).toBeGreaterThan(0);
    });
  });

  it('pays a harder board more, so Easy is not the efficient farm', () => {
    const worth = (difficulty) => {
      const reward = rewardForWin({ difficulty, lives: MAX_LIVES, hintsUsed: 0 });
      return reward[HINT] + reward[RULE_OUT];
    };

    DIFFICULTY_IDS.slice(1).forEach((difficulty, index) => {
      expect(worth(difficulty)).toBeGreaterThanOrEqual(worth(DIFFICULTY_IDS[index]));
    });
    expect(worth('expert')).toBeGreaterThan(worth('easy'));
  });

  it('pays more for a board finished cleanly — lives kept and no hints asked', () => {
    const messy = rewardForWin({ difficulty: 'easy', lives: 1, hintsUsed: 3 });
    const flawless = rewardForWin({ difficulty: 'easy', lives: MAX_LIVES, hintsUsed: 3 });
    const perfect = rewardForWin({ difficulty: 'easy', lives: MAX_LIVES, hintsUsed: 0 });

    expect(flawless[HINT]).toBeGreaterThan(messy[HINT]);
    expect(perfect[HINT]).toBeGreaterThan(flawless[HINT]);

    expect(messy.flawless).toBe(false);
    expect(perfect.flawless).toBe(true);
    expect(perfect.unaided).toBe(true);
  });

  it('falls back to the default rung rather than paying nothing for a bad one', () => {
    const reward = rewardForWin({ difficulty: 'impossible', lives: 1, hintsUsed: 1 });
    expect(reward[HINT] + reward[RULE_OUT]).toBeGreaterThan(0);
  });
});

describe('payOutWin', () => {
  const board = { size: 6, seed: 3, difficulty: 'easy', lives: MAX_LIVES, hintsUsed: 0 };

  it('pays the first time and adds the reward to the balance', () => {
    const before = walletWith(0, 0);
    const { wallet, reward } = payOutWin(before, board);

    expect(reward).not.toBeNull();
    expect(balance(wallet, HINT)).toBe(reward[HINT]);
    expect(balance(wallet, RULE_OUT)).toBe(reward[RULE_OUT]);
    expect(wallet.paidPuzzle).toBe(puzzleKey(board));
  });

  /**
   * The guard the whole step turns on. `solved` is derived from `marks`, so undo
   * and redo cross the win line as often as the player likes and each crossing
   * is a fresh "the board is solved".
   */
  it('pays a board exactly once, however many times the win line is crossed', () => {
    const first = payOutWin(walletWith(0, 0), board);
    const second = payOutWin(first.wallet, board);
    const third = payOutWin(second.wallet, board);

    expect(second.reward).toBeNull();
    expect(third.reward).toBeNull();
    expect(second.wallet).toBe(first.wallet);
    expect(balance(third.wallet, HINT)).toBe(first.reward[HINT]);
  });

  it('pays the next board, because it is a different board', () => {
    const first = payOutWin(walletWith(0, 0), board);
    const next = payOutWin(first.wallet, { ...board, seed: board.seed + 1 });

    expect(next.reward).not.toBeNull();
    expect(balance(next.wallet, HINT)).toBe(first.reward[HINT] + next.reward[HINT]);
  });

  it('tells two same-seed boards of different sizes apart', () => {
    expect(puzzleKey({ size: 5, seed: 1 })).not.toBe(puzzleKey({ size: 6, seed: 1 }));
  });
});

describe('applyDailyFloor', () => {
  it('raises an empty wallet to the floor, so no board is ever a dead end', () => {
    const wallet = applyDailyFloor(walletWith(0, 0), '2026-07-28');

    expect(balance(wallet, HINT)).toBe(DAILY_FLOOR[HINT]);
    expect(balance(wallet, RULE_OUT)).toBe(DAILY_FLOOR[RULE_OUT]);
  });

  it('raises *to* the floor and never above it, so idling is not an income', () => {
    const rich = walletWith(20, 20);
    const wallet = applyDailyFloor(rich, '2026-07-28');

    expect(balance(wallet, HINT)).toBe(20);
    expect(balance(wallet, RULE_OUT)).toBe(20);
  });

  it('runs once a day, not once a launch', () => {
    const first = applyDailyFloor(walletWith(0, 0), '2026-07-28');
    const spent = spend(first, HINT, ASSIST_COSTS.NUDGE);
    const again = applyDailyFloor(spent, '2026-07-28');

    // Same object back: nothing to write, and no top-up between two launches on
    // the same day.
    expect(again).toBe(spent);
    expect(balance(again, HINT)).toBe(DAILY_FLOOR[HINT] - ASSIST_COSTS.NUDGE);

    const tomorrow = applyDailyFloor(again, '2026-07-29');
    expect(balance(tomorrow, HINT)).toBe(DAILY_FLOOR[HINT]);
  });

  it('does nothing without a day to record it against', () => {
    const wallet = walletWith(0, 0);
    expect(applyDailyFloor(wallet, null)).toBe(wallet);
    expect(applyDailyFloor(wallet, '')).toBe(wallet);
  });

  it('leaves the paid-puzzle record alone', () => {
    const paid = { ...walletWith(0, 0), paidPuzzle: '6:3' };
    expect(applyDailyFloor(paid, '2026-07-28').paidPuzzle).toBe('6:3');
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
