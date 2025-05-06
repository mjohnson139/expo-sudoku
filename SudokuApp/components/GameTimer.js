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
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
        
        {/* Pause button - positioned next to timer */}
        <TouchableOpacity 
          style={[
            styles.pauseButton,
            { 
              backgroundColor: theme.colors.numberPad.background,
              borderColor: theme.colors.numberPad.border
            }
          ]} 
          onPress={handlePausePress}
          // Disable when already paused
          disabled={isPaused}
          accessibilityLabel="Pause Game"
        >
          <Text style={styles.pauseButtonIcon}>⏸️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  timerRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 5,
    minHeight: 28,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888',
    textAlign: 'center',
    letterSpacing: 1,
    marginRight: 8,
  },
  pauseButton: {
    width: 40, 
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    // Raised effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  pauseButtonIcon: {
    fontSize: 20,
  },
});

export default GameTimer;