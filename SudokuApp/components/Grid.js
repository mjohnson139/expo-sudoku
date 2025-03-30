import React from 'react';
import { View, StyleSheet } from 'react-native';
import Cell from './Cell';

const Grid = ({ board, onCellPress }) => {
  return (
    <View style={styles.grid}>
      {board.map((row, rowIndex) =>
        row.map((num, colIndex) => (
          <Cell 
            key={`${rowIndex}-${colIndex}`} 
            value={num} 
            onPress={() => onCellPress(rowIndex, colIndex)} 
          />
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 300,
    height: 300,
  },
});

export default Grid;
