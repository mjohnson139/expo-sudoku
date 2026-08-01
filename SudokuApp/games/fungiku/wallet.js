/**
 * The coin wallet (docs/fungiku-plan.md §14.4).
 *
 * Pure: no React, no AsyncStorage, no clock. Every rate in the economy is a
 * constant in this file and every transition is a function of `(wallet, input)`,
 * so the balance the game shows is a thing a test can reproduce exactly. The
 * storage half is ./walletStorage.js.
 *
 * **One currency.** Coins buy assists; that is the whole model. The first cut of
 * this shipped two separate token kinds — hint tokens and rule-out tokens — and
 * it failed on the device for a reason worth recording: a win that reads
 * *"+2 hints — no hints"* is telling you that you earned two hint tokens because
 * you used no hints, and there is no reading of that sentence that is not a
 * contradiction. A currency has to be named for what it *is*, not for what it
 * buys, or every message about earning collides with every message about
 * spending. Coins also mean a player has one number to watch instead of two, and
 * anything added later is priced in the same units rather than minting a third
 * kind.
 *
 * **This is not part of the per-puzzle save, and that is the point of the step.**
 * `state.hintsUsed` is per-puzzle history — how much help *this board* needed —
 * and it stays exactly as it was, because that is what earning is computed from.
 * The wallet is a balance that spans puzzles and sessions, so it gets its own
 * global key, the same shape as `@AppTheme`. If a change here ever seems to want
 * a `MIGRATIONS` entry in ./saveMigration.js, it has been put in the wrong
 * module.
 *
 * **Every number below is a guess.** They were drafted to be playable, not
 * balanced, and they want a family play session before they mean anything. They
 * are gathered at the top of the file for exactly that reason: tuning the economy
 * should be editing this block, not chasing arithmetic through the UI.
 */
import { MAX_LIVES } from './reducer';
import { DEFAULT_DIFFICULTY, difficultyLabel, isDifficulty } from './difficulty';

/**
 * What each assist costs, in coins. **Set by the operator, 2026-07-29**
 * (plan §12.9): *"hints should cost 20 coins if we are revealing a mushroom and
 * 5 if it's a simple thing."*
 *
 * The ladder is §11.2's, priced: **rule-out is the cheap one** because it reveals
 * nothing a player could not derive mechanically — it saves tedium, not thinking
 * — while a nudge is real help and a reveal solves a cell outright. Each rung
 * costs more than the last, which is what §11.2 asked for and what two separate
 * currencies could never express.
 *
 * The gap widened sharply — a reveal was 2× a nudge and is now 4× — and it went
 * with the nudge getting **stronger**: since the same operator pass, a nudge
 * points at the cell rather than at the group it is in (plan §12.9). A hint that
 * hands you the answer's location should not cost what a riddle cost.
 *
 * **The earn rates were not changed to match, and that is worth knowing before
 * a play session.** `WIN_BASE` still pays 3–8; a reveal is now two or three
 * whole boards' work. That may be exactly right — help you have to save for is
 * help you think about — but it is a real shift in the economy's shape and it is
 * the thing to watch (§8 #14).
 *
 * The **"nothing is forced from here" answer is not in this table and that is
 * deliberate.** It gives nothing away — the reducer already declines to count it
 * in `hintsUsed` — so it costs nothing. A spend is attached to the *action*,
 * never to the tap that asked for it.
 */
export const COIN_COSTS = {
  RULE_OUT: 1,
  HINT: 5,
  REVEAL: 20,
};

/** The cheapest thing on the board — what "you can still do something" means. */
export const MIN_COST = Math.min(...Object.values(COIN_COSTS));

/**
 * What a wallet that has never been used holds. Enough for a few of everything on
 * the first board, so metering reads as a feature rather than as a wall.
 */
export const STARTING_COINS = 10;

/**
 * **The floor, and the answer to "can this game become unwinnable?"** — no.
 *
 * Once a day the balance is raised *to* this level if it has fallen below it.
 * Raised to, never added to: a player who does not play for a week comes back to
 * one hint's worth, not seven, so the floor is a safety net rather than an idle
 * income that makes earning pointless.
 *
 * A player stranded at zero on a hard board therefore always has a way forward
 * — tomorrow at the latest, and immediately if they can finish any board at all.
 * The alternatives considered were a per-win minimum (does not help a player who
 * cannot finish the board they are on) and a permanent minimum balance (which is
 * just "assists are free", with extra steps).
 *
 * ### It is `COIN_COSTS.HINT`, and it is derived rather than typed
 *
 * It was a flat 4 while a hint cost 2. The operator's repricing (hint 2 → 5)
 * would have left the floor at 4 — **enough to buy nothing but rule-outs**, which
 * quietly repeals the paragraph above: a player stuck on a hard board does not
 * need tedium saved, they need to be told something, and a floor that cannot buy
 * the cheapest *hint* is not the safety net it claims to be.
 *
 * So it is defined as the price of one hint. That is not tuning the economy by
 * the back door — it is the smallest number that keeps the floor's stated
 * promise, and tying it to the price means the next reprice cannot silently
 * break it either. **A deliberate choice to make it something else is fine; a
 * stale constant that no longer clears any price is not.**
 */
