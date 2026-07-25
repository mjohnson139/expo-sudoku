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

const FungikuWinBanner = ({ solved, size, seed, accent, onNextPuzzle }) => {
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
        useNativeDriver: true,
      }),
    ]);
    animation.start();

    return () => animation.stop();
  }, [solved, shimmer]);

  // Every hook has to run before this bails out — an early return above one of
  // them changes the hook count between renders and React throws.
  if (!mounted) return null;

  const ink = readableOn(accent);

  return (
    <Animated.View
      pointerEvents={solved ? 'auto' : 'none'}
      style={[
        styles.banner,
        {
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
        <Text style={[styles.detail, { color: ink }]}>
          {size}×{size} · seed {seed}
        </Text>
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
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  detail: {
    fontSize: 11,
    opacity: 0.85,
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
