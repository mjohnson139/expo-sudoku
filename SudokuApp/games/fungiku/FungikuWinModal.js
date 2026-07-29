import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  WIN_DIALOG_DELAY_MS,
  WIN_DIALOG_ENTER_MS,
  isAwardComplete,
  shownAwardTotal,
  visibleAwardSteps,
} from './winPresentation';

/**
 * The win celebration's second half: a dialog, in front of the board
 * (docs/fungiku-plan.md §12.8).
 *
 * ### Why this replaced a banner
 *
 * It used to be an inline banner in the screen's column, between the counter row
 * and the board. That put it **in the layout**, which meant winning *moved the
 * board* — and the operator's device report was exactly that: *"I don't like
 * where it appears… where it is right now moves the board."*
 *
 * The cost was not only aesthetic. A view that mounts above the board invalidates
 * the origin every tap is resolved against, which is why `FungikuBoard` carries a
 * re-measure effect keyed on `solved`, and why the banner was forbidden from ever
 * changing height — the payout had to *replace* a line rather than add one, so
 * three reasons could never be on screen together. **Taking it out of the layout
 * deletes that whole class of constraint.** The dialog can be any size it likes,
 * grow as reasons land, and the board underneath does not move by a pixel.
 *
 * ### Why it waits
 *
 * It opens `WIN_DIALOG_DELAY_MS` after the win, not immediately — the board's
 * lift and the mushrooms' ripple happen first, over an unobstructed board. A
 * dialog that arrived on the winning tap would cover the celebration it is
 * supposed to be part of. The delay is **derived from the wave's own timing**
 * (winPresentation.js) so retuning one cannot silently break the other.
 *
 * ### Where it sits
 *
 * **Low, over the controls** — the same placement as `FungikuOutOfLivesModal`,
 * and for the same reason: the finished board is what the player just made, and
 * the coin balance counting up in the counter row is part of the payout. A
 * centred dialog would hide both. Sudoku's `WinModal` centres itself; where the
 * two conventions disagree, Fungiku's own precedent wins, because the complaint
 * that produced this dialog was about covering and moving the board.
 *
 * ### The payout, still narrated
 *
 * `rewardForWin` returns a total *and the steps that make it up*, and the reasons
 * land one at a time (`useCoinAward`) — the balance in the counter row counting
 * up behind the dim, each reason naming itself here. What is new is that the
 * reasons **stack** rather than replacing one another, which the banner could
 * never do. The total is summed from the rows on screen (`shownAwardTotal`), so
 * the dialog cannot contradict itself.
 */
