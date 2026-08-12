import { useCallback, useRef } from 'react';
import type { View } from 'react-native';

/**
 * The board's top-left position in window coordinates.
 *
 * On the new architecture a `PanResponder`'s `locationX`/`locationY` are
 * relative to the touched *child* view — a tile — not to the responder, so a
 * gesture that needs "where on the board am I?" has to use `pageX`/`pageY` minus
 * the board's own origin. Both incoming games and the sibling app's slider were
 * bitten by this on the SDK 54 upgrade (docs/colorloop-merge-plan.md §10).
 *
 * ### Why this moved here in Step 2, and what is still open
 *
 * Step 1 parked its copy at `games/numberslide/useBoardOrigin.ts` and left a
 * note: *"Step 2 brings Color Loop, which needs the same file; if it is still
 * two hooks then, that is the moment to lift this one somewhere both games can
 * see it."* It is, so it is lifted — **three** callers now, counting the
 * `Slider` in `components/Controls.tsx`. Promoting a function that has three
 * real callers is the opposite of building a framework; it is what plan §4.5
 * says to do with `mulberry32`, for the same reason.
 *
 * **This is still knowingly the second implementation in the repo.**
 * `hooks/useBoardOrigin.js` is the first and Fungiku uses it. The two are not
 * merged here because merging them means either converting a JavaScript hook to
 * TypeScript — which plan §4.1 forbids in this epic — or having the TypeScript
 * games import a `.js` hook whose `useRef(null)` infers as
 * `MutableRefObject<null>` and will not typecheck against a `View`'s `ref`.
 * **Step 6's architecture review owns whether the platform ends up with one hook
 * or two** (plan §3), and it now has a much smaller question to answer: two
 * files, not three, and the difference between them is a `.js`/`.ts` extension
 * and `toLocal`'s callers.
 *
 * What did converge is the *behaviour*. The platform hook guards against a
 * non-finite measurement and exposes `toLocal`; this one now does both. Nothing
 * Number Slide draws moves as a result — a `NaN` origin was never a working
 * case — and when Step 6 picks a survivor there is no behavioural difference
 * left to reconcile.
 *
 * Usage:
 *   const { ref, origin, measure, toLocal } = useBoardOrigin();
 *   <View ref={ref} onLayout={measure} {...responder.panHandlers} />
 *   // in onPanResponderGrant: measure();
 *   // then: toLocal(nativeEvent.pageX, nativeEvent.pageY)
 */
export function useBoardOrigin() {
  const ref = useRef<View>(null);
  const origin = useRef({ x: 0, y: 0 });

  /**
   * Re-read the origin. Asynchronous by nature — it round-trips to the native
   * layout — so callers get the previous value until it resolves, which is why
   * `onLayout` primes it and grant only refreshes it. A flex-centred board moves
   * when anything above it appears, so measuring at layout alone is not enough.
   */
  const measure = useCallback(() => {
    ref.current?.measureInWindow((x, y) => {
      if (Number.isFinite(x) && Number.isFinite(y)) {
        origin.current = { x, y };
      }
    });
  }, []);

  /** Convert a window-space point to board-space. */
  const toLocal = useCallback(
    (pageX: number, pageY: number) => ({
      x: pageX - origin.current.x,
      y: pageY - origin.current.y,
    }),
    []
  );

  return { ref, origin, measure, toLocal };
}

export default useBoardOrigin;
