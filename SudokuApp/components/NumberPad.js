import React, { useMemo, useCallback, memo } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';

const NumberPad = ({ 
  onSelectNumber, 
  theme, 
  board, 
  selectedCell,
  notesMode = false
}) => {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  
  // Track how many times each number appears on the board
  // Memoize this calculation to prevent it from running on every render
  const numberCounts = useMemo(() => {
    const counts = {};
    numbers.forEach(num => counts[num] = 0);
    
    if (board) {
      board.forEach(row => {
        row.forEach(cell => {
          if (cell > 0 && cell <= 9) {
            counts[cell]++;
          }
        });
      });
    }
    
    return counts;
  }, [board, numbers]); // Only recalculate when board changes
  
  // Get the value in the currently selected cell (if any)
  // Memoize this calculation to avoid recomputing on every render
  const selectedCellValue = useMemo(() => {
    return selectedCell && board && 
      board[selectedCell.row] && 
      board[selectedCell.row][selectedCell.col] ? 
      board[selectedCell.row][selectedCell.col] : 0;
  }, [selectedCell, board]);
  
  return (
    <View style={styles.container}>
      <View style={styles.numberRow}>
        {numbers.map((num) => {
          // Check if this number has been used 9 times
          const isMaxedOut = numberCounts[num] >= 9;
          
          // Allow interaction if the selected cell contains this number (for clearing)
          const canClearSelected = selectedCellValue === num;
          
          // Only fully disable if not in notes mode, maxed out AND not in the selected cell
          const isDisabled = !notesMode && isMaxedOut && !canClearSelected;
          
          // Visual treatment for maxed-out numbers (regardless of whether they can be cleared)
          // In notes mode we don't visually indicate maxed out numbers
          const isMaxedOutStyle = !notesMode && isMaxedOut;
          
          // Memoize the button style for each number
          const buttonStyle = useMemo(() => [
            styles.button, 
            {
              backgroundColor: isMaxedOutStyle 
                ? theme.colors.numberPad.clearButton
                : notesMode 
                  ? theme.colors.numberPad.notesBackground || theme.colors.numberPad.background 
                  : theme.colors.numberPad.background,
              borderColor: theme.colors.numberPad.border,
              shadowColor: theme.colors.numberPad.shadow,
              opacity: isMaxedOutStyle && !canClearSelected ? 0.5 : 1, // Lower opacity if disabled
              // Add a subtle indication when in notes mode
              borderWidth: notesMode ? 2 : 1,
              ...(Platform.OS === 'android' ? {
                // Android-specific optimizations
                elevation: 1, // Reduce elevation for better performance
              } : {})
            }
          ], [isMaxedOutStyle, canClearSelected, notesMode, theme.colors.numberPad]);

          // Memoize the text style for each number
          const textStyle = useMemo(() => [
            styles.text, 
            { 
              color: theme.colors.numberPad.text,
              // Font styling for notes mode
              fontWeight: notesMode ? '600' : '500',
            }
          ], [theme.colors.numberPad.text, notesMode]);

          // Create an optimized onPress handler for each button
          const handlePress = useCallback(() => {
            onSelectNumber(num);
          }, [num, onSelectNumber]);
          
          return (
            <TouchableOpacity 
              key={num} 
              style={buttonStyle}
              onPress={handlePress}
              delayPressIn={0}
              disabled={isDisabled}
            >
              <Text style={textStyle}>{num}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  numberRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 200,
  },
  button: {
    width: 50,
    height: 50,
    margin: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 5,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: Platform.OS === 'android' ? 1 : 2, // Lower elevation on Android
    ...(Platform.OS === 'android' ? {
      overflow: 'hidden', // Prevent layout issues on Android
    } : {}),
  },
  text: {
    fontSize: 22,
    fontWeight: '500',
  }
});

// Use memo for the entire component to prevent unnecessary re-renders
export default memo(NumberPad, (prevProps, nextProps) => {
  // Only re-render if these props have changed
  return (
    prevProps.notesMode === nextProps.notesMode &&
    prevProps.selectedCell === nextProps.selectedCell &&
    prevProps.board === nextProps.board &&
    JSON.stringify(prevProps.theme.colors.numberPad) === JSON.stringify(nextProps.theme.colors.numberPad)
  );
});