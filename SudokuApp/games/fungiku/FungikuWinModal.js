import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  WIN_DIALOG_DELAY_MS,
  WIN_DIALOG_ENTER_MS,
  awardSteps,
  awardTotal,
} from './winPresentation';
import {
  confettiPieces,
  confettiX,
  confettiY,
  CONFETTI_DURATION_MS,
  CONFETTI_INPUT,
  CONFETTI_OPACITY,
} from './confetti';

/**
 * Built once at module scope, not per render. The trajectories are deterministic
 * (confetti.js), so there is exactly one burst in the app and rebuilding it would
 * only churn objects.
 */
const PIECES = confettiPieces();

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
  const burst = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(0)).current;

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
    // **A plain fade and a slight scale.** It was an `Easing.back` overshoot with
    // a slide up, and the operator's report was that it arrived clunkily — which
    // it did: a dialog that springs past its size and settles back has arrived
    // twice, and it was doing that while confetti and four payout rows were also
    // moving. One thing moves now, and it moves once (plan §12.11).
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? WIN_DIALOG_ENTER_MS : 150,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
      useNativeDriver: true,
    });
    animation.start();

    // No `setValue` near this one — it is native-driven, and plan §2's rule is
    // that the two must never be mixed.
    return () => animation.stop();
  }, [visible, progress]);

  useEffect(() => {
    if (!visible) return undefined;

    // The confetti. One pass, not a loop: a celebration that never stops becomes
    // wallpaper. Driven natively and never `setValue`d — it animates from 0 to 1
    // and both ends of the trajectory are "nothing on screen" (confetti.js), so
    // there is no reset to get wrong.
    const animation = Animated.timing(burst, {
      toValue: 1,
      duration: CONFETTI_DURATION_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    animation.start();

    return () => animation.stop();
  }, [visible, burst]);

  useEffect(() => {
    // The payout's one beat. It is a fade only — the block is already mounted
    // and holding its height (see the render), so nothing moves.
    const animation = Animated.timing(reveal, {
      toValue: award.revealed ? 1 : 0,
      duration: award.revealed ? 260 : 0,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    animation.start();

    return () => animation.stop();
  }, [award.revealed, reveal]);

  // Every hook has to run before this bails out — an early return above one of
  // them changes the hook count between renders and React throws.
  if (!visible) return null;

  const titleColor = theme.colors.title;
  const surface = theme.colors.numberPad.background;
  const border = theme.colors.numberPad.border;

  // All of them, together, or none yet. There is no partial state any more.
  const steps = awardSteps(reward, award.revealed);
  const total = awardTotal(reward, award.revealed);
  const hasReward = !!reward && Array.isArray(reward.steps) && reward.steps.length > 0;

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
              // One transform, one direction, no overshoot. See the entrance
              // effect above for why the spring and the slide are gone.
              transform: [
                { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
              ],
            },
          ]}
        >
          {/* The confetti (plan §12.11). It bursts from behind the popper and
              falls past the title. `pointerEvents="none"` because it covers the
              dialog's whole width and would otherwise eat taps meant for the
              backdrop; and it is drawn *first* so the text sits over it. */}
          <View style={styles.confetti} pointerEvents="none">
            {PIECES.map((piece, i) => (
              <Animated.View
                key={i}
                style={{
                  position: 'absolute',
                  width: piece.size,
                  height: piece.size,
                  borderRadius: 1,
                  backgroundColor: piece.color,
                  opacity: burst.interpolate({
                    inputRange: CONFETTI_INPUT,
                    outputRange: CONFETTI_OPACITY,
                  }),
                  transform: [
                    {
                      translateX: burst.interpolate({
                        inputRange: CONFETTI_INPUT,
                        outputRange: confettiX(piece.dx),
                      }),
                    },
                    {
                      translateY: burst.interpolate({
                        inputRange: CONFETTI_INPUT,
                        outputRange: confettiY(piece.dy),
                      }),
                    },
                    {
                      rotate: burst.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', `${piece.spin}deg`],
                      }),
                    },
                  ],
                }}
              />
            ))}
          </View>

          <MaterialCommunityIcons name="party-popper" size={30} color={accent} />

          <Text style={[styles.title, { color: titleColor }]}>Solved!</Text>
          <Text style={[styles.identity, { color: titleColor }]}>
            {size}×{size} · seed {seed}
          </Text>

          {/* The payout, all at once (plan §12.11).

              **Mounted from the moment the dialog is, and faded in** — not
              conditionally rendered. The dialog is centred now, so a block
              appearing inside it would grow the box symmetrically and shunt the
              title and the buttons apart at the exact moment the player is
              reading them. Reserving the height means the only thing that
              changes is opacity, which is the calm version of the same reveal.

              The total is summed from the rows on screen (`awardTotal`), never
              read from `reward.total`, so the dialog cannot contradict itself. */}
          {hasReward && (
            <Animated.View
              style={[styles.payout, { borderColor: border, opacity: reveal }]}
              // **Held at opacity 0 is still readable to a screen reader.** The
              // block is mounted early only to reserve its height, so it has to
              // be hidden from assistive tech until it is actually revealed —
              // otherwise the payout is announced a beat before it is shown and
              // the live region below fires against an invisible total.
              //
              // `aria-hidden`, not the older pair: `accessibilityElementsHidden`
              // is iOS-only and react-native-web does not map
              // `importantForAccessibility` at all, so the first attempt at this
              // changed nothing on the web and a browser check caught it. RN
              // maps `aria-hidden` to both native equivalents, so one prop
              // covers iOS, Android and the web.
              aria-hidden={!award.revealed}
            >
              {(award.revealed ? steps : reward.steps).map((step) => (
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

              <View style={[styles.payoutRow, styles.payoutTotal, { borderColor: border }]}>
                <Text style={[styles.payoutLabel, styles.payoutTotalText, { color: titleColor }]}>
                  Coins earned
                </Text>
                <View style={styles.payoutCoins}>
                  <MaterialCommunityIcons name="circle-multiple" size={13} color={COIN} />
                  <Text
                    style={[styles.payoutCoinsText, styles.payoutTotalText, { color: titleColor }]}
                    // It arrives on its own, so a screen reader has to be told
                    // rather than left to notice.
                    accessibilityLiveRegion="polite"
                  >
                    +{award.revealed ? total : reward.total}
                  </Text>
                </View>
              </View>
            </Animated.View>
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
    // **Centred, on the operator's call (2026-07-30).** It shipped low, over the
    // controls, reasoning that the finished board and the counting coin balance
    // should stay visible. The operator looked at it and asked for centred, and
    // they are right for a reason the argument missed: the payout no longer
    // counts up in the counter row, so there is nothing behind the dialog left
    // to watch — and a dialog pinned to the bottom of a tall phone reads as
    // having slid off rather than as having arrived.
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  confetti: {
    // Sits over the dialog's top half, centred on the popper: every piece starts
    // at this view's middle and flies out from there. Zero height so it reserves
    // no space of its own — the pieces are absolutely positioned inside it.
    position: 'absolute',
    top: 42,
    left: 0,
    right: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
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
