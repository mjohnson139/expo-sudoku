import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useGameContext, ACTIONS } from '../contexts/GameContext';
import TimerDigit from './TimerDigit';

/**
 * GameTimer component displaying elapsed time and pause button
 * Positioned on the right side of the GameTopStrip
 */
const GameTimer = () => {
  const { elapsedSeconds, formatTime, dispatch, theme, isPaused } = useGameContext();

  const handlePausePress = () => {
    dispatch({ type: ACTIONS.PAUSE_GAME });
  };

  // Extract individual digits for minutes and seconds
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  
  const minTens = Math.floor(minutes / 10);
  const minOnes = minutes % 10;
  const secTens = Math.floor(seconds / 10);
  const secOnes = seconds % 10;

  return (
    <View style={styles.timerContainer}>
      <Text style={styles.timerLabel}>TIME</Text>
      
      <View style={[styles.timerBadge, { backgroundColor: theme.colors.numberPad.border }]}>
        <View style={styles.timerInnerContainer}>
          <View style={styles.timerTextContainer}>
            {/* Minute digits */}
            <TimerDigit 
              value={minTens} 
              style={{ color: theme.colors.numberPad.text }}
            />
            <TimerDigit 
              value={minOnes} 
              style={{ color: theme.colors.numberPad.text }}
            />
            <Text style={[styles.separatorText, { color: theme.colors.numberPad.text }]}>:</Text>
            {/* Second digits */}
            <TimerDigit 
              value={secTens} 
              style={{ color: theme.colors.numberPad.text }}
            />
            <TimerDigit 
              value={secOnes} 
              style={{ color: theme.colors.numberPad.text }}
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
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  timerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 2,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    minWidth: 80,
    height: 36,
  },
  timerInnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
  },
  timerTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    minWidth: 45,
  },
  separatorText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 24,
    marginHorizontal: 2, 
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
    color: '#666',
    alignSelf: 'center',
  },
  pauseButton: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 2,
  },
  pauseButtonIcon: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});

export default GameTimer;