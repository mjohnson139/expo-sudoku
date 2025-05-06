import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useGameContext, ACTIONS } from '../contexts/GameContext';

/**
 * GameTimer component displaying elapsed time and pause button
 */
const GameTimer = () => {
  const { elapsedSeconds, formatTime, dispatch, theme, isPaused } = useGameContext();

  const handlePausePress = () => {
    dispatch({ type: ACTIONS.PAUSE_GAME });
  };

  return (
    <View style={styles.timerRow}>
      <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
      
      {/* Pause button */}
      <TouchableOpacity 
        style={styles.pauseButton} 
        onPress={handlePausePress}
        // Disable when already paused
        disabled={isPaused}
      >
        <Text style={styles.pauseButtonIcon}>⏸️</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  timerRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 5,
    minHeight: 28,
    flexDirection: 'row',
  },
  timerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888',
    width: 72,
    textAlign: 'left',
    letterSpacing: 1,
  },
  pauseButton: {
    padding: 5,
  },
  pauseButtonIcon: {
    fontSize: 20,
  },
});

export default GameTimer;