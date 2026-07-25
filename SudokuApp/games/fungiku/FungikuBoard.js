import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing, PanResponder } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MARKS } from './engine';
import { getRegionPalette } from '../../utils/symbolSets';
import useBoardSize from '../../hooks/useBoardSize';
import useBoardOrigin from '../../hooks/useBoardOrigin';
import { cellFromPoint, cellsAlongLine } from './geometry';
import { PAINT_MODES } from './reducer';
import { useFungikuContext } from './FungikuContext';

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
 * How far the finger must travel before a touch becomes a stroke instead of a
 * tap. Small enough that the cell you started on is still under your finger, big
 * enough that a slightly shaky tap does not paint.
 */
const DRAG_THRESHOLD = 6;

const FungikuBoard = ({ isDark, theme, onTouchActiveChange }) => {
  const {
    size,
    regions,
    marks,
    conflicts,
    mistakes,
    showMistakes,
    hint,
    cycleCell,
    paintCells,
    beginStroke,
    endStroke,
    solved,
  } = useFungikuContext();

  // Cells a hint is pointing at: a whole row/column/region for a nudge, a single
  // cell for a mistake or a reveal.
  const hintCells = useMemo(() => new Set(hint?.cells || []), [hint]);

  const boardSize = useBoardSize();
  const cell = Math.floor(boardSize / size);
  const glyph = Math.round(cell * 0.62);

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

  // Tap feedback, which the per-cell Touchables used to give for free.
  const [pressedCell, setPressedCell] = useState(-1);

  // Positive confirmation (plan §11.1): a placement should *feel* like one, not
  // merely fail to turn red. Deliberately fires for **every** mushroom placed,
  // right or wrong — animating only correct ones would leak the solution to
  // anyone who had left correctness feedback switched off.
  const [poppedCell, setPoppedCell] = useState(-1);
  const pop = useRef(new Animated.Value(1)).current;
  const previousMarks = useRef(marks);

  useEffect(() => {
    const before = previousMarks.current;
    previousMarks.current = marks;
    if (before === marks || before.length !== marks.length) return;

    // A single new mushroom means a placement; several at once means a reveal or
    // an undo, which should not pop.
    const placed = marks.reduce(
      (found, mark, cell) =>
        mark === MARKS.MUSHROOM && before[cell] !== MARKS.MUSHROOM ? [...found, cell] : found,
      []
    );
    if (placed.length !== 1) return;

    setPoppedCell(placed[0]);
    pop.setValue(0);
    Animated.spring(pop, {
      toValue: 1,
      friction: 5,
      tension: 140,
      useNativeDriver: true,
    }).start();
  }, [marks, pop]);

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
  useEffect(() => {
    measure();
  }, [hint, solved, measure]);

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
            // Still ambiguous: a tap is a touch that never travels this far.
            if (Math.hypot(gesture.dx, gesture.dy) <= DRAG_THRESHOLD) return;

            isStroke.current = true;
            setPressedCell(-1);

            const first = startPoint.current
              ? cellAt(startPoint.current.x, startPoint.current.y)
              : -1;

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
            endStroke();
          } else {
            // Never travelled: it was a tap, so run the full mark cycle. Taps
            // land here now rather than on a per-cell Touchable, because the
            // board owns the touch from the moment it starts.
            const tapped = startPoint.current
              ? cellAt(startPoint.current.x, startPoint.current.y)
              : -1;
            if (tapped >= 0) cycleCell(tapped);
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
    [beginStroke, endStroke, paintCells, measure]
  );

  const palette = useMemo(() => getRegionPalette(isDark), [isDark]);

  // Region outlines come from the theme's grid colors so the board reads as part
  // of the app; they need to hold up over both light and dark region fills.
  const outline = theme?.colors?.grid?.boxBorder || (isDark ? '#e8e8e8' : '#333333');
  const hairline = theme?.colors?.grid?.cellBorder || (isDark ? '#ffffff44' : '#33333344');

  // The board itself celebrates a win first (a gentle lift), before the banner
  // above it arrives — same "board celebrates first" idea the sibling color-loop
  // app uses for its win sequence.
  const winLift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(winLift, {
      toValue: solved ? 1 : 0,
      duration: solved ? 420 : 160,
      easing: solved ? Easing.out(Easing.back(2)) : Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [solved, winLift]);

  return (
    <Animated.View
      ref={boardRef}
      onLayout={onLayout}
      {...responder.panHandlers}
      style={[
        styles.board,
        {
          width: cell * size,
          height: cell * size,
          transform: [
            { scale: winLift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) },
          ],
        },
      ]}
    >
      {Array.from({ length: size }, (_, row) => (
        <View key={row} style={styles.row}>
          {Array.from({ length: size }, (_, col) => {
            const index = row * size + col;
            const region = regions[index];
            const entry = palette[region % palette.length];
            const mark = marks[index];
            const conflicting = conflicts.has(index);
            const mistaken = mistakes.has(index);

            const differs = (r, c) =>
              r < 0 || c < 0 || r >= size || c >= size || regions[r * size + c] !== region;

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
                }${conflicting ? ', conflict' : ''}${
                  showMistakes && mistaken ? ', mistake' : ''
                }${hintCells.has(index) ? ', hint' : ''}`}
                accessibilityHint="Taps cycle empty, ruled out, mushroom"
                onAccessibilityTap={() => cycleCell(index)}
                style={{
                  width: cell,
                  height: cell,
                  backgroundColor: entry.background,
                  // Press feedback, previously TouchableOpacity's activeOpacity.
                  opacity: pressedCell === index ? 0.6 : 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderTopColor: differs(row - 1, col) ? outline : hairline,
                  borderBottomColor: differs(row + 1, col) ? outline : hairline,
                  borderLeftColor: differs(row, col - 1) ? outline : hairline,
                  borderRightColor: differs(row, col + 1) ? outline : hairline,
                  borderTopWidth: differs(row - 1, col) ? 2 : StyleSheet.hairlineWidth,
                  borderBottomWidth: differs(row + 1, col) ? 2 : StyleSheet.hairlineWidth,
                  borderLeftWidth: differs(row, col - 1) ? 2 : StyleSheet.hairlineWidth,
                  borderRightWidth: differs(row, col + 1) ? 2 : StyleSheet.hairlineWidth,
                }}
              >
                {/* Conflict is signalled by a ring *and* a color change, so it
                    survives a colorblind reader and a dark theme alike. The ring
                    color is contrast-checked against every fill in the palette
                    (see symbolSets.js). */}
                {conflicting && (
                  <View
                    style={[
                      styles.conflictRing,
                      {
                        width: cell - 6,
                        height: cell - 6,
                        borderRadius: (cell - 6) / 2,
                        borderColor: entry.conflictInk,
                      },
                    ]}
                  />
                )}

                {/* A hint points with a dashed inset outline — a third channel,
                    so it can sit on a cell that is also conflicting or mistaken
                    without either signal being lost. */}
                {hintCells.has(index) && (
                  <View
                    style={[
                      styles.hintOutline,
                      { width: cell - 3, height: cell - 3, borderColor: entry.ink },
                    ]}
                  />
                )}

                {mark === MARKS.MUSHROOM && (
                  <Animated.View
                    style={
                      index === poppedCell
                        ? {
                            transform: [
                              {
                                scale: pop.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0.4, 1],
                                }),
                              },
                            ],
                          }
                        : null
                    }
                  >
                    <MaterialCommunityIcons
                      name="mushroom"
                      size={glyph}
                      color={conflicting ? entry.conflictInk : entry.ink}
                    />
                  </Animated.View>
                )}

                {/* Mistake badge: legal so far, but not where the solution has it
                    (plan §11.1). A corner glyph rather than a ring, so it reads
                    as a different kind of wrong from a conflict. */}
                {showMistakes && mistaken && (
                  <MaterialCommunityIcons
                    name="alert"
                    size={Math.round(cell * 0.28)}
                    color={entry.conflictInk}
                    style={styles.mistakeBadge}
                  />
                )}

                {mark === MARKS.X && (
                  <MaterialCommunityIcons
                    name="close"
                    size={Math.round(glyph * 0.8)}
                    color={inkFaded}
                  />
                )}
              </View>
            );
          })}
        </View>
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  board: {
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  conflictRing: {
    position: 'absolute',
    borderWidth: 2.5,
  },
  hintOutline: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 3,
    opacity: 0.9,
  },
  mistakeBadge: {
    position: 'absolute',
    top: 1,
    right: 1,
  },
});

export default FungikuBoard;
