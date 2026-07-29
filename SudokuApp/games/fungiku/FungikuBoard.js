import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing, PanResponder, PixelRatio } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MARKS } from './engine';
import { getRegionColor, MUSHROOM_VALUE, SYMBOL_SET_IDS } from '../../utils/symbolSets';
import Symbol from '../../components/Symbol';
import useBoardSize from '../../hooks/useBoardSize';
import useBoardOrigin from '../../hooks/useBoardOrigin';
import { boardExtent, cellFromPoint, cellsAlongLine } from './geometry';
import {
  waveKeyframes,
  waveOutputRange,
  WAVE_DELAY_MS,
  WAVE_DURATION_MS,
} from './celebration';
import { PAINT_MODES } from './reducer';
import { useFungikuContext } from './FungikuContext';

/**
 * Stable object identity, so the sizing hook's memo is not invalidated on every
 * render by a fresh options literal. Exported because the screen has to ask the
 * same question — the counter row and the banners line up with the board, and
 * they cannot line up with a different answer.
 */
export const FILL_WIDTH = { fill: true };

/**
 * The Fungiku board.
 *
 * Region outlines *are* the board's structure (docs/fungiku-plan.md §3) — they
 * stand in for Sudoku's 3×3 box lines, and they are the only way the player sees
 * where one color region ends. An edge is drawn thick wherever the neighboring
 * cell belongs to a different region.
 *
 * Everything visual comes from the active theme: which region palette (light or
 * dark) is chosen, the outline color, and the glyph ink — which is picked for
 * contrast against each region's own fill rather than being the region's hue, so
 * a mushroom never disappears into an orange cell.
 *
 * @param {boolean} isDark - whether the active theme is a dark one
 * @param {Object} theme - a theme object from utils/themes
 */

const MARK_LABELS = {
  [MARKS.EMPTY]: 'empty',
  [MARKS.X]: 'ruled out',
  [MARKS.MUSHROOM]: 'mushroom',
};

/**
 * Placing a mushroom needs a way in that is not a double tap, because a screen
 * reader has no way to produce one (plan §14.2). Hoisted to module scope so the
 * array identity is stable across every cell and every render.
 *
 * Known gap, carried in the handoff: react-native-web does not map custom
 * accessibility actions, so on the web build this reaches native screen readers
 * only. `onAccessibilityTap` — the ✕ — works everywhere.
 */
const ACCESSIBILITY_ACTIONS = [
  { name: 'activate', label: 'Rule out or clear' },
  { name: 'placeMushroom', label: 'Place mushroom' },
];

/**
 * When a touch stops being a tap and becomes a stroke.
 *
 * **The test is "did the finger reach another cell", not "did it move N pixels".**
 * It used to be a flat 6px, and that was survivable while a tap only ever cycled
 * a mark: a shaky tap that tipped over the threshold became a one-cell stroke
 * and painted the very same ✕ the tap would have, so nobody could tell.
 *
 * The double-tap (plan §14.2) ended that. A wobble past 6px on *either* half of
 * the pair turns that half into a stroke, which resets the double-tap and leaves
 * the player with a ✕ they have to tap again — or, if it was the second half
 * starting on a ✕, an *erase* stroke that wipes the cell. The mushroom simply
 * does not go in, and it fails differently depending on which tap wobbled. That
 * is the "tapping is very unpredictable" the operator hit on device, and 6px of
 * travel is well within what a finger does on glass while holding still.
 *
 * Leaving the starting cell is the honest test, because it is exactly what a
 * sweep does and what a tap does not. `MAX_TAP_TRAVEL` is only the backstop for
 * a finger that leaves the board altogether, where there is no new cell to
 * compare against.
 */
const MAX_TAP_TRAVEL = 28;

/**
 * How long after a tap a second tap on the same cell still counts as a
 * double-tap, and therefore places a mushroom (plan §14.2).
 *
 * Longer than the ~250 ms a platform double-tap usually allows, on purpose: the
 * player this game is for is a child, and a child's second tap is slower than an
 * adult's. The cost of being generous here is small — the only thing a late
 * second tap does instead is clear the X the first tap placed, which is one more
 * tap to put back — while the cost of being strict is a mushroom that "won't go
 * in".
 *
 * **A number to check on device, not in a browser** (plan §2). A mouse click and
 * a small finger on glass are not the same gesture.
 */
