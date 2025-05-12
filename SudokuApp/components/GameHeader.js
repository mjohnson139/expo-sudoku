import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useGameContext } from '../contexts/GameContext';
import { ACTIONS } from '../contexts/GameContext';

/**
 * GameHeader component containing menu button, title and theme selector
 */
const GameHeader = () => {
  const { theme, dispatch, cycleTheme, currentThemeName } = useGameContext();

  const handleMenuPress = () => {
    dispatch({ type: ACTIONS.SHOW_MENU });
  };

  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        {/* Menu Button */}
        <TouchableOpacity
          style={[styles.menuIcon, { borderColor: theme.colors.title }]}
          onPress={handleMenuPress}
        >
          <Text style={{ color: theme.colors.title, fontSize: 18 }}>☰</Text>
        </TouchableOpacity>

        {/* Game Title */}
        <View style={styles.headerTitleBox}>
          <Text style={[styles.title, { color: theme.colors.title }]}>Sudoku</Text>
        </View>

        {/* Theme Selector Button */}
        <TouchableOpacity
          style={[styles.themeButton, { borderColor: theme.colors.title }]}
          onPress={cycleTheme}
          accessibilityLabel="Change Theme"
        >
          <Text style={[styles.themeButtonText, { color: theme.colors.title }]}>
            🎨 {theme.name}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    minHeight: 48,
    marginBottom: 8,
    gap: 0,
  },
  headerTitleBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  themeButton: {
    marginLeft: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  themeButtonText: {
    fontSize: 12,
  },
  menuIcon: {
    marginRight: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
});

export default GameHeader;