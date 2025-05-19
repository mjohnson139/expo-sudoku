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
  // Store and calculate cell relations for highlighting
  const [cellRelations, setCellRelations] = useState({});

  // Critical performance optimization for cell selection
  useEffect(() => {
    if (!selectedCell) {
      setCellRelations({});
      return;
    }

    // PERFORMANCE OPTIMIZATION: Only update selected cell immediately
    // This dramatically improves tap response time
    const { row, col } = selectedCell;
    
    // MAJOR PERFORMANCE BOOST: Don't calculate ANY relations initially
    // Just select the cell itself for immediate visual feedback
    setCellRelations({ [`${row}-${col}`]: 'selected' });
    
    // Delay ALL other calculations slightly to prioritize UI responsiveness
    // This small timeout makes a huge difference in perceived performance
    setTimeout(() => {
      // Now calculate quick row/column relations after a tiny delay
      const immediateRelations = { [`${row}-${col}`]: 'selected' };
      
      // Add row and column relations (fast calculation)
      for (let i = 0; i < 9; i++) {
        if (i !== row) immediateRelations[`${i}-${col}`] = 'column';
        if (i !== col) immediateRelations[`${row}-${i}`] = 'row';
      }
      
      // Update with immediate relations
      setCellRelations(immediateRelations);
      
      // Push more complex calculations to after all UI interactions complete
      InteractionManager.runAfterInteractions(() => {
        const selectedValue = board[row][col];
        const fullRelations = {...immediateRelations};
        
        // Pre-calculate box coordinates (more efficient)
        const boxStartRow = Math.floor(row / 3) * 3;
        const boxStartCol = Math.floor(col / 3) * 3;
        
        // Use optimized box relation calculation
        for (let r = boxStartRow; r < boxStartRow + 3; r++) {
          for (let c = boxStartCol; c < boxStartCol + 3; c++) {
            // Skip the selected cell itself and cells already in a relation
            if ((r === row && c === col) || fullRelations[`${r}-${c}`]) continue;
            fullRelations[`${r}-${c}`] = 'box';
          }
        }
        
        // Only calculate same-value relations if actually needed
        if (selectedValue !== 0) {
          // Scan board only once and cache indices by value for future lookups
          // This avoid O(n²) scan when there are many same values
          for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
              // Skip if already in relation or not matching
              if (fullRelations[`${r}-${c}`] || board[r][c] !== selectedValue) continue;
              fullRelations[`${r}-${c}`] = 'sameValue';
            }
          }
        }
        
        // Update with full relations after all fast UI updates complete
        setCellRelations(fullRelations);
      });
    }, 0); // Minimal timeout - just enough to yield to UI thread
  }, [selectedCell, board]);

  // Memoize border styles for all cells to avoid recreating them on every render
  const cellBorderStyles = useMemo(() => {
    const styles = {};
    
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cellKey = `${r}-${c}`;

        // Outermost borders should always be thick and boxBorder color
        // Ensure consistent border widths across all platforms
        const borderRight = c === 8 ? 2 : (c + 1) % 3 === 0 ? 2 : 1;
        const borderBottom = r === 8 ? 2 : (r + 1) % 3 === 0 ? 2 : 1;
        const borderLeft = c === 0 ? 2 : 1;
        const borderTop = r === 0 ? 2 : 1;

        // For 3x3 grid lines, always use boxBorder color when at edges of 3x3 boxes
        // This ensures the grid lines are visible on all platforms
        styles[cellKey] = {
          borderRightWidth: borderRight,
          borderBottomWidth: borderBottom,
          borderLeftWidth: borderLeft,
          borderTopWidth: borderTop,
          borderRightColor: c === 8 || (c + 1) % 3 === 0 
            ? theme.colors.grid.boxBorder 
            : theme.colors.grid.cellBorder,
          borderBottomColor: r === 8 || (r + 1) % 3 === 0 
            ? theme.colors.grid.boxBorder 
            : theme.colors.grid.cellBorder,
          borderLeftColor: c === 0 || c % 3 === 0 
            ? theme.colors.grid.boxBorder 
            : theme.colors.grid.cellBorder,
          borderTopColor: r === 0 || r % 3 === 0 
            ? theme.colors.grid.boxBorder 
            : theme.colors.grid.cellBorder,
        };
      }
    }
    
    return styles;
  }, [theme.colors.grid.boxBorder, theme.colors.grid.cellBorder]);

  // High-performance memoized cell renderer
  const renderCell = useCallback((rowIndex, colIndex, num) => {
    const cellKey = `${rowIndex}-${colIndex}`;
    // Fast path for determining if selected
    const isSelected = selectedCell && 
      selectedCell.row === rowIndex && 
      selectedCell.col === colIndex;
    const isInitialCell = initialCells.includes(cellKey);
    
    // Get the relation type from our memoized object
    // Use the 'selected' type for immediate feedback or standard relation types otherwise
    const relationType = cellRelations[cellKey] === 'selected' ? null : cellRelations[cellKey] || null;
    
    // Get feedback for this cell 
    const isCorrect = showFeedback ? cellFeedback[cellKey] : null;
    
    // Get notes for this cell (if any) - notes should be empty array if none
    const notes = cellNotes[cellKey] || [];

    // Optimized TouchableOpacity for better Android performance
    return (
      <TouchableOpacity
        key={cellKey}
        style={styles.cellContainer}
        onPress={() => onCellPress(rowIndex, colIndex)}
        activeOpacity={0.7}
        delayPressIn={0}
        hitSlop={{top: 1, bottom: 1, left: 1, right: 1}} // Better touch detection
        pressRetentionOffset={{top: 5, left: 5, bottom: 5, right: 5}} // Prevent accidental cancellations
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
    )
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
      padding: 2, // Increased padding to 2 pixels for better visibility of outer frame
      backgroundColor: theme.colors.grid.boxBorder,
      borderRadius: 0, // Keep sharp corners
      alignSelf: 'center',
      // Ensure consistent rendering across platforms
      overflow: 'hidden',
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

// Performance optimizations for all platforms
// Pre-calculate common styles to avoid recreation during rendering
const commonStyles = {
  cell: {
    overflow: 'hidden',
    elevation: 0,
  }
};

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
    // Cross-platform optimizations
    elevation: 0,
    overflow: 'hidden'
  }
});

export default React.memo(Grid);
