import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

const NumberPad = ({ onSelectNumber, theme, board, selectedCell }) => {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  
  // Track how many times each number appears on the board
  const countNumberUsage = () => {
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
  };
  
  const numberCounts = countNumberUsage();
  
  // Get the value in the currently selected cell (if any)
  const selectedCellValue = selectedCell && board && 
    board[selectedCell.row] && 
    board[selectedCell.row][selectedCell.col] ? 
    board[selectedCell.row][selectedCell.col] : 0;
  
  return (
    <View style={styles.container}>
      <View style={styles.numberRow}>
        {numbers.map((num) => {
          // Check if this number has been used 9 times
          const isMaxedOut = numberCounts[num] >= 9;
          
          // Allow interaction if the selected cell contains this number (for clearing)
          const canClearSelected = selectedCellValue === num;
          
          // Only fully disable if maxed out AND not in the selected cell
          const isDisabled = isMaxedOut && !canClearSelected;
          
          // Visual treatment for maxed-out numbers (regardless of whether they can be cleared)
          const isMaxedOutStyle = isMaxedOut;
          
          return (
            <TouchableOpacity 
              key={num} 
              style={[
                styles.button, 
                {
                  backgroundColor: isMaxedOutStyle 
                    ? theme.colors.numberPad.clearButton // Always use the red background if maxed out
                    : theme.colors.numberPad.background,
                  borderColor: theme.colors.numberPad.border,
                  shadowColor: theme.colors.numberPad.shadow,
                  opacity: isMaxedOutStyle && !canClearSelected ? 0.5 : 1, // Lower opacity if disabled
                }
              ]} 
              onPress={() => onSelectNumber(num)}
              disabled={isDisabled}
            >
              <Text style={[
                styles.text, 
                { color: theme.colors.numberPad.text }
              ]}>{num}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 30,
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
    elevation: 2,
  },
  text: {
    fontSize: 22,
    fontWeight: '500',
  },
});

export default NumberPad;
