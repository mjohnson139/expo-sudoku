import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useGameContext } from '../contexts/GameContext';
import { ACTIONS } from '../contexts/GameContext';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Constants for consistent sizes
const ICON_SIZE = 24;
const ICON_SIZE_SMALL = 16;

/**
 * GameHeader component containing menu button, title and theme selector
 */
const GameHeader = () => {
  const { theme, dispatch, cycleTheme } = useGameContext();

  const handleMenuPress = () => {
    dispatch({ type: ACTIONS.SHOW_MENU });
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        {/* Left: Menu Button */}
        <View style={styles.leftSection}>
          <TouchableOpacity
            style={[styles.menuIcon, { borderColor: theme.colors.title }]}
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
          <Text style={[styles.title, { color: theme.colors.title }]}>Sudoku Galaxy</Text>
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
    alignItems: 'flex-start',
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
  menuIcon: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
});

export default GameHeader;