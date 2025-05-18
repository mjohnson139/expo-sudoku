import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import GameTimer from './GameTimer';
import ScoreDisplay from './ScoreDisplay';
import { useGameContext } from '../contexts/GameContext';
import DifficultyBadge from './DifficultyBadge';

/**
 * Component that displays the top strip with:
 * - Score on the left
 * - Difficulty level badge in the center
 * - Timer and pause button on the right
 * Width matches the header for visual consistency
 */
const GameTopStrip = ({ style }) => {
  const { theme } = useGameContext();

  return (
    <View style={[styles.container, { backgroundColor: theme?.colors?.background || '#f8f8f8' }, style]}>
      {/* Left section: Score */}
      <View style={styles.leftSection}>
        <ScoreDisplay />
      </View>

      {/* Center section: Difficulty level */}
      <View style={styles.centerSection}>
        <DifficultyBadge />
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
    paddingTop: 0, // Add padding at the top
    paddingBottom: 10, // No bottom padding
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
    paddingLeft: 8,
    justifyContent: 'flex-start',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    flex: 1,
    paddingRight: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default GameTopStrip;