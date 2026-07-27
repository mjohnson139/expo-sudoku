import React, { useEffect, useRef, useState } from 'react';
import {
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
import FungikuBoard from './FungikuBoard';
import FungikuMenuModal from './FungikuMenuModal';
import FungikuWinBanner from './FungikuWinBanner';
import { difficultyLabel } from './difficulty';
import { FungikuProvider, useFungikuContext } from './FungikuContext';

// The accent Fungiku is identified by on the hub card; reused for the win banner
// so winning looks like Fungiku rather than a generic green success box.
const FUNGIKU_ACCENT = '#a0522d';

// Lives are drawn in their own colour rather than the theme's title ink, so
// "you have three of these and they run out" reads at a glance and does not look
// like more chrome. Spent hearts fall back to the theme, hollow.
const FUNGIKU_LIFE = '#d1495b';

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
    outOfLives,
    hint,
    hintsUsed,
    requestHint,
    revealMushroom,
    dismissHint,
    canReveal,
    generating,
  } = useFungikuContext();

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
  // Running out of lives takes the top slot below "Generating…": the board just
  // emptied itself, and that needs saying before anything else. It lives here
  // rather than in a banner of its own because a banner mounting above the board
  // moves the board — see FungikuBoard's re-measure effect.
  const statusText = generating
    ? 'Generating…'
    : outOfLives
      ? 'Out of lives — same board, fresh start'
      : solved
        ? 'One per row, column and color — none touching'
        : 'Tap to rule out · double-tap to place · drag to sweep ✕';

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
        onPickDifficulty={pickDifficulty}
        onPickSize={pickSize}
        onPickSeed={pickSeed}
        onClose={closeMenu}
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
        <View style={[styles.counterRow, { backgroundColor: surface, borderColor: border }]}>
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

          {/* Lives (plan §14.3). Deliberately *inside* this row rather than in
              a strip of its own: a view that mounts above the board moves the
              board, which invalidates the origin every touch is resolved
              against. Hearts that fill and empty in an always-mounted row of
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
              <MaterialCommunityIcons
                key={i}
                name={i < lives.left ? 'heart' : 'heart-outline'}
                size={15}
                color={i < lives.left ? FUNGIKU_LIFE : titleColor}
                style={styles.life}
              />
            ))}
          </View>

          <Text
            style={[styles.counterHint, { color: titleColor }]}
            // Announced, because a player who cannot see the spinner still needs
            // to know why the board stopped responding.
            accessibilityLiveRegion={generating || outOfLives ? 'polite' : 'none'}
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

            {hint.offerReveal && canReveal && (
              <TouchableOpacity
                onPress={revealMushroom}
                style={[styles.hintAction, { borderColor: titleColor }]}
                accessibilityRole="button"
                accessibilityLabel="Reveal a mushroom"
              >
                <Text style={[styles.hintActionText, { color: titleColor }]}>Reveal</Text>
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

        <FungikuWinBanner
          solved={solved}
          size={size}
          seed={seed}
          accent={FUNGIKU_ACCENT}
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

        {/* Rule out (plan §2). An action the player asks for, not a mode that
            acts behind them: one tap marks everything the mushrooms already on
            the board forbid. Disabled when there is nothing left to mark, so it
            never offers to do nothing. */}
        <View style={styles.controlRow}>
          <TouchableOpacity
            onPress={ruleOut}
            disabled={ruleOutCount === 0}
            style={[
              styles.wideButton,
              { borderColor: border },
              ruleOutCount === 0 && styles.toolButtonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: ruleOutCount === 0 }}
            accessibilityLabel={
              ruleOutCount === 0
                ? 'Rule out, nothing to mark'
                : `Rule out ${ruleOutCount} cell${ruleOutCount === 1 ? '' : 's'}`
            }
            accessibilityHint="Marks every cell the mushrooms you have placed forbid"
          >
            <MaterialCommunityIcons name="auto-fix" size={18} color={titleColor} />
            <Text style={[styles.buttonText, { color: titleColor }]}>
              {ruleOutCount === 0 ? 'Rule out' : `Rule out ${ruleOutCount}`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Hint (plan §11.2). The "Show mistakes" switch that used to sit beside
            it is **gone, not hidden** (plan §14.3): correctness feedback stopped
            being a preference the moment a wrong guess started costing a life.
            What made always-on feedback corrosive was that guessing was free, and
            it no longer is. */}
        <View style={styles.controlRow}>
          <TouchableOpacity
            onPress={requestHint}
            disabled={solved}
            style={[
              styles.wideButton,
              { borderColor: border },
              solved && styles.toolButtonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityState={{ disabled: solved }}
            accessibilityLabel={hintsUsed > 0 ? `Hint, ${hintsUsed} used` : 'Hint'}
            accessibilityHint="Gives the weakest hint that still helps"
          >
            <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={titleColor} />
            <Text style={[styles.buttonText, { color: titleColor }]}>
              {hintsUsed > 0 ? `Hint (${hintsUsed})` : 'Hint'}
            </Text>
          </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  counterText: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 6,
    marginRight: 10,
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
    flexShrink: 1,
  },
  lives: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
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
});

export default FungikuScreen;
