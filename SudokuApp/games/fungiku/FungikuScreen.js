import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ScreenHeader';
import useAppTheme from '../../hooks/useAppTheme';
import useBoardSize from '../../hooks/useBoardSize';
import FungikuBoard from './FungikuBoard';
import FungikuMenuModal from './FungikuMenuModal';
import FungikuOutOfLivesModal from './FungikuOutOfLivesModal';
import FungikuWinBanner from './FungikuWinBanner';
import { boardExtent } from './geometry';
import { difficultyLabel } from './difficulty';
import useCoinAward from './useCoinAward';
import { COIN_COSTS, FungikuProvider, useFungikuContext } from './FungikuContext';

// The accent Fungiku is identified by on the hub card; reused for the win banner
// so winning looks like Fungiku rather than a generic green success box.
const FUNGIKU_ACCENT = '#a0522d';

// Lives are drawn in their own colour rather than the theme's title ink, so
// "you have three of these and they run out" reads at a glance and does not look
// like more chrome. Spent hearts fall back to the theme, hollow.
const FUNGIKU_LIFE = '#d1495b';

// A price you cannot pay borrows the hearts' colour on purpose (plan §14.4).
// The app has two things that run out, and one of them was already taught to the
// player in red; a second colour for the same idea would be a second idea.
const FUNGIKU_EMPTY = FUNGIKU_LIFE;

// Coins get their own gold rather than the theme's ink, for the same reason the
// hearts do: a currency you can run out of should not look like more chrome.
const FUNGIKU_COIN = '#c8952b';

/** "1 coin" / "2 coins". Only ever read aloud, and only ever wrong at one. */
const coinWord = (n) => `${n} coin${n === 1 ? '' : 's'}`;

/**
 * Fungiku's screen — a peer of the Sudoku screen, reached from the hub
 * (docs/fungiku-plan.md §6), and as of Step 4 an actually playable game.
 *
 * Layout: header, the `🍄 X/N` counter, the board, then controls. The size and
 * "next puzzle" controls stand in for the training ladder until the ladder step
 * lands (plan §7).
 */
