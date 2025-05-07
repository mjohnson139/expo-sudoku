import React from 'react';
import { View, StyleSheet } from 'react-native';
import GameTimer from './GameTimer';
import { useGameContext } from '../contexts/GameContext';

/**
 * Component that displays the top strip with timer on the right
 */
const GameTopStrip = () => {
  const { theme } = useGameContext();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.spacer} />
      <View style={styles.rightContent}>
        <GameTimer />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
    marginVertical: 8,
  },
  spacer: {
    // Empty spacer for the left side to maintain layout balance
  },
  rightContent: {
    justifyContent: 'flex-end',
  },
});

export default GameTopStrip;