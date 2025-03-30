import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

const NumberPad = ({ onSelectNumber }) => {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  
  return (
    <View style={styles.container}>
      <View style={styles.numberRow}>
        {numbers.map((num) => (
          <TouchableOpacity 
            key={num} 
            style={styles.button} 
            onPress={() => onSelectNumber(num)}
          >
            <Text style={styles.text}>{num}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity 
        style={[styles.button, styles.clearButton]} 
        onPress={() => onSelectNumber(0)}
      >
        <Text style={styles.text}>Clear</Text>
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
    borderColor: '#555',
    borderRadius: 5,
    backgroundColor: '#f0f0f0',
    shadowColor: "#000",
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
    backgroundColor: '#ffe0e0',
    width: 120,
  },
  text: {
    fontSize: 22,
    fontWeight: '500',
  },
});

export default NumberPad;
