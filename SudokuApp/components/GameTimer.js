import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useGameContext, ACTIONS } from '../contexts/GameContext';

/**
 * GameTimer component displaying elapsed time and pause button
 * Positioned on the right side of the GameTopStrip
 */
const GameTimer = () => {
  const { elapsedSeconds, formatTime, dispatch, theme, isPaused } = useGameContext();

  const handlePausePress = () => {
    dispatch({ type: ACTIONS.PAUSE_GAME });
  };

  return (
    <View style={styles.timerContainer}>
      <View style={[
        styles.timerTextContainer,
        {
          backgroundColor: theme.colors.numberPad?.background || 'transparent',
          borderColor: theme.colors.numberPad?.border
        }
      ]}>
        <Text style={[
          styles.timerText, 
          { color: theme.colors.numberPad?.text || theme.colors.text }
        ]}>
          {formatTime(elapsedSeconds)}
        </Text>
      </View>
      
      {/* Pause button - icon only with minimal size but good tap target */}
      <TouchableOpacity 
        style={styles.pauseButton}
        onPress={handlePausePress}
        disabled={isPaused}
        accessibilityLabel="Pause Game"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Increase tap area without changing visible size
      >
        <Text style={[
          styles.pauseButtonIcon, 
          { 
            color: isPaused 
              ? theme.colors.cell?.correctValueText || theme.colors.accent || '#4caf50' 
              : theme.colors.numberPad?.text || theme.colors.text 
          }
        ]}>⏸️</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerTextContainer: {
    minWidth: 60, // Minimum width to prevent size changes
    alignItems: 'center',
    justifyContent: 'center',

  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
    fontFamily: 'monospace', // Use a fixed-width font
  },
  pauseButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseButtonIcon: {
    fontSize: 22,
  },
});

export default GameTimer;