import { useCallback, useRef } from 'react';

/**
 * The board's top-left position in window coordinates.
 *
 * **This exists because `locationX`/`locationY` cannot be trusted.** On the new
 * architecture, a `PanResponder`'s `locationX`/`locationY` are relative to the
 * *child* view the touch landed on — a single cell — not to the responder. Any
 * gesture that needs "where on the board am I?" has to use `pageX`/`pageY` minus
 * the board's own origin. (The sibling color-loop app hit this in both of its
 * games and a slider on the SDK 54 upgrade; docs/fungiku-plan.md §2 records it.)
 *
 * The origin is re-measured **at gesture grant**, not only on layout, because a
 * flex-centered board moves when something above it appears — Fungiku's win
 * banner mounts and unmounts, which shifts the board by its whole height.
 *
 * Usage:
 *   const { ref, onLayout, measure, toLocal } = useBoardOrigin();
 *   <View ref={ref} onLayout={onLayout} {...responder.panHandlers} />
 *   // in onPanResponderGrant: measure();
 *   // then: toLocal(nativeEvent.pageX, nativeEvent.pageY)
 */
const useBoardOrigin = () => {
  const ref = useRef(null);
  const origin = useRef({ x: 0, y: 0 });

  /**
   * Re-read the origin. Asynchronous by nature (it round-trips to the native
   * layout), so callers get the previous value until it resolves — which is why
   * `onLayout` primes it and grant only refreshes it.
   */
  const measure = useCallback(() => {
    const node = ref.current;
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((x, y) => {
        if (Number.isFinite(x) && Number.isFinite(y)) {
          origin.current = { x, y };
        }
      });
    }
  }, []);

  const onLayout = useCallback(() => {
    measure();
  }, [measure]);

  /** Convert a window-space point to board-space. */
  const toLocal = useCallback(
    (pageX, pageY) => ({
      x: pageX - origin.current.x,
      y: pageY - origin.current.y,
    }),
    []
  );

  return { ref, onLayout, measure, toLocal };
};

export default useBoardOrigin;
