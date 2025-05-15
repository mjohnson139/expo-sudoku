import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import GameTimer from './GameTimer';
import { useGameContext } from '../contexts/GameContext';

/**
 * Component that displays the top strip with:
 * - Score placeholder on the left
 * - Difficulty level in the center
 * - Timer and pause button on the right
 * Width matches the header for visual consistency
 */
const GameTopStrip = () => {
  const { theme } = useGameContext();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Left section: Score placeholder */}
      <View style={styles.leftSection}>
        <Text style={[styles.scoreText, { color: theme.colors.title }]}>
          Score: --
        </Text>
      </View>

      {/* Center section: Difficulty level */}
      <View style={styles.centerSection}>
        <Text style={[styles.levelText, { color: theme.colors.title }]}>
          Level: Medium
        </Text>
      </View>

      {/* Right section: Timer and pause button */}
      <View style={styles.rightSection}>
        <GameTimer />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '100%', // Full width to match header
    marginVertical: 8,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
    paddingLeft: 8,
    justifyContent: 'center',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
    paddingRight: 8,
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  levelText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default GameTopStrip;