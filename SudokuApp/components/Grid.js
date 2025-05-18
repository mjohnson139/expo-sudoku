import React, { useMemo, useCallback, useState, useEffect, memo } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Dimensions, InteractionManager, Pressable } from 'react-native';
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
  // For Android, use a simpler relations model that's faster to calculate
  const [cellRelations, setCellRelations] = useState({});

  // Optimize cell relations calculation based on platform
  useEffect(() => {
    if (!selectedCell) {
      setCellRelations({});
      return;
    }

    // Android: Only provide row/column relations for better performance
    // iOS: Provide full relations
    if (Platform.OS === 'android') {
      // For Android, only calculate row/column for best performance
      const { row, col } = selectedCell;
      const simpleRelations = {};
      
      // Add row and column relations only
      for (let i = 0; i < 9; i++) {
        if (i !== row) simpleRelations[`${i}-${col}`] = 'column';
        if (i !== col) simpleRelations[`${row}-${i}`] = 'row';
      }
      
      // Only update once with the simple relations
      setCellRelations(simpleRelations);
    } else {
      // iOS can handle more complex calculations
      // First set immediate relations (row/column) for faster visual feedback
      const { row, col } = selectedCell;
      const immediateRelations = {};
      
      // Add row and column relations immediately (fastest to calculate)
      for (let i = 0; i < 9; i++) {
        if (i !== row) immediateRelations[`${i}-${col}`] = 'column';
        if (i !== col) immediateRelations[`${row}-${i}`] = 'row';
      }
      
      // Update with immediate relations first
      setCellRelations(immediateRelations);
      
      // Calculate more complex relations (box, same value) asynchronously
      InteractionManager.runAfterInteractions(() => {
      const { row, col } = selectedCell;
      const selectedValue = board[row][col];
      const fullRelations = {...immediateRelations};
      
      // Pre-calculate box boundaries (more efficient)
      const boxStartRow = Math.floor(row / 3) * 3;
      const boxStartCol = Math.floor(col / 3) * 3;
      const boxEndRow = boxStartRow + 2;
      const boxEndCol = boxStartCol + 2;
      
      // Add box relations
      for (let r = boxStartRow; r <= boxEndRow; r++) {
        for (let c = boxStartCol; c <= boxEndCol; c++) {
          // Skip the selected cell itself and cells already in a relation (row/col)
          if ((r === row && c === col) || fullRelations[`${r}-${c}`]) continue;
          fullRelations[`${r}-${c}`] = 'box';
        }
      }
      
      // Add same value relations (only if selected cell has a value)
      if (selectedValue !== 0) {
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            // Skip if already in a relation
            if (fullRelations[`${r}-${c}`]) continue;
            
            // Add same value relation
            if (board[r][c] === selectedValue) {
              fullRelations[`${r}-${c}`] = 'sameValue';
            }
          }
        }
      }
      
        // Update with full relations
        setCellRelations(fullRelations);
      });
    }
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

  // Create a memoized cell renderer to improve performance
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

    // Use platform-specific touchable components for best performance
    if (Platform.OS === 'android') {
      return (
        <Pressable
          key={cellKey}
          style={[styles.cellContainer, { overflow: 'hidden' }]}
          onPress={() => onCellPress(rowIndex, colIndex)}
          android_ripple={{color: 'transparent'}}
          hitSlop={0}
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
        </Pressable>
      );
    } else {
      return (
        <TouchableOpacity
          key={cellKey}
          style={styles.cellContainer}
          onPress={() => onCellPress(rowIndex, colIndex)}
          activeOpacity={0.7}
          delayPressIn={0}
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
    }
  }, [
    selectedCell, 
    initialCells, 
    cellRelations, 
    showFeedback, 
    cellFeedback, 
    cellBorderStyles, 
    theme,
    cellNotes,
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

// Configure Android hardware acceleration and optimizations
if (Platform.OS === 'android') {
  // Pre-calculate standard border styles to avoid recreating them for each cell
  global.AndroidCellStyles = {
    // Common styles for faster cell rendering
    standard: {
      overflow: 'hidden',
      elevation: 0,
      // Force hardware acceleration where possible
      backfaceVisibility: 'hidden',
    }
  };
}

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
    ...(Platform.OS === 'android' ? {
      // Android-specific optimizations
      elevation: 0, // Eliminate shadow complexity
      backfaceVisibility: 'hidden', // Force hardware acceleration
      overflow: 'hidden', // Prevent layout issues
      borderWidth: 0, // Use more efficient borders in Cell component
    } : {})
  }
});

export default React.memo(Grid);
