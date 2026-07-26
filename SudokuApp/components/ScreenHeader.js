import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ICON_SIZE = 24;

/**
 * Header for game screens that aren't Sudoku: a home affordance back to the hub
 * plus the game's title. Sudoku keeps its own richer GameHeader (menu + theme
 * cycle) and gets the same home button added there.
 *
 * `onMenuPress` is optional and adds a menu button on the right, in the same
 * corner Sudoku's GameHeader puts its own — a game with a difficulty menu should
 * open it from the same place in either game.
 *
 * `subtitle` is optional: one line under the title for what the current game *is*
 * (Fungiku uses it for "Easy · 6×6"). Callers should pass it either always or
 * never for a given screen — a subtitle that appears and disappears changes the
 * header's height, which moves everything under it.
 */
const ScreenHeader = ({ title, subtitle, theme, onHomePress, onMenuPress }) => {
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
        {!!subtitle && (
          <Text style={[styles.subtitle, { color: titleColor }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Also balances the row so the title stays optically centered — the View
          stays even with no menu button in it. */}
      <View style={styles.rightSection}>
        {onMenuPress && (
          <TouchableOpacity
            style={[styles.iconButton, { borderColor: titleColor }]}
            onPress={onMenuPress}
            accessibilityLabel="Game menu"
            accessibilityRole="button"
            accessibilityHint="Choose a difficulty or start a new puzzle"
          >
            <MaterialCommunityIcons name="menu" size={ICON_SIZE} color={titleColor} />
          </TouchableOpacity>
        )}
      </View>
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
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
    // Single line by construction (numberOfLines={1}), so the header's height is
    // the same whatever the subtitle says.
    marginTop: 1,
  },
  iconButton: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
});

export default ScreenHeader;
