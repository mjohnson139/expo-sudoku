import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useGameContext } from '../contexts/GameContext';

/**
 * GameTimer component displaying elapsed time
 */
const GameTimer = () => {
  const { elapsedSeconds, formatTime } = useGameContext();

  return (
    <View style={styles.timerRow}>
      <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  timerRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 20,
    marginBottom: 5,
    minHeight: 28,
    flexDirection: 'row',
    gap: 0,
  },
  timerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888',
    width: 72,
    textAlign: 'center',
    letterSpacing: 1,
  },
});

export default GameTimer;