import React from 'react';
import { Text, StyleSheet, Platform } from 'react-native';
import { useGameContext } from '../contexts/GameContext';
import LabeledBadge from './LabeledBadge';

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
    <LabeledBadge
      label="LEVEL"
      theme={theme}
      backgroundColor={getBadgeColor()}
      containerStyle={styles.badgeContainer}
    >
      <Text style={[styles.levelText, { color: theme.colors.numberPad.text }]}>
        {getDifficultyLabel()}
      </Text>
    </LabeledBadge>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    alignItems: 'center',
  },
  levelText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    width: 60, // Fixed width for consistency
  },
});

export default DifficultyBadge;
