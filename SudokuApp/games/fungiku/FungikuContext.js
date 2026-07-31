import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import usePersistentReducer from '../../hooks/usePersistentReducer';
import { MARKS, MAX_SIZE, MIN_SIZE } from './engine';
import { loadFungikuState, saveFungikuState } from './storage';
import useFungikuWallet from './useFungikuWallet';
import { COIN_COSTS, balance, canAfford, puzzleKey, rewardForWin } from './wallet';
import {
  DEFAULT_SEED,
  FUNGIKU_ACTIONS,
  buildPuzzleState,
  createInitialFungikuState,
  fungikuReducer,
  selectCanRedo,
  selectCanUndo,
  selectHintIsChargeable,
  selectIsSolved,
  selectLives,
  selectMistakeCells,
  selectMushroomCount,
  selectRevealCell,
  selectRuleOutCells,
  resolvePuzzleIdentity,
} from './reducer';

/**
 * Fungiku's own context — deliberately **not** an extension of Sudoku's
 * GameContext. The two games share no state, no storage key and no reducer;
 * they only share the persistence hook and the theme.
 *
 * Derived values (the mushroom count, the win flag) are memoized from `marks`
 * here rather than kept in the reducer, so undo can never leave a stale
 * highlight behind. `lives` and `mistakeCells` are the exceptions and are real
 * state: what a board has cost you is not a function of what is on it now
 * (plan §14.3 — undo retracts the mark but never refunds the life).
 */
const FungikuContext = createContext();

/**
 * Board sizes offered today — every size the engine supports, derived there from
 * MIN_SIZE/MAX_SIZE rather than listed here, so a chip the UI offers and a size
 * `generate()` accepts cannot drift apart. The difficulty rungs map *into* this
 * range (see ./difficulty.js); the chips are the free-play escape hatch that
 * reaches a single size directly (plan §14.1).
 */
export { SIZES } from './engine';
export { DIFFICULTIES } from './difficulty';
export { COIN_COSTS } from './wallet';

// Stable object identity, so the persistence hook never sees a "new" adapter.
const FUNGIKU_PERSISTENCE = { load: loadFungikuState, save: saveFungikuState };

/**
 * At and above this size, generation is deferred by a frame so the "Generating…"
 * state can paint before the main thread is blocked (plan §12.1).
 *
 * Generation is synchronous and its cost is a cliff: on the machine that
 * measured it, 8×8 takes 5 ms, 9×9 51 ms and 10×10 **414 ms median, 789 ms
 * worst**. A phone's JS engine is slower again. Below the threshold the work is
 * over before a frame could have been drawn, and deferring would only add
 * latency; at and above it, a "New puzzle" tap that freezes for half a second
 * reads as a bug, so the player is told what is happening instead.
 */
const DEFER_GENERATION_AT_SIZE = 9;

