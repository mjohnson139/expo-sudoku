import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import Cell from './Cell';
import CellScoreAnimation from './CellScoreAnimation';

const Grid = ({ 
  board, 
  onCellPress, 
  selectedCell, 
  initialCells = [], 
  theme, 
  showFeedback = false, 
  cellFeedback = {}, 
  cellNotes = {}
}) => {
  // Memoize all the cell relations based on the selected cell and board state
  // This prevents recalculating relations for all 81 cells on every render
  const cellRelations = useMemo(() => {
    if (!selectedCell) return {};
    
    const { row, col } = selectedCell;
    const selectedValue = board[row][col];
    const relations = {};
    
    // Pre-calculate box coordinates
    const selectedBoxRow = Math.floor(row / 3);
    const selectedBoxCol = Math.floor(col / 3);
    
    // Calculate relations for all cells at once
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        // Skip the selected cell itself
        if (r === row && c === col) continue;
        
        const cellKey = `${r}-${c}`;
        const cellBoxRow = Math.floor(r / 3);
        const cellBoxCol = Math.floor(c / 3);
        const cellValue = board[r][c];
        
        // Determine relation (prioritize in order: box, row, column, sameValue)
        if (cellBoxRow === selectedBoxRow && cellBoxCol === selectedBoxCol) {
          relations[cellKey] = 'box';
        } else if (r === row) {
          relations[cellKey] = 'row';
        } else if (c === col) {
          relations[cellKey] = 'column';
        } else if (selectedValue !== 0 && cellValue === selectedValue) {
          relations[cellKey] = 'sameValue';
        }
      }
    }
    
    return relations;
  }, [selectedCell, board]);

  // Memoize border styles for all cells to avoid recreating them on every render
  const cellBorderStyles = useMemo(() => {
    const styles = {};
    
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cellKey = `${r}-${c}`;

        // Outermost borders should always be thick and boxBorder color
        const borderRight = c === 8 ? 2 : (c + 1) % 3 === 0 ? 2 : 1;
        const borderBottom = r === 8 ? 2 : (r + 1) % 3 === 0 ? 2 : 1;
        const borderLeft = c === 0 ? 2 : 1;
        const borderTop = r === 0 ? 2 : 1;

        styles[cellKey] = {
          borderRightWidth: borderRight,
          borderBottomWidth: borderBottom,
          borderLeftWidth: borderLeft,
          borderTopWidth: borderTop,
          borderRightColor: c === 8 ? theme.colors.grid.boxBorder : ((c + 1) % 3 === 0 ? theme.colors.grid.boxBorder : theme.colors.grid.cellBorder),
          borderBottomColor: r === 8 ? theme.colors.grid.boxBorder : ((r + 1) % 3 === 0 ? theme.colors.grid.boxBorder : theme.colors.grid.cellBorder),
          borderLeftColor: c === 0 ? theme.colors.grid.boxBorder : theme.colors.grid.cellBorder,
          borderTopColor: r === 0 ? theme.colors.grid.boxBorder : theme.colors.grid.cellBorder,
        };
      }
    }
    
    return styles;
  }, [theme.colors.grid.boxBorder, theme.colors.grid.cellBorder]);

  /**
   * FlatList item renderer – wrapped in useCallback so the
   * reference only changes when selectedCell or the relations
   * actually change.  This lets FlatList better
   * recycle / window its children.
   */
  /**
   * FlatList item renderer – wrapped in useCallback so the
   * reference only changes when selectedCell or the relations
   * actually change.  This lets FlatList better
   * recycle / window its children.
   */
  const renderCell = useCallback((rowIndex, colIndex, num) => {
    const cellKey = `${rowIndex}-${colIndex}`;
    const isSelected = selectedCell && 
      selectedCell.row === rowIndex && 
      selectedCell.col === colIndex;
    const isInitialCell = initialCells.includes(cellKey);
    
    // Get the relation type from our memoized object
    const relationType = cellRelations[cellKey] || null;
    
    // Get feedback for this cell
    const isCorrect = showFeedback ? cellFeedback[cellKey] : null;
    
    // Get notes for this cell (if any)
    const notes = cellNotes[cellKey] || [];

    return (
      <TouchableOpacity
        key={cellKey}
        style={styles.cellContainer}
        onPressIn={() => onCellPress(rowIndex, colIndex)}
        activeOpacity={0.7}
      >
        <Cell 
          value={num} 
          isSelected={isSelected}
          isInitialCell={isInitialCell}
          relationType={relationType}
          isCorrect={isCorrect}
          showFeedback={showFeedback && !isInitialCell && num !== 0}
          extraStyle={cellBorderStyles[cellKey]}
          theme={theme}
          notes={notes}
        />
      </TouchableOpacity>
    );
  }, [
    selectedCell, 
    cellRelations,
    initialCells,
    showFeedback,
    cellFeedback,
    cellNotes,
    cellBorderStyles,
    theme,
    onCellPress
  ]);

  // Pre-render all rows and cells for better performance
  const renderedRows = useMemo(() => {
    return board.map((row, rowIndex) => (
      <View key={`row-${rowIndex}`} style={styles.row}>
        {row.map((num, colIndex) => renderCell(rowIndex, colIndex, num))}
      </View>
    ));
  }, [board, renderCell]);

  return (
    <View style={{
      padding: 1, // Adjusted padding to 1 pixel for a thinner board frame
      backgroundColor: theme.colors.grid.boxBorder,
      borderRadius: 0, // Keep sharp corners
      alignSelf: 'center',
    }}>
      <View 
        style={[
          styles.grid, 
          { 
            backgroundColor: theme.colors.grid.background,
          }
        ]}
      >
        {renderedRows}
        <CellScoreAnimation />
      </View>
    </View>
  );
};

// Get responsive dimensions for the grid
const getGridDimensions = () => {
  // Base size for mobile
  const baseSize = 324;
  const baseCellSize = 36;
  
  // For web platform, use responsive sizing based on screen width
  if (Platform.OS === 'web') {
    const { width, height } = Dimensions.get('window');
    const smallerDimension = Math.min(width, height);
    
    // Limit grid size on web for larger screens
    // On small screens, make it proportionally smaller
    const maxWebSize = 450; // Maximum grid size on web
    const minWebSize = 270; // Minimum grid size on web
    
    // Calculate the responsive size based on screen dimensions
    const responsiveSize = Math.min(
      maxWebSize,
      Math.max(minWebSize, smallerDimension * 0.7)
    );
    
    // Round to nearest pixel for clean rendering
    const gridSize = Math.floor(responsiveSize);
    const cellSize = Math.floor(gridSize / 9);
    
    return { gridSize, cellSize };
  }
  
  // Return default sizes for mobile platforms
  return { gridSize: baseSize, cellSize: baseCellSize };
};

// Get the dimensions based on platform
const { gridSize, cellSize } = getGridDimensions();

const styles = StyleSheet.create({
  grid: {
    width: gridSize,
    height: gridSize,
    // No borderWidth or borderColor here
  },
  row: {
    flexDirection: 'row',
  },
  cellContainer: {
    width: cellSize,
    height: cellSize,
  }
});

export default React.memo(Grid);
