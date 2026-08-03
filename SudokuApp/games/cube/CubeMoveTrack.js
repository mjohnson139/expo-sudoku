import React, { useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ALG_FONT } from './algText';
import { describeToken } from './solve';

/** One line of moves. */
const LINE = 20;

/** How many of them are on screen at once. */
const LINES = 2;

const PAD = 5;

/**
 * The height this costs the page, and it is a constant on purpose — see below.
 * Exported so the screen can talk about its own budget (docs/cube-plan.md §8.6).
 */
export const TRACK_HEIGHT = LINES * LINE + PAD * 2;

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
  onSeek,
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
    scroll.current.scrollTo({ y: Math.max(0, y - LINE), animated: true });
  }, [index, tokens]);

  // A different algorithm is a different track, and last week's scroll offset is
  // not where the new one starts.
  useEffect(() => {
    tops.current = {};
  }, [tokens]);

  return (
    <View
      style={[styles.track, { backgroundColor: surface, borderColor: border }]}
      accessibilityLabel={label}
    >
      <ScrollView
        ref={scroll}
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        // The tokens are the subject here, not a page to be scrolled — so a drag
        // that starts on one still hits it.
        keyboardShouldPersistTaps="handled"
      >
        {tokens.length === 0 ? (
          <Text style={[styles.placeholder, { color: pendingColor }]}>{placeholder}</Text>
        ) : (
          tokens.map((token, i) => (
            <React.Fragment key={`${token}-${i}`}>
              {/* The gap between two tokens is where a phase boundary shows, and
                  it is its own element rather than part of the token: the token
                  is a tap target that turns the cube, and a divider is not a
                  move you can turn to. */}
              {i > 0 && marks.has(i) && (
                <Text style={[styles.mark, { color: accent }]}>|</Text>
              )}
              <TouchableOpacity
                onPress={() => onSeek(i + 1)}
                onLayout={({ nativeEvent }) => noteTop(i, nativeEvent.layout.y)}
                accessibilityRole="button"
                // Unchanged from the card this replaced, deliberately: every
                // headless driver this epic has written finds a move by this
                // string, and they are the regression suite for "the control
                // still works from its new home".
                accessibilityLabel={`Move ${i + 1}, ${describeToken(token)}`}
                accessibilityHint={`Turns the cube to this point in the ${noun}`}
                style={styles.token}
              >
                <Text
                  style={[
                    styles.tokenText,
                    { color: i < index ? titleColor : pendingColor },
                    i === index - 1 && [styles.currentToken, { color: accent }],
                  ]}
                >
                  {token}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    alignSelf: 'stretch',
    marginHorizontal: 4,
    height: TRACK_HEIGHT + 2, // the border
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  scroll: {
    flex: 1,
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
  },
  tokenText: {
    fontFamily: ALG_FONT,
    fontSize: 14,
    lineHeight: LINE,
  },
  // Bold as well as coloured: the token you are on has to be findable at a
  // glance, and on a monospaced face weight is the difference that survives a
  // small screen.
  currentToken: {
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
