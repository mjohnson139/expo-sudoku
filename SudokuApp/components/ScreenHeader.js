import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ICON_SIZE = 24;

/**
 * Header for game screens that aren't Sudoku: a home affordance back to the hub
 * plus the game's title. Sudoku keeps its own richer GameHeader (menu + theme
 * cycle) and gets the same home button added there.
 */
const ScreenHeader = ({ title, theme, onHomePress }) => {
  const titleColor = theme?.colors?.title || '#333';

  return (
    <View style={styles.header}>
      <View style={styles.leftSection}>
        <TouchableOpacity
          style={[styles.iconButton, { borderColor: titleColor }]}
          onPress={onHomePress}
          accessibilityLabel="Back to games"
          accessibilityRole="button"
          accessibilityHint="Leaves this game and returns to the game list"
        >
          <MaterialCommunityIcons name="home" size={ICON_SIZE} color={titleColor} />
        </TouchableOpacity>
      </View>

      <View style={styles.centerSection}>
        <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
      </View>

      {/* Balances the row so the title stays optically centered. */}
      <View style={styles.rightSection} />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
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
    flex: 2,
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  iconButton: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
});

export default ScreenHeader;
