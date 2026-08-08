import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

/**
 * The two control primitives the incoming games' chrome is built from, ported
 * from the sibling color-loop app's `components/Controls.tsx`.
 *
 * **Only the two this screen uses.** The source file also carries a
 * `PanResponder` slider and a segmented control; they belong to Color Loop's
 * physics screen and its mode chips, and they arrive with the step that needs
 * them rather than as furniture nobody is sitting on (plan's Step 1 scope: "and
 * whichever `Controls` primitives the screen actually uses — no more").
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
});

export default { Btn, LinkBtn };
