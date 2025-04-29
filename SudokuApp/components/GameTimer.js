import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useGameContext } from '../contexts/GameContext';
import { ACTIONS } from '../contexts/GameContext';

/**
 * GameTimer component displaying elapsed time with pause button
 */
const GameTimer = () => {
  const { elapsedSeconds, formatTime, theme, dispatch } = useGameContext();

  const handlePause = () => {
    dispatch({ type: ACTIONS.SHOW_MENU });
  };

  return (
    <View style={styles.timerRow}>
      <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
      <TouchableOpacity
        style={styles.pauseButton}
        onPress={handlePause}
        accessibilityLabel="Pause Game"
      >
        <Text style={{ color: theme.colors.title, fontSize: 18 }}>⏸️</Text>
      </TouchableOpacity>
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
    marginRight: 8,
  },
  pauseButton: {
    padding: 4,
  },
});

export default GameTimer;