const FungikuScreenContent = ({ onExitToHub }) => {
  const { theme, isDark } = useAppTheme();

  // The counter row is width-matched to the board rather than left to size
  // itself from its contents. **This is load-bearing, not cosmetic.** The row
  // sits in a ScrollView whose content container centres its children, so a row
  // wider than the screen widens the content container — and every centred
  // sibling, the board included, gets pushed right and clipped. Adding the
  // hearts was enough to do exactly that on a phone: the last column ended up
  // off-screen and untappable.
  //
  // Matched to the board's **real** width, not to the allowance. A cell is a
  // whole number of pixels, so 324 at 7×7 is a 322pt board — and matching the row
  // to 324 left it two pixels proud on each side, which on device reads as the
  // board's edge being clipped by the box above it. `boardExtent` is the one
  // place that remainder is worked out.
  const available = useBoardSize();

  // True while a finger is down on the board, which freezes scrolling so a
  // vertical sweep paints instead of scrolling the page.
  const [boardTouchActive, setBoardTouchActive] = useState(false);

  const {
    difficulty,
    size,
    seed,
    mushroomCount,
    solved,
    hasMarks,
    canUndo,
    canRedo,
    undo,
    redo,
    clearMarks,
    changeDifficulty,
    changeSize,
    changeSeed,
    nextPuzzle,
    ruleOut,
    ruleOutCount,
    lives,
    lastMistake,
    restartBoard,
    hint,
    hintsUsed,
    requestHint,
    revealMushroom,
    dismissHint,
    canReveal,
    generating,
    // The wallet (plan §14.4). `coins` is what is left across every board ever
    // played; `hintsUsed` above is still what *this* board has cost. Both, on
    // purpose — earning is computed from the second.
    coins,
    canAffordHint,
    canAffordReveal,
    canAffordRuleOut,
    lastReward,
    grantCoins,
  } = useFungikuContext();

  // The payout animation (plan §14.4). It owns only how much of the win is still
  // hidden; the number on screen is the real balance minus that, so a coin spent
  // at any moment — including mid-animation — moves it without special cases.
  const award = useCoinAward(lastReward);
  const shownCoins = Math.max(0, coins - award.pending);

  // The board's true width — see the note on `available` above.
  const { board: boardWidth } = boardExtent(available, size);

  const titleColor = theme.colors.title;
  const surface = theme.colors.numberPad.background;
  const border = theme.colors.numberPad.border;

  // --- the difficulty menu (plan §14.1) ------------------------------------
  const [menuVisible, setMenuVisible] = useState(false);

  // Opened once, on arrival, when there is nothing to come back to — the same
  // way Sudoku opens its menu when no game is in progress. A restored board (or
  // one already being played) is not interrupted: the header button is how you
  // reach the menu then.
  //
  // The provider withholds its children until hydration, so this component's
  // first render already sees the restored board and `hasMarks` is trustworthy
  // here. Guarded by a ref rather than by `hasMarks` alone, or clearing the
  // board mid-game would pop the menu open.
  const openedOnArrival = useRef(false);
  useEffect(() => {
    if (openedOnArrival.current) return;
    openedOnArrival.current = true;
    if (!hasMarks) setMenuVisible(true);
  }, [hasMarks]);

  // The heart that just emptied gets a beat of its own. Losing a life is the one
  // thing on this screen that happens *to* the player, and before this it was a
  // silent swap of one icon for another — easy to miss entirely, which is what
  // the operator reported.
  //
  // One value per heart, never one shared value pointed at "the heart that just
  // went" — the same rule the board's pop and shake follow (plan §2).
  const heartBeats = useRef(
    Array.from({ length: lives.of }, () => new Animated.Value(1))
  ).current;
  const previousLives = useRef(lives.left);

  useEffect(() => {
    const before = previousLives.current;
    previousLives.current = lives.left;
    // Only a life *lost*. Gaining them back is the restart, which has a modal.
    if (lives.left >= before) return;

    const value = heartBeats[lives.left];
    if (!value) return;

    value.stopAnimation();
    value.setValue(1);
    Animated.sequence([
      Animated.timing(value, { toValue: 1.6, duration: 120, useNativeDriver: false }),
      Animated.timing(value, { toValue: 1, duration: 220, useNativeDriver: false }),
    ]).start(() => value.setValue(1));
  }, [lives.left, heartBeats]);

  const closeMenu = () => setMenuVisible(false);

  // Every path out of the menu starts a board, so every one of them closes it.
  const pickDifficulty = (next) => {
    closeMenu();
    changeDifficulty(next);
  };
  const pickSize = (next) => {
    closeMenu();
    changeSize(next);
  };
  const pickSeed = (next) => {
    closeMenu();
    changeSeed(next);
  };

  // The gift/purchase seam (plan §14.4), behind the menu's developer constant.
  // Deliberately does *not* close the menu: the balance it changes is drawn a
  // line above the button, so the point of pressing it is seeing it move.
  const giftCoins = () => grantCoins(10);

  // The status line follows the state of play instead of always explaining the
  // input model. (Named `statusText`, not `hint` — `hint` is the hint object from
  // context, and shadowing it here silently broke the build once.)
  //
  // It no longer counts conflicts. Since plan §14.3 a wrong mushroom never
  // survives placement, so every mushroom on the board sits at a solution cell —
  // and two solution cells cannot share a row, column or region, or touch. There
  // is no such thing as two mushrooms breaking a rule any more, so a line
  // reporting it would be a promise the game can never keep.
  //
  // A wrong guess takes the top slot below "Generating…". It is the one thing
  // that happens *to* the player, and it needs saying in words as well as in the
  // shake and the heart — three channels, because the operator's report was that
  // it was not obvious a life had gone at all. It lives here rather than in a
  // banner of its own because a banner mounting above the board moves the board
  // (see FungikuBoard's re-measure effect); this row is always mounted and its
  // height is fixed.
  //
  // Running out of lives is *not* here: it gets the modal, because a board about
  // to be wiped deserves more than a line of small print.
  const statusText = generating
    ? 'Generating…'
    : lastMistake
      ? 'Wrong — no mushroom there. That cost you a life.'
      : solved
        ? 'One per row, column and color — none touching'
        : 'Tap to rule out · double-tap to place';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Which board you are on lives in the header (plan §14.1), not in a
          banner above the board. A view that mounts above the board *moves* the
          board, which invalidates the origin every tap is resolved against —
          the bug behind FungikuBoard's re-measure effect. The header is always
          mounted and its subtitle is always present, so its height never
          changes and there is no origin to invalidate. */}
      <ScreenHeader
        title="Fungiku"
        subtitle={`${difficultyLabel(difficulty)} · ${size}×${size}`}
        theme={theme}
        onHomePress={onExitToHub}
        onMenuPress={() => setMenuVisible(true)}
      />

      <FungikuMenuModal
        visible={menuVisible}
        theme={theme}
        difficulty={difficulty}
        size={size}
        seed={seed}
        generating={generating}
        coins={coins}
        onPickDifficulty={pickDifficulty}
        onPickSize={pickSize}
        onPickSeed={pickSeed}
        onGiftCoins={giftCoins}
        onClose={closeMenu}
      />

      {/* Driven by `lives === 0`, which the reducer treats as "a restart is
          pending" rather than as a state the board is left sitting in. Because
          `lives` is persisted, quitting to the hub with the dialog up and coming
          back lands on it again instead of stranding a board with no lives. */}
      <FungikuOutOfLivesModal
        visible={lives.left === 0}
        theme={theme}
        lives={lives.of}
        onRestart={restartBoard}
      />

      {/* Two halves of one fix for "a vertical drag scrolls instead of painting"
          (the board claims the touch at touch-down; see FungikuBoard):
            scrollEnabled       — frozen while a finger is down on the board.
                                  This is what reliably stops Android's
                                  ScrollView from intercepting the drag.
            canCancelContentTouches (iOS only) — stops UIScrollView cancelling a
                                  touch the board has already claimed.
          The trade-off is deliberate: you cannot scroll this screen by dragging
          on the board. Drag anywhere else. The content fits without scrolling on
          a normal phone even at 8×8, so the ScrollView is really insurance for
          small or landscape screens. */}
      <ScrollView
        contentContainerStyle={styles.body}
        scrollEnabled={!boardTouchActive}
        {...(Platform.OS === 'ios' ? { canCancelContentTouches: false } : null)}
      >
        {/* The `🍄 X/N` counter (plan §1) — how the player tracks the goal, and
            where a big board's generation hitch is announced (plan §12.1).

            The "Generating…" state deliberately lives *inside this row* rather
            than in a banner of its own. A view that mounts above the board moves
            the board, which invalidates the origin every touch is resolved
            against — the bug behind the hint banner's re-measure effect. This row
            is always mounted and keeps its height, so the board never moves and
            there is no origin to invalidate. */}
        <View
          style={[
            styles.counterRow,
            { backgroundColor: surface, borderColor: border, width: boardWidth },
          ]}
        >
          {/* Two lines, both always present, so the box height is constant and
              the board below it never moves. The status line is the part that
              grows with what the game has to say, and it gets its own line
              rather than competing with the counter for horizontal room. */}
          <View style={styles.counterTop}>
            <View style={styles.counterCount}>
              {generating ? (
                <ActivityIndicator size="small" color={titleColor} />
              ) : (
                <MaterialCommunityIcons name="mushroom" size={20} color={titleColor} />
              )}
              <Text
                style={[styles.counterText, { color: titleColor }]}
                accessibilityLabel={`${mushroomCount} of ${size} mushrooms placed`}
              >
                {mushroomCount}/{size}
              </Text>
            </View>

            {/* The coin balance (plan §14.4). It lives here, in the row that is
                always mounted and never changes height, for the same reason the
                hearts and "Generating…" do: anything that mounts *above* the
                board moves the board and invalidates the origin every tap is
                resolved against.

                This is the number the payout animation counts up. It is derived
                — the real balance minus whatever the animation is still holding
                back — so spending a coin moves it correctly even mid-celebration,
                and there is no display copy to fall out of step. */}
            <Animated.View
              style={[styles.coins, { transform: [{ scale: award.pop }] }]}
              accessible
              accessibilityLabel={coinWord(shownCoins)}
              // The payout is worth announcing: it is the one number on this
              // screen that changes without the player touching anything.
              accessibilityLiveRegion={award.done ? 'none' : 'polite'}
            >
              <MaterialCommunityIcons name="circle-multiple" size={16} color={FUNGIKU_COIN} />
              <Text style={[styles.coinsText, { color: titleColor }]}>{shownCoins}</Text>
            </Animated.View>

            {/* Lives (plan §14.3). Deliberately *inside* this box rather than in
                a strip of its own: a view that mounts above the board moves the
                board, which invalidates the origin every touch is resolved
                against. Hearts that fill and empty in an always-mounted box of
                fixed height cannot move anything. */}
            <View
              style={styles.lives}
              accessible
              accessibilityLabel={`${lives.left} of ${lives.of} lives left`}
              // A lost life is worth announcing — it is the one thing on this
              // screen that happens *to* the player rather than because of a tap
              // they meant to make.
              accessibilityLiveRegion="polite"
            >
              {Array.from({ length: lives.of }, (_, i) => (
                <Animated.View key={i} style={{ transform: [{ scale: heartBeats[i] }] }}>
                  <MaterialCommunityIcons
                    name={i < lives.left ? 'heart' : 'heart-outline'}
                    size={15}
                    color={i < lives.left ? FUNGIKU_LIFE : titleColor}
                    style={styles.life}
                  />
                </Animated.View>
              ))}
            </View>
          </View>

          <Text
            style={[styles.counterHint, { color: titleColor }]}
            // One line, clipped rather than wrapped: a second line would change
            // the box height and move the board.
            numberOfLines={1}
            // Announced, because a player who cannot see the spinner still needs
            // to know why the board stopped responding.
            accessibilityLiveRegion={generating || lastMistake ? 'polite' : 'none'}
          >
            {statusText}
          </Text>
        </View>

        {/* Hint output (plan §11.2). A hint is an explicit request, so its
            result gets its own line rather than a fleeting toast — and the
            "nothing is forced" case says so, with the reveal as a second,
            deliberate tap. */}
        {hint && !solved && (
          <View style={[styles.hintBanner, { backgroundColor: surface, borderColor: border }]}>
            <MaterialCommunityIcons
              name={hint.kind === 'mistake' ? 'alert' : 'lightbulb-on-outline'}
              size={18}
              color={titleColor}
            />
            <Text style={[styles.hintText, { color: titleColor }]}>{hint.message}</Text>

            {/* The top rung, and the dearest (plan §11.2, §14.4). It draws on the
                same hint balance as the nudge, at a higher price — so a player
                who can afford a nudge cannot necessarily afford the answer. The
                price is on the button rather than in the small print, because
                finding out what something cost after paying is not a choice. */}
            {hint.offerReveal && canReveal && (
              <TouchableOpacity
                onPress={revealMushroom}
                disabled={!canAffordReveal}
                style={[
                  styles.hintAction,
                  { borderColor: canAffordReveal ? titleColor : FUNGIKU_EMPTY },
                  !canAffordReveal && styles.toolButtonDisabled,
                ]}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canAffordReveal }}
                accessibilityLabel={
                  canAffordReveal
                    ? `Reveal a mushroom, costs ${coinWord(COIN_COSTS.REVEAL)}, you have ${coins}`
                    : `Reveal a mushroom, costs ${coinWord(COIN_COSTS.REVEAL)} and you have ${coins}`
                }
              >
                <Text
                  style={[
                    styles.hintActionText,
                    { color: canAffordReveal ? titleColor : FUNGIKU_EMPTY },
                  ]}
                >
                  Reveal
                </Text>
                <MaterialCommunityIcons
                  name="circle-multiple-outline"
                  size={11}
                  color={canAffordReveal ? FUNGIKU_COIN : FUNGIKU_EMPTY}
                  style={styles.hintActionCoin}
                />
                <Text
                  style={[
                    styles.hintActionText,
                    styles.hintActionPrice,
                    { color: canAffordReveal ? titleColor : FUNGIKU_EMPTY },
                  ]}
                >
                  {COIN_COSTS.REVEAL}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={dismissHint}
              style={styles.hintDismiss}
              accessibilityRole="button"
              accessibilityLabel="Dismiss hint"
            >
              <MaterialCommunityIcons name="close" size={16} color={titleColor} />
            </TouchableOpacity>
          </View>
        )}

        {/* The payout rides in the banner that is already there rather than in a
            view of its own (plan §14.4). A new view above the board would move
            the board and invalidate the tap origin; `solved` is *already* one of
            FungikuBoard's re-measure deps, so the banner is the one place above
            the board that can change without adding a dependency. */}
        <FungikuWinBanner
          solved={solved}
          size={size}
          seed={seed}
          accent={FUNGIKU_ACCENT}
          reward={lastReward}
          award={award}
          onNextPuzzle={nextPuzzle}
        />

        <FungikuBoard
          isDark={isDark}
          theme={theme}
          onTouchActiveChange={setBoardTouchActive}
        />

        {/* Undo / redo / clear */}
        <View style={styles.controlRow}>
          <ToolButton
            icon="undo"
            label="Undo"
            onPress={undo}
            disabled={!canUndo}
            theme={theme}
          />
          <ToolButton
            icon="redo"
            label="Redo"
            onPress={redo}
            disabled={!canRedo}
            theme={theme}
          />
          <ToolButton
            icon="eraser"
            label="Clear"
            onPress={clearMarks}
            disabled={!hasMarks}
            theme={theme}
          />
        </View>

        {/* Rule out (plan §2), now a consumable (plan §14.4). An action the
            player asks for, not a mode that acts behind them: one tap marks
            everything the mushrooms already on the board forbid, and one coin.

            **Two reasons it can be dead, drawn differently.** "Nothing to mark"
            is the board telling you this would do nothing; "none left" is the
            wallet telling you that you cannot afford it. Collapsing both into a
            greyed-out button would leave the player with no way to tell whether
            waiting or earning is what fixes it. */}
        <View style={styles.controlRow}>
          <AssistButton
            icon="auto-fix"
            label={ruleOutCount === 0 ? 'Rule out' : `Rule out ${ruleOutCount}`}
            onPress={ruleOut}
            // Nothing to mark: the board's answer, not the wallet's.
            idle={ruleOutCount === 0}
            cost={COIN_COSTS.RULE_OUT}
            affordable={canAffordRuleOut}
            theme={theme}
            accessibilityLabel={
              !canAffordRuleOut
                ? `Rule out, costs ${coinWord(
                    COIN_COSTS.RULE_OUT
                  )} and you have ${coins}. Finish a board to earn more.`
                : ruleOutCount === 0
                  ? 'Rule out, nothing to mark'
                  : `Rule out ${ruleOutCount} cell${ruleOutCount === 1 ? '' : 's'}, costs ${coinWord(
                      COIN_COSTS.RULE_OUT
                    )}`
            }
            accessibilityHint="Marks every cell the mushrooms you have placed forbid"
          />
        </View>

        {/* Hint (plan §11.2), priced (plan §14.4). The "Show mistakes" switch
            that used to sit beside it is **gone, not hidden** (plan §14.3):
            correctness feedback stopped being a preference the moment a wrong
            guess started costing a life. What made always-on feedback corrosive
            was that guessing was free, and it no longer is.

            The balance shown is the *hint* balance, which the reveal in the
            banner draws on too — one currency, two prices (§11.2's ladder says
            each rung costs more than the last). */}
        <View style={styles.controlRow}>
          <AssistButton
            icon="lightbulb-on-outline"
            label={hintsUsed > 0 ? `Hint (${hintsUsed})` : 'Hint'}
            onPress={requestHint}
            idle={solved}
            cost={COIN_COSTS.HINT}
            affordable={canAffordHint}
            theme={theme}
            accessibilityLabel={
              !canAffordHint
                ? `Hint, costs ${coinWord(
                    COIN_COSTS.HINT
                  )} and you have ${coins}. Finish a board to earn more.`
                : `Hint, costs ${coinWord(COIN_COSTS.HINT)}${
                    hintsUsed > 0 ? `, ${hintsUsed} used on this board` : ''
                  }`
            }
            accessibilityHint="Gives the weakest hint that still helps. Saying nothing is forced is free."
          />
        </View>

        {/* Another board at this difficulty, and the way to the menu.

            The size chips and the seed both moved into the menu (plan §14.1) —
            picking a puzzle is one place now, not a row of developer controls
            under the board. What is left here is the two things a player wants
            mid-game without going shopping: another board like this one, and the
            menu. */}
        <View style={styles.controlRow}>
          <TouchableOpacity
            onPress={nextPuzzle}
            // A second tap while the top size is still generating would only
            // queue work the first tap is already doing.
            disabled={generating}
            style={[
              styles.wideButton,
              { borderColor: border },
              generating && styles.toolButtonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: generating }}
            accessibilityLabel="Generate the next puzzle"
          >
            <MaterialCommunityIcons name="dice-multiple" size={18} color={titleColor} />
            <Text style={[styles.buttonText, { color: titleColor }]}>New puzzle</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            style={[styles.wideButton, styles.menuButtonSpacing, { borderColor: border }]}
            accessibilityRole="button"
            accessibilityLabel="Change difficulty"
            accessibilityHint="Opens the menu to pick a difficulty"
          >
            <MaterialCommunityIcons name="tune-variant" size={18} color={titleColor} />
            <Text style={[styles.buttonText, { color: titleColor }]}>Difficulty</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

