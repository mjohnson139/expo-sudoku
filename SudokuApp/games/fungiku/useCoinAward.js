import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { AWARD_START_MS } from './winPresentation';

/**
 * The payout, held back until the dialog is ready to show it
 * (docs/fungiku-plan.md §14.4, §12.11).
 *
 * ### It used to narrate, and the operator asked it to stop
 *
 * The first version walked the payout one reason at a time: the balance counted
 * up in beats, each reason naming itself as it landed, over about four seconds.
 * The intent was that a player who never sees *"No hints used +2"* named has no
 * reason to play for it. On device it read as clunky — five separate things
 * animating in for one event — and the verdict was *"it doesn't have to animate
 * each thing… I can just kind of show some confetti and then show the results."*
 *
 * So the reasons are still all named, in the dialog, but they **arrive together**.
 * What went with the walk: `stepIndex`, `step`, `STEP_MS`, `SETTLE_MS` and the
 * chain of timers that drove them. One timer remains.
 *
 * ### The balance is derived, never held
 *
 * This hook owns only `pending`: how much of the payout has not been revealed
 * yet. The screen draws `coins - pending`, so a coin spent *during* the
 * celebration (or at any time after it) moves the number without this hook
 * knowing anything about it. Holding a display copy of the balance instead would
 * need re-syncing on every spend, and would be wrong for a frame each time.
 *
 * @param {{total: number, steps: Array<{label: string, coins: number}>}|null} reward
 *   the payout for the board on screen, or null when there is nothing to announce
 * @returns {{pending: number, revealed: boolean, done: boolean, pop: Animated.Value}}
 */
const useCoinAward = (reward) => {
  // How much of the payout is still hidden — all of it, then none of it.
  const [pending, setPending] = useState(0);
  const [revealed, setRevealed] = useState(false);

  // One value, one consumer (the coin pill). JS-driven because it is reset with
  // `setValue()`, and plan §2's rule is that the two must never be mixed: the
  // native driver does not keep the JS value in step, so a value that is
  // `setValue()`d can be stranded at the reset value permanently.
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!reward) {
      setPending(0);
      setRevealed(true);
      return undefined;
    }

    setPending(reward.total);
    setRevealed(false);

    const timer = setTimeout(() => {
      setPending(0);
      setRevealed(true);

      pop.stopAnimation();
      pop.setValue(1);
      Animated.sequence([
        Animated.timing(pop, { toValue: 1.5, duration: 160, useNativeDriver: false }),
        Animated.timing(pop, { toValue: 1, duration: 280, useNativeDriver: false }),
      ]).start(({ finished }) => {
        // An explicit rest, so a cancelled run cannot leave the pill big.
        if (finished) pop.setValue(1);
      });
    }, AWARD_START_MS);

    return () => {
      clearTimeout(timer);
      pop.stopAnimation();
      pop.setValue(1);
      // Whatever was left hidden is not owed to the player twice: the wallet was
      // credited in full when the win was paid, and `pending` only ever hid it.
      // Releasing it here is what makes leaving mid-celebration safe.
      setPending(0);
    };
    // Keyed on the reward object alone. It is set once per payout and never
    // rebuilt, so a spend mid-celebration cannot restart the sequence.
  }, [reward, pop]);

  return {
    pending,
    revealed,
    // Kept as a name of its own: the screen uses it to decide whether the coin
    // balance is still a live region worth announcing. It happens to equal
    // `revealed` today, and would not if another beat were ever added.
    done: revealed,
    pop,
  };
};

export default useCoinAward;
