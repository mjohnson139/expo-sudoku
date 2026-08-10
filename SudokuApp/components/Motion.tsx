import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleProp, ViewStyle } from 'react-native';
import { DUR, EASE, SPRING, USE_NATIVE } from '../utils/motion';

/**
 * The four primitives of the motion vocabulary in `utils/motion.ts`, ported from
 * the sibling color-loop app (docs/colorloop-merge-plan.md §3).
 *
 * Built on React Native's own `Animated`, so there is no new dependency and they
 * work in Expo Go and in a browser alike. Every one of them honours
 * `USE_NATIVE` rather than hardcoding `useNativeDriver: true`.
 */

/** Fade + rise entrance. Staggers siblings via `delay`. */
export function FadeSlideIn({
  delay = 0,
  distance = 14,
  style,
  children,
}: {
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: DUR.enter,
      delay,
      easing: EASE.settle,
      useNativeDriver: USE_NATIVE,
    }).start();
  }, [t, delay]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: t,
          transform: [
            { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Spring-scale entrance for hero moments (win card, badges). */
export function PopIn({
  delay = 0,
  from = 0.85,
  style,
  children,
}: {
  delay?: number;
  from?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const s = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(s, { toValue: 1, ...SPRING.card, useNativeDriver: USE_NATIVE }),
    ]).start();
  }, [s, delay]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: s.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 1] }),
          transform: [{ scale: s.interpolate({ inputRange: [0, 1], outputRange: [from, 1] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Pressable that scales down on touch — the house press feedback. */
export function ScalePress({
  onPress,
  style,
  children,
}: {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.spring(s, { toValue: v, ...SPRING.press, useNativeDriver: USE_NATIVE }).start();
  return (
    <Pressable onPress={onPress} onPressIn={() => to(0.965)} onPressOut={() => to(1)}>
      <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Counts a number up to `target` over `duration` ms whenever `active` flips true. */
export function useCountUp(target: number, active: boolean, duration = 700): number {
  const [value, setValue] = useState(target);
  useEffect(() => {
    if (!active) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - (1 - p) * (1 - p) * (1 - p);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // restart only when a fresh win begins
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  return active ? value : target;
}
