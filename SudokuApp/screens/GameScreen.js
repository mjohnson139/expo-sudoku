import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Grid from '../components/Grid';
import NumberPad from '../components/NumberPad';

const initialBoard = [
  [0, 2, 3, 4, 0, 0, 0, 0, 1],
  [8, 5, 0, 0, 2, 0, 4, 0, 0],
  [0, 0, 3, 0, 1, 2, 5, 6, 0],
  [0, 0, 0, 3, 0, 7, 0, 6, 0],
  [4, 1, 6, 0, 5, 0, 9, 0, 0],
  [6, 8, 0, 0, 4, 0, 0, 0, 0],
  [5, 8, 3, 0, 0, 0, 0, 0, 0],
  [1, 9, 7, 2, 5, 4, 0, 0, 0],
  [4, 2, 0, 7, 9, 1, 0, 0, 0],
];

const GameScreen = () => {
  const [board, setBoard] = useState(initialBoard);
  const [selectedCell, setSelectedCell] = useState(null);

  const handleCellPress = (row, col) => {
    setSelectedCell({ row, col });
  };

  const handleNumberSelect = (num) => {
    if (!selectedCell) return;
    
    const newBoard = [...board];
    newBoard[selectedCell.row][selectedCell.col] = num;
    setBoard(newBoard);
    setSelectedCell(null);
  };

  return (
    <View style={styles.container}>
      <Grid board={board} onCellPress={handleCellPress} />
      <NumberPad onSelectNumber={handleNumberSelect} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GameScreen;