const DOUBLE_TAP_MS = 320;

const FungikuBoard = ({ isDark, theme, onTouchActiveChange }) => {
  const {
    size,
    regions,
    marks,
    mistakeCells,
    lastMistake,
    lives,
    hint,
    tapCell,
    placeMushroom,
    paintCells,
    beginStroke,
    endStroke,
    solved,
    generating,
  } = useFungikuContext();

  // Cells a hint is pointing at: a whole row/column/region for a nudge, a single
  // cell for a mistake or a reveal.
  const hintCells = useMemo(() => new Set(hint?.cells || []), [hint]);

  // `fill` — Fungiku's board takes the width the screen offers rather than
  // Sudoku's fixed 324. See useBoardSize.
  const available = useBoardSize(FILL_WIDTH);
  const { pad, cell } = boardExtent(available, size);
  const glyph = Math.round(cell * 0.62);

  // --- separated tiles (operator request, 2026-07-29) -----------------------
  //
  // The board is no longer a grid with lines drawn on it: it is a field of
  // rounded tiles that do not touch. The gap between them is the board's
  // background showing through, which is where the structure now comes from.
  //
  // **The gap lives *inside* the cell box, and that is load-bearing.** The cell
  // pitch is unchanged and the board's box is still exactly `cell × size`, so
  // `cellFromPoint` needs to know nothing about any of this and a finger landing
  // in a gap still belongs to the nearest cell — there is no dead space to miss.
  // Anything that changed the pitch would have to change the touch geometry with
  // it, and that is the part of this board that has cost the most to get right.
  //
  // Both scale with the cell so a 10×10 board (32pt cells on a phone) reads the
  // same as a 5×5 one (64pt), rather than being swallowed by a gap tuned for the
  // large end. Snapped to device pixels for the same reason every line was:
  // a half-pixel inset antialiases into a smear whose visibility depends on the
  // fill behind it.
  const gap = Math.max(2, PixelRatio.roundToNearestPixel(cell * 0.09));
  const inset = PixelRatio.roundToNearestPixel(gap / 2);
  const radius = Math.max(3, Math.round(cell * 0.16));

  // What shows *through* the gaps, and the band around the outside of them.
  //
  // It is a **card the board sits inside**, not a background on the board
  // itself. The board's box is the touch geometry — `cellFromPoint` resolves
  // every tap against its origin — so it may never carry padding. A parent that
  // does is fine: `measureInWindow` reads the board's own position, which
  // already accounts for the card's padding, so the touch path is untouched.
  //
  // The card exists because the board's own background was not enough: the only
  // thing outside the edge tiles was their half-gap, which at 10×10 is about a
  // pixel, so the outer columns looked shaved while the interior ones did not.
  // `pad` is a band of gutter wide enough to read as a frame at every size.
  //
  // **It cannot just be the page**, which is what the first version left showing:
  // the dark palette's palest fill is a dark tint, and against a dark page those
  // tiles had no edge and floated. A gutter that is always *lighter* than
  // everything on top of it gives every tile an edge by construction, whatever
  // the theme or the fill — the same reasoning as the contrast-picked glyph ink,
  // applied to the space between tiles instead of the mark inside one.
  //
  // Translucent white on dark themes rather than a fixed grey, so it lifts the
  // theme's own hue (twilight's page is purple, not grey) instead of dropping a
  // neutral on top of it.
  const gutter = isDark ? 'rgba(255,255,255,0.10)' : '#ffffff';

  // --- legibility at the top size (plan §12.3) ------------------------------
  //
  // The board is a fixed 324pt on native however many cells it holds, so a cell
  // is 64px at 5×5 and **32px at 10×10**. Anything drawn inside a cell was tuned
  // against the large end and stops working at the small one, which is why the
  // gap and the corner radius above are both fractions of the cell rather than
  // constants.
  //
  // Note what the browser cannot tell you here: web boards are up to 450px, so a
  // 10×10 cell is 45px there — *larger* than a 5×5 native cell. None of this is
  // judgeable outside Expo Go.

  // --- drag to sweep X's (plan §2) -----------------------------------------
  //
  // The board claims every touch that starts on it, in the **capture phase, at
  // touch-down**. That is not an optimization — it is the fix for a bug the
  // operator hit on device: claiming on *movement* instead means racing the
  // enclosing ScrollView, and vertically the ScrollView wins. It is already
  // tracking the same touch, and once vertical movement passes its slop it takes
  // it — via onInterceptTouchEvent on Android, and on iOS because
  // canCancelContentTouches defaults to letting a scroll view cancel a child's
  // touch. So the page scrolled instead of X's appearing.
  //
  // Claiming at touch-down removes the race entirely: there is no window in
  // which the ScrollView can decide the gesture is a scroll. The cost is that
  // taps arrive here rather than at a per-cell Touchable, so this component
  // distinguishes them (release under the threshold = tap), and the cells keep
  // their accessibility labels plus onAccessibilityTap for screen readers.
  //
  // FungikuScreen completes the fix on the ScrollView side.
  const { ref: boardRef, onLayout, measure, toLocal } = useBoardOrigin();

  // Refs, not state: these change many times per frame during a stroke and must
  // never trigger a re-render of their own.
  const startPoint = useRef(null);
  const lastCell = useRef(-1);
  const paintMode = useRef(PAINT_MODES.X);
  const isStroke = useRef(false);

  // The previous tap, for the double-tap detector. A ref because it is written
  // on every touch and must never cause a render of its own.
  const previousTap = useRef({ cell: -1, at: 0 });

  // Tap feedback, which the per-cell Touchables used to give for free.
  const [pressedCell, setPressedCell] = useState(-1);

  // Positive confirmation (plan §11.1): a placement should *feel* like one, not
  // merely fail to turn red. Deliberately fires for **every** mushroom placed,
  // right or wrong — animating only correct ones would leak the solution to
  // anyone who had left correctness feedback switched off.
  //
  // **One Animated.Value per cell, not one shared value pointed at "the cell that
  // just popped".** That shared-value version had a real bug: resetting the value
  // to 0 happens imperatively and immediately, but re-pointing it at the new cell
  // is a React state update that only lands on the next render — so for those
  // frames the value sat at 0 while still attached to the *previous* mushroom,
  // and the earlier mushroom visibly shrank and snapped back. Per-cell values
  // remove the class of bug rather than patching the ordering.
  //
  // **The value is a 0→1 progress, and every part of the sprout is interpolated
  // from it** (plan §12.7). It used to *be* the scale, which is why the sprout
  // costs no extra values, no extra animations and no extra state: a rise, a
  // tilt and a squash-and-stretch are four interpolations of the one spring. It
  // still rests at exactly 1, where every interpolation is the identity pose, so
  // a mushroom nobody has just placed is drawn exactly as it was before.
  const popValues = useMemo(
    () => Array.from({ length: size * size }, () => new Animated.Value(1)),
    [size]
  );
  // A wrong guess shakes its cell (plan §14.3). **One value per cell**, for the
  // same reason the pop has one: a single shared value re-pointed at "the cell
  // that just went wrong" is re-pointed by a state update but reset immediately,
  // so for a frame it is still attached to the previous cell. Per-cell values
  // remove the class of bug rather than patching the ordering.
  const shakeValues = useMemo(
    () => Array.from({ length: size * size }, () => new Animated.Value(0)),
    [size]
  );

  useEffect(() => {
    if (!lastMistake) return;
    const value = shakeValues[lastMistake.cell];
    if (!value) return;

    // Stop anything still running before restarting, and drive with the JS
    // driver because this value is `setValue`d — mixing setValue with the native
    // driver is what stranded the win animation's scales (plan §2).
    value.stopAnimation();
    value.setValue(0);
    Animated.sequence([
      Animated.timing(value, { toValue: 1, duration: 50, useNativeDriver: false }),
      Animated.timing(value, { toValue: -1, duration: 70, useNativeDriver: false }),
      Animated.timing(value, { toValue: 0.6, duration: 60, useNativeDriver: false }),
      Animated.timing(value, { toValue: 0, duration: 60, useNativeDriver: false }),
    ]).start(() => {
      // Whatever interrupts it, the cell must not be left off-centre.
      value.setValue(0);
    });
    // `seq` is in the deps on purpose: two wrong guesses in the *same* cell are
    // two events, and without it the second would not re-fire.
  }, [lastMistake, shakeValues]);

  const previousMarks = useRef(marks);

  useEffect(() => {
    const before = previousMarks.current;
    previousMarks.current = marks;
    if (before === marks || before.length !== marks.length) return;

    // A single new mushroom means a placement; several at once means an undo or a
    // restore, which should not pop.
    const placed = marks.reduce(
      (found, mark, cell) =>
        mark === MARKS.MUSHROOM && before[cell] !== MARKS.MUSHROOM ? [...found, cell] : found,
      []
    );
    if (placed.length !== 1) return;

    const value = popValues[placed[0]];
    if (!value) return;

    // Stop anything already running on this cell's value before restarting it.
    // Placing, removing and replacing a mushroom quickly would otherwise leave
    // two springs driving one value.
    value.stopAnimation();
    value.setValue(0);
    Animated.spring(value, {
      toValue: 1,
      // Loose enough to overshoot, which is what makes the sprout land with a
      // wobble instead of easing politely into place. The overshoot is not
      // clamped anywhere: the interpolations below extrapolate past 1, so the
      // scale swells a little, the tilt swings through upright to the other side,
      // and the rise carries the mushroom a few pixels above its resting spot
      // before settling. That is the whole of the "fun" — one spring, read four
      // ways.
      friction: 5,
      tension: 140,
      // **Deliberately NOT the native driver.** This value has to *rest* at
      // exactly 1, and it is reset with setValue() on every placement — and
      // mixing setValue() with useNativeDriver leaves the JS-side value as a
      // stale copy, because the animation runs natively and does not write back.
      // The operator caught the result: on a solved 8×8, five of eight mushrooms
      // sat permanently smaller than the rest, their scale stranded at the pop's
      // start value. With the JS driver the value is the single source of truth
      // and lands on 1.
      useNativeDriver: false,
    }).start(() => {
      // Belt and braces: whatever interrupts the spring, the cell must not be
      // left mid-pop. A stuck scale is a permanent visual defect, not a glitch.
      value.setValue(1);
    });
  }, [marks, popValues]);

  // Re-measure whenever something *above* the board appears or disappears.
  //
  // `onLayout` is not enough: on web it is backed by a ResizeObserver, which
  // watches a view's size and not its position — so a board that gets pushed
  // down by a banner mounting never fires it. And the `measure()` at touch-down
  // resolves asynchronously, which is too late for that same touch. The result
  // was a real bug: the first tap after a hint appeared landed on the wrong cell,
  // or missed the board entirely.
  //
  // This effect runs after the banner has been committed, so the origin is right
  // before the player can touch anything. `hint` and `solved` are the two things
  // that mount a banner above the board.
  // `generating` and `lives.left` are in here for the same reason, one step
  // weaker: they change what the row above the board *renders* rather than
  // whether it exists. That row keeps its height by design — the hearts live
  // inside it precisely so losing one cannot move the board — so this is the
  // cheap insurance that says so, and the place the next thing added above the
  // board belongs.
  useEffect(() => {
    measure();
  }, [hint, solved, generating, lives.left, measure]);

  // The latest marks/geometry, readable from inside gesture callbacks that were
  // created once and would otherwise close over a stale render.
  const live = useRef({ marks, cell, size });
  live.current = { marks, cell, size };

  const cellAt = (pageX, pageY) => {
    const { x, y } = toLocal(pageX, pageY);
    const { cell: cellSize, size: boardCells } = live.current;
    return cellFromPoint({ x, y, cellSize, size: boardCells });
  };

  /**
   * Touch-down bookkeeping, shared by the capture- and bubble-phase claims.
   * Idempotent: only one of the two ever runs for a given touch, but running it
   * twice would do no harm.
   */
  const beginTouch = (event) => {
    startPoint.current = {
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
    };
    isStroke.current = false;

    // Re-measure here rather than only on layout: the win banner above the board
    // mounts and unmounts, which moves the board.
    measure();

    // Freeze scrolling for as long as the finger is down on the board. Belt and
    // braces with canCancelContentTouches on the screen: this is the one that
    // reliably stops Android's ScrollView.
    onTouchActiveChange?.(true);

    setPressedCell(cellAt(startPoint.current.x, startPoint.current.y));
  };

  /** Common tail for release and terminate: hand scrolling back. */
  const finish = () => {
    lastCell.current = -1;
    isStroke.current = false;
    setPressedCell(-1);
    onTouchActiveChange?.(false);
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        // Claim at touch-down, before the ScrollView can start interpreting the
        // touch as a scroll. This is the fix.
        //
        // Registered in *both* phases on purpose. The capture phase is what
        // pre-empts the ScrollView on native; but react-native-web does not
        // appear to honour a capture-phase claim on touch start, and with the
        // cells now plain Views that left touch taps dead — nothing handled
        // them. The bubble-phase handler is the fallback that keeps taps working
        // wherever capture isn't honoured. Whichever fires first wins; the other
        // is never consulted, and `beginTouch` is safe to run either way.
        onStartShouldSetPanResponderCapture: (event) => {
          beginTouch(event);
          return true;
        },
        onStartShouldSetPanResponder: (event) => {
          beginTouch(event);
          return true;
        },

        // Already the responder, so these only matter if something upstream
        // tries to hand the touch over mid-gesture.
        onMoveShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,

        onPanResponderMove: (event, gesture) => {
          if (!isStroke.current) {
            const first = startPoint.current
              ? cellAt(startPoint.current.x, startPoint.current.y)
              : -1;
            const under = cellAt(event.nativeEvent.pageX, event.nativeEvent.pageY);

            // Still a tap while the finger is over the cell it started on. Only
            // reaching a *different* cell makes this a sweep — the backstop
            // catches a finger that has left the board, where `under` is -1 and
            // there is no cell to compare with.
            const reachedAnother = under >= 0 && under !== first;
            const leftTheBoard = under < 0 && Math.hypot(gesture.dx, gesture.dy) > MAX_TAP_TRAVEL;
            if (!reachedAnother && !leftTheBoard) return;

            isStroke.current = true;
            setPressedCell(-1);

            // The first cell decides the whole stroke: starting on an X erases,
            // starting anywhere else paints. Fixing the mode up front means
            // dragging back over your own path doesn't flip cells twice.
            paintMode.current =
              first >= 0 && live.current.marks[first] === MARKS.X
                ? PAINT_MODES.ERASE
                : PAINT_MODES.X;

            beginStroke();
            lastCell.current = first;
            if (first >= 0) paintCells([first], paintMode.current);
          }

          const next = cellAt(event.nativeEvent.pageX, event.nativeEvent.pageY);
          if (next < 0 || next === lastCell.current) return;

          // Fill everything between the last point and this one — at speed a
          // finger can skip several cells between move events.
          const span =
            lastCell.current >= 0
              ? cellsAlongLine(lastCell.current, next, live.current.size)
              : [next];

          lastCell.current = next;
          paintCells(span, paintMode.current);
        },

        onPanResponderRelease: () => {
          if (isStroke.current) {
            // A stroke is not a tap, and must not become half of a double one:
            // tap, drag, tap should be two separate taps.
            previousTap.current = { cell: -1, at: 0 };
            endStroke();
          } else {
            // Never travelled: it was a tap. Taps land here rather than on a
            // per-cell Touchable, because the board owns the touch from the
            // moment it starts — which is also why the double-tap detector has
            // to live *inside* this responder (plan §14.2). A second
            // PanResponder or a child Touchable would never see the second tap.
            const tapped = startPoint.current
              ? cellAt(startPoint.current.x, startPoint.current.y)
              : -1;

            if (tapped >= 0) {
              const now = Date.now();
              const previous = previousTap.current;
              const isSecond = previous.cell === tapped && now - previous.at <= DOUBLE_TAP_MS;

              if (isSecond) {
                // Consume it, so a third tap starts over rather than reading as
                // a second double-tap.
                previousTap.current = { cell: -1, at: 0 };
                placeMushroom(tapped);
              } else {
                // **Not deferred.** The X goes in now and the second tap
                // upgrades the cell if it arrives. Waiting out the window here
                // would put a ~300 ms delay on the most common gesture in the
                // game.
                previousTap.current = { cell: tapped, at: now };
                tapCell(tapped);
              }
            }
          }
          finish();
        },
        onPanResponderTerminate: () => {
          if (isStroke.current) endStroke();
          finish();
        },

        // Don't let anything steal the stroke mid-sweep (the ScrollView this
        // board sits in would happily take it).
        onPanResponderTerminationRequest: () => false,

        // Android: tell the native responder — the ScrollView — to stand down.
        onShouldBlockNativeResponder: () => true,
      }),
    // Built once: every value it touches is read through a ref.
    [beginStroke, endStroke, paintCells, tapCell, placeMushroom, measure]
  );


  // The board itself celebrates a win first (a gentle lift), before the banner
  // above it arrives — same "board celebrates first" idea the sibling color-loop
  // app uses for its win sequence.
  //
  // **It pops and comes back.** It used to animate to 1 and *stay* there, which
  // meant a solved board sat permanently 4% wider than everything else in the
  // column: it stuck out past the counter row above it, and once the board
  // started filling the screen's width it had nowhere left to grow into. That is
  // the whole of the operator's *"it's just when you finish a game"* — the
  // celebration was not a celebration, it was a resize.
  //
  // A resting scale of exactly 1 also keeps the board's drawn box equal to its
  // measured box, which is what every tap is resolved against. Undo still works
  // on a finished board, so that is not academic.
  const winLift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = solved
      ? Animated.sequence([
          Animated.timing(winLift, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.back(2)),
            useNativeDriver: true,
          }),
          Animated.timing(winLift, {
            toValue: 0,
            duration: 420,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      : Animated.timing(winLift, {
          toValue: 0,
          duration: 160,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        });

    animation.start();

    // No `setValue` anywhere near this one — it is native-driven, and plan §2's
    // rule is that the two must never be mixed. Un-solving while the pop is in
    // flight is handled by the `!solved` branch, which animates it home.
    return () => animation.stop();
  }, [solved, winLift]);

  // --- the win wave (plan §12.7) -------------------------------------------
  //
  // Every mushroom on a solved board hops, one diagonal at a time, from the
  // top-left corner to the bottom-right. It is the payoff for the whole puzzle,
  // and it is the one moment where the mushrooms are the subject rather than the
  // notation.
  //
  // **One value for the entire board, and it is not the per-cell rule breaking.**
  // The rule the handoff carries — never one shared value pointed at "the current
  // cell" — is about a value that gets *re-pointed*, because re-pointing is a
  // render and resetting is immediate, so for a frame the value is still attached
  // to the last cell. Nothing is re-pointed here: every mushroom reads this same
  // progress at once and each one interpolates it through its own fixed window,
  // so the stagger is geometry (celebration.js) rather than scheduling.
  //
  // That is also what lets it run on the **native driver** — one animation, no
  // `setValue`, a hundred cells — while the placement pop above stays JS-driven
  // because it *is* `setValue`d. Plan §2's rule is that the two must never be
  // mixed **on one value**; keeping them on separate values, in separate
  // Animated.Views, is how both get the driver they need.
  const winWave = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    // Both ends of the progress are the resting pose (celebration.js), so
    // cancelling is a jump to the nearest end rather than an unwind — an undo
    // across the win line must never leave a mushroom stranded mid-hop.
    const animation = solved
      ? Animated.sequence([
          Animated.timing(winWave, {
            toValue: 1,
            duration: WAVE_DURATION_MS,
            delay: WAVE_DELAY_MS,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          // Home again for the next win. A 1 ms trip rather than `setValue`,
          // which may not be mixed with the native driver — and invisible,
          // because both ends draw the identical pose.
          Animated.timing(winWave, { toValue: 0, duration: 1, useNativeDriver: true }),
        ])
      : Animated.timing(winWave, { toValue: 0, duration: 1, useNativeDriver: true });

    animation.start();

    return () => animation.stop();
  }, [solved, winWave]);

  // How far a mushroom hops, and how big it swells at the top of the hop. Both
  // scale with the cell, so a 10×10 board (32pt cells on a phone) reads the same
  // as a 5×5 one rather than barely moving. The hop leaves the tile — that is
  // the point of it — but it never touches layout, so the board's drawn box
  // stays equal to its measured box and taps keep resolving correctly even
  // mid-celebration.
  const waveLift = Math.round(cell * 0.22);

  // Both sets of transforms are built **once per board**, not per render.
  //
  // Interpolating inline in the JSX would mint a fresh AnimatedInterpolation for
  // every mushroom on every render — and this board re-renders on every touch
  // down, every touch up and every mark — which means tearing down and rebuilding
  // up to a hundred native animation nodes mid-gesture. The values themselves are
  // already stable per board (`popValues`) or per component (`winWave`), so the
  // nodes reading them can be too.
  const waveTransforms = useMemo(
    () =>
      Array.from({ length: size * size }, (_, index) => {
        const inputRange = waveKeyframes(index, size);
        return [
          {
            translateY: winWave.interpolate({
              inputRange,
              outputRange: waveOutputRange(0, -waveLift),
            }),
          },
          {
            scale: winWave.interpolate({ inputRange, outputRange: waveOutputRange(1, 1.18) }),
          },
        ];
      }),
    [size, waveLift, winWave]
  );

  // A mushroom does not appear, it *grows*: it rises into the cell from below,
  // squashed flat and tilted, and stretches upright as it arrives. Every one of
  // these is the same spring read through a different interpolation — which is
  // why the sprout costs no extra values and no extra animations — and every
  // output range **ends on the identity pose**, so a mushroom at rest is drawn
  // exactly as the plain scale drew it.
  const sproutTransforms = useMemo(
    () =>
      popValues.map((value) => [
        {
          translateY: value.interpolate({
            inputRange: [0, 1],
            outputRange: [Math.round(glyph * 0.4), 0],
          }),
        },
        { rotate: value.interpolate({ inputRange: [0, 1], outputRange: ['-16deg', '0deg'] }) },
        { scaleX: value.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
        // Flatter than it is wide at the start, so the sprout squashes and
        // stretches rather than merely getting bigger.
        { scaleY: value.interpolate({ inputRange: [0, 1], outputRange: [0.28, 1] }) },
      ]),
    [popValues, glyph]
  );

  return (
    // The card. It carries the gutter, the rounded frame, the padding that keeps
    // the edge tiles off the edge, and the win lift — everything *except* the
    // touch box, which is its child.
    <Animated.View
      // While a big board generates, the board on screen is the *previous*
      // puzzle and is about to be replaced. Marks made on it would vanish.
      pointerEvents={generating ? 'none' : 'auto'}
      style={[
        styles.card,
        {
          padding: pad,
          backgroundColor: gutter,
          borderRadius: radius + pad,
          transform: [
            { scale: winLift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) },
          ],
        },
      ]}
    >
    {/* The touch box: exactly the tiles' bounding box, no padding, no border.
        This is what `measureInWindow` reads and what every tap is resolved
        against, and it must stay exactly `cell × size`. */}
    <View
      ref={boardRef}
      onLayout={onLayout}
      {...responder.panHandlers}
      style={{ width: cell * size, height: cell * size }}
    >
      {Array.from({ length: size }, (_, row) => (
        <View key={row} style={styles.row}>
          {Array.from({ length: size }, (_, col) => {
            const index = row * size + col;
            const region = regions[index];
            // Looked up through the engine's guarded accessor rather than a
            // modulo into the palette. The modulo silently gave region 9 the
            // same fill as region 0 the moment boards reached 10 regions.
            const entry = getRegionColor(region, isDark);
            const mark = marks[index];
            // A red X: this cell held a mushroom that turned out to be wrong
            // (plan §14.3). It is an *ordinary* X in every other respect — a tap
            // clears it, a stroke erases it — the colour is only the record of
            // what it cost.
            const mistaken = mark === MARKS.X && mistakeCells.has(index);

            // X is a thinking aid, so it sits quieter than a mushroom — but it
            // still has to be visible on its own fill, so it is the same
            // contrast-checked ink at reduced strength rather than a fixed gray.
            const inkFaded = entry.ink === '#ffffff' ? '#ffffffaa' : '#1a1a1aaa';

            return (
              <View
                key={col}
                // A plain View, not a Touchable: the board owns the touch from
                // touch-down, so a child Touchable would never see a press.
                // Taps are dispatched by the responder above; these props keep
                // the cell a first-class accessibility target, and
                // onAccessibilityTap is what a screen reader activates.
                accessible
                accessibilityRole="button"
                // Region name and mark are both spelled out, so the board is
                // usable without relying on color (plan §5). These labels are
                // also the seam the browser tests address cells through.
                accessibilityLabel={`Row ${row + 1}, column ${col + 1}, ${entry.name} region, ${
                  MARK_LABELS[mark] || 'empty'
                }${mistaken ? ', wrong guess' : ''}${hintCells.has(index) ? ', hint' : ''}`}
                // **A screen reader cannot express a double tap** (plan §14.2),
                // so activating a cell does the tap and placing a mushroom is a
                // named alternative action rather than a repeat. The hint is
                // where it is announced: it is per-cell text that reaches both
                // VoiceOver and TalkBack, and unlike accessibilityState it is not
                // dropped on the way to the web.
                accessibilityHint="Activates to rule out or clear. Use the place mushroom action to commit one."
                accessibilityActions={ACCESSIBILITY_ACTIONS}
                onAccessibilityTap={() => tapCell(index)}
                onAccessibilityAction={({ nativeEvent }) => {
                  if (nativeEvent.actionName === 'placeMushroom') placeMushroom(index);
                  else tapCell(index);
                }}
                // The touch box, which is the full pitch and carries no colour.
                // The padding is what separates one tile from the next; the fill
                // is on the child. Keeping the gap inside this box is what lets
                // `cellFromPoint` stay ignorant of it.
                style={{ width: cell, height: cell, padding: inset }}
              >
                <View
                  style={{
                    flex: 1,
                    backgroundColor: entry.background,
                    borderRadius: radius,
                    // Press feedback, previously TouchableOpacity's activeOpacity.
                    opacity: pressedCell === index ? 0.6 : 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                {/* A hint points with a dashed inset outline — a separate channel
                    from the glyph, so it can sit on a cell that is also flagged
                    without either signal being lost. It follows the tile's
                    corner radius, or it would read as a square badge sitting on
                    a rounded tile. */}
                {hintCells.has(index) && (
                  <View
                    style={[
                      styles.hintOutline,
                      {
                        width: cell - gap - 3,
                        height: cell - gap - 3,
                        borderRadius: Math.max(2, radius - 2),
                        borderColor: entry.ink,
                      },
                    ]}
                  />
                )}

                {mark === MARKS.MUSHROOM && (
                  // **Two nested Animated.Views, and the nesting is load-bearing.**
                  // The wave is native-driven and the sprout is JS-driven (see
                  // both effects above), and a single view cannot carry both:
                  // once any value in a style has been moved to the native
                  // driver, a JS-driven animation on that same props node
                  // throws. Separate views are separate props nodes, so each
                  // half gets the driver it needs and the transforms still
                  // compose.
                  <Animated.View
                    // Outer: the win wave. Rests at the identity pose whenever
                    // the board is unsolved, and at *both* ends of the ripple.
                    style={{ transform: waveTransforms[index] }}
                  >
                    <Animated.View
                      // Inner: this cell's own sprout, which rests at 1. Only the
                      // cell that was just placed is ever away from 1, so no
                      // other mushroom can be affected.
                      style={{ transform: sproutTransforms[index] }}
                    >
                      {/* **Through the seam, not around it** (plan §5, Step 1).
                          The board used to name the `mushroom` icon itself,
                          which meant the one file an art swap was supposed to
                          touch was not the only file it would have had to
                          touch. Fungiku's cells hold marks rather than values,
                          so the mushroom's value is imported rather than
                          implied — and dropping in real art is now an edit to
                          `symbolSets.js` and `Symbol.js` alone. */}
                      <Symbol
                        symbolSet={SYMBOL_SET_IDS.FUNGIKU}
                        value={MUSHROOM_VALUE}
                        size={glyph}
                        // The contrast-picked ink for *this* fill, not the
                        // symbol set's own red — a saturated mushroom on a
                        // warm fill is nearly invisible (symbolSets.js).
                        color={entry.ink}
                      />
                    </Animated.View>
                  </Animated.View>
                )}

                {mark === MARKS.X && (
                  <Animated.View
                    // The shake is the moment-of-impact half of "that was
                    // wrong"; the red is the half that stays. Only the cell that
                    // just went wrong is ever away from 0.
                    style={{
                      transform: [
                        {
                          translateX: shakeValues[index].interpolate({
                            inputRange: [-1, 0, 1],
                            outputRange: [-5, 0, 5],
                          }),
                        },
                      ],
                    }}
                  >
                    <MaterialCommunityIcons
                      name={mistaken ? 'close-thick' : 'close'}
                      size={Math.round(glyph * 0.8)}
                      // `conflictInk` is the palette's contrast-checked "this is
                      // wrong" ink, checked against every fill (symbolSets.js).
                      // The conflict ring it was built for is gone; flagging a
                      // wrong guess is the job it does now. A wrong guess also
                      // gets the *heavier* glyph, so the flag survives a
                      // colourblind reader rather than resting on red alone.
                      color={mistaken ? entry.conflictInk : inkFaded}
                    />
                  </Animated.View>
                )}
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  hintOutline: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    opacity: 0.9,
  },
});

export default FungikuBoard;