/**
 * A priced assist: the action on the left, **what it costs** on the right
 * (plan §14.4).
 *
 * The button shows a *price*, not a balance — the balance is one number in the
 * counter row above the board, where it is always visible and where the payout
 * animation counts it up. Repeating it on every button would be three copies of
 * one fact, and would leave nowhere to say the thing only the button knows.
 *
 * **Three reasons this button can be dead, and it has to say which.**
 *   - `idle` — the board has nothing for it to do (nothing to rule out, or the
 *     puzzle is finished). Dimmed, price in the normal ink.
 *   - `!affordable` — you cannot pay. **Not dimmed**: the price and the border go
 *     red, because a greyed-out button reads as "not now" and this one means
 *     "not until you earn more", which is a different instruction.
 *   - neither — live.
 */
const AssistButton = ({
  icon,
  label,
  onPress,
  idle,
  cost,
  affordable,
  theme,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const titleColor = theme.colors.title;
  const disabled = idle || !affordable;
  const priceColor = affordable ? titleColor : FUNGIKU_EMPTY;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.wideButton,
        styles.assistButton,
        { borderColor: affordable ? theme.colors.numberPad.border : FUNGIKU_EMPTY },
        // Only the board's "nothing to do here" dims. Not being able to afford it
        // is a state the player has to read, not one that fades into the
        // background.
        idle && styles.toolButtonDisabled,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      <View style={styles.assistAction}>
        <MaterialCommunityIcons name={icon} size={18} color={titleColor} />
        <Text style={[styles.buttonText, { color: titleColor }]}>{label}</Text>
      </View>

      <View style={styles.assistPrice}>
        <MaterialCommunityIcons
          name="circle-multiple-outline"
          size={13}
          color={affordable ? FUNGIKU_COIN : FUNGIKU_EMPTY}
        />
        <Text style={[styles.assistPriceText, { color: priceColor }]}>{cost}</Text>
      </View>
    </TouchableOpacity>
  );
};

