import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { mix } from '../../utils/color';

/**
 * How many quarter turns were written and taken straight back (`cancelInverse`).
 *
 * A gesture solve is faster than the pad partly because a wrong turn costs
 * nothing — drag it back and it never happened. That is the right behaviour and
 * it hides something worth seeing: *how much* figuring-out a block took. This is
 * the bar that keeps it, one segment a fumble, so the count is visible rather
 * than the moves silently vanishing — which is the whole reason `cancelInverse`
 * is allowed to eat a move still on screen.
 *
 * ### Why it is an overlay, and pointer-transparent
 *
 * It sits in the corner of the stage, over the cube, because §8.6's rule is that
 * the cube is sized first and every *row* justifies its height against it — and
 * a row is exactly what this must not be. Absolutely positioned over the cube's
 * own square it costs the cube nothing, and `pointerEvents="none"` keeps it out
 * of the one gesture this whole step is about: a finger that lands on the meter
 * still turns the layer under it.
 *
 * **Provisional.** The operator asked for "a little counter, maybe a growing bar
 * or something" (2026-08-18) — this is the something. Placement, the cap and the
 * amber are all first guesses, and none of them is in the settled design canvas
 * yet.
 */

// A first guess at where the bar stops growing and leaves the number to carry
// the rest. Six reads as a bar; past it the digits say more than another pip.
const SEGMENT_CAP = 6;

// Amber rather than red: a fumble is friction, not an error, and red would
// scold. Fixed across themes because amber carries on both; everything around
// it is theme-derived.
const WARN = '#d9822b';

const CubeMistakeMeter = ({ count = 0, theme }) => {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (count <= 0) return undefined;
    pulse.setValue(1);
    const animation = Animated.sequence([
      Animated.timing(pulse, { toValue: 1.18, duration: 90, useNativeDriver: true }),
      Animated.spring(pulse, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [count, pulse]);

  if (!count || count <= 0) return null;

  const filled = Math.min(count, SEGMENT_CAP);
  const track = mix(theme.colors.title, theme.colors.background, 0.86);
  const chip = mix(theme.colors.background, WARN, 0.9);
  const border = mix(theme.colors.background, WARN, 0.7);

  return (
    <Animated.View
      // Decorative on the way in, but the number is the point, so it is
      // announced when it changes rather than left for a finger to find.
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${count} ${count === 1 ? 'fumble' : 'fumbles'} — turns written and taken back`}
      style={[
        styles.chip,
        { backgroundColor: chip, borderColor: border, transform: [{ scale: pulse }] },
      ]}
    >
      <View style={styles.bar}>
        {Array.from({ length: SEGMENT_CAP }, (_, i) => (
          <View
            key={i}
            style={[styles.segment, { backgroundColor: i < filled ? WARN : track }]}
          />
        ))}
      </View>
      <Text style={[styles.count, { color: WARN }]}>{count}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Pinned to the top-trailing corner of the stage. The cube is centred in its
  // square, so the corner is the emptiest part of the stage at every width.
  chip: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  segment: {
    width: 4,
    height: 9,
    borderRadius: 1.5,
  },
  count: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 12,
    textAlign: 'right',
  },
});

export default CubeMistakeMeter;
