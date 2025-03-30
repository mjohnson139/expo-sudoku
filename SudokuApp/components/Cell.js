import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Cell = ({ 
  value, 
  isSelected,
  isInitialCell, 
  relationType,
  isCorrect, 
  showFeedback, 
  extraStyle, 
  theme,
  notes = [] // Array of numbers 1-9 that are notes for this cell
}) => {
  // Determine the background color based on cell status
  const getCellBackground = () => {
    if (isSelected) {
      return theme.colors.cell.selectedBackground;
    } else if (relationType) {
      // Make sure theme has all the necessary colors with fallbacks
      switch(relationType) {
        case 'box':
          return theme.colors.cell.boxRelatedBackground || theme.colors.cell.relatedBackground;
        case 'row':
          return theme.colors.cell.rowRelatedBackground || theme.colors.cell.relatedBackground;
        case 'column':
          return theme.colors.cell.columnRelatedBackground || theme.colors.cell.relatedBackground;
        case 'sameValue':
          return theme.colors.cell.sameValueBackground || theme.colors.cell.relatedBackground;
        default:
          return theme.colors.cell.background;
      }
    } else if (showFeedback && isCorrect === false) {
      return theme.colors.cell.incorrectBackground || '#ffebee';
    }
    return theme.colors.cell.background;
  };

  // Determine text color based on cell status
  const getTextColor = () => {
    if (isInitialCell) {
      // Use a more prominent color for initial values
      return theme.colors.cell.initialValueText;
    } else if (showFeedback) {
      return isCorrect 
        ? theme.colors.cell.correctValueText 
        : theme.colors.cell.incorrectValueText;
    }
    return theme.colors.cell.userValueText;
  };

  // Notes grid rendering
  const renderNotes = () => {
    // Create a 3x3 grid of possible numbers
    const grid = [];
    
    // Define note positions: 0-based index for positions [0,0] to [2,2]
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        // Calculate the number for this position (1-9)
        const num = row * 3 + col + 1;
        
        grid.push(
          <View 
            key={num} 
            style={[
              styles.noteCell,
              { 
                left: `${col * 33.33}%`, 
                top: `${row * 33.33}%` 
              }
            ]}
          >
            {notes.includes(num) && (
              <Text style={[
                styles.noteText,
                { color: theme.colors.cell.notesText || theme.colors.cell.userValueText }
              ]}>
                {num}
              </Text>
            )}
          </View>
        );
      }
    }
    
    return grid;
  };

  return (
    <View 
      style={[
        styles.cell, 
        { backgroundColor: getCellBackground() },
        extraStyle
      ]} 
    >
      {value !== 0 ? (
        // If cell has a value, render the number
        <Text style={[
          styles.text,
          { 
            color: getTextColor(),
            fontWeight: isInitialCell ? 'bold' : '500',
            fontSize: isInitialCell ? 19 : 18, // Keep initial values slightly larger
          }
        ]}>
          {value}
        </Text>
      ) : (
        // If cell is empty, potentially render notes
        <View style={styles.notesContainer}>
          {renderNotes()}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cell: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 18,
  },
  notesContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  noteCell: {
    position: 'absolute',
    width: '33.33%',
    height: '33.33%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteText: {
    fontSize: 9,
    fontWeight: '500',
  }
});

export default Cell;
