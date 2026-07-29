import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { readableOn } from '../../utils/color';

/**
 * The win celebration.
 *
 * Step 4 shipped a static green box, which announced the win without feeling
 * like one. This springs in *after* the board's own lift (FungikuBoard scales up
 * on solve), so the sequence reads as "the board celebrates, then the banner
 * confirms" rather than everything moving at once.
 *
 * Un-placing a mushroom un-wins the board, so it animates *out* as well as in —
 * but it must be genuinely gone once it has, not just transparent. An
 * opacity-0 banner still reserves its layout (leaving a gap above the board) and
 * still reads "Solved!" to a screen reader on an untouched puzzle, so the exit
 * animation's completion callback unmounts it.
 */
const ENTER_DELAY = 220;

/**
 * What the banner's second line says right now (plan §14.4).
 *
 * The payout is **narrated, not reported**: the coin balance in the counter row
 * counts up one reason at a time, and this line names the reason that is landing.
 * A single "+8 coins" would be the same information with none of the feeling, and
 * a player who never sees "No hints used +2" named has no reason to play for it.
 *
 * Four states, in order:
 *   - no reward at all — this board has already been paid (a redo across the win
 *     line, or a relaunch onto a board finished last session). It shows the board
 *     identity, because claiming a payout that did not happen would be a lie
 *     about the balance;
 *   - the reward has landed but the first reason has not shown yet — identity
 *     again, so the line is never blank while the banner springs in;
 *   - a reason, with what it paid;
 *   - the total, which then stays.
 */
const detailLine = ({ reward, award, size, seed }) => {
  const identity = { text: `${size}×${size} · seed ${seed}`, coins: null };
  if (!reward || award.stepIndex < 0) return identity;

  if (award.step) return { text: award.step.label, coins: award.step.coins };

  return { text: 'Coins earned', coins: reward.total };
};

const FungikuWinBanner = ({ solved, size, seed, accent, width, reward, award, onNextPuzzle }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(solved);

  useEffect(() => {
    if (solved) setMounted(true);

    const animation = Animated.timing(progress, {
      toValue: solved ? 1 : 0,
      duration: solved ? 420 : 180,
      delay: solved ? ENTER_DELAY : 0,
      easing: solved ? Easing.out(Easing.back(1.7)) : Easing.in(Easing.quad),
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      // Only drop it once the exit actually played out; a cancelled animation
      // means solved flipped again mid-flight and the next effect owns it.
      if (finished && !solved) setMounted(false);
    });

    return () => animation.stop();
  }, [solved, progress]);

  useEffect(() => {
    if (!solved) {
      shimmer.setValue(0);
      return undefined;
    }

    // One pass, not a loop: a celebration that never stops becomes wallpaper.
    const animation = Animated.sequence([
      Animated.delay(ENTER_DELAY + 260),
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 900,
        easing: Easing.inOut(Easing.quad),
        // JS driver, for the same reason as the board's placement pop: this value
        // is reset with setValue() above, and setValue() mixed with the native
        // driver leaves the JS value a stale copy — which strands the rotation
        // part-way instead of returning it to 0deg.
        useNativeDriver: false,
      }),
    ]);
    animation.start();

    return () => animation.stop();
  }, [solved, shimmer]);

  // Every hook has to run before this bails out — an early return above one of
  // them changes the hook count between renders and React throws.
  if (!mounted) return null;

  const ink = readableOn(accent);
  const detail = detailLine({ reward, award, size, seed });

  return (
    <Animated.View
      pointerEvents={solved ? 'auto' : 'none'}
      style={[
        styles.banner,
        {
          // Board-width, like the counter row above it and the buttons below.
          // It used to size itself from its contents, which read as deliberate
          // while the board was a fixed 324 and read as a stray narrow box once
          // the column filled the screen. Its **height** still may not change —
          // it sits above the board, and `solved` is the only thing that
          // re-measures the board's origin.
          width,
          backgroundColor: accent,
          opacity: progress,
          transform: [
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) },
          ],
        },
      ]}
    >
      <Animated.View
        style={{
          transform: [
            {
              rotate: shimmer.interpolate({
                inputRange: [0, 0.25, 0.5, 0.75, 1],
                outputRange: ['0deg', '-14deg', '0deg', '14deg', '0deg'],
              }),
            },
          ],
        }}
      >
        <MaterialCommunityIcons name="party-popper" size={22} color={ink} />
      </Animated.View>

      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: ink }]}>Solved!</Text>

        {/* **One line, always, whatever it is saying.** Each reason *replaces*
            the last rather than stacking below it: the banner sits above the
            board, and a banner that grows moves the board — which invalidates
            the origin every tap is resolved against (see FungikuBoard's
            re-measure effect, which keys on `solved` and therefore covers the
            banner mounting but not the banner changing size).

            The `key` is what makes each reason its own element, so the fade-in
            below restarts instead of the text swapping silently. */}
        <View style={styles.detailRow}>
          <Text
            key={detail.text}
            style={[styles.detail, styles.detailFade, { color: ink }]}
            numberOfLines={1}
            // The reasons arrive on their own, so a screen reader has to be told
            // rather than left to notice.
            accessibilityLiveRegion={detail.coins === null ? 'none' : 'polite'}
          >
            {detail.text}
          </Text>

          {detail.coins !== null && (
            <View key={`${detail.text}-coins`} style={styles.detailCoins}>
              <MaterialCommunityIcons name="circle-multiple" size={11} color={ink} />
              <Text style={[styles.detail, styles.detailCoinsText, { color: ink }]}>
                +{detail.coins}
              </Text>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        onPress={onNextPuzzle}
        style={[styles.button, { borderColor: ink }]}
        accessibilityRole="button"
        accessibilityLabel="Play the next puzzle"
      >
        <Text style={[styles.buttonText, { color: ink }]}>Next puzzle</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  textBlock: {
    marginLeft: 10,
    marginRight: 12,
    // Takes the slack, so the action stays pinned to the banner's right edge
    // instead of floating in the middle of a now-wider box.
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  detail: {
    fontSize: 11,
    opacity: 0.85,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailFade: {
    flexShrink: 1,
  },
  detailCoins: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  detailCoinsText: {
    fontWeight: '800',
    opacity: 1,
    marginLeft: 2,
  },
  button: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default FungikuWinBanner;
