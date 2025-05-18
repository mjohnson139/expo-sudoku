import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useGameContext } from '../contexts/GameContext';

/**
 * DifficultyBadge - displays the difficulty label and badge color
 * Used in the center of the GameTopStrip
 */
const DifficultyBadge = () => {
  const { theme, difficulty } = useGameContext();
  const DEFAULT_DIFFICULTY = 'medium';

  // Get the badge color from theme based on difficulty
  const getBadgeColor = () => {
    const fallbackColors = {
      'easy': '#d4edda',
      'medium': '#ffeeba',
      'hard': '#f8d7da',
      'expert': '#f8d7da',
    };
    const difficultyLevel = difficulty || DEFAULT_DIFFICULTY;
    if (theme?.colors?.difficulty) {
      return theme.colors.difficulty[difficultyLevel] || theme.colors.difficulty[DEFAULT_DIFFICULTY];
    }
    return fallbackColors[difficultyLevel] || fallbackColors[DEFAULT_DIFFICULTY];
  };

  // Get difficulty label with proper capitalization
  const getDifficultyLabel = () => {
    const difficultyLevel = difficulty || DEFAULT_DIFFICULTY;
    return difficultyLevel.charAt(0).toUpperCase() + difficultyLevel.slice(1);
  };

  return (
    <>
      <Text style={styles.levelLabel}>LEVEL</Text>
      <View style={[styles.levelBadge, { backgroundColor: getBadgeColor() }]}> 
        <Text style={[styles.levelText, { color: theme.colors.numberPad.text }]}>{getDifficultyLabel()}</Text>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  levelLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
    color: '#666',
    alignSelf: 'center',
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    height: 36,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  levelText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    color: '#333333', // Match timer and score text color
    width: 60, // Fixed width for consistency
  },
});

export default DifficultyBadge;
