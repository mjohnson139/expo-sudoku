import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * The hint, floating over the screen instead of sitting in it
 * (docs/fungiku-plan.md §12.8).
 *
 * ### Why this is an overlay and the win is a dialog
 *
 * Both used to be inline banners above the board, and both pushed it down — the
 * operator's report was *"the hints kind of appear right above the board and it
 * pushes it down and then it messes up the position of things."* Both are now out
 * of the layout. But they are **not** the same kind of thing:
 *
 * - A win dialog **may** take the screen. The puzzle is over; there is nothing
 *   left to do to the board.
 * - A hint **may not**. Its whole job is to point at cells — `FungikuBoard` draws
 *   a dashed outline on the cells it names — and the player has to *look at those
 *   cells and tap them* while it is showing. A modal would black out the very
 *   thing it is talking about.
 *
 * So this is an absolutely-positioned view with **`pointerEvents="box-none"`** on
 * its container: it draws over the screen and takes no layout space, and every
 * touch that is not on the card itself passes straight through to the board.
 *
 * It sits **low, over the controls**, for the same reason the two dialogs do —
 * the board is what the hint is about, so the board is the one thing it must not
 * cover.
 *
 * ### Exit has to be animated, and then it has to be *gone*
 *
 * An overlay left mounted at opacity 0 is invisible and still real: it would keep
 * announcing a stale hint to a screen reader, and its dismiss button would still
 * be a touch target sitting over the controls. So the exit animation's completion
 * callback unmounts it, exactly as the old banner did.
 */
const FungikuHintOverlay = ({
  hint,
  visible,
  theme,
  width,
  canReveal,
  canAffordReveal,
  revealCost,
  coinWord,
  emptyColor,
  coinColor,
  onReveal,
  onDismiss,
}) => {
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  // The last hint that was actually drawn. Without it the card would blank out
  // mid-exit — `hint` goes null the moment it is dismissed, but the card is still
  // on screen sliding away, and an empty card sliding away reads as a glitch.
  const shown = useRef(hint);
  if (hint) shown.current = hint;

  useEffect(() => {
    if (visible) setMounted(true);

    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? 260 : 160,
      easing: visible ? Easing.out(Easing.back(1.4)) : Easing.in(Easing.quad),
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      // Only drop it once the exit actually played out; a cancelled animation
      // means `visible` flipped again mid-flight and the next effect owns it.
      if (finished && !visible) setMounted(false);
    });

    return () => animation.stop();
  }, [visible, progress]);

  if (!mounted || !shown.current) return null;

  const current = shown.current;
  const titleColor = theme.colors.title;
  const surface = theme.colors.numberPad.background;
  const border = theme.colors.numberPad.border;

  return (
    // **`box-none`, not `none`.** `none` on the container would also disable the
    // card's own buttons; `box-none` means "this view is not a touch target, but
    // my children still are", which is exactly the split needed: the card takes
    // its own taps, everything around it falls through to the board.
    <View style={styles.layer} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.banner,
          {
            backgroundColor: surface,
            borderColor: border,
            width,
            opacity: progress,
            transform: [
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
            ],
          },
        ]}
      >
        <MaterialCommunityIcons
          name={current.kind === 'mistake' ? 'alert' : 'lightbulb-on-outline'}
          size={18}
          color={titleColor}
        />
        <Text
          style={[styles.text, { color: titleColor }]}
          // The hint arrives on its own once the button is pressed, and the
          // player's eyes are on the board rather than down here.
          accessibilityLiveRegion="polite"
        >
          {current.message}
        </Text>

        {/* The top rung, and the dearest (plan §11.2, §14.4). It draws on the
            same coin balance as the nudge, at a higher price — so a player who
            can afford a nudge cannot necessarily afford the answer. The price is
            on the button rather than in the small print, because finding out what
            something cost after paying is not a choice. */}
        {current.offerReveal && canReveal && (
          <TouchableOpacity
            onPress={onReveal}
            disabled={!canAffordReveal}
            style={[
              styles.action,
              { borderColor: canAffordReveal ? titleColor : emptyColor },
              !canAffordReveal && styles.actionDisabled,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canAffordReveal }}
            accessibilityLabel={`Reveal a mushroom, costs ${coinWord(revealCost)}`}
          >
            <Text
              style={[styles.actionText, { color: canAffordReveal ? titleColor : emptyColor }]}
            >
              Reveal
            </Text>
            <MaterialCommunityIcons
              name="circle-multiple-outline"
              size={11}
              color={canAffordReveal ? coinColor : emptyColor}
              style={styles.actionCoin}
            />
            <Text
              style={[
                styles.actionText,
                styles.actionPrice,
                { color: canAffordReveal ? titleColor : emptyColor },
              ]}
            >
              {revealCost}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={onDismiss}
          style={styles.dismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss hint"
        >
          <MaterialCommunityIcons name="close" size={16} color={titleColor} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingBottom: 20,
    paddingHorizontal: 10,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    // It floats, so it needs to read as floating. The inline banner sat in the
    // column and did not.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 6,
  },
  text: {
    fontSize: 12,
    marginLeft: 8,
    flexShrink: 1,
  },
  action: {
    borderWidth: 1,
    borderRadius: 7,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  actionDisabled: {
    opacity: 0.9,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionCoin: {
    marginLeft: 5,
  },
  actionPrice: {
    marginLeft: 2,
  },
  dismiss: {
    paddingLeft: 8,
  },
});

export default FungikuHintOverlay;
