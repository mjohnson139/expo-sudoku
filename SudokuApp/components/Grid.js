import React from 'react';
import { View, StyleSheet } from 'react-native';
import Cell from './Cell';

const Grid = ({ board, onCellPress, selectedCell, initialCells = [], theme }) => {
  return (
    <View style={[
      styles.grid, 
      { 
        backgroundColor: theme.colors.grid.background,
        borderColor: theme.colors.grid.border,
        borderWidth: 2,
      }
    ]}>
      {board.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((num, colIndex) => {
            const cellKey = `${rowIndex}-${colIndex}`;
            const isSelected = selectedCell && 
              selectedCell.row === rowIndex && 
              selectedCell.col === colIndex;
            const isInitialCell = initialCells.includes(cellKey);
            
            // Better border styling for 3x3 boxes
            const borderRight = (colIndex + 1) % 3 === 0 ? 2 : 1;
            const borderBottom = (rowIndex + 1) % 3 === 0 ? 2 : 1;
            const borderLeft = colIndex === 0 ? 2 : 1;
            const borderTop = rowIndex === 0 ? 2 : 1;

            const borderStyles = {
              borderRightWidth: borderRight,
              borderBottomWidth: borderBottom,
              borderLeftWidth: borderLeft,
              borderTopWidth: borderTop,
              borderRightColor: (colIndex + 1) % 3 === 0 ? theme.colors.grid.boxBorder : theme.colors.grid.cellBorder,
              borderBottomColor: (rowIndex + 1) % 3 === 0 ? theme.colors.grid.boxBorder : theme.colors.grid.cellBorder,
              borderLeftColor: colIndex === 0 ? theme.colors.grid.boxBorder : theme.colors.grid.cellBorder,
              borderTopColor: rowIndex === 0 ? theme.colors.grid.boxBorder : theme.colors.grid.cellBorder,
            };

            return (
              <Cell 
                key={`${rowIndex}-${colIndex}`} 
                value={num} 
                onPress={() => onCellPress(rowIndex, colIndex)}
                isSelected={isSelected}
                isInitialCell={isInitialCell}
                extraStyle={borderStyles}
                theme={theme}
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
    width: 324, // Slightly increased to accommodate thicker borders
    height: 324, // Slightly increased to accommodate thicker borders
  },
  row: {
    flexDirection: 'row',
  },
});

export default Grid;
