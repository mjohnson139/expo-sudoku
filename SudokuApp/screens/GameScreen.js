import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Switch } from 'react-native';
import Grid from '../components/Grid';
import NumberPad from '../components/NumberPad';
import BuildNotes from '../components/BuildNotes';
import JoystickNavigator from '../components/JoystickNavigator';
import THEMES from '../utils/themes';
import { isCorrectValue } from '../utils/solution';

// Update build number
const BUILD_NUMBER = "1.6.2";

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
  
  // State for feedback feature
  const [showFeedback, setShowFeedback] = useState(false);
  const [cellFeedback, setCellFeedback] = useState({});

  // State for joystick toggle and sensitivity
  const [joystickEnabled, setJoystickEnabled] = useState(true);
  const [joystickThreshold, setJoystickThreshold] = useState(12.0);

  // State for notes feature
  const [notesMode, setNotesMode] = useState(false);
  const [cellNotes, setCellNotes] = useState({});

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

  // Implement a function to check if cells are related
  const areCellsRelated = (cell1Row, cell1Col, cell2Row, cell2Col) => {
    // Same row
    if (cell1Row === cell2Row) return true;
    
    // Same column
    if (cell1Col === cell2Col) return true;
    
    // Same 3x3 box
    const box1Row = Math.floor(cell1Row / 3);
    const box1Col = Math.floor(cell1Col / 3);
    const box2Row = Math.floor(cell2Row / 3);
    const box2Col = Math.floor(cell2Col / 3);
    
    return box1Row === box2Row && box1Col === box2Col;
  };

  // Function to update notes when a value is placed in a cell
  const updateRelatedNotes = (row, col, value) => {
    // Don't update notes if value is 0 (clearing a cell) or if value is invalid
    if (value <= 0 || value > 9) return;
    
    const updatedNotes = { ...cellNotes };
    let hasChanges = false;
    
    // Go through all cells with notes
    Object.keys(updatedNotes).forEach(cellKey => {
      const [cellRow, cellCol] = cellKey.split('-').map(Number);
      
      // Check if this cell is related to the cell where a value was placed
      if (areCellsRelated(row, col, cellRow, cellCol)) {
        const notes = updatedNotes[cellKey];
        
        // If the notes include the value that was placed, remove it
        if (notes.includes(value)) {
          const newNotes = notes.filter(n => n !== value);
          
          if (newNotes.length === 0) {
            // If no notes left, remove the entry
            delete updatedNotes[cellKey];
          } else {
            // Otherwise update with the new notes array
            updatedNotes[cellKey] = newNotes;
          }
          
          hasChanges = true;
        }
      }
    });
    
    // Only update state if there were actual changes
    if (hasChanges) {
      setCellNotes(updatedNotes);
    }
  };

  // Handle number selection based on current mode (regular or notes)
  const handleNumberSelect = (num) => {
    if (!selectedCell) return;
    
    const cellKey = `${selectedCell.row}-${selectedCell.col}`;
    
    // Prevent modifying initial board cells
    if (initialCells.includes(cellKey)) {
      return;
    }

    if (notesMode) {
      // Notes mode - toggle notes for this number in the cell
      const currentNotes = cellNotes[cellKey] || [];
      let newNotes;
      
      if (currentNotes.includes(num)) {
        // Remove the number from notes
        newNotes = currentNotes.filter(n => n !== num);
      } else {
        // Add the number to notes
        newNotes = [...currentNotes, num];
      }
      
      // Update notes state
      const newCellNotes = { ...cellNotes };
      
      if (newNotes.length === 0) {
        // If no notes left, remove the entry
        delete newCellNotes[cellKey];
      } else {
        newCellNotes[cellKey] = newNotes;
      }
      
      setCellNotes(newCellNotes);
    } else {
      // Regular mode - set/toggle the actual number in the cell
      const newBoard = [...board];
      const currentValue = newBoard[selectedCell.row][selectedCell.col];
      
      // Toggle the number - if it's already in the cell, clear it
      const newValue = (currentValue === num) ? 0 : num;
      newBoard[selectedCell.row][selectedCell.col] = newValue;
      
      // Clear any notes for this cell when setting an actual number
      if (newValue !== 0 && cellNotes[cellKey]) {
        const newCellNotes = { ...cellNotes };
        delete newCellNotes[cellKey];
        setCellNotes(newCellNotes);
      }
      
      // If a number was placed (not cleared), update related notes
      if (newValue !== 0) {
        updateRelatedNotes(selectedCell.row, selectedCell.col, newValue);
      }
      
      setBoard(newBoard);

      // Check if the value is correct and update feedback if feedback is enabled
      if (showFeedback && newValue !== 0) {
        const isCorrect = isCorrectValue(selectedCell.row, selectedCell.col, newValue);
        const newFeedback = { ...cellFeedback };
        newFeedback[cellKey] = isCorrect;
        setCellFeedback(newFeedback);
      } else if (showFeedback && newValue === 0) {
        // If cell was cleared, remove the feedback
        const newFeedback = { ...cellFeedback };
        delete newFeedback[cellKey];
        setCellFeedback(newFeedback);
      }
    }
  };

  // Handle joystick movement
  const handleJoystickMove = (direction) => {
    if (!selectedCell) {
      // If no cell is selected, select the center cell
      setSelectedCell({ row: 4, col: 4 });
      return;
    }

    const { row, col } = selectedCell;
    let newRow = row;
    let newCol = col;

    switch (direction) {
      case 'up':
        newRow = Math.max(0, row - 1);
        break;
      case 'down':
        newRow = Math.min(8, row + 1);
        break;
      case 'left':
        newCol = Math.max(0, col - 1);
        break;
      case 'right':
        newCol = Math.min(8, col + 1);
        break;
    }

    // Only update if the position actually changed
    if (newRow !== row || newCol !== col) {
      setSelectedCell({ row: newRow, col: newCol });
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

  // Toggle joystick feature
  const toggleJoystick = () => {
    setJoystickEnabled(!joystickEnabled);
  };

  // Adjust joystick threshold with larger increments
  const adjustThreshold = (increment) => {
    // Ensure threshold stays within reasonable bounds (0.5 to 20.0)
    const newValue = Math.max(0.5, Math.min(20.0, joystickThreshold + increment));
    setJoystickThreshold(parseFloat(newValue.toFixed(1))); // Round to 1 decimal place
  };

  // Toggle between regular and notes mode
  const toggleNotesMode = () => {
    setNotesMode(!notesMode);
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
      
      <View style={styles.gridContainer}>
        <Grid 
          board={board} 
          onCellPress={handleCellPress} 
          selectedCell={selectedCell}
          initialCells={initialCells}
          theme={theme}
          showFeedback={showFeedback}
          cellFeedback={cellFeedback}
          cellNotes={cellNotes}  // Pass cell notes to Grid
        />
        
        {/* Joystick Navigator on the grid only */}
        <JoystickNavigator
          onMove={handleJoystickMove}
          active={joystickEnabled}
          threshold={joystickThreshold}
        />
      </View>
      
      {/* Controls */}
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

          <View style={styles.feedbackControl}>
            <Text style={[styles.feedbackLabel, { color: theme.colors.title }]}>
              Joystick
            </Text>
            <Switch
              value={joystickEnabled}
              onValueChange={setJoystickEnabled}
              trackColor={{ 
                false: '#d3d3d3', 
                true: theme.colors.cell.correctValueText 
              }}
              thumbColor={joystickEnabled ? theme.colors.numberPad.background : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Second row with joystick and notes controls */}
        <View style={styles.controlsRow}>
          {/* Joystick Threshold Control */}
          {joystickEnabled && (
            <View style={styles.thresholdContainer}>
              <Text style={[styles.thresholdLabel, { color: theme.colors.title }]}>
                Joystick Sensitivity: {joystickThreshold.toFixed(1)}
              </Text>
              <View style={styles.thresholdControls}>
                <TouchableOpacity 
                  style={[styles.thresholdButton, { backgroundColor: theme.colors.numberPad.background }]}
                  onPress={() => adjustThreshold(-0.5)}
                >
                  <Text style={{ color: theme.colors.numberPad.text }}>-</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.thresholdButton, { backgroundColor: theme.colors.numberPad.background }]}
                  onPress={() => adjustThreshold(0.5)}
                >
                  <Text style={{ color: theme.colors.numberPad.text }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
      
      <NumberPad 
        onSelectNumber={handleNumberSelect} 
        toggleNotesMode={toggleNotesMode}
        theme={theme} 
        board={board}
        selectedCell={selectedCell}
        notesMode={notesMode}
      />

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
  gridContainer: {
    width: 324, // Match grid width
    height: 324, // Match grid height
    position: 'relative', // For positioning the joystick
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
    gap: 15, // Reduced gap for three controls
    flexWrap: 'wrap', // Allow wrapping on smaller screens
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
  },
  thresholdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  thresholdLabel: {
    fontSize: 14,
    marginRight: 10,
  },
  thresholdControls: {
    flexDirection: 'row',
  },
  thresholdButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  notesControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginLeft: 15,
  },
  notesLabel: {
    marginRight: 10,
    fontSize: 16,
  },
});

export default GameScreen;
