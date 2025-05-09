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
    // Prevent pause if we just resumed from background
    // This avoids auto-resuming the first pause after background
    if (global.justResumedFromBackground) {
      console.log('Ignoring pause action during post-resume cooldown period');
      return;
    }
    
    dispatch({ type: ACTIONS.PAUSE_GAME });
  };

  // Determine if the pause button should be disabled
  const pauseDisabled = isPaused || global.justResumedFromBackground;
  
  return (
    <View style={styles.timerContainer}>
      <View style={styles.timerTextContainer}>
        <Text style={[
          styles.timerText, 
          { color: theme.colors.text }
        ]}>
          {formatTime(elapsedSeconds)}
        </Text>
      </View>
      
      {/* Pause button - icon only with minimal size but good tap target */}
      <TouchableOpacity 
        style={[
          styles.pauseButton,
          // Apply a subtle opacity if in cooldown period
          global.justResumedFromBackground ? styles.cooldownButton : null
        ]}
        onPress={handlePausePress}
        disabled={pauseDisabled}
        accessibilityLabel="Pause Game"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Increase tap area without changing visible size
      >
        <Text style={[
          styles.pauseButtonIcon, 
          { color: theme.colors.text },
          global.justResumedFromBackground ? { opacity: 0.5 } : null
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
    marginRight: 2, // Space between timer and icon
    // Removed background color, border, and padding to blend with main background
  },
  timerText: {
    fontSize: 16, // Increased size for better visibility
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  pauseButton: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseButtonIcon: {
    fontSize: 12,
  },
  // Style for when the button is in cooldown
  cooldownButton: {
    opacity: 0.5,
  },
});

export default GameTimer;