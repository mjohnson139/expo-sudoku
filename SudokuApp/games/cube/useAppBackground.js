import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/**
 * Run something when the app actually leaves (docs/cube-plan.md §7.1).
 *
 * ### Why `background` and not `inactive`
 *
 * iOS passes through `inactive` on the way out, and it also passes through it
 * for things that are **not** leaving: pulling down Control Centre, the app
 * switcher being peeked at, a notification banner arriving. `CubeProvider`'s
 * save flush deliberately treats `inactive` as leaving, because flushing early
 * costs nothing and a phone that evicts the process during that peek would
 * otherwise lose the last 400ms of authored work.
 *
 * **This hook is for the other kind of work** — throwing away where the operator
 * was standing — and there the two states are not interchangeable. Resetting the
 * transport because somebody glanced at Control Centre and came straight back
 * would lose their place for a gesture that never left the app. Android reports
 * `background` directly and never sees `inactive` at all.
 *
 * The callback is held in a ref, so a caller may pass an inline function without
 * re-subscribing on every render.
 *
 * @param {Function} onBackground called once each time the app goes to the
 *   background
 */
const useAppBackground = (onBackground) => {
  const handler = useRef(onBackground);
  handler.current = onBackground;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'background') handler.current();
    });
    return () => subscription.remove();
  }, []);
};

export default useAppBackground;
