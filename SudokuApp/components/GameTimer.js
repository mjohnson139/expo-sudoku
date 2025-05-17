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
      <Text style={styles.timerLabel}>TIME</Text>
      
      <View style={[styles.timerBadge, { backgroundColor: theme.colors.numberPad.border }]}>
        <View style={styles.timerInnerContainer}>
          <Text style={[
            styles.timerText, 
            { color: theme.colors.numberPad.text }
          ]}>
            {formatTime(elapsedSeconds)}
          </Text>
          
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
            ]}>❚❚</Text>
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
  timerText: {
    fontSize: 16, // Increased size for better visibility
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
    marginRight: 4, // Space between time and pause button
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
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 0,
  },
  pauseButtonIcon: {
    fontSize: 16,
    fontWeight: 'normal',
  },
});

export default GameTimer;