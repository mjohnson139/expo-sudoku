import React from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { useGameContext } from '../contexts/GameContext';
import LabeledBadge from './LabeledBadge';

/**
 * GameTimer component displaying elapsed time
 * Positioned on the right side of the GameTopStrip
 */
const GameTimer = () => {
  const { elapsedSeconds, formatTime, theme } = useGameContext();

  return (
    <LabeledBadge
      label="TIME"
      theme={theme}
      containerStyle={styles.badgeContainer}
    >
      <View style={styles.timerInnerContainer}>
        <Text style={[
          styles.timerText, 
          { color: theme.colors.numberPad.text }
        ]}>
          {formatTime(elapsedSeconds)}
        </Text>
      </View>
    </LabeledBadge>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    alignItems: 'center',
  },
  timerInnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
  },
  timerText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
});

export default GameTimer;