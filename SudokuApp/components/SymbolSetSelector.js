import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useGameContext } from '../contexts/GameContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SYMBOL_SET_IDS } from '../utils/symbolSets';

// Constants for consistent sizes (matches the header's theme button)
const ICON_SIZE = 24;

/**
 * SymbolSetSelector — an icon button that cycles the Fungiku display mode
 * (Numbers → Fungiku), mirroring the theme selector. It only changes how a
 * cell's value is *drawn*; the board stays numeric (docs/fungiku-plan.md §4).
 *
 * Placement: next to the theme selector in the header (see GameHeader.js).
 *
 * The button is intentionally icon-only: the visible mode label ("Fungiku" vs.
 * a plainer "Colors") is an open question for the operator (plan §7 #1), so we
 * avoid committing to wording in the UI. The current mode still rides the
 * accessibilityLabel/Value so screen readers and tests can read it.
 */
const SYMBOL_SET_META = {
  [SYMBOL_SET_IDS.NUMBERS]: { icon: 'numeric', label: 'Numbers' },
  [SYMBOL_SET_IDS.FUNGIKU]: { icon: 'mushroom', label: 'Fungiku' },
};

const SymbolSetSelector = () => {
  const { theme, symbolSet, cycleSymbolSet } = useGameContext();

  const meta = SYMBOL_SET_META[symbolSet] || SYMBOL_SET_META[SYMBOL_SET_IDS.NUMBERS];

  return (
    <TouchableOpacity
      style={[styles.button, { borderColor: theme.colors.title }]}
      onPress={cycleSymbolSet}
      accessibilityRole="button"
      accessibilityLabel="Change symbol set"
      accessibilityValue={{ text: meta.label }}
      accessibilityHint="Cycles the board between number and Fungiku symbols"
    >
      <MaterialCommunityIcons
        name={meta.icon}
        size={ICON_SIZE}
        color={theme.colors.title}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 5,
    borderWidth: 1,
    marginRight: 6,
  },
});

export default SymbolSetSelector;
