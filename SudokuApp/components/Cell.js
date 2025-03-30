import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

const Cell = ({ value, onPress, isSelected, extraStyle }) => {
  return (
    <TouchableOpacity 
      style={[
        styles.cell, 
        isSelected && styles.selected,
        extraStyle
      ]} 
      onPress={onPress}
    >
      <Text style={[
        styles.text,
        value !== 0 && styles.filledText
      ]}>
        {value !== 0 ? value : ''}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cell: {
    width: 35.5,
    height: 35.5,
    borderWidth: 0.5,
    borderColor: '#aaa',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  selected: {
    backgroundColor: '#c2e3ff',
  },
  text: {
    fontSize: 18,
  },
  filledText: {
    fontWeight: 'bold',
  }
});

export default Cell;
