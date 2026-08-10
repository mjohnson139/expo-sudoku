import { useRef } from 'react';
import type { View } from 'react-native';

/**
 * The board's top-left position in window coordinates.
 *
 * On the new architecture a `PanResponder`'s `locationX`/`locationY` are
 * relative to the touched *child* view — a tile — not to the responder, so a
 * gesture that needs "where on the board am I?" has to use `pageX`/`pageY` minus
 * the board's own origin.
 *
 * ### This is knowingly the second copy in the repo
 *
 * `hooks/useBoardOrigin.js` is the first, it solves the same problem, and its
 * version is the better one: it also exposes `toLocal` and documents that the
 * origin must be re-measured at gesture *grant* rather than only on layout.
 * **Converging the two is explicitly out of scope for this step** — Number
 * Slide's copy comes along as it is and the epic's Step 6 architecture review
 * decides whether the platform owns one hook or two (plan §3, §10).
 *
 * It is here, inside the game, rather than beside the platform's copy in
 * `hooks/`, for two reasons: a second `hooks/useBoardOrigin` differing only by
 * extension is the worst possible name for it, and TypeScript cannot import the
 * `.js` one while `allowJs` is off (plan §4.1). Step 2 brings Color Loop, which
 * needs the same file; if it is still two hooks then, that is the moment to lift
 * this one somewhere both games can see it — and Step 6 still owns the merge.
 */
export function useBoardOrigin() {
  const ref = useRef<View>(null);
  const origin = useRef({ x: 0, y: 0 });
  const measure = () => {
    ref.current?.measureInWindow((x, y) => {
      origin.current = { x, y };
    });
  };
  return { ref, origin, measure };
}

export default useBoardOrigin;
