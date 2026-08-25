import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ALG_FONT } from './algText';
import { describeToken } from './solve';
import { HANDLE, LINE, PAD, TRACK_HEIGHT, drawerHeight, followScrollTop } from './trackLayout';

export { TRACK_HEIGHT };

/** Past this much of a drag, let go and the drawer goes the way you were pulling. */
const SNAP = 24;

/**
 * The moves — the scramble, or the solve being written — as a **fixed** two-line
 * track that scrolls to follow the cube (plan §8.6, Step 7).
 *
 * ### Why this replaced the card
 *
 * The card this grew out of drew every token and took whatever height that
 * needed: five wrapped lines for a 42-move solve, six for a longer one. It was
 * the tallest row on the screen **and the only one that grew as the operator
 * drilled** — which is the wrong way round for a tool whose subject is the cube.
 * Measured at 320×568 on a 42-move annotated solve, the old card left the cube
 * **four points**. Not a typo, and not a case anyone had looked at: the docs
 * recorded 114, measured on a shorter solve.
 *
 * The block was doing three jobs — read the whole solve, see where you are, tap
 * a token to turn there — and it was sized for the first, which is the job the
 * *cube* is on this screen to do. The other two are kept exactly: every token is
 * still a tap target that turns the cube to it, and the phase boundaries still
 * show between them.
 *
 * ### Fixed, not "capped"
 *
 * `TRACK_HEIGHT` does not depend on how many moves there are, and that is a
 * requirement rather than a simplification. The stage measures itself
 * (`onLayout`), so a track that were one line at move 3 and two at move 9 would
 * **resize the cube in the middle of a solve** — the thing this step exists to
 * stop.
 *
 * ### The scroll, and the pan it must not touch
 *
 * Plan §2's rule is that the page does not scroll, because a `ScrollView` around
 * the cube puts "turn the cube" and "scroll the page" in competition for one
 * drag. This is the same shape as `CubePhaseStrip`, which has scrolled sideways
 * since Step 6: a bounded strip, well clear of the cube's square, that scrolls
 * inside itself. The rule stands; nothing here is a scroll view the cube is in.
 *
 * Following the cube is keyed on `index`, which changes **when a move lands**
 * and not on every animation frame — so a playback scrolls once per move rather
 * than juddering. The current move is parked on the *second* of the two lines,
 * so the line above it is where you just came from.
 */
