import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useGameContext } from '../contexts/GameContext';
import { ACTIONS } from '../contexts/GameContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Constants for consistent sizes
const ICON_SIZE = 24;
const ICON_SIZE_SMALL = 16;

/**
 * GameHeader component containing home and menu buttons, title and theme selector
 *
 * @param {Function} onHomePress - leaves Sudoku for the hub. Absent when the
 *   screen is rendered without a router around it, in which case no home
 *   affordance is shown.
 */
const GameHeader = ({ onHomePress }) => {
  const { theme, dispatch, cycleTheme } = useGameContext();

  const handleMenuPress = () => {
    dispatch({ type: ACTIONS.SHOW_MENU });
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        {/* Left: Home (back to the hub) and Menu buttons */}
        <View style={styles.leftSection}>
          {onHomePress && (
            <TouchableOpacity
              style={[styles.headerIcon, styles.homeIcon, { borderColor: theme.colors.title }]}
              onPress={onHomePress}
              accessibilityLabel="Back to games"
              accessibilityRole="button"
              accessibilityHint="Pauses this game and returns to the game list"
            >
              <MaterialCommunityIcons
                name="home"
                size={ICON_SIZE}
                color={theme.colors.title}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.headerIcon, { borderColor: theme.colors.title }]}
            onPress={handleMenuPress}
            accessibilityLabel="Open game menu"
            accessibilityRole="button"
            accessibilityHint="Opens the game menu with settings and options"
          >
            <MaterialCommunityIcons
              name="menu"
              size={ICON_SIZE}
              color={theme.colors.title}
            />
          </TouchableOpacity>
        </View>

        {/* Center: Game Title */}
        <View style={styles.centerSection}>
          <Text style={[styles.title, { color: theme.colors.title }]}>Sudoku</Text>
        </View>

        {/* Right: Theme Selector Button */}
        <View style={styles.rightSection}>
          <TouchableOpacity
            style={[styles.themeButton, { borderColor: theme.colors.title }]}
            onPress={cycleTheme}
            accessibilityLabel="Change Theme"
            accessibilityRole="button"
            accessibilityHint="Cycles through available color themes"
          >
            <View style={styles.themeButtonContent}>
              <MaterialCommunityIcons 
                name="palette" 
                size={ICON_SIZE} 
                color={theme.colors.title}
                style={styles.themeIcon} 
              />
              <Text style={[styles.themeButtonText, { color: theme.colors.title }]}>
                {theme.name}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    minHeight: 48,
    marginBottom: 10,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 8,
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  themeButton: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 5,
    borderWidth: 1,
    width: 90,
  },
  themeButtonText: {
    fontSize: 12,
  },
  themeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start', // Align icon and text to the left
  },
  themeIcon: {
    marginRight: 4,
  },
  headerIcon: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  homeIcon: {
    marginRight: 6,
  },
});

export default GameHeader;