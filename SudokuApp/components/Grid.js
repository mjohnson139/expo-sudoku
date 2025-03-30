import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, PanResponder } from 'react-native';
import Cell from './Cell';

const Grid = ({ 
  board, 
  onCellPress, 
  selectedCell, 
  initialCells = [], 
  theme, 
  showFeedback = false, 
  cellFeedback = {} 
}) => {
  // Keep track of which cell is currently being touched
  const [touchedCell, setTouchedCell] = useState(null);
  const gridRef = useRef(null);
  
  // Create pan responder for tracking finger movement across cells
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,

      onPanResponderGrant: (evt, gestureState) => {
        // Initial touch - find which cell was touched
        const { locationX, locationY } = evt.nativeEvent;
        const { row, col } = getCellFromPoint(locationX, locationY);
        if (row !== null && col !== null) {
          setTouchedCell({ row, col });
        }
      },

      onPanResponderMove: (evt, gestureState) => {
        // Move touch - update highlighted cell as finger moves
        const { locationX, locationY } = evt.nativeEvent;
        const { row, col } = getCellFromPoint(locationX, locationY);
        
        if (row !== null && col !== null) {
          // Only update if we're on a different cell
          if (!touchedCell || touchedCell.row !== row || touchedCell.col !== col) {
            setTouchedCell({ row, col });
          }
        } else {
          // If we moved outside the grid, clear touched cell
          setTouchedCell(null);
        }
      },

      onPanResponderRelease: (evt, gestureState) => {
        // Touch ended - select the currently touched cell
        if (touchedCell) {
          onCellPress(touchedCell.row, touchedCell.col);
        }
        setTouchedCell(null);
      },

      onPanResponderTerminate: () => {
        setTouchedCell(null);
      }
    })
  ).current;

  // Function to determine which cell is at a given point
  const getCellFromPoint = (x, y) => {
    const cellSize = 36; // Must match cell container size
    const borderOffset = 2; // Account for grid border
    
    // Adjust for grid border
    const adjustedX = x - borderOffset;
    const adjustedY = y - borderOffset;
    
    // Calculate row and column from touch point
    const col = Math.floor(adjustedX / cellSize);
    const row = Math.floor(adjustedY / cellSize);
    
    // Check if we're within the grid bounds
    if (row >= 0 && row < 9 && col >= 0 && col < 9) {
      return { row, col };
    }
    
    return { row: null, col: null };
  };
  
  // Calculate related cells based on selected cell
  const getRelatedCells = (row, col) => {
    const relatedCells = new Set();
    
    // No related cells if nothing is selected
    if (row === null || col === null) return relatedCells;
    
    const currentValue = board[row][col];
    
    // Add all cells in the same row
    for (let c = 0; c < 9; c++) {
      if (c !== col) {
        relatedCells.add(`${row}-${c}`);
      }
    }
    
    // Add all cells in the same column
    for (let r = 0; r < 9; r++) {
      if (r !== row) {
        relatedCells.add(`${r}-${col}`);
      }
    }
    
    // Add all cells in the same 3x3 box
    const boxStartRow = Math.floor(row / 3) * 3;
    const boxStartCol = Math.floor(col / 3) * 3;
    for (let r = boxStartRow; r < boxStartRow + 3; r++) {
      for (let c = boxStartCol; c < boxStartCol + 3; c++) {
        if (r !== row || c !== col) {
          relatedCells.add(`${r}-${c}`);
        }
      }
    }
    
    // Add all cells with the same value (if it's not empty)
    if (currentValue !== 0) {
      board.forEach((rowValues, r) => {
        rowValues.forEach((cellValue, c) => {
          if ((r !== row || c !== col) && cellValue === currentValue) {
            relatedCells.add(`${r}-${c}`);
          }
        });
      });
    }
    
    return relatedCells;
  };
  
  // Get related cells for currently selected cell
  const relatedCells = selectedCell 
    ? getRelatedCells(selectedCell.row, selectedCell.col) 
    : new Set();

  return (
    <View 
      ref={gridRef}
      style={[
        styles.grid, 
        { 
          backgroundColor: theme.colors.grid.background,
          borderColor: theme.colors.grid.border,
          borderWidth: 2,
        }
      ]}
      {...panResponder.panHandlers}
    >
      {board.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((num, colIndex) => {
            const cellKey = `${rowIndex}-${colIndex}`;
            const isSelected = selectedCell && 
              selectedCell.row === rowIndex && 
              selectedCell.col === colIndex;
            const isTouched = touchedCell && 
              touchedCell.row === rowIndex && 
              touchedCell.col === colIndex;
            const isInitialCell = initialCells.includes(cellKey);
            const isRelated = relatedCells.has(cellKey);
            
            // Get feedback for this cell
            const isCorrect = showFeedback ? cellFeedback[cellKey] : null;
            
            // Border styling for 3x3 boxes
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
              <View
                key={`${rowIndex}-${colIndex}`}
                style={styles.cellContainer}
              >
                <Cell 
                  value={num} 
                  isSelected={isSelected}
                  isTouched={isTouched}
                  isInitialCell={isInitialCell}
                  isRelated={isRelated}
                  isCorrect={isCorrect}
                  showFeedback={showFeedback && !isInitialCell && num !== 0}
                  extraStyle={borderStyles}
                  theme={theme}
                />
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    width: 324,
    height: 324,
  },
  row: {
    flexDirection: 'row',
  },
  cellContainer: {
    width: 36,
    height: 36,
  }
});

export default Grid;
