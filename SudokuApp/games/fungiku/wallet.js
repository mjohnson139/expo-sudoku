/**
 * The assist wallet (docs/fungiku-plan.md §14.4).
 *
 * Pure: no React, no AsyncStorage, no clock. Every rate in the economy is a
 * constant in this file and every transition is a function of `(wallet, input)`,
 * so the balance the game shows is a thing a test can reproduce exactly. The
 * storage half is ./walletStorage.js.
 *
 * **This is not part of the per-puzzle save, and that is the whole point of the
 * step.** `state.hintsUsed` is per-puzzle history — how much help *this board*
 * needed — and it stays exactly as it was, because that is what earning is
 * computed from. The wallet is a balance that spans puzzles and sessions, so it
 * gets its own global key, the same shape as `@AppTheme`. If a change here ever
 * seems to want a `MIGRATIONS` entry in ./saveMigration.js, it has been put in
 * the wrong module.
 *
 * **Every number below is a guess.** They were drafted to be playable, not
 * balanced, and they want a family play session before they mean anything. They
 * are gathered at the top of the file for exactly that reason: tuning the economy
 * should be editing this block, not chasing arithmetic through the UI.
 */
import { MAX_LIVES } from './reducer';
import { DEFAULT_DIFFICULTY, isDifficulty } from './difficulty';

/**
 * The two things you can run out of. Both are consumables now: §14.4 settled
 * that "Auto fill" *is* the existing Rule out button and it is metered too, not
 * left free.
 */
export const ASSIST_KINDS = { HINT: 'hint', RULE_OUT: 'ruleOut' };

const KIND_IDS = [ASSIST_KINDS.HINT, ASSIST_KINDS.RULE_OUT];

/**
 * What each assist costs, in coins of its own kind.
 *
 * A nudge and a reveal are the same currency at different prices, because
 * §11.2's ladder says each rung should cost more than the last and they are the
 * same *kind* of help — a hint, weak or strong. Pricing them as two separate
 * currencies would let a player hoard reveals while starving of nudges, which is
 * backwards: the nudge is the one a teaching game wants used.
 *
 * The **STUCK answer is not in this table and that is deliberate.** "No single
 * forced step from here" gives nothing away — the reducer already declines to
 * count it in `hintsUsed` — so it costs nothing. A spend is attached to the
 * *action*, never to the tap that asked for it.
 */
export const ASSIST_COSTS = {
  NUDGE: 1,
  REVEAL: 2,
  RULE_OUT: 1,
};

/**
 * What a wallet that has never been used holds. Enough to meet the metering as a
 * feature rather than as a wall on the very first board.
 */
export const STARTING_BALANCE = { [ASSIST_KINDS.HINT]: 3, [ASSIST_KINDS.RULE_OUT]: 3 };

/**
 * **The floor, and the answer to "can this game become unwinnable?"** — no.
 *
 * Once a day, each balance is raised *to* this level if it has fallen below it.
 * Raised to, never added to: a player who does not play for a week comes back to
 * two of each, not fourteen, so the floor is a safety net rather than an idle
 * income that makes earning pointless.
 *
 * A player stranded at zero on a hard board therefore always has a way forward
 * — tomorrow at the latest, and immediately if they can finish any board at all.
 * The alternatives considered were a per-win minimum (does not help a player who
 * cannot finish the board they are on) and a permanent minimum balance (which is
 * just "assists are free", with extra steps).
 */
export const DAILY_FLOOR = { [ASSIST_KINDS.HINT]: 2, [ASSIST_KINDS.RULE_OUT]: 2 };

/**
 * A ceiling, so a balance is always something the button can draw in two digits
 * and a long win streak cannot turn the economy off entirely.
 */
export const MAX_BALANCE = 99;

/**
 * What finishing a board pays, before the bonuses. Denominated in difficulty
 * because that is the one thing the player chose, and a harder board is more
 * work — paying it the same as an Easy one would make Easy the efficient way to
 * farm assists for a board you cannot beat.
 */
const WIN_BASE = {
  easy: { [ASSIST_KINDS.HINT]: 1, [ASSIST_KINDS.RULE_OUT]: 1 },
  medium: { [ASSIST_KINDS.HINT]: 1, [ASSIST_KINDS.RULE_OUT]: 2 },
  hard: { [ASSIST_KINDS.HINT]: 2, [ASSIST_KINDS.RULE_OUT]: 2 },
  expert: { [ASSIST_KINDS.HINT]: 3, [ASSIST_KINDS.RULE_OUT]: 3 },
};

/** Finished with every life intact — no wrong mushroom ever went down. */
const FLAWLESS_BONUS = { [ASSIST_KINDS.HINT]: 1, [ASSIST_KINDS.RULE_OUT]: 1 };

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
const UNAIDED_BONUS = { [ASSIST_KINDS.HINT]: 1, [ASSIST_KINDS.RULE_OUT]: 0 };

const clampBalance = (n) => Math.max(0, Math.min(MAX_BALANCE, Math.trunc(n)));

/** The identity of a board, for the "has this win already been paid?" record. */
export const puzzleKey = ({ size, seed }) => `${size}:${seed}`;

/** A brand-new wallet. */
export const createWallet = () => ({
  balances: { ...STARTING_BALANCE },
  // The last board that paid out, by `puzzleKey`. See `payOutWin`.
  paidPuzzle: null,
  // The day the floor was last applied, as a caller-supplied day string.
  lastFloorDay: null,
});

