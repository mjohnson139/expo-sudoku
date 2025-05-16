import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useGameContext, ACTIONS } from '../contexts/GameContext';
import RollingNumber from './RollingNumber';

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
      <Text style={styles.timerLabel}>TIME</Text>
      
      <View style={[styles.timerBadge, { backgroundColor: theme.colors.numberPad.border }]}>
        <View style={styles.timerInnerContainer}>
          <View style={styles.timerTextContainer}>
            <RollingNumber
              value={Math.floor(elapsedSeconds / 60)}
              style={[
                styles.rollingDigit, 
                { color: theme.colors.numberPad.text }
              ]}
            />
            <Text style={[
              styles.timerText, 
              { color: theme.colors.numberPad.text }
            ]}>:</Text>
            <RollingNumber
              value={elapsedSeconds % 60}
              style={[
                styles.rollingDigit, 
                { color: theme.colors.numberPad.text }
              ]}
            />
          </View>
          
          {/* Pause button integrated in badge */}
          <TouchableOpacity 
            style={styles.pauseButton}
            onPress={handlePausePress}
            disabled={isPaused}
            accessibilityLabel="Pause Game"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[
              styles.pauseButtonIcon, 
              { color: theme.colors.numberPad.text }
            ]}>⏸</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  timerContainer: {
    alignItems: 'center', // Center align like the score container
    justifyContent: 'flex-end',
  },
  timerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6, // Smaller corner radius for button-like feel
    marginTop: 2,
    elevation: 1, // Light shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    minWidth: 80, // Ensure enough space for time + pause button
    height: 36, // Fixed height to match other badges
  },
  timerInnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 24, // Match score height
  },
  timerTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4, // Space between time and pause button
    minWidth: 45, // Make sure there's enough room for the timer
  },
  timerText: {
    fontSize: 16, // Increased size for better visibility
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  rollingDigit: {
    fontSize: 16, // Increased size for better visibility
    fontWeight: 'bold',
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
    color: '#666', // Subtle color for label
    alignSelf: 'center', // Center align
  },
  pauseButton: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 2, // Adjust visual alignment
  },
  pauseButtonIcon: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});

export default GameTimer;