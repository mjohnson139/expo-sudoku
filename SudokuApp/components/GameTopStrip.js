import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import GameTimer from './GameTimer';
import { useGameContext } from '../contexts/GameContext';

/**
 * Component that displays the top strip with:
 * - Score placeholder on the left
 * - Difficulty level badge in the center
 * - Timer and pause button on the right
 * Width matches the header for visual consistency
 */
const GameTopStrip = () => {
  const { theme, difficulty } = useGameContext();
  
  // Determine the badge color based on difficulty
  const getBadgeColor = () => {
    switch(difficulty) {
      case 'easy': return '#d4edda'; // Green for easy
      case 'medium': return '#ffeeba'; // Yellow for medium
      case 'hard': return '#f8d7da'; // Pink for hard
      case 'expert': return '#f8d7da'; // Pink for expert (same as hard)
      default: return '#ffeeba'; // Default to medium
    }
  };
  
  // Get difficulty label with proper capitalization
  const getDifficultyLabel = () => {
    if (!difficulty) return 'Medium';
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  };
  
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
        <View style={[styles.levelBadge, { backgroundColor: getBadgeColor() }]}>
          <Text style={styles.levelText}>
            {getDifficultyLabel()}
          </Text>
        </View>
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
  levelBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
});

export default GameTopStrip;