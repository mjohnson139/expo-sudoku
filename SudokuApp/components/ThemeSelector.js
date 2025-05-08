// filepath: /Users/matthewjohnson/dev/expo-sudoku/SudokuApp/components/ThemeSelector.js
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useGameContext } from '../contexts/GameContext';

/**
 * ThemeSelector component allowing user to switch themes
 * Positioned on the left side of the GameTopStrip
 */
const ThemeSelector = () => {
  const { theme, cycleTheme } = useGameContext();

  return (
    <TouchableOpacity 
      style={[
        styles.themeButton,
        { 
          backgroundColor: theme.colors.numberPad.background,
          borderColor: theme.colors.numberPad.border
        }
      ]} 
      onPress={cycleTheme}
      accessibilityLabel="Change Theme"
    >
      <Text style={[styles.themeButtonText, { color: theme.colors.numberPad.text }]}>
        🎨 {theme.name}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  themeButton: {
    minWidth: 100,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    // Raised effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  themeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ThemeSelector;