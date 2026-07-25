import React from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, TouchableOpacity } from 'react-native';
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
 * "next puzzle" controls stand in for the training ladder until Step 6; Step 5
 * replaces the board with the finished themed component.
 */
const FungikuScreenContent = ({ onExitToHub }) => {
  const { theme, isDark } = useAppTheme();
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
  } = useFungikuContext();

  const titleColor = theme.colors.title;
  const surface = theme.colors.numberPad.background;
  const border = theme.colors.numberPad.border;

  // The hint follows the state of play instead of always explaining the tap
  // cycle — telling a player who has just won how to tap a cell was Step 4's
  // one loose end.
  const hint = solved
    ? 'One per row, column and color — none touching'
    : conflicts.size > 0
      ? `${conflicts.size} mushroom${conflicts.size === 1 ? '' : 's'} breaking a rule`
      : 'Tap a cell: empty → ✕ → 🍄';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title="Fungiku" theme={theme} onHomePress={onExitToHub} />

      <ScrollView contentContainerStyle={styles.body}>
        {/* The `🍄 X/N` counter (plan §1) — how the player tracks the goal. */}
        <View style={[styles.counterRow, { backgroundColor: surface, borderColor: border }]}>
          <MaterialCommunityIcons name="mushroom" size={20} color={titleColor} />
          <Text
            style={[styles.counterText, { color: titleColor }]}
            accessibilityLabel={`${mushroomCount} of ${size} mushrooms placed`}
          >
            {mushroomCount}/{size}
          </Text>
          <Text style={[styles.counterHint, { color: titleColor }]}>{hint}</Text>
        </View>

        <FungikuWinBanner
          solved={solved}
          size={size}
          seed={seed}
          accent={FUNGIKU_ACCENT}
          onNextPuzzle={nextPuzzle}
        />

        <FungikuBoard isDark={isDark} theme={theme} />

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

        {/* Board size + next puzzle — the stand-in for Step 6's ladder */}
        <Text style={[styles.label, { color: titleColor }]}>Board size</Text>
        <View style={styles.controlRow}>
          {SIZES.map((option) => (
            <TouchableOpacity
              key={option}
              onPress={() => changeSize(option)}
              style={[
                styles.chip,
                { borderColor: border },
                option === size && { backgroundColor: titleColor, borderColor: titleColor },
              ]}
              accessibilityRole="button"
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
            style={[styles.wideButton, { borderColor: border }]}
            accessibilityRole="button"
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
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 4,
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
