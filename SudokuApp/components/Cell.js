import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Performance-optimized Cell component
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
  // Memoize background color calculation
  const backgroundColor = useMemo(() => {
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
  }, [isSelected, relationType, showFeedback, isCorrect, theme.colors.cell]);

  // Memoize text color calculation
  const textColor = useMemo(() => {
    if (isInitialCell) {
      // Use a more prominent color for initial values
      return theme.colors.cell.initialValueText;
    } else if (showFeedback) {
      return isCorrect 
        ? theme.colors.cell.correctValueText 
        : theme.colors.cell.incorrectValueText;
    }
    return theme.colors.cell.userValueText;
  }, [isInitialCell, showFeedback, isCorrect, theme.colors.cell]);

  // Memoize text style
  const textStyle = useMemo(() => [
    styles.text,
    { 
      color: textColor,
      fontWeight: isInitialCell ? 'bold' : '500',
      fontSize: isInitialCell ? 19 : 18, // Keep initial values slightly larger
    }
  ], [textColor, isInitialCell]);

  // Optimized notes rendering - only create when needed
  const notesElements = useMemo(() => {
    // Skip unnecessary calculations if no notes or value exists
    if (value !== 0 || notes.length === 0) return null;
    
    // Pre-compute notes color to avoid repetition in the loop
    const notesColor = theme.colors.cell.notesText || theme.colors.cell.userValueText;
    
    // Create a 3×3 grid of possible notes
    return (
      <View style={styles.notesContainer}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
          // Calculate position in the 3×3 grid
          const row = Math.floor((num - 1) / 3);
          const col = (num - 1) % 3;
          
          // Only render if this note exists
          return (
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
                <Text style={[styles.noteText, { color: notesColor }]}>
                  {num}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    );
  }, [value, notes, theme.colors.cell.notesText, theme.colors.cell.userValueText]);

  // Combine all styles for the cell container
  const cellStyle = useMemo(() => [
    styles.cell, 
    { backgroundColor }, 
    extraStyle
  ], [backgroundColor, extraStyle]);

  // Render optimization: Conditionally render content based on value
  if (value !== 0) {
    // Cell has a value
    return (
      <View style={cellStyle} accessibilityLabel={`Cell value: ${value}`}>
        <Text style={textStyle}>{value}</Text>
      </View>
    );
  } else {
    // Empty cell - may contain notes
    return (
      <View style={cellStyle} accessibilityLabel="Empty cell">
        {notesElements}
      </View>
    );
  }
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

// Use React.memo to prevent unnecessary re-renders
export default React.memo(Cell);
