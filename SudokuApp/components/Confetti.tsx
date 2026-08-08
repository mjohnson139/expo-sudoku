import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { EASE, USE_NATIVE } from '../utils/motion';

interface Piece {
  color: string;
  dx: number; // final horizontal drift
  peak: number; // rise before falling
  fall: number; // final resting offset below origin
  spin: string;
  size: number;
  delay: number;
}

/**
 * A one-shot burst of ticker-tape from the center of its (absolute-fill)
 * container. Pieces launch up and out, then fall and fade. Driven by a single
 * shared progress value so a full burst costs one animation.
 *
 * **This is the app's second confetti.** `games/fungiku/confetti.js` is the
 * first, and the two are deliberately left alone: plan §10 says two
 * implementations are acceptable through Step 4 and that reconciling them is
 * Step 5's decision, with three win celebrations on the table rather than two.
 * Do not merge them in passing.
 */
export default function Confetti({
  colors,
  count = 26,
  duration = 1400,
  onDone,
}: {
  colors: string[];
  count?: number;
  duration?: number;
  onDone?: () => void;
}) {
  const t = useRef(new Animated.Value(0)).current;

  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: count }, (_, i) => {
        const side = i % 2 === 0 ? 1 : -1;
        return {
          color: colors[i % colors.length],
          dx: side * (20 + Math.random() * 130),
          peak: -(60 + Math.random() * 120),
          fall: 90 + Math.random() * 140,
          spin: `${(Math.random() * 2 - 1) * 540}deg`,
          size: 5 + Math.random() * 4,
          delay: Math.random() * 0.18,
        };
      }),
    [colors, count]
  );

  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration,
      easing: EASE.standard,
      useNativeDriver: USE_NATIVE,
    }).start(() => onDone?.());
  }, [t, duration, onDone]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => {
        const start = p.delay;
        const mid = start + (1 - start) * 0.4;
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '46%',
              width: p.size,
              height: p.size * 1.7,
              borderRadius: 2,
              backgroundColor: p.color,
              opacity: t.interpolate({
                inputRange: [0, start, start + 0.05, 0.75, 1],
                outputRange: [0, 0, 1, 1, 0],
              }),
              transform: [
                {
                  translateX: t.interpolate({
                    inputRange: [start, 1],
                    outputRange: [0, p.dx],
                    extrapolate: 'clamp',
                  }),
                },
                {
                  translateY: t.interpolate({
                    inputRange: [start, mid, 1],
                    outputRange: [0, p.peak, p.fall],
                    extrapolate: 'clamp',
                  }),
                },
                {
                  rotate: t.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', p.spin],
                  }),
                },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