const ToolButton = ({ icon, label, onPress, disabled, theme }) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={[
      styles.toolButton,
      { borderColor: theme.colors.numberPad.border },
      disabled && styles.toolButtonDisabled,
    ]}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled: !!disabled }}
  >
    <MaterialCommunityIcons name={icon} size={20} color={theme.colors.title} />
    <Text style={[styles.toolButtonText, { color: theme.colors.title }]}>{label}</Text>
  </TouchableOpacity>
);

const FungikuScreen = ({ onExitToHub }) => (
  <FungikuProvider>
    <FungikuScreenContent onExitToHub={onExitToHub} />
  </FungikuProvider>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    ...(Platform.OS === 'web'
      ? {
          paddingTop: 20,
          paddingBottom: 20,
          maxWidth: 600,
          marginHorizontal: 'auto',
          width: '100%',
        }
      : {}),
  },
  body: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  counterRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  counterTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counterCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterText: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 6,
  },
  hintBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 12,
    maxWidth: 360,
  },
  hintText: {
    fontSize: 12,
    marginLeft: 8,
    flexShrink: 1,
  },
  hintAction: {
    borderWidth: 1,
    borderRadius: 7,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  hintActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  hintDismiss: {
    paddingLeft: 8,
  },
  counterHint: {
    fontSize: 11,
    opacity: 0.7,
    marginTop: 2,
  },
  lives: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  life: {
    marginLeft: 1,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginHorizontal: 4,
  },
  toolButtonDisabled: {
    opacity: 0.35,
  },
  toolButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
  menuButtonSpacing: {
    marginLeft: 8,
  },
  wideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  assistButton: {
    // Fixed, so a balance falling from 10 to 9 — or to "none left" — does not
    // resize the button under the finger that is about to press it again.
    minWidth: 240,
    justifyContent: 'space-between',
  },
  assistAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assistPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  assistPriceText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  coins: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coinsText: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 4,
  },
  hintActionCoin: {
    marginLeft: 5,
  },
  hintActionPrice: {
    marginLeft: 2,
  },
});

export default FungikuScreen;
