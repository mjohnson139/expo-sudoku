import React, { useState } from 'react';
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
import FungikuWinBanner from './FungikuWinBanner';
import { FungikuProvider, SIZES, useFungikuContext } from './FungikuContext';

// The accent Fungiku is identified by on the hub card; reused for the win banner
// so winning looks like Fungiku rather than a generic green success box.
const FUNGIKU_ACCENT = '#a0522d';

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
    size,
    seed,
    mushroomCount,
    solved,
    conflicts,
    hasMarks,
    canUndo,
    canRedo,
    undo,
    redo,
    clearMarks,
    changeSize,
    nextPuzzle,
    ruleOut,
    ruleOutCount,
    showMistakes,
    toggleMistakes,
    mistakes,
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

  // The status line follows the state of play instead of always explaining the
  // tap cycle. (Named `statusText`, not `hint` — `hint` is the hint object from
  // context, and shadowing it here silently broke the build once.)
  const statusText = generating
    ? 'Generating…'
    : solved
      ? 'One per row, column and color — none touching'
      : conflicts.size > 0
        ? `${conflicts.size} mushroom${conflicts.size === 1 ? '' : 's'} breaking a rule`
        : 'Tap to cycle · drag to sweep ✕';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title="Fungiku" theme={theme} onHomePress={onExitToHub} />

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
          <Text
            style={[styles.counterHint, { color: titleColor }]}
            // Announced, because a player who cannot see the spinner still needs
            // to know why the board stopped responding.
            accessibilityLiveRegion={generating ? 'polite' : 'none'}
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

        {/* Hint (plan §11.2) and the correctness-feedback switch (§11.1). Both
            are opt-in by nature: a hint is asked for, and mistakes are only shown
            to a player who wants them shown. */}
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

          <TouchableOpacity
            onPress={toggleMistakes}
            style={[
              styles.wideButton,
              { borderColor: border },
              showMistakes && { backgroundColor: titleColor, borderColor: titleColor },
            ]}
            accessibilityRole="switch"
            accessibilityState={{ checked: showMistakes }}
            // The state is named in the label because accessibilityState.checked
            // does not reach aria-checked on web.
            accessibilityLabel={`Show mistakes, ${showMistakes ? 'on' : 'off'}`}
            accessibilityHint="Flags mushrooms that break no rule but are in the wrong cell"
          >
            <MaterialCommunityIcons
              name={showMistakes ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={18}
              color={showMistakes ? surface : titleColor}
            />
            <Text style={[styles.buttonText, { color: showMistakes ? surface : titleColor }]}>
              Mistakes{showMistakes && mistakes.size > 0 ? ` (${mistakes.size})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Board size + next puzzle — the stand-in for the ladder step.

            Six chips no longer fit one row on a narrow phone (6 × ~56pt beats a
            360pt screen), so the row wraps rather than squeezing the chips down
            to something hard to hit. */}
        <Text style={[styles.label, { color: titleColor }]}>Board size</Text>
        <View style={[styles.controlRow, styles.chipRow]}>
          {SIZES.map((option) => (
            <TouchableOpacity
              key={option}
              onPress={() => changeSize(option)}
              disabled={generating}
              style={[
                styles.chip,
                { borderColor: border },
                option === size && { backgroundColor: titleColor, borderColor: titleColor },
                generating && styles.toolButtonDisabled,
              ]}
              accessibilityRole="button"
              accessibilityState={{ disabled: generating, selected: option === size }}
              accessibilityLabel={`${option} by ${option} board`}
            >
              <Text style={[styles.chipText, { color: option === size ? surface : titleColor }]}>
                {option}×{option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

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
            <Text style={[styles.buttonText, { color: titleColor }]}>New puzzle (seed {seed})</Text>
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
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 18,
  },
  chipRow: {
    flexWrap: 'wrap',
    alignSelf: 'stretch',
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 4,
    // Spacing for the second row once the chips wrap.
    marginVertical: 3,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
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
