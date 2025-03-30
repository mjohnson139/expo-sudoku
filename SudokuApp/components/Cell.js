import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Cell = ({ 
  value, 
  isSelected,
  isTouched,
  isInitialCell, 
  isRelated,
  isCorrect, 
  showFeedback, 
  extraStyle, 
  theme 
}) => {
  // Determine the background color based on cell status
  const getCellBackground = () => {
    if (isSelected) {
      return theme.colors.cell.selectedBackground;
    } else if (isTouched) {
      // Make sure we have a fallback color if touchedBackground isn't defined
      return theme.colors.cell.touchedBackground || 
             `${theme.colors.cell.selectedBackground}A0`; // Add some transparency
    } else if (isRelated) {
      return theme.colors.cell.relatedBackground || 
             `${theme.colors.cell.selectedBackground}50`; // More transparent than selected
    } else if (showFeedback && isCorrect === false) {
      return '#ffebee'; // Light red background
    } else if (isInitialCell && theme.colors.cell.prefilled) {
      return theme.colors.cell.prefilled;
    }
    return theme.colors.cell.background;
  };

  // Determine text color based on cell status
  const getTextColor = () => {
    if (isInitialCell) {
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
