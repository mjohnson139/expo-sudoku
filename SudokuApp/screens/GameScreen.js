import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Grid from '../components/Grid';
import NumberPad from '../components/NumberPad';
import BuildNotes from '../components/BuildNotes';
import THEMES from '../utils/themes';

// Build number to track versions in screenshots
const BUILD_NUMBER = "1.0.4";

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
  // Build notes state
  const [showBuildNotes, setShowBuildNotes] = useState(false);

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

  // Toggle build notes visibility
  const toggleBuildNotes = () => {
    setShowBuildNotes(!showBuildNotes);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.title }]}>Sudoku</Text>
        <TouchableOpacity 
          style={[styles.buildButton, { borderColor: theme.colors.title }]} 
          onPress={toggleBuildNotes}
        >
          <Text style={[styles.buildNumber, { color: theme.colors.title }]}>
            Build {BUILD_NUMBER} ℹ️
          </Text>
        </TouchableOpacity>
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

      {/* Build Notes Button (visible at bottom right corner) */}
      <TouchableOpacity 
        style={[styles.notesButton, { backgroundColor: theme.colors.numberPad.background }]}
        onPress={toggleBuildNotes}
      >
        <Text style={{ color: theme.colors.numberPad.text }}>📝 Notes</Text>
      </TouchableOpacity>

      {/* Build Notes Component */}
      <BuildNotes 
        version={BUILD_NUMBER}
        isVisible={showBuildNotes} 
        onClose={() => setShowBuildNotes(false)} 
        theme={theme}
      />
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
  buildButton: {
    marginLeft: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  buildNumber: {
    fontSize: 12,
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
  },
  notesButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  }
});

export default GameScreen;
