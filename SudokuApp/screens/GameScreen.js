import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Grid from '../components/Grid';
import NumberPad from '../components/NumberPad';
import THEMES from '../utils/themes';

// Build number to track versions in screenshots
const BUILD_NUMBER = "1.0.3";

// Valid initial Sudoku board with unique numbers in rows, columns and boxes
const initialBoard = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

const GameScreen = () => {
  const [board, setBoard] = useState(initialBoard);
  const [selectedCell, setSelectedCell] = useState(null);
  // Track initial board to prevent changing initial numbers
  const [initialCells, setInitialCells] = useState([]);
  // Theme state
  const [currentThemeName, setCurrentThemeName] = useState('classic');
  const [theme, setTheme] = useState(THEMES.classic);

  // Initialize initialCells on component mount
  useEffect(() => {
    const initialPositions = [];
    initialBoard.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        if (value !== 0) {
          initialPositions.push(`${rowIndex}-${colIndex}`);
        }
      });
    });
    setInitialCells(initialPositions);
  }, []);

  const handleCellPress = (row, col) => {
    // Allow selecting any cell, but will prevent modifying initial cells
    setSelectedCell({ row, col });
  };

  const handleNumberSelect = (num) => {
    if (!selectedCell) return;
    
    const cellKey = `${selectedCell.row}-${selectedCell.col}`;
    
    // Prevent modifying initial board cells
    if (initialCells.includes(cellKey)) {
      return;
    }

    const newBoard = [...board];
    newBoard[selectedCell.row][selectedCell.col] = num;
    setBoard(newBoard);
  };

  // Cycle through available themes
  const cycleTheme = () => {
    const themeKeys = Object.keys(THEMES);
    const currentIndex = themeKeys.indexOf(currentThemeName);
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    const nextThemeName = themeKeys[nextIndex];
    
    setCurrentThemeName(nextThemeName);
    setTheme(THEMES[nextThemeName]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.title }]}>Sudoku</Text>
        <Text style={[styles.buildNumber, { color: theme.colors.title }]}>
          Build {BUILD_NUMBER}
        </Text>
      </View>
      
      <Grid 
        board={board} 
        onCellPress={handleCellPress} 
        selectedCell={selectedCell}
        initialCells={initialCells}
        theme={theme}
      />
      
      <NumberPad onSelectNumber={handleNumberSelect} theme={theme} />
      
      <View style={styles.themeContainer}>
        <TouchableOpacity 
          style={[styles.themeButton, { backgroundColor: theme.colors.numberPad.background }]} 
          onPress={cycleTheme}
        >
          <Text style={{ color: theme.colors.numberPad.text }}>
            Theme: {theme.name}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  buildNumber: {
    fontSize: 12,
    marginLeft: 10,
    opacity: 0.7,
  },
  themeContainer: {
    marginTop: 20,
  },
  themeButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  }
});

export default GameScreen;
