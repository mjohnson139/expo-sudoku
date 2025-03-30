import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Switch } from 'react-native';
import Grid from '../components/Grid';
import NumberPad from '../components/NumberPad';
import BuildNotes from '../components/BuildNotes';
import THEMES from '../utils/themes';
import { isCorrectValue } from '../utils/solution';

// Build number to track versions in screenshots
const BUILD_NUMBER = "1.3.1";

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
  const [initialCells, setInitialCells] = useState([]);
  const [currentThemeName, setCurrentThemeName] = useState('classic');
  const [theme, setTheme] = useState(THEMES.classic);
  const [showBuildNotes, setShowBuildNotes] = useState(false);
  
  // New state for feedback feature
  const [showFeedback, setShowFeedback] = useState(false);
  const [cellFeedback, setCellFeedback] = useState({});

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

    // Check if the value is correct and update feedback if feedback is enabled
    if (showFeedback && num !== 0) {
      const isCorrect = isCorrectValue(selectedCell.row, selectedCell.col, num);
      const newFeedback = { ...cellFeedback };
      newFeedback[cellKey] = isCorrect;
      setCellFeedback(newFeedback);
    }
  };

  // Toggle feedback feature
  const toggleFeedback = (value) => {
    setShowFeedback(value);
    if (!value) {
      // Clear feedback when turning off
      setCellFeedback({});
    } else {
      // Re-check all user-entered cells
      const newFeedback = {};
      board.forEach((row, rowIndex) => {
        row.forEach((value, colIndex) => {
          const cellKey = `${rowIndex}-${colIndex}`;
          
          // Only check user-entered values (not initial or empty)
          if (!initialCells.includes(cellKey) && value !== 0) {
            newFeedback[cellKey] = isCorrectValue(rowIndex, colIndex, value);
          }
        });
      });
      setCellFeedback(newFeedback);
    }
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
        showFeedback={showFeedback}
        cellFeedback={cellFeedback}
      />
      
      {/* Updated centered controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.controlsRow}>
          <View style={styles.feedbackControl}>
            <Text style={[styles.feedbackLabel, { color: theme.colors.title }]}>
              Feedback
            </Text>
            <Switch
              value={showFeedback}
              onValueChange={toggleFeedback}
              trackColor={{ 
                false: '#d3d3d3', 
                true: theme.colors.cell.correctValueText 
              }}
              thumbColor={showFeedback ? theme.colors.numberPad.background : '#f4f3f4'}
            />
          </View>

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
      
      <NumberPad onSelectNumber={handleNumberSelect} theme={theme} />

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
  controlsContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20, // Add space between the controls
  },
  feedbackControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedbackLabel: {
    marginRight: 10,
    fontSize: 16,
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
