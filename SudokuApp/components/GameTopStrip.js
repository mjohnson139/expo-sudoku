import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import GameTimer from './GameTimer';
import { useGameContext } from '../contexts/GameContext';

/**
 * Component that displays the top strip with:
 * - Score on the left
 * - Difficulty level badge in the center
 * - Timer and pause button on the right
 * Width matches the header for visual consistency
 */
const GameTopStrip = () => {
  const { theme, difficulty, score } = useGameContext();
  
  // Use default from GameContext.js initial state if difficulty is not available
  const DEFAULT_DIFFICULTY = 'medium';
  
  // Get the badge color from theme based on difficulty
  const getBadgeColor = () => {
    // Define fallback colors in case theme colors aren't available yet
    const fallbackColors = {
      'easy': '#d4edda',    // Green for easy
      'medium': '#ffeeba',  // Yellow for medium
      'hard': '#f8d7da',    // Pink for hard
      'expert': '#f8d7da'   // Pink for expert
    };
    
    // Use default if difficulty is not specified
    const difficultyLevel = difficulty || DEFAULT_DIFFICULTY;
    
    // Check if theme and theme.colors and theme.colors.difficulty exist
    if (theme?.colors?.difficulty) {
      return theme.colors.difficulty[difficultyLevel] || theme.colors.difficulty[DEFAULT_DIFFICULTY];
    }
    
    // Fallback to hardcoded colors if theme isn't fully loaded
    return fallbackColors[difficultyLevel] || fallbackColors[DEFAULT_DIFFICULTY];
  };
  
  // Get difficulty label with proper capitalization
  const getDifficultyLabel = () => {
    // Use default if difficulty is not specified
    const difficultyLevel = difficulty || DEFAULT_DIFFICULTY;
    return difficultyLevel.charAt(0).toUpperCase() + difficultyLevel.slice(1);
  };
  
  // Format score with thousands separators
  const formatScore = (score) => {
    return score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  return (
    <View style={[styles.container, { backgroundColor: theme?.colors?.background || '#f8f8f8' }]}>
      {/* Left section: Score */}
      <View style={styles.leftSection}>
        <Text style={[styles.scoreText, { color: theme?.colors?.title || '#333333' }]}>
          Score: {formatScore(score)}
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
    marginVertical: 4, // Reduced from 8 to better accommodate smaller screens
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