export const FungikuProvider = ({ children }) => {
  // Generated once. `useReducer` ignores this argument after mount, but
  // evaluating it inline would re-run `generate()` on every render — and this
  // provider re-renders on every tap, which at 8×8 is ~30ms of wasted work per
  // tap. (Generation is deterministic, so recomputing would be harmless if the
  // memo were ever dropped; it is purely a cost question.)
  const initialState = useMemo(() => createInitialFungikuState(), []);

  const [state, dispatch, hydrated] = usePersistentReducer(
    fungikuReducer,
    initialState,
    FUNGIKU_ACTIONS.RESTORE_SAVED_GAME,
    FUNGIKU_PERSISTENCE
  );

  // The assist wallet (plan §14.4) — its own key, its own lifetime, deliberately
  // *not* threaded through the reducer above. `state.hintsUsed` is still what
  // this board has cost; the wallet is what the player has left, across every
  // board they have ever played.
  const { wallet, walletHydrated, spendCoins, grantCoins, payWin } = useFungikuWallet();

  const mushroomCount = useMemo(() => selectMushroomCount(state), [state.marks]);
  const solved = useMemo(() => selectIsSolved(state), [state.marks, state.regions, state.size]);

  /**
   * **A win is an event; `solved` is not one.** (docs/fungiku-plan.md §12.12)
   *
   * `solved` is derived from `marks`, so it is true on *every* render where the
   * board happens to be complete — after the winning tap, after a redo across the
   * win line, and again on the very first render when a save restores a board that
   * was already finished. Every part of the celebration used to key on it
   * directly, and the operator found what that costs: **the wave and the dialog
   * replayed whenever the app came back from the background**, because a reload
   * remounts the tree and the first render already says `solved`.
   *
   * `winSeq` counts the **transitions into solved that this provider actually
   * watched happen**. It starts at 0 and increments only when a board that was not
   * solved becomes solved while it is looking, so:
   *
   *   - arriving on a finished board never fires it — nothing transitioned;
   *   - a remount *is* arriving again, so it does not fire either;
   *   - a re-render with no change cannot fire it, because there is no change.
   *
   * Monotonic on purpose, the same shape as `mistakeSeq` in the reducer: two wins
   * in a row have to be two distinct values or the second celebration would not
   * re-fire. Consumers key their effects on it and **do nothing while it is 0**.
   *
   * It is not in the reducer and not in the save. It is a fact about what *this
   * session* watched, not about the puzzle — persisting it would make a restored
   * board claim a win the player never saw.
   */
  const [winSeq, setWinSeq] = useState(0);
  const watchedSolved = useRef(false);
  const watching = useRef(false);
  useEffect(() => {
    // **Do not start watching until the save has loaded.** This provider renders
    // *before* hydration with the default empty board, so `solved` genuinely goes
    // false → true when a finished board is restored — and reading that as a win
    // is exactly the bug this counter exists to prevent. The first pass after
    // hydration therefore **adopts** whatever the board is without celebrating
    // it; only changes after that are wins.
    if (!hydrated) return;

    if (!watching.current) {
      watching.current = true;
      watchedSolved.current = solved;
      return;
    }

    if (solved === watchedSolved.current) return;
    watchedSolved.current = solved;
    if (solved) setWinSeq((n) => n + 1);
  }, [solved, hydrated]);

  // Any mark at all, not just mushrooms — a board restored with only X marks on
  // it still has something to clear, even though its undo stack is empty.
  const hasMarks = useMemo(
    () => state.marks.some((mark) => mark !== MARKS.EMPTY),
    [state.marks]
  );

  // How many cells one tap of "Rule out" would fill. Drives whether the button
  // is enabled, so it never sits there offering to do nothing.
  const ruleOutCount = useMemo(
    () => selectRuleOutCells(state).size,
    [state.marks, state.regions, state.size]
  );

  // The red X marks: cells where a mushroom was placed and turned out to be
  // wrong (plan §14.3). A stored record rather than a derived one — see the note
  // above the reducer's selectors.
  const mistakeCells = useMemo(() => selectMistakeCells(state), [state.mistakeCells]);

  // Lives left on this board, and the full complement the heart row draws.
  const lives = useMemo(() => selectLives(state), [state.lives]);
  const canReveal = useMemo(
    () => selectRevealCell(state) >= 0,
    [state.marks, state.regions, state.solution, state.size]
  );

  // --- what help costs, and what is left of it (plan §14.4) -----------------
  //
  // One balance, read out of the wallet rather than kept as a second copy: the
  // authority for a spend is the ref inside `useFungikuWallet`, and a mirror of
  // it here would be one render behind on exactly the taps that matter.
  const coins = balance(wallet);

  // Would the next press of Hint hand anything over? The reducer's own rule for
  // `hintsUsed`, asked one step earlier so the wallet can charge on the same
  // side of it — a nudge costs, "nothing is forced from here" does not.
  const hintIsChargeable = useMemo(
    () => selectHintIsChargeable(state),
    [state.marks, state.regions, state.size]
  );

  // Three separate reasons a button can be dead, and the player has to be able
  // to tell them apart: nothing to do here, the board is finished, or you cannot
  // afford it. The screen draws each differently, so each gets its own flag
  // rather than one `disabled`.
  const canAffordHint = canAfford(wallet, COIN_COSTS.HINT);
  const canAffordReveal = canAfford(wallet, COIN_COSTS.REVEAL);
  const canAffordRuleOut = canAfford(wallet, COIN_COSTS.RULE_OUT);

  // --- earning (plan §14.4) -------------------------------------------------
  //
  // What the board that is on screen just paid, kept with the board it was paid
  // for. The win banner reads it; a different board means there is nothing to
  // show, which is cheaper and more honest than clearing it on every transition
  // that could start a new puzzle.
  const [lastReward, setLastReward] = useState(null);

  /**
   * Pay a finished board.
   *
   * **`solved` is a condition, not an event**, and that is the whole difficulty
   * here. It is derived from `marks`, so it is newly true on every render where
   * the board happens to be complete: after the winning tap, after a redo across
   * the win line, and again on the next launch when the save restores a board
   * that was already finished. Paying on it directly would pay on all of them.
   *
   * `payWin` is idempotent per board — it records which puzzle it paid — so this
   * effect can fire as often as React likes and the second call returns null.
   *
   * Gated on **both** hydrations. Running before the wallet has loaded would pay
   * out of a default wallet whose "already paid" record is empty, and the load
   * that followed would overwrite the grant with the saved balance — a payout the
   * player watched arrive and never received.
   */
  useEffect(() => {
    if (!solved || !hydrated || !walletHydrated) return;

    const reward = payWin({
      size: state.size,
      seed: state.seed,
      difficulty: state.difficulty,
      lives: state.lives,
      hintsUsed: state.hintsUsed,
    });
    if (reward) setLastReward({ ...reward, puzzle: puzzleKey(state) });
  }, [
    solved,
    hydrated,
    walletHydrated,
    payWin,
    state.size,
    state.seed,
    state.difficulty,
    state.lives,
    state.hintsUsed,
  ]);

  // Only for the board it was paid for. A new puzzle at the same instant the
  // dialog is animating out must not inherit the last one's payout.
  const rewardForThisBoard =
    lastReward && lastReward.puzzle === puzzleKey(state) ? lastReward : null;

  /**
   * **What this board earns — computed, not remembered** (plan §12.13).
   *
   * `rewardForWin` is pure, and every input it takes (`difficulty`, `lives`,
   * `hintsUsed`) is persisted with the board. So the breakdown can be worked out
   * from a restored save, which is what lets a win dialog that survives a
   * relaunch still show its coins.
   *
   * This is deliberately **not** the same thing as `rewardForThisBoard`, and
   * conflating them is what produced the operator's *"it comes back and it
   * doesn't have the coins"*. Two different questions:
   *
   *   - *what did this board earn?* — pure, always answerable. Drives the rows
   *     the dialog draws.
   *   - *did this session grant it?* — `rewardForThisBoard`, non-null only when
   *     the wallet actually paid out just now. Drives the count-up animation, and
   *     is correctly null for a board paid in an earlier session.
   *
   * The wallet remains the only authority on *granting*; this only describes.
   */
  const winReward = useMemo(
    () =>
      solved
        ? rewardForWin({
            difficulty: state.difficulty,
            lives: state.lives,
            hintsUsed: state.hintsUsed,
          })
        : null,
    [solved, state.difficulty, state.lives, state.hintsUsed]
  );

  // --- the input model (plan §14.2) ----------------------------------------
  // A tap rules a cell out, or clears a filled one. It is dispatched the moment
  // the finger lifts — it never waits to see whether a second tap is coming, so
  // the most common mark in the game is never delayed by the double-tap window.
  const tapCell = useCallback(
    (cell) => dispatch({ type: FUNGIKU_ACTIONS.TAP_CELL, payload: { cell } }),
    [dispatch]
  );

  // The second tap: commit a mushroom. An attempt, not a mark — the reducer
  // judges it against the solution and a wrong one costs a life (plan §14.3).
  const placeMushroom = useCallback(
    (cell) => dispatch({ type: FUNGIKU_ACTIONS.PLACE_MUSHROOM, payload: { cell } }),
    [dispatch]
  );

  // --- drag-to-sweep (plan §2) ---------------------------------------------
  // A stroke is many paints across many frames but exactly one undoable action:
  // beginStroke arms the undo entry, the first effective paint spends it.
  const beginStroke = useCallback(
    () => dispatch({ type: FUNGIKU_ACTIONS.BEGIN_STROKE }),
    [dispatch]
  );
  const paintCells = useCallback(
    (cells, mode) => dispatch({ type: FUNGIKU_ACTIONS.PAINT_CELLS, payload: { cells, mode } }),
    [dispatch]
  );
  const endStroke = useCallback(() => dispatch({ type: FUNGIKU_ACTIONS.END_STROKE }), [dispatch]);

  /**
   * One tap: mark everything the placed mushrooms forbid (plan §2) — and as of
   * §14.4, one coin.
   *
   * Charged here rather than in the reducer because the reducer is pure and the
   * wallet is not part of its state. The order matters: the sweep is only
   * dispatched if the coin actually came out, so a wallet that could not pay can
   * never leave the board changed for free.
   */
  const ruleOut = useCallback(() => {
    // Nothing to mark is not a purchase. The reducer would return the same state
    // anyway; refusing here means it also costs nothing.
    if (ruleOutCount === 0) return;
    if (!spendCoins(COIN_COSTS.RULE_OUT)) return;
    dispatch({ type: FUNGIKU_ACTIONS.RULE_OUT });
  }, [dispatch, ruleOutCount, spendCoins]);

  // --- hints (plan §11.2), now priced (plan §14.4) --------------------------
  //
  // **Spend on the action, not on the tap.** A hint request that can only answer
  // "no single forced step from here" hands nothing over, so it is free — the
  // same asymmetry the reducer already applies to `hintsUsed`. The button is
  // still disabled at an empty balance, so this is not a way to farm free
  // answers; it is a way to not be charged for one.
  const requestHint = useCallback(() => {
    if (hintIsChargeable && !spendCoins(COIN_COSTS.HINT)) return;
    dispatch({ type: FUNGIKU_ACTIONS.REQUEST_HINT });
  }, [dispatch, hintIsChargeable, spendCoins]);

  /** The top rung, and the dearest: a cell solved outright (plan §11.2). */
  const revealMushroom = useCallback(() => {
    if (!canReveal) return;
    if (!spendCoins(COIN_COSTS.REVEAL)) return;
    dispatch({ type: FUNGIKU_ACTIONS.REVEAL_MUSHROOM });
  }, [canReveal, dispatch, spendCoins]);

  const dismissHint = useCallback(
    () => dispatch({ type: FUNGIKU_ACTIONS.DISMISS_HINT }),
    [dispatch]
  );

  /** The player acknowledging a win. Nothing else dismisses the dialog. */
  const dismissWin = useCallback(
    () => dispatch({ type: FUNGIKU_ACTIONS.DISMISS_WIN }),
    [dispatch]
  );

  // --- starting a puzzle, and the hitch at the top size ---------------------
  //
  // True while a big board is being generated. It exists so the half-second the
  // main thread spends inside `generate()` at 10×10 is *announced* rather than
  // experienced as a frozen app (plan §12.1).
  const [generating, setGenerating] = useState(false);

  // Identifies the most recent request. A tap that arrives while an earlier
  // deferred generation is still pending invalidates it, so rapid taps on
  // "New puzzle" resolve to the last one asked for rather than racing.
  const requestId = useRef(0);
  useEffect(
    () => () => {
      // Unmounted (left for the hub): make any pending callback a no-op rather
      // than let it dispatch into a dead provider.
      requestId.current += 1;
    },
    []
  );

  /**
   * Start a puzzle. Generation happens here rather than in the reducer so a
   * failure surfaces as a caught error instead of a throw mid-dispatch.
   */
  const startPuzzle = useCallback(
    ({ difficulty = state.difficulty, size, seed = state.seed }) => {
      // Resolved here, before anything is dispatched, because whether this
      // generation has to be deferred depends on the size — and the difficulty
      // menu hands over a rung, not a size. Same rule the reducer uses, so the
      // size decided here is the size that gets built.
      const identity = resolvePuzzleIdentity({ difficulty, size, seed });

      const run = () => {
        try {
          dispatch({
            type: FUNGIKU_ACTIONS.NEW_PUZZLE,
            // The feedback switch is a preference and carries over; the hint
            // count is per-puzzle and resets.
            // Nothing carries over from the board being left behind: a new
            // board is a full three lives, no red marks and no hints spent.
            payload: buildPuzzleState({
              difficulty: identity.difficulty,
              size: identity.size,
              seed,
            }),
          });
        } catch (error) {
          console.error('Fungiku generation failed:', error);
        }
      };

      // Small boards: generate inline. The work finishes inside the same frame,
      // so deferring would add a frame of latency and buy nothing.
      if (identity.size < DEFER_GENERATION_AT_SIZE) {
        run();
        return;
      }

      const id = (requestId.current += 1);
      setGenerating(true);

      // Two hops on purpose. The state update above only *schedules* a render;
      // requestAnimationFrame runs after that render is committed, and the
      // timeout after the frame it belongs to has been handed off — so
      // "Generating…" is on screen before the main thread disappears into the
      // generator. A bare setTimeout(0) can run before the frame is drawn.
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (requestId.current !== id) return; // superseded, or unmounted
          try {
            run();
          } finally {
            setGenerating(false);
          }
        }, 0);
      });
    },
    [dispatch, state.difficulty, state.seed]
  );

  /**
   * Another board like this one. Keeps the *size* rather than re-resolving the
   * difficulty, so "New puzzle" on a 6×6 easy board never hands back a 5×5 —
   * a size change is something the player asks for, not a side effect of a
   * reroll.
   */
  const nextPuzzle = useCallback(
    () => startPuzzle({ difficulty: state.difficulty, size: state.size, seed: state.seed + 1 }),
    [startPuzzle, state.difficulty, state.size, state.seed]
  );

  /** The menu's primary path in (plan §14.1): a rung, and the seed picks the size. */
  const changeDifficulty = useCallback(
    (difficulty, seed = DEFAULT_SEED) => startPuzzle({ difficulty, seed }),
    [startPuzzle]
  );

  /** The free-play escape hatch: one exact size, whatever rung it belongs to. */
  const changeSize = useCallback(
    (size) => startPuzzle({ size, seed: DEFAULT_SEED }),
    [startPuzzle]
  );

  /**
   * Developer-only: jump straight to a `{difficulty, seed}` board so a reported
   * one can be reopened by hand. Keeps the current size when there is one, so
   * typing a seed does not also move you to another board size.
   */
  const changeSeed = useCallback(
    (seed) => startPuzzle({ difficulty: state.difficulty, size: state.size, seed }),
    [startPuzzle, state.difficulty, state.size]
  );

  const clearMarks = useCallback(() => dispatch({ type: FUNGIKU_ACTIONS.CLEAR_MARKS }), [dispatch]);

  /**
   * Start the same board over after the last life is spent (plan §14.3).
   *
   * Driven by the player pressing "Try again", not by the reducer wiping the
   * board the moment the third mistake lands — see the note on PLACE_MUSHROOM.
   */
  const restartBoard = useCallback(
    () => dispatch({ type: FUNGIKU_ACTIONS.RESTART_BOARD }),
    [dispatch]
  );
  const undo = useCallback(() => dispatch({ type: FUNGIKU_ACTIONS.UNDO }), [dispatch]);
  const redo = useCallback(() => dispatch({ type: FUNGIKU_ACTIONS.REDO }), [dispatch]);

  const value = useMemo(
    () => ({
      ...state,
      mushroomCount,
      solved,
      // The *event*, for everything that celebrates. Nothing may key a
      // celebration on `solved`, or it replays on every remount. See above.
      winSeq,
      hasMarks,
      canUndo: selectCanUndo(state),
      canRedo: selectCanRedo(state),
      minSize: MIN_SIZE,
      maxSize: MAX_SIZE,
      generating,
      tapCell,
      placeMushroom,
      beginStroke,
      paintCells,
      endStroke,
      ruleOut,
      ruleOutCount,
      mistakeCells,
      lives,
      canReveal,
      // The wallet, as the screen needs it: one balance, and whether each
      // button's price can be paid.
      coins,
      hintIsChargeable,
      canAffordHint,
      canAffordReveal,
      canAffordRuleOut,
      // What the board earned (always answerable) and what this session granted
      // (only just now). The dialog draws the first and animates the second.
      winReward,
      winDismissed: state.winDismissed,
      dismissWin,
      lastReward: rewardForThisBoard,
      grantCoins,
      requestHint,
      revealMushroom,
      dismissHint,
      startPuzzle,
      nextPuzzle,
      changeDifficulty,
      changeSize,
      changeSeed,
      clearMarks,
      restartBoard,
      undo,
      redo,
    }),
    [
      state,
      mushroomCount,
      solved,
      winSeq,
      hasMarks,
      generating,
      tapCell,
      placeMushroom,
      beginStroke,
      paintCells,
      endStroke,
      ruleOut,
      ruleOutCount,
      mistakeCells,
      lives,
      canReveal,
      coins,
      hintIsChargeable,
      canAffordHint,
      canAffordReveal,
      canAffordRuleOut,
      rewardForThisBoard,
      winReward,
      dismissWin,
      grantCoins,
      requestHint,
      revealMushroom,
      dismissHint,
      startPuzzle,
      nextPuzzle,
      changeDifficulty,
      changeSize,
      changeSeed,
      clearMarks,
      restartBoard,
      undo,
      redo,
    ]
  );

  // Wait for hydration so a saved board never flashes as an empty one.
  return (
    <FungikuContext.Provider value={value}>{hydrated ? children : null}</FungikuContext.Provider>
  );
};

export const useFungikuContext = () => {
  const context = useContext(FungikuContext);
  if (context === undefined) {
    throw new Error('useFungikuContext must be used within a FungikuProvider');
  }
  return context;
};

export default FungikuContext;