export const DAILY_FLOOR_COINS = COIN_COSTS.HINT;

/** A ceiling, so a long win streak cannot turn the economy off entirely. */
export const MAX_COINS = 999;

/**
 * What finishing a board pays, before the bonuses. Denominated in difficulty
 * because that is the one thing the player chose, and a harder board is more
 * work — paying it the same as an Easy one would make Easy the efficient way to
 * farm coins for a board you cannot beat.
 */
const WIN_BASE = { easy: 3, medium: 4, hard: 6, expert: 8 };

/**
 * One coin per life still standing. Granular rather than an all-or-nothing
 * "flawless" bonus, because it gives the payout animation something true to say
 * on a board that was *nearly* clean — and because a player who made one mistake
 * should still see the difference between one and two.
 *
 * A won board always has at least one life left (zero lives means the board is
 * waiting to be restarted), so this always pays something.
 */
const COINS_PER_LIFE = 1;

/**
 * Finished without asking for a hint. Measured with `hintsUsed`, the per-puzzle
 * counter that already exists and is already persisted.
 *
 * **Rule-outs are not counted here**, and that is a decision rather than an
 * omission: there is no per-puzzle rule-out counter, adding one would mean
 * touching the per-puzzle save, and the thing it would police is already priced
 * — every rule-out costs a coin at the moment it is used. Being paid a bonus for
 * not using an assist you had to buy would be charging twice.
 */
const NO_HINTS_BONUS = 2;

const clampCoins = (n) => Math.max(0, Math.min(MAX_COINS, Math.trunc(n)));

/** The identity of a board, for the "has this win already been paid?" record. */
export const puzzleKey = ({ size, seed }) => `${size}:${seed}`;

/** A brand-new wallet. */
export const createWallet = () => ({
  coins: STARTING_COINS,
  // The last board that paid out, by `puzzleKey`. See `payOutWin`.
  paidPuzzle: null,
  // The day the floor was last applied, as a caller-supplied day string.
  lastFloorDay: null,
});

/**
 * Coerce whatever came out of storage into a wallet.
 *
 * Storage is a string a user could in principle have edited, and a `NaN` balance
 * would render as "NaN" on screen and compare false against every price — so
 * every field is checked rather than trusted, the same way `migrateFungikuSave`
 * finishes with a belt-and-braces pass.
 *
 * **The one real conversion is the two-currency wallet** that briefly shipped on
 * this branch, whose balances were `{hint, ruleOut}`. Those tokens are worth what
 * they could have bought, so they convert at the price list rather than being
 * summed as if a hint token and a rule-out token were the same thing. There is no
 * version field here on purpose: a wallet is a flat counter, and beyond this one
 * shape the honest answer to an unreadable one is a fresh wallet, not a guess.
 */
export const normalizeWallet = (raw) => {
  if (!raw || typeof raw !== 'object') return createWallet();

  let coins;
  if (Number.isFinite(raw.coins)) {
    coins = clampCoins(raw.coins);
  } else if (raw.balances && typeof raw.balances === 'object') {
    const hint = Number.isFinite(raw.balances.hint) ? raw.balances.hint : 0;
    const ruleOut = Number.isFinite(raw.balances.ruleOut) ? raw.balances.ruleOut : 0;
    coins = clampCoins(hint * COIN_COSTS.HINT + ruleOut * COIN_COSTS.RULE_OUT);
  } else {
    coins = STARTING_COINS;
  }

  return {
    coins,
    paidPuzzle: typeof raw.paidPuzzle === 'string' ? raw.paidPuzzle : null,
    lastFloorDay: typeof raw.lastFloorDay === 'string' ? raw.lastFloorDay : null,
  };
};

/** How many coins are left. */
export const balance = (wallet) => {
  const value = wallet ? wallet.coins : 0;
  return Number.isFinite(value) ? value : 0;
};

/** Can this wallet pay `cost`? The one question every button asks. */
export const canAfford = (wallet, cost) => balance(wallet) >= cost;

/**
 * Add coins.
 *
 * **Gifts and purchases are both this** (plan §14.4). There is no store, no
 * `react-native-iap` and no RevenueCat — neither runs in Expo Go, which would
 * break the epic's "visible on a device at every step" rule — so the seam is the
 * deliverable and the till is not. A purchase, a gift and a win all arrive here.
 *
 * Returns the wallet unchanged (by identity) when nothing moves, so React state
 * can skip the update.
 */
export const grant = (wallet, n = 1) => {
  if (!Number.isFinite(n) || n <= 0) return wallet;

  const next = clampCoins(balance(wallet) + n);
  if (next === balance(wallet)) return wallet;

  return { ...wallet, coins: next };
};

/**
 * Take `cost` off the balance. Returns the wallet unchanged if it cannot pay —
 * callers check `canAfford` first to disable the button, and this is the second
 * lock on the same door rather than the error path.
 */
export const spend = (wallet, cost = 1) => {
  if (!Number.isFinite(cost) || cost <= 0 || !canAfford(wallet, cost)) return wallet;
  return { ...wallet, coins: clampCoins(balance(wallet) - cost) };
};

/**
 * What a finished board is worth, **and why** (plan §14.4 — "boards solved, and
 * how cleanly").
 *
 * Returns a `total` *and the `steps` that make it up*, because the payout is
 * animated: the balance counts up one reason at a time and each reason says
 * itself. That is the whole justification for returning a breakdown rather than a
 * number — a player who never sees the bonuses named has no reason to play for
 * them.
 *
 * Both inputs already exist and are both already persisted, which is why they
 * were chosen: `lives` is real state as of Step 10, and `hintsUsed` has been
 * per-puzzle since Step 7.
 *
 * @returns {{total: number, steps: Array<{label: string, coins: number}>}}
 */
export const rewardForWin = ({ difficulty, lives = MAX_LIVES, hintsUsed = 0 } = {}) => {
  const rung = isDifficulty(difficulty) ? difficulty : DEFAULT_DIFFICULTY;
  const livesLeft = Math.max(0, Math.min(MAX_LIVES, Number.isFinite(lives) ? lives : MAX_LIVES));

  const steps = [{ label: `${difficultyLabel(rung)} board`, coins: WIN_BASE[rung] }];

  if (livesLeft > 0) {
    steps.push({
      label: livesLeft === 1 ? '1 life left' : `${livesLeft} lives left`,
      coins: livesLeft * COINS_PER_LIFE,
    });
  }

  if (!hintsUsed) {
    steps.push({ label: 'No hints used', coins: NO_HINTS_BONUS });
  }

  return { total: steps.reduce((sum, step) => sum + step.coins, 0), steps };
};

/**
 * Pay a win — **at most once per board**.
 *
 * This is the guard the whole step turns on. `solved` is derived from `marks`,
 * so the win line is not an event: undo and redo can cross it as often as the
 * player likes, leaving for the hub and coming back restores a board that is
 * *still* solved, and every one of those is a render where "the board is solved"
 * is newly true. Paying on that condition without a record would pay on all of
 * them — and with the payout animated, it would also replay the celebration
 * every time.
 *
 * The record is the board's identity rather than a flag, because the flag would
 * have to be cleared by something and every candidate for that job (starting a
 * puzzle, leaving the screen) is a place the clear could be missed. Storing
 * *which* board was paid means the question is answered by comparison and there
 * is nothing to reset. Only the most recent is kept: a payout can only happen on
 * the board being played, so one slot covers every way of re-crossing the line
 * on it.
 *
 * @returns {{wallet: Object, reward: Object|null}} `reward` is null when this
 *   board has already been paid — the caller uses it to decide whether there is
 *   anything to announce.
 */
export const payOutWin = (wallet, { size, seed, difficulty, lives, hintsUsed } = {}) => {
  const key = puzzleKey({ size, seed });
  if (wallet.paidPuzzle === key) return { wallet, reward: null };

  const reward = rewardForWin({ difficulty, lives, hintsUsed });

  return { wallet: grant({ ...wallet, paidPuzzle: key }, reward.total), reward };
};

/**
 * Apply the daily floor. `day` is supplied by the caller (`YYYY-MM-DD` from the
 * device's local date) rather than read from a clock in here, so this stays pure
 * and a test can step through days without mocking `Date`.
 *
 * Returns the wallet unchanged by identity once the floor has been applied
 * today, so the caller can skip a write on every launch but the first.
 */
export const applyDailyFloor = (wallet, day) => {
  if (typeof day !== 'string' || day.length === 0) return wallet;
  if (wallet.lastFloorDay === day) return wallet;

  return {
    ...wallet,
    coins: Math.max(balance(wallet), DAILY_FLOOR_COINS),
    lastFloorDay: day,
  };
};

/** The device's local calendar day, as the string `applyDailyFloor` expects. */
export const today = (now = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  // Local parts, not `toISOString()` — that is UTC, so a player east or west of
  // it would see the floor arrive at some arbitrary hour of their afternoon.
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export default {
  COIN_COSTS,
  balance,
  canAfford,
  createWallet,
  grant,
  spend,
  payOutWin,
  applyDailyFloor,
};
