import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COIN_COSTS, useFungikuContext } from './FungikuContext';
import { popoverPlacement, TAIL_SIZE } from './hintPlacement';

/**
 * The hint, as a popover on the cell it is talking about
 * (docs/fungiku-plan.md §12.10).
 *
 * ### Why it moved twice
 *
 * It began as an inline banner above the board, which pushed the board down
 * every time it appeared (§12.8). That became a floating bar pinned to the
 * bottom of the screen — which fixed the layout problem and left a different
 * one: *"was hoping the hint text would be a popover kind of thing."* A bar at
 * the far end of the screen from a highlighted cell makes the player look in two
 * places and join them up themselves. **A popover says "this cell, and here is
 * why" in one glance.**
 *
 * ### Where it lives in the tree, and why that is not arbitrary
 *
 * It is rendered **inside `FungikuBoard`'s card, as a sibling of the touch box**
 * — not inside the touch box, and not back up in the screen.
 *
 * - Not in the touch box, because the board claims every touch **at touch-down in
 *   the capture phase** to win the ScrollView race (plan §2). A child of that
 *   view can never receive a press, so Dismiss and Reveal would be dead.
 * - Not in the screen, because then it would need the board's measured origin to
 *   place itself, and `measureInWindow` is asynchronous — the popover would
 *   arrive a frame late, in the wrong place, on the one interaction whose entire
 *   value is pointing accurately.
 *
 * As a sibling it is positioned in the board's own coordinates, which are the
 * same coordinates `cellFromPoint` resolves taps in, and it is outside the touch
 * box's capture path so its buttons work.
 *
 * ### It swallows taps that land on it, deliberately
 *
 * The layer around it is `pointerEvents="box-none"` so the rest of the board is
 * still live, but the bubble itself takes its own touches rather than passing
 * them through. Passing them through would mean tapping "somewhere in the
 * message" silently ruled out a cell the player could not see.
 */
const FungikuHintPopover = ({ size, cellSize, theme, coinWord, emptyColor, coinColor }) => {
  const { hint, solved, canReveal, canAffordReveal, revealMushroom, dismissHint } =
    useFungikuContext();

  const visible = !!hint && !solved;
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  // The last hint actually drawn. Without it the bubble blanks out mid-exit —
  // `hint` goes null the instant it is dismissed, but the bubble is still on
  // screen shrinking away, and an empty bubble shrinking away reads as a glitch.
  const shown = useRef(hint);
  if (hint) shown.current = hint;

  useEffect(() => {
    if (visible) setMounted(true);

    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? 240 : 150,
      easing: visible ? Easing.out(Easing.back(1.5)) : Easing.in(Easing.quad),
      useNativeDriver: true,
    });

    animation.start(({ finished }) => {
      // Only drop it once the exit actually played out; a cancelled animation
      // means `visible` flipped again mid-flight and the next effect owns it.
      // An overlay left mounted at opacity 0 is invisible and still real: it
      // would keep announcing a stale hint to a screen reader and keep a dead
      // dismiss button sitting over the board.
      if (finished && !visible) setMounted(false);
    });

    return () => animation.stop();
  }, [visible, progress]);

  if (!mounted || !shown.current) return null;

  const current = shown.current;
  const titleColor = theme.colors.title;
  const surface = theme.colors.numberPad.background;
  const border = theme.colors.numberPad.border;

  const place = popoverPlacement({
    cell: current.cells && current.cells.length > 0 ? current.cells[0] : -1,
    size,
    cellSize,
  });

  // The bubble grows *out of* the cell it points at, which is the other half of
  // "animate to the cell": the ring closes in, the bubble opens from the same
  // place. Anchoring the scale at the tail rather than the bubble's middle is
  // what makes it read as coming from the cell instead of just appearing.
  const originY = place.side === 'below' ? -12 : 12;

  return (
    <View style={[styles.layer, { width: cellSize * size, height: cellSize * size }]} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.bubble,
          {
            backgroundColor: surface,
            borderColor: border,
            left: place.left,
            width: place.width,
            ...(place.side === 'above' ? { bottom: place.bottom } : { top: place.top }),
            opacity: progress,
            transform: [
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [originY, 0] }) },
              { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
            ],
          },
        ]}
      >
        {/* The pointer: a square turned 45°, half of it tucked behind the body.
            Only the two outward-facing edges carry a border, or the rotation
            would draw a line straight through the bubble's own edge. */}
        {place.tailLeft !== null && (
          <View
            style={[
              styles.tail,
              {
                left: place.tailLeft,
                backgroundColor: surface,
                borderColor: border,
                ...(place.side === 'below'
                  ? { top: -TAIL_SIZE / 2, borderTopWidth: 1, borderLeftWidth: 1 }
                  : { bottom: -TAIL_SIZE / 2, borderBottomWidth: 1, borderRightWidth: 1 }),
              },
            ]}
          />
        )}

        <View style={styles.row}>
          <MaterialCommunityIcons
            name={current.kind === 'mistake' ? 'alert' : 'lightbulb-on-outline'}
            size={16}
            color={titleColor}
          />
          <Text
            style={[styles.text, { color: titleColor }]}
            // The hint arrives on its own once the button is pressed, and the
            // player's eyes are on the board rather than on this bubble.
            accessibilityLiveRegion="polite"
          >
            {current.message}
          </Text>

          <TouchableOpacity
            onPress={dismissHint}
            style={styles.dismiss}
            accessibilityRole="button"
            accessibilityLabel="Dismiss hint"
          >
            <MaterialCommunityIcons name="close" size={15} color={titleColor} />
          </TouchableOpacity>
        </View>

        {/* The top rung, and the dearest (plan §11.2, §14.4). It draws on the
            same coin balance as the nudge, at four times the price — so a player
            who can afford a nudge cannot necessarily afford the answer. The
            price is on the button rather than in the small print, because
            finding out what something cost after paying is not a choice.

            It gets its own line here rather than sitting in the row: the bubble
            is narrow, and a bubble may change height freely — that was the whole
            point of getting these out of the layout (§12.8). */}
        {current.offerReveal && canReveal && (
          <TouchableOpacity
            onPress={revealMushroom}
            disabled={!canAffordReveal}
            style={[
              styles.action,
              { borderColor: canAffordReveal ? titleColor : emptyColor },
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canAffordReveal }}
            accessibilityLabel={`Reveal a mushroom, costs ${coinWord(COIN_COSTS.REVEAL)}`}
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
              {COIN_COSTS.REVEAL}
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  bubble: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    // It floats over the board, so it has to read as floating. The bar it
    // replaced sat in the page and did not need this.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  tail: {
    position: 'absolute',
    width: TAIL_SIZE,
    height: TAIL_SIZE,
    transform: [{ rotate: '45deg' }],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  text: {
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 7,
    flexShrink: 1,
    flexGrow: 1,
  },
  dismiss: {
    paddingLeft: 6,
    paddingTop: 1,
  },
  action: {
    borderWidth: 1,
    borderRadius: 7,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginTop: 8,
    marginLeft: 23,
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
});

export default FungikuHintPopover;
