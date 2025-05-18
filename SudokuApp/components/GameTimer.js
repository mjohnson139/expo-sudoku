import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Platform } from 'react-native';
import { useGameContext, ACTIONS } from '../contexts/GameContext';
import LabeledBadge from './LabeledBadge';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

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
        
        {/* Pause button integrated in badge */}
        <TouchableOpacity 
          style={styles.pauseButton}
          onPress={handlePausePress}
          disabled={isPaused}
          accessibilityLabel="Pause Game"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons
            name="pause-circle"
            size={21}
            color={theme.colors.numberPad.text}
          />
        </TouchableOpacity>
      </View>
    </LabeledBadge>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    alignItems: 'center',
  },
  timerInnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
  },
  timerText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
    marginRight: 4, // Space between time and pause button
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    width: 60, // Fixed width for timer
  },
  pauseButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default GameTimer;