/**
 * Coerce whatever came out of storage into a wallet.
 *
 * Storage is a string a user could in principle have edited, and a
 * `NaN` balance would render as "NaN" on a button and compare false against
 * every cost — so every field is checked rather than trusted, the same way
 * `migrateFungikuSave` finishes with a belt-and-braces pass.
 *
 * There is no version field and no migration path here on purpose: a wallet is a
 * flat map of counters, and the honest answer to an unreadable one is a fresh
 * wallet, not a guess.
 */
export const normalizeWallet = (raw) => {
  const fresh = createWallet();
  if (!raw || typeof raw !== 'object') return fresh;

  const balances = {};
  KIND_IDS.forEach((kind) => {
    const value = raw.balances && raw.balances[kind];
    balances[kind] = Number.isFinite(value) ? clampBalance(value) : STARTING_BALANCE[kind];
  });

  return {
    balances,
    paidPuzzle: typeof raw.paidPuzzle === 'string' ? raw.paidPuzzle : null,
    lastFloorDay: typeof raw.lastFloorDay === 'string' ? raw.lastFloorDay : null,
  };
};

/** How many of `kind` are left. Unknown kinds read as 0 rather than undefined. */
export const balance = (wallet, kind) => {
  const value = wallet && wallet.balances ? wallet.balances[kind] : 0;
  return Number.isFinite(value) ? value : 0;
};

/** Can this wallet pay `cost` of `kind`? The one question the buttons ask. */
export const canAfford = (wallet, kind, cost = 1) => balance(wallet, kind) >= cost;

/**
 * Add to a balance.
 *
 * **Gifts and purchases are both just this** (plan §14.4). There is no store, no
 * `react-native-iap` and no RevenueCat — neither runs in Expo Go, which would
 * break the epic's "visible on a device at every step" rule — so the seam is the
 * deliverable and the till is not. A purchase, a gift and a win all arrive here.
 *
 * Returns the wallet unchanged (by identity) when nothing moves, so React state
 * can skip the update.
 */
export const grant = (wallet, kind, n = 1) => {
  if (!KIND_IDS.includes(kind) || !Number.isFinite(n) || n <= 0) return wallet;

  const next = clampBalance(balance(wallet, kind) + n);
  if (next === balance(wallet, kind)) return wallet;

  return { ...wallet, balances: { ...wallet.balances, [kind]: next } };
};

/**
 * Take `cost` off a balance. Returns the wallet unchanged if it cannot pay —
 * callers check `canAfford` first to disable the button, and this is the second
 * lock on the same door rather than the error path.
 */
export const spend = (wallet, kind, cost = 1) => {
  if (!KIND_IDS.includes(kind) || !canAfford(wallet, kind, cost)) return wallet;

  return {
    ...wallet,
    balances: { ...wallet.balances, [kind]: clampBalance(balance(wallet, kind) - cost) },
  };
};

/**
 * What a finished board is worth: a base by difficulty, plus what it cost to
 * finish it (plan §14.4 — "boards solved, and how cleanly").
 *
 * Both inputs already exist and are both already persisted, which is why they
 * were chosen: `lives` is real state as of Step 10, and `hintsUsed` has been
 * per-puzzle since Step 7.
 */
export const rewardForWin = ({ difficulty, lives = MAX_LIVES, hintsUsed = 0 } = {}) => {
  const base = WIN_BASE[isDifficulty(difficulty) ? difficulty : DEFAULT_DIFFICULTY];
  const flawless = lives >= MAX_LIVES;
  const unaided = !hintsUsed;

  return {
    [ASSIST_KINDS.HINT]:
      base[ASSIST_KINDS.HINT] +
      (flawless ? FLAWLESS_BONUS[ASSIST_KINDS.HINT] : 0) +
      (unaided ? UNAIDED_BONUS[ASSIST_KINDS.HINT] : 0),
    [ASSIST_KINDS.RULE_OUT]:
      base[ASSIST_KINDS.RULE_OUT] +
      (flawless ? FLAWLESS_BONUS[ASSIST_KINDS.RULE_OUT] : 0) +
      (unaided ? UNAIDED_BONUS[ASSIST_KINDS.RULE_OUT] : 0),
    flawless,
    unaided,
  };
};

/**
 * Pay a win — **at most once per board**.
 *
 * This is the guard the whole step turns on. `solved` is derived from `marks`,
 * so the win line is not an event: undo and redo can cross it as often as the
 * player likes, leaving for the hub and coming back restores a board that is
 * *still* solved, and every one of those is a render where "the board is solved"
 * is newly true. Paying on that condition without a record would pay on all of
 * them.
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

  let next = { ...wallet, paidPuzzle: key };
  KIND_IDS.forEach((kind) => {
    next = grant(next, kind, reward[kind]);
  });

  return { wallet: next, reward };
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

  const balances = { ...wallet.balances };
  KIND_IDS.forEach((kind) => {
    if (balances[kind] < DAILY_FLOOR[kind]) balances[kind] = DAILY_FLOOR[kind];
  });

  return { ...wallet, balances, lastFloorDay: day };
};

/** The device's local calendar day, as the string `applyDailyFloor` expects. */
export const today = (now = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  // Local parts, not `toISOString()` — that is UTC, so a player east or west of
  // it would see the floor arrive at some arbitrary hour of their afternoon.
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export default {
  ASSIST_KINDS,
  ASSIST_COSTS,
  balance,
  canAfford,
  createWallet,
  grant,
  spend,
  payOutWin,
  applyDailyFloor,
};
