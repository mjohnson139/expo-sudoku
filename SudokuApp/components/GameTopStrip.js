import React from 'react';
import { View, StyleSheet } from 'react-native';
import GameTimer from './GameTimer';
import { useGameContext } from '../contexts/GameContext';

/**
 * Component that displays the top strip with timer on the right
 * Width matches the grid (324px) for visual consistency
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
    width: 324, // Exact width to match grid
    paddingHorizontal: 0, // Removed padding to ensure exact width
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