const CubeMoveTrack = ({
  tokens,
  index,
  marks,
  placeholder,
  accent,
  theme,
  // Moves not played yet, muted. Passed in rather than mixed here, so the
  // screen keeps one answer for what "not yet" looks like.
  pendingColor,
  label,
  noun = 'scramble',
  // How far down the drawer may be pulled: the stage's measured height, which
  // is the room between the track and the transport. Passed in because only the
  // screen knows it, and it is a *maximum* — a short solve opens to its own
  // height rather than to a panel of empty space.
  room = 0,
  onSeek,
  selection,
  onSelect,
  algorithmRuns = [],
  expandedRuns = new Set(),
  onToggleRun,
}) => {
  const titleColor = theme.colors.title;
  const surface = theme.colors.numberPad.background;
  const border = theme.colors.numberPad.border;

  const scroll = useRef(null);
  // Where each token sits in the scrolled content. A plain object in a ref
  // rather than state: it is written during layout and read when the cube
  // moves, and re-rendering on either would be a render per token.
  const tops = useRef({});

  const noteTop = useCallback((i, y) => {
    tops.current[i] = y;
  }, []);

  // Follow the cube. `index` is the number of moves played, so the move just
  // made is `index - 1` — the one drawn as current.
  useEffect(() => {
    const y = tops.current[Math.max(0, index - 1)];
    if (y === undefined || !scroll.current) return;
    // One line up from the token's own line, which parks the current move on the
    // second of the two rows and leaves the row you came from above it.
    //
    // This arithmetic is only exact because **every child of the track is
    // exactly `LINE` tall** — see `styles.mark`. Let the dividers size
    // themselves and the rows drift a point or two apart, the offset drifts with
    // them, and each scroll leaves a sliver of the previous row showing along
    // the top edge. Visible in a screenshot and in nothing else.
    scroll.current.scrollTo({ y: followScrollTop(y), animated: true });
  }, [index, tokens]);

  // A different algorithm is a different track, and last week's scroll offset is
  // not where the new one starts.
  useEffect(() => {
    tops.current = {};
  }, [tokens]);

  // ——— The drawer ————————————————————————————————————————————————————
  //
  // Two lines is the right *resting* size and the wrong size for reading a solve
  // back, which is the operator's own verdict on the two-line track: *"the solve
  // display could be a drawer with a handle. Or a way to view the whole thing."*
  // So it is both — two lines while you write, the whole solve when you pull it
  // down.
  //
  // **It opens over the cube rather than pushing it.** The panel is positioned
  // absolutely out of a wrapper that keeps the track's height in the layout, so
  // the stage below never re-measures and `cubeSize` never changes. A drawer
  // that resized the cube every time it was opened would be the bug this whole
  // step exists to kill, arriving by another door.
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  openRef.current = open;

  // How tall the whole solve wants to be, **measured rather than estimated** —
  // how many tokens fit on a line depends on the width of the phone and on how
  // many of them are `M2` rather than `U`, and a guess opens the drawer onto a
  // band of empty space. Capped by what the stage can lend, so a four-move solve
  // opens to one line and a hundred-move one stops at the cube.
  const [content, setContent] = useState(0);
  const openHeight = drawerHeight({ open: true, content, room });

  const height = useRef(new Animated.Value(TRACK_HEIGHT)).current;
  const settle = useCallback(
    (next) => {
      setOpen(next);
      Animated.timing(height, {
        toValue: next ? openHeight : drawerHeight({ open: false }),
        duration: 180,
        // A height cannot be driven natively, and there is no cube in here to
        // stutter — the panel is text over a stage that is not re-rendering.
        useNativeDriver: false,
      }).start();
    },
    [height, openHeight]
  );

  // Keep an open drawer the right size when the solve grows under it.
  useEffect(() => {
    if (openRef.current) height.setValue(openHeight);
  }, [height, openHeight]);

  // Drag the handle, or tap it. The handle is well clear of the cube's square,
  // so this takes no gesture away from the pan that turns it (plan §2).
  const drag = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderRelease: (_, g) => {
        if (g.dy > SNAP) settleRef.current(true);
        else if (g.dy < -SNAP) settleRef.current(false);
        else settleRef.current(!openRef.current);
      },
    })
  ).current;
  // The responder is created once, so it cannot close over a `settle` that
  // changes with `openHeight` — the same stale-closure trap `CubeView` hits with
  // yaw and pitch (plan §10).
  const settleRef = useRef(settle);
  settleRef.current = settle;

  return (
    // Holds the *closed* height in the layout whatever the drawer is doing, so
    // the stage below it is measured once and stays measured. The zIndex is what
    // puts the open panel over the cube rather than under it.
    <View style={styles.wrap}>
      <Animated.View
        style={[styles.track, { height, backgroundColor: surface, borderColor: border }]}
        accessibilityLabel={label}
      >
      <ScrollView
        ref={scroll}
        style={styles.scroll}
        contentContainerStyle={styles.body}
        onContentSizeChange={(_, h) => setContent(h)}
        showsVerticalScrollIndicator={false}
        // Open, the whole solve is the point and it may be taller than the
        // panel; closed, the two lines are driven by the transport.
        scrollEnabled={open}
        // The tokens are the subject here, not a page to be scrolled — so a drag
        // that starts on one still hits it.
        keyboardShouldPersistTaps="handled"
      >
        {tokens.length === 0 ? (
          <Text style={[styles.placeholder, { color: pendingColor }]}>{placeholder}</Text>
        ) : (
          tokens.map((token, i) => {
            const run = algorithmRuns.find((candidate) => i >= candidate.at && i < candidate.end);
            const runKey = run ? `${run.at}:${run.end}` : null;
            const expanded = Boolean(selection || (runKey && expandedRuns.has(runKey)));
            if (run && !expanded && i > run.at) return null;
            return (
            <React.Fragment key={`${token}-${i}`}>
              {/* The gap between two tokens is where a phase boundary shows, and
                  it is its own element rather than part of the token: the token
                  is a tap target that turns the cube, and a divider is not a
                  move you can turn to. */}
              {i > 0 && marks.has(i) && (
                <Text style={[styles.mark, { color: accent }]}>|</Text>
              )}
              {run && i === run.at && (
                <TouchableOpacity
                  onPress={() => onToggleRun?.(runKey)}
                  style={[styles.runChip, { borderColor: accent }, !expanded && { backgroundColor: accent }]}
                  accessibilityRole="button"
                  accessibilityLabel={`${run.name}, moves ${run.at + 1} to ${run.end}`}
                  accessibilityHint={expanded ? 'Collapses these moves to the algorithm name' : 'Shows every move in this algorithm'}
                  accessibilityState={{ expanded }}
                >
                  <Text style={[styles.runName, { color: expanded ? accent : '#fff' }]}>{run.name}</Text>
                </TouchableOpacity>
              )}
              {(!run || expanded) && (
              <TouchableOpacity
                onPress={() => onSelect ? onSelect(i) : onSeek(i + 1)}
                onLayout={({ nativeEvent }) => noteTop(i, nativeEvent.layout.y)}
                accessibilityRole="button"
                // Unchanged from the card this replaced, deliberately: every
                // headless driver this epic has written finds a move by this
                // string, and they are the regression suite for "the control
                // still works from its new home".
                accessibilityLabel={`Move ${i + 1}, ${describeToken(token)}`}
                accessibilityHint={`Turns the cube to this point in the ${noun}`}
                // The current move is **white on an accent chip** rather than
                // accent-coloured text (plan §8.8). The fill is on the container
                // rather than the label because the container's padding is
                // already fixed — a chip that added its own would re-flow the
                // row under the cursor on every move played.
                style={[
                  styles.token,
                  selection && i >= selection.start && i <= selection.end && styles.selectedToken,
                  i === index - 1 && !selection && { backgroundColor: accent },
                ]}
              >
                <Text
                  style={[
                    styles.tokenText,
                    { color: i < index ? titleColor : pendingColor },
                    i === index - 1 && !selection && styles.currentToken,
                  ]}
                >
                  {token}
                </Text>
              </TouchableOpacity>
              )}
            </React.Fragment>
            );
          })
        )}
      </ScrollView>

      {/* The handle. Drag it down for the whole solve, up to put it away — or
          tap it, because a 16-point grab bar is a big ask of a thumb that only
          wants to toggle something. */}
      <View
        {...drag.panHandlers}
        style={styles.handle}
        accessibilityRole="button"
        accessibilityLabel={open ? 'Collapse the moves' : 'Show the whole thing'}
        accessibilityHint={
          open
            ? 'Puts the moves back to two lines'
            : 'Opens the moves out over the cube so the whole algorithm is visible'
        }
        accessibilityState={{ expanded: open }}
      >
        <View style={[styles.grip, { backgroundColor: border }]} />
        <MaterialCommunityIcons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={13}
          color={pendingColor}
          style={styles.chevron}
        />
      </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Reserves the closed height, always. The panel inside it grows out of the
  // flow, so nothing below ever moves.
  wrap: {
    alignSelf: 'stretch',
    height: TRACK_HEIGHT + 2, // the border
    zIndex: 10,
  },
  // Full width when open, so nothing behind it — the phase strip in particular —
  // peeks out down the side of the panel.
  track: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
  },
  handle: {
    height: HANDLE,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  grip: {
    width: 28,
    height: 3,
    borderRadius: 2,
    marginRight: 5,
  },
  chevron: {
    opacity: 0.8,
  },
  body: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingVertical: PAD,
    paddingHorizontal: 6,
  },
  token: {
    height: LINE,
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  selectedToken: { backgroundColor: 'rgba(214, 71, 82, 0.16)' },
  runChip: { height: LINE, borderWidth: 1, borderRadius: 5, paddingHorizontal: 7, justifyContent: 'center' },
  runName: { fontSize: 11, lineHeight: LINE, fontWeight: '800' },
  tokenText: {
    fontFamily: ALG_FONT,
    // 12, from the design (plan §8.8), where Step 7 had 14. `lineHeight` stays
    // `LINE` and that is the part that matters: every child of this track is
    // exactly one line tall, or the auto-scroll — which is computed from `LINE`
    // — parks a sliver of the previous row along the top edge.
    fontSize: 12,
    lineHeight: LINE,
  },
  // White on the accent chip the container draws. Bold as well, because on a
  // monospaced face weight is the difference that survives a small screen.
  currentToken: {
    color: '#ffffff',
    fontWeight: '700',
  },
  // `height` as well as `lineHeight`, and it is load-bearing rather than tidy: a
  // bar glyph asks for a taller box than a letter does, and one child a couple
  // of points taller than the rest pushes every row below it out of step with
  // `LINE` — which is the number the auto-scroll is computed from.
  mark: {
    fontFamily: ALG_FONT,
    // Two points smaller than a move, and that is not decoration: a bar glyph
    // fills its whole em where a letter does not, so at the tokens' 14 it paints
    // past the 20-point line it is given and the row *above* the window leaves
    // red ticks along the top edge of the track. Clipped as well, belt and
    // braces — react-native-web does not reliably clip an inline span.
    fontSize: 12,
    height: LINE,
    lineHeight: LINE,
    overflow: 'hidden',
    fontWeight: '700',
    paddingHorizontal: 2,
  },
  placeholder: {
    fontFamily: ALG_FONT,
    fontSize: 14,
    height: LINE,
    lineHeight: LINE,
    textAlign: 'center',
  },
});

export default CubeMoveTrack;
