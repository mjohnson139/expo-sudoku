import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

const Cell = ({ value, onPress, isSelected, isInitialCell, extraStyle, theme }) => {
  // Determine the background color based on cell status
  const getCellBackground = () => {
    if (isSelected) {
      return theme.colors.cell.selectedBackground;
    } else if (isInitialCell && theme.colors.cell.prefilled) {
      return theme.colors.cell.prefilled;
    }
    return theme.colors.cell.background;
  };

  // Determine text color based on cell status
  const getTextColor = () => {
    if (isInitialCell) {
      return theme.colors.cell.initialValueText;
    }
    return theme.colors.cell.userValueText;
  };

  return (
    <TouchableOpacity 
      style={[
        styles.cell, 
        { backgroundColor: getCellBackground() },
        extraStyle
      ]} 
      onPress={onPress}
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
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cell: {
    width: 36, // Slightly increased to accommodate thicker borders
    height: 36, // Slightly increased to accommodate thicker borders
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 18,
  }
});

export default Cell;
