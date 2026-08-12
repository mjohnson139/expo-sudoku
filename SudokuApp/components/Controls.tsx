import React, { useRef } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useBoardOrigin } from '../utils/useBoardOrigin';

/**
 * The control primitives the incoming games' chrome is built from, ported from
 * the sibling color-loop app's `components/Controls.tsx`.
 *
 * Step 1 took **only the two Number Slide used** — `Btn` and `LinkBtn` — and
 * left the segmented control and the slider behind as furniture nobody was
 * sitting on. **Step 2 brings them**, because Color Loop's mode and size chips
 * are `Seg` and its touch-feel screen is four `Slider`s (plan §4.3).
 *
 * The colours are **passed in, not imported**. The originals read a fixed
 * walnut-and-brass `THEME`; here every caller hands over resolved colours from
 * its own theme-derived palette, which is what keeps these usable by a second
 * game with a different accent without either of them owning a palette
 * (plan §4.2).
 */

export function Btn({
  label,
  onPress,
  small,
  style,
  color,
  textColor,
  pressedColor,
}: {
  label: string;
  onPress: () => void;
  small?: boolean;
  style?: ViewStyle;
  color: string;
  textColor: string;
  pressedColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: pressed ? pressedColor : color },
        style,
      ]}
    >
      <Text selectable={false} style={[styles.btnText, small && styles.btnTextSmall, { color: textColor }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function LinkBtn({
  label,
  onPress,
  color,
}: {
  label: string;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={label}>
      <Text selectable={false} style={[styles.linkText, { color }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * A segmented picker — the shape Color Loop chooses a board size, a goal and a
 * match preset with.
 *
 * Generic over the value so a caller keeps its own union (`Mode`, `PresetId`)
 * instead of stringifying it and parsing it back.
 */
export function Seg<T extends string | number>({
  options,
  value,
  onChange,
  background,
  selected,
  text,
  selectedText,
  border,
}: {
  options: { label: string; value: T; disabled?: boolean }[];
  value: T;
  onChange: (v: T) => void;
  background: string;
  selected: string;
  text: string;
  selectedText: string;
  border: string;
}) {
  return (
    <View style={[styles.seg, { backgroundColor: background, borderColor: border }]}>
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on, disabled: !!opt.disabled }}
            // The state is named in the label as well as in `accessibilityState`
            // because `selected` does not reach the web reliably —
            // `FungikuMenuModal` learned that one first.
            accessibilityLabel={`${opt.label}${on ? ', current' : ''}`}
            style={[styles.segBtn, on && { backgroundColor: selected }, opt.disabled && styles.segDim]}
          >
            <Text
              selectable={false}
              style={[styles.segText, { color: on ? selectedText : text }, on && styles.segTextOn]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * A 0..100 slider built on `PanResponder`, so it behaves the same on iOS,
 * Android and the web without a dependency.
 *
 * **It resolves touches through `pageX` minus a measured origin**, never
 * `locationX`. This control is one of the three things in the sibling app that
 * the SDK 54 upgrade broke — on the new architecture `locationX` is relative to
 * whichever child view the finger landed on, so dragging the thumb moved the
 * value by the wrong amount and tapping the track jumped somewhere else
 * entirely (plan §10). The origin is re-measured at grant because a panel that
 * scrolls or a toast that appears moves the track after layout.
 */
export function Slider({
  value,
  onChange,
  track,
  fill,
}: {
  value: number;
  onChange: (v: number) => void;
  track: string;
  fill: string;
}) {
  const widthRef = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const { ref, measure, toLocal } = useBoardOrigin();

  const set = (pageX: number) => {
    const w = widthRef.current;
    const { x } = toLocal(pageX, 0);
    if (w > 0) onChangeRef.current(Math.max(0, Math.min(100, Math.round((x / w) * 100))));
  };
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        measure(); // refresh origin in case the panel shifted since layout
        set(e.nativeEvent.pageX);
      },
      onPanResponderMove: (e) => set(e.nativeEvent.pageX),
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  return (
    <View
      ref={ref}
      style={styles.sliderHit}
      onLayout={(e) => {
        widthRef.current = e.nativeEvent.layout.width;
        measure();
      }}
      accessibilityRole="adjustable"
      accessibilityValue={{ min: 0, max: 100, now: value }}
      {...pan.panHandlers}
    >
      <View style={[styles.sliderTrack, { backgroundColor: track }]}>
        <View style={[styles.sliderFill, { width: `${value}%`, backgroundColor: fill }]} />
      </View>
      <View style={[styles.sliderThumb, { left: `${value}%`, backgroundColor: fill }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 13,
    paddingVertical: 13,
    paddingHorizontal: 30,
  },
  btnSmall: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  btnText: {
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.8,
  },
  btnTextSmall: {
    fontSize: 13,
  },
  linkText: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  seg: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  segBtn: {
    borderRadius: 7,
    paddingVertical: 6,
    paddingHorizontal: 13,
  },
  segDim: { opacity: 0.45 },
  segText: { fontSize: 13 },
  segTextOn: { fontWeight: '600' },
  sliderHit: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  sliderFill: {
    height: 4,
  },
  sliderThumb: {
    position: 'absolute',
    top: 7,
    width: 18,
    height: 18,
    marginLeft: -9,
    borderRadius: 9,
  },
});

export default { Btn, LinkBtn, Seg, Slider };
