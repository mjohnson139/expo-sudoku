import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  applyDailyFloor,
  canAfford,
  createWallet,
  grant,
  payOutWin,
  spend,
  today,
} from './wallet';
import { loadFungikuWallet, saveFungikuWallet } from './walletStorage';

/**
 * React's half of the assist wallet (docs/fungiku-plan.md §14.4). The rules and
 * the rates are in ./wallet.js; this holds the current one, writes it, and gives
 * the provider three verbs.
 *
 * **Not `usePersistentReducer`, on purpose.** That hook wires one reducer to one
 * storage key and dispatches a restore action into it, which is exactly right
 * for a board and exactly wrong for a balance: the wallet is not part of the
 * board's state, must not be restored by an action the board's reducer sees, and
 * outlives every board. It is a small global value, so it copies the shape of a
 * small global value.
 *
 * **The ref is load-bearing.** A spend is a check and a decrement that must not
 * be separated: the provider asks "can this be paid?" and then dispatches the
 * action it paid for, in one synchronous turn. Reading the balance out of React
 * state would read the value from the render that is on screen, so two taps
 * inside one frame could both see the last coin. `walletRef` is the authority
 * and `setWallet` is how it reaches the screen.
 */
const useFungikuWallet = () => {
  const [wallet, setWallet] = useState(createWallet);
  const [hydrated, setHydrated] = useState(false);

  const walletRef = useRef(wallet);

  /** The one place a wallet changes: ref first, then the screen, then storage. */
  const commit = useCallback((next) => {
    if (next === walletRef.current) return false;
    walletRef.current = next;
    setWallet(next);
    saveFungikuWallet(next);
    return true;
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadFungikuWallet().then((loaded) => {
      if (cancelled) return;

      // The floor is applied on the way in, before anything can be spent, so a
      // player who opens the app at zero already has today's allowance in hand
      // rather than discovering it after the first dead button.
      const floored = applyDailyFloor(loaded, today());

      walletRef.current = floored;
      setWallet(floored);
      // Only a change is written. `applyDailyFloor` returns the same object once
      // it has run today, so this is one write per day and not one per launch.
      if (floored !== loaded) saveFungikuWallet(floored);
      setHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Writes are debounced by 500 ms, and the screen unmounts the moment the
  // player leaves for the hub — the same reason `usePersistentReducer` flushes.
  useEffect(
    () => () => {
      if (saveFungikuWallet.flush) saveFungikuWallet.flush();
    },
    []
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'background' && next !== 'inactive') return;
      if (saveFungikuWallet.flush) saveFungikuWallet.flush();
      saveFungikuWallet(walletRef.current);
    });

    return () => subscription.remove();
  }, []);

  /**
   * Pay for an assist. Returns whether it went through, so the caller can
   * decline to dispatch the action it could not afford.
   *
   * The buttons are already disabled when the balance is short — this is the
   * second lock on the same door, not the error path.
   */
  const spendAssist = useCallback(
    (kind, cost) => {
      const current = walletRef.current;
      if (!canAfford(current, kind, cost)) return false;
      return commit(spend(current, kind, cost));
    },
    [commit]
  );

  /**
   * Add assists from anywhere: a win, a gift, or — when there is ever a store —
   * a purchase. §14.4 is explicit that all three are this one call and that the
   * store is not in scope, because neither `react-native-iap` nor RevenueCat
   * runs in Expo Go.
   */
  const grantAssists = useCallback(
    (kind, n = 1) => commit(grant(walletRef.current, kind, n)),
    [commit]
  );

  /**
   * Pay a finished board, at most once. Returns the reward when this board had
   * not already been paid, and null when it had — see `payOutWin` for why the
   * record is the board's identity rather than a flag.
   */
  const payWin = useCallback(
    (puzzle) => {
      const { wallet: next, reward } = payOutWin(walletRef.current, puzzle);
      if (!reward) return null;
      commit(next);
      return reward;
    },
    [commit]
  );

  return { wallet, walletHydrated: hydrated, spendAssist, grantAssists, payWin };
};

export default useFungikuWallet;