const FungikuWinModal = ({
  solved,
  size,
  seed,
  accent,
  reward,
  award,
  onNextPuzzle,
  onDismiss,
  theme,
}) => {
  // Mounted separately from `solved`, because the dialog is deliberately late:
  // there is a window where the board is solved and this is not on screen yet.
  //
  // **Dismissal is owned here rather than lifted into the screen**, and that is
  // the reason: `solved` is a *condition, not an event* (plan §14.4), so there is
  // nothing in game state that "closing" could set. Closing is a fact about this
  // dialog, and it lives with the dialog. The effect below keys on `solved`, so
  // un-solving and re-solving — undo across the win line, then redo — reopens it,
  // which is right: that is a new arrival at the win, not the same one.
  const [visible, setVisible] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!solved) {
      setVisible(false);
      return undefined;
    }

    // Un-solving before the dialog is due (an undo across the win line, which
    // the player has ~1 second to do) cancels it rather than opening it late.
    const timer = setTimeout(() => setVisible(true), WIN_DIALOG_DELAY_MS);
    return () => clearTimeout(timer);
  }, [solved]);

  const dismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? WIN_DIALOG_ENTER_MS : 160,
      easing: visible ? Easing.out(Easing.back(1.6)) : Easing.in(Easing.quad),
      useNativeDriver: true,
    });
    animation.start();

    // No `setValue` near this one — it is native-driven, and plan §2's rule is
    // that the two must never be mixed.
    return () => animation.stop();
  }, [visible, progress]);

  useEffect(() => {
    if (!visible) {
      shimmer.setValue(0);
      return undefined;
    }

    // One pass, not a loop: a celebration that never stops becomes wallpaper.
    const animation = Animated.sequence([
      Animated.delay(WIN_DIALOG_ENTER_MS),
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 900,
        easing: Easing.inOut(Easing.quad),
        // JS driver, because this value is reset with `setValue()` above and the
        // two must never be mixed — mixing strands the rotation part-way instead
        // of returning it to 0deg (plan §2).
        useNativeDriver: false,
      }),
    ]);
    animation.start();

    return () => animation.stop();
  }, [visible, shimmer]);

  // Every hook has to run before this bails out — an early return above one of
  // them changes the hook count between renders and React throws.
  if (!visible) return null;

  const titleColor = theme.colors.title;
  const surface = theme.colors.numberPad.background;
  const border = theme.colors.numberPad.border;

  const steps = visibleAwardSteps(reward, award.stepIndex);
  const total = shownAwardTotal(reward, award.stepIndex);
  const complete = isAwardComplete(reward, award.stepIndex);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      {/* The backdrop is a dismiss target as well as a scrim: a finished board
          can still be undone, and a dialog with no way past it would make that
          unreachable. Light enough (0.35) that the board and the counter row's
          counting coins stay readable behind it — the payout is meant to be
          watched. */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={dismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss, and look at the finished board"
      >
        <Animated.View
          style={[
            styles.box,
            {
              backgroundColor: surface,
              borderColor: border,
              opacity: progress,
              transform: [
                { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
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
            <MaterialCommunityIcons name="party-popper" size={30} color={accent} />
          </Animated.View>

          <Text style={[styles.title, { color: titleColor }]}>Solved!</Text>
          <Text style={[styles.identity, { color: titleColor }]}>
            {size}×{size} · seed {seed}
          </Text>

          {/* The payout, one reason at a time. **This is the thing the banner
              could not do**: it sat above the board, so it could never grow, and
              each reason had to overwrite the last. Nothing here moves the board,
              so the reasons stack and the player can see what they earned and
              why — all of it at once, at the end. */}
          {steps.length > 0 && (
            <View style={[styles.payout, { borderColor: border }]}>
              {steps.map((step) => (
                <View key={step.label} style={styles.payoutRow}>
                  <Text style={[styles.payoutLabel, { color: titleColor }]} numberOfLines={1}>
                    {step.label}
                  </Text>
                  <View style={styles.payoutCoins}>
                    <MaterialCommunityIcons name="circle-multiple" size={12} color={COIN} />
                    <Text style={[styles.payoutCoinsText, { color: titleColor }]}>
                      +{step.coins}
                    </Text>
                  </View>
                </View>
              ))}

              {complete && (
                <View style={[styles.payoutRow, styles.payoutTotal, { borderColor: border }]}>
                  <Text style={[styles.payoutLabel, styles.payoutTotalText, { color: titleColor }]}>
                    Coins earned
                  </Text>
                  <View style={styles.payoutCoins}>
                    <MaterialCommunityIcons name="circle-multiple" size={13} color={COIN} />
                    <Text
                      style={[
                        styles.payoutCoinsText,
                        styles.payoutTotalText,
                        { color: titleColor },
                      ]}
                      // The one number here that arrives on its own, so a screen
                      // reader has to be told rather than left to notice.
                      accessibilityLiveRegion="polite"
                    >
                      +{total}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={dismiss}
              style={[styles.button, { borderColor: border }]}
              accessibilityRole="button"
              accessibilityLabel="Close, and look at the finished board"
            >
              <Text style={[styles.buttonText, { color: titleColor }]}>Close</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onNextPuzzle}
              style={[styles.button, styles.primaryButton, { backgroundColor: accent }]}
              accessibilityRole="button"
              accessibilityLabel="Play the next puzzle"
            >
              <MaterialCommunityIcons name="dice-multiple" size={16} color="#ffffff" />
              <Text style={[styles.buttonText, styles.primaryButtonText]}>Next puzzle</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

// The same gold the counter row's balance uses, so a coin here and a coin there
// are visibly the same thing.
const COIN = '#c8952b';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    // Low, over the controls — not centred. See the note at the top: the
    // finished board and the counter row's counting balance both stay visible.
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 32,
  },
  box: {
    width: 300,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
  },
  identity: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  payout: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 14,
  },
  payoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  payoutLabel: {
    fontSize: 12,
    opacity: 0.85,
    flexShrink: 1,
  },
  payoutCoins: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  payoutCoinsText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 3,
  },
  payoutTotal: {
    borderTopWidth: 1,
    marginTop: 4,
    paddingTop: 6,
  },
  payoutTotalText: {
    fontSize: 13,
    fontWeight: '800',
    opacity: 1,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  primaryButton: {
    borderColor: 'transparent',
    marginLeft: 10,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButtonText: {
    color: '#ffffff',
    marginLeft: 6,
  },
});

export default FungikuWinModal;
