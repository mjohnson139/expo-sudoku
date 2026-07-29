import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

/** How long the win banner takes to spring in before the counting starts. */
const START_DELAY = 700;

/** One reason per beat. Slow enough to read, short enough not to be a cutscene. */
export const STEP_MS = 850;

/** How long the total sits on screen before the banner settles into its rest. */
const SETTLE_MS = 900;

/**
 * The payout animation (docs/fungiku-plan.md §14.4).
 *
 * Winning pays coins, and **the payout is watched rather than reported**: the
 * balance in the counter row counts up one reason at a time, and each reason says
 * itself as it lands. A single "+8 coins" would be the same information and none
 * of the feeling, and — more practically — a player who never sees "No hints
 * used +2" named has no reason to play for it.
 *
 * **The balance is derived, never held.** This hook owns only `pending`: how much
 * of the payout has not yet been revealed. The screen draws `coins - pending`, so
 * a coin spent *during* the animation (or at any time after it) moves the number
 * without this hook knowing anything about it. Holding a display copy of the
 * balance instead would need re-syncing on every spend, and would be wrong for a
 * frame each time.
 *
 * @param {{total: number, steps: Array<{label: string, coins: number}>}|null} reward
 *   the payout for the board on screen, or null when there is nothing to announce
 * @returns {{pending: number, stepIndex: number, step: Object|null, done: boolean,
 *   pop: Animated.Value}}
 */
const useCoinAward = (reward) => {
  // How much of the payout is still hidden. Counts down to 0 as reasons land.
  const [pending, setPending] = useState(0);
  // Which reason is showing: -1 before the first, `steps.length` once they are
  // all in and the banner is showing the total.
  const [stepIndex, setStepIndex] = useState(-1);
  const [done, setDone] = useState(false);

  // One value, one consumer (the coin pill) — not the per-cell case the board's
  // pop had to solve. JS-driven because it is reset with `setValue()`, and plan
  // §2's rule is that the two must never be mixed: the native driver does not
  // keep the JS value in step, so a value that is `setValue()`d can be stranded
  // at the reset value permanently.
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!reward) {
      setPending(0);
      setStepIndex(-1);
      setDone(true);
      return undefined;
    }

    setPending(reward.total);
    setStepIndex(-1);
    setDone(false);

    const timers = [];
    let hidden = reward.total;

    reward.steps.forEach((step, index) => {
      timers.push(
        setTimeout(() => {
          hidden -= step.coins;
          setPending(hidden);
          setStepIndex(index);

          pop.stopAnimation();
          pop.setValue(1);
          Animated.sequence([
            Animated.timing(pop, { toValue: 1.45, duration: 140, useNativeDriver: false }),
            Animated.timing(pop, { toValue: 1, duration: 260, useNativeDriver: false }),
          ]).start(({ finished }) => {
            // An explicit rest, so a cancelled run cannot leave the pill big.
            if (finished) pop.setValue(1);
          });
        }, START_DELAY + index * STEP_MS)
      );
    });

    // The total, held for a beat, then the banner settles back to naming the
    // board. `stepIndex === steps.length` is that "showing the total" state.
    timers.push(
      setTimeout(() => setStepIndex(reward.steps.length), START_DELAY + reward.steps.length * STEP_MS)
    );
    timers.push(
      setTimeout(() => setDone(true), START_DELAY + reward.steps.length * STEP_MS + SETTLE_MS)
    );

    return () => {
      timers.forEach(clearTimeout);
      pop.stopAnimation();
      pop.setValue(1);
      // Whatever was left hidden is not owed to the player twice: the wallet was
      // credited in full when the win was paid, and `pending` only ever hid it.
      // Releasing it here is what makes leaving mid-animation safe.
      setPending(0);
    };
    // Keyed on the reward object alone. It is set once per payout and never
    // rebuilt, so a spend mid-animation cannot restart the sequence.
  }, [reward, pop]);

  return {
    pending,
    stepIndex,
    step: reward && stepIndex >= 0 && stepIndex < reward.steps.length ? reward.steps[stepIndex] : null,
    done,
    pop,
  };
};

export default useCoinAward;
