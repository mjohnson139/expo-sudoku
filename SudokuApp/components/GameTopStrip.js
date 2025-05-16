import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import GameTimer from './GameTimer';
import ScoreDisplay from './ScoreDisplay';
import { useGameContext } from '../contexts/GameContext';

/**
 * Component that displays the top strip with:
 * - Score on the left
 * - Difficulty level badge in the center
 * - Timer and pause button on the right
 * Width matches the header for visual consistency
 */
const GameTopStrip = () => {
  const { theme, difficulty } = useGameContext();
  
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
  
  return (
    <View style={[styles.container, { backgroundColor: theme?.colors?.background || '#f8f8f8' }]}>
      {/* Left section: Score */}
      <View style={styles.leftSection}>
        <ScoreDisplay />
      </View>

      {/* Center section: Difficulty level */}
      <View style={styles.centerSection}>
        <Text style={styles.levelLabel}>LEVEL</Text>
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
    marginTop: 8, // Space at top
    marginBottom: 40, // Added padding at the bottom as requested
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
  levelLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
    color: '#666', // Subtle color for label
    alignSelf: 'center',
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6, // Smaller corner radius to match other badges
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80, // Increased to match timer badge
    height: 36, // Fixed height to match other badges
    elevation: 1, // Light shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  levelText: {
    fontSize: 16, // Match other badges
    fontWeight: 'bold',
    color: '#333333',
    letterSpacing: 1,
  },
});

export default GameTopStrip;