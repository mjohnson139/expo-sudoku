import React from 'react';
import { View, StyleSheet } from 'react-native';
import Cell from './Cell';

const Grid = ({ board, onCellPress, selectedCell }) => {
  return (
    <View style={styles.grid}>
      {board.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((num, colIndex) => {
            const isSelected = selectedCell && 
              selectedCell.row === rowIndex && 
              selectedCell.col === colIndex;
            
            // Calculate border styles for 3x3 boxes
            const borderStyles = {
              borderRightWidth: (colIndex + 1) % 3 === 0 && colIndex < 8 ? 2 : 1,
              borderBottomWidth: (rowIndex + 1) % 3 === 0 && rowIndex < 8 ? 2 : 1,
              borderLeftWidth: colIndex === 0 ? 2 : 1,
              borderTopWidth: rowIndex === 0 ? 2 : 1,
            };

            return (
              <Cell 
                key={`${rowIndex}-${colIndex}`} 
                value={num} 
                onPress={() => onCellPress(rowIndex, colIndex)}
                isSelected={isSelected}
                extraStyle={borderStyles}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    width: 320,
    height: 320,
    borderWidth: 2,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
  },
});

export default Grid;
