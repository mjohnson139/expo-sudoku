import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

const NumberPad = ({ onSelectNumber, theme }) => {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  
  return (
    <View style={styles.container}>
      <View style={styles.numberRow}>
        {numbers.map((num) => (
          <TouchableOpacity 
            key={num} 
            style={[
              styles.button, 
              {
                backgroundColor: theme.colors.numberPad.background,
                borderColor: theme.colors.numberPad.border,
                shadowColor: theme.colors.numberPad.shadow,
              }
            ]} 
            onPress={() => onSelectNumber(num)}
          >
            <Text style={[
              styles.text, 
              { color: theme.colors.numberPad.text }
            ]}>{num}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity 
        style={[
          styles.button, 
          styles.clearButton, 
          {
            backgroundColor: theme.colors.numberPad.clearButton,
            borderColor: theme.colors.numberPad.border,
            shadowColor: theme.colors.numberPad.shadow,
          }
        ]} 
        onPress={() => onSelectNumber(0)}
      >
        <Text style={[
          styles.text,
          { color: theme.colors.numberPad.text }
        ]}>Clear</Text>
      </TouchableOpacity>
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
  clearButton: {
    marginTop: 10,
    width: 120,
  },
  text: {
    fontSize: 22,
    fontWeight: '500',
  },
});

export default NumberPad;
