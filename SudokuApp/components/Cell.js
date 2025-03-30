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
  theme 
}) => {
  // Determine the background color based on cell status
  const getCellBackground = () => {
    if (isSelected) {
      return theme.colors.cell.selectedBackground;
    } else if (relationType) {
      // Different background colors based on relation type
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
          return theme.colors.cell.relatedBackground;
      }
    } else if (showFeedback && isCorrect === false) {
      return '#ffebee'; // Light red background
    }
    // Use the same background for all cells, including initial/prefilled cells
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

  return (
    <View 
      style={[
        styles.cell, 
        { backgroundColor: getCellBackground() },
        extraStyle
      ]} 
    >
      {value !== 0 && (
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
  }
});

export default Cell;
