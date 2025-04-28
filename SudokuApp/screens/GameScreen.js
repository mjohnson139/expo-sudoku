import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Switch, Modal, Animated } from 'react-native';
import Grid from '../components/Grid';
import NumberPad from '../components/NumberPad';
import BuildNotes from '../components/BuildNotes';
import DebugCrosshair from '../components/DebugCrosshair';
import THEMES from '../utils/themes';
import { generateSudoku, isCorrectValue as checkCorrectValue } from '../utils/boardFactory';
import appJson from '../app.json';

// Update build number
const BUILD_NUMBER = appJson.expo.version;

// Empty initial Sudoku board
const emptyBoard = Array.from({ length: 9 }, () => Array(9).fill(0));

// --- Undo/Redo Action Schema ---
// Each action is an object:
// {
//   type: 'setValue' | 'clearValue' | 'addNote' | 'removeNote',
//   cellKey: string, // e.g. 'row-col'
//   previousValue: number, // for value changes
//   newValue: number,      // for value changes
//   previousNotes: number[] | undefined, // for notes changes
//   newNotes: number[] | undefined      // for notes changes
// }

const GameScreen = () => {
  const [board, setBoard] = useState(emptyBoard);
  const [solutionBoard, setSolutionBoard] = useState(emptyBoard);
  // Store puzzle's initial board to identify immutable cells
  const [initialBoardState, setInitialBoardState] = useState(emptyBoard);
  const [selectedCell, setSelectedCell] = useState(null);
  const [initialCells, setInitialCells] = useState([]);
  const [currentThemeName, setCurrentThemeName] = useState('classic');
  const [theme, setTheme] = useState(THEMES.classic);
  const [showBuildNotes, setShowBuildNotes] = useState(false);
  
  // State for feedback feature
  const [showFeedback, setShowFeedback] = useState(false);
  const [cellFeedback, setCellFeedback] = useState({});

  // State for notes feature
  const [notesMode, setNotesMode] = useState(false);
  const [cellNotes, setCellNotes] = useState({});

  // State for menu modal
  const [showMenu, setShowMenu] = useState(true);
  
  // Track number of filled cells for win detection
  const [filledCount, setFilledCount] = useState(0);
  // State for win modal
  const [showWinModal, setShowWinModal] = useState(false);

  // Undo/Redo stacks
  const [undoStack, setUndoStack] = useState([]); // Array of action objects
  const [redoStack, setRedoStack] = useState([]); // Array of action objects

  // Animation for menu modal
  const [menuAnim] = useState(new Animated.Value(0));
  useEffect(() => {
    if (showMenu) {
      Animated.timing(menuAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(menuAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showMenu]);

  // Initialize immutable cells when puzzle starts or initial board changes
  useEffect(() => {
    const initialPositions = getInitialCells(initialBoardState);
    setInitialCells(initialPositions);
  }, [initialBoardState]);
  
  // Win detection: only check when board is full
  useEffect(() => {
    if (filledCount === 81) {
      let won = true;
      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
          if (board[i][j] !== solutionBoard[i][j]) {
            won = false;
            break;
          }
        }
        if (!won) break;
      }
      if (won) {
        setShowWinModal(true);
      }
    }
  }, [filledCount, board, solutionBoard]);

  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef(null);

  // Start/stop timer based on menu and win state
  useEffect(() => {
    if (!showMenu && !showWinModal) {
      // Start timer
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setElapsedSeconds((s) => s + 1);
        }, 1000);
      }
    } else {
      // Pause timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [showMenu, showWinModal]);

  // Format timer as mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Memoize the handleCellPress function to improve performance
  const handleCellPress = useCallback((row, col) => {
    // Allow selecting any cell, but will prevent modifying initial cells
    setSelectedCell({ row, col });
  }, []);

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
      let actionType;
      if (currentNotes.includes(num)) {
        // Remove the number from notes
        newNotes = currentNotes.filter(n => n !== num);
        actionType = 'removeNote';
      } else {
        // Add the number to notes
        newNotes = [...currentNotes, num];
        actionType = 'addNote';
      }
      // Record action for undo
      setUndoStack(prev => [
        ...prev,
        {
          type: actionType,
          cellKey,
          previousNotes: currentNotes,
          newNotes,
        }
      ]);
      // Clear redo stack
      setRedoStack([]);
      // Update notes state
      const newCellNotes = { ...cellNotes };
      if (newNotes.length === 0) {
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
      // Record action for undo
      setUndoStack(prev => [
        ...prev,
        {
          type: newValue === 0 ? 'clearValue' : 'setValue',
          cellKey,
          previousValue: currentValue,
          newValue,
          previousNotes: cellNotes[cellKey],
          newNotes: undefined,
        }
      ]);
      // Clear redo stack
      setRedoStack([]);
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
      // Update filled cell count for win detection
      const prevCount = filledCount;
      let newCount = prevCount;
      if (currentValue === 0 && newValue !== 0) {
        newCount = prevCount + 1;
      } else if (currentValue !== 0 && newValue === 0) {
        newCount = prevCount - 1;
      }
      setFilledCount(newCount);
      // Check if the value is correct and update feedback if feedback is enabled
      if (showFeedback && newValue !== 0) {
        const isCorrect = checkCorrectValue(solutionBoard, selectedCell.row, selectedCell.col, newValue);
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

  // Undo last action
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, lastAction]);

    const { type, cellKey, previousValue, newValue, previousNotes, newNotes } = lastAction;
    const [row, col] = cellKey.split('-').map(Number);

    if (type === 'setValue' || type === 'clearValue') {
      // Restore previous value
      setBoard(prevBoard => {
        const newBoard = [...prevBoard];
        newBoard[row] = [...newBoard[row]];
        newBoard[row][col] = previousValue;
        return newBoard;
      });
      // Restore previous notes
      setCellNotes(prevNotes => {
        const updated = { ...prevNotes };
        if (previousNotes && previousNotes.length > 0) {
          updated[cellKey] = previousNotes;
        } else {
          delete updated[cellKey];
        }
        return updated;
      });
      // Remove feedback for this cell if needed
      setCellFeedback(prevFeedback => {
        const updated = { ...prevFeedback };
        delete updated[cellKey];
        return updated;
      });
    } else if (type === 'addNote' || type === 'removeNote') {
      // Restore previous notes
      setCellNotes(prevNotes => {
        const updated = { ...prevNotes };
        if (previousNotes && previousNotes.length > 0) {
          updated[cellKey] = previousNotes;
        } else {
          delete updated[cellKey];
        }
        return updated;
      });
    }
  };

  // Redo last undone action
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const lastAction = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, lastAction]);

    const { type, cellKey, previousValue, newValue, previousNotes, newNotes } = lastAction;
    const [row, col] = cellKey.split('-').map(Number);

    if (type === 'setValue' || type === 'clearValue') {
      // Reapply new value
      setBoard(prevBoard => {
        const newBoard = [...prevBoard];
        newBoard[row] = [...newBoard[row]];
        newBoard[row][col] = newValue;
        return newBoard;
      });
      // Remove notes for this cell if value is set
      setCellNotes(prevNotes => {
        const updated = { ...prevNotes };
        if (newValue !== 0) {
          delete updated[cellKey];
        }
        return updated;
      });
      // Update feedback if enabled
      if (showFeedback && newValue !== 0) {
        setCellFeedback(prevFeedback => {
          const updated = { ...prevFeedback };
          updated[cellKey] = checkCorrectValue(solutionBoard, row, col, newValue);
          return updated;
        });
      } else if (showFeedback && newValue === 0) {
        setCellFeedback(prevFeedback => {
          const updated = { ...prevFeedback };
          delete updated[cellKey];
          return updated;
        });
      }
    } else if (type === 'addNote' || type === 'removeNote') {
      // Reapply new notes
      setCellNotes(prevNotes => {
        const updated = { ...prevNotes };
        if (newNotes && newNotes.length > 0) {
          updated[cellKey] = newNotes;
        } else {
          delete updated[cellKey];
        }
        return updated;
      });
    }
  };

  // Toggle feedback feature
  const toggleFeedback = (value) => {
    setShowFeedback(value);
    if (!value) {
      // Clear feedback when turning off
      setCellFeedback({});
    } else {
      // Re-check all user-entered cells against the generated solution
      const newFeedback = {};
      board.forEach((row, rowIndex) => {
        row.forEach((value, colIndex) => {
          const cellKey = `${rowIndex}-${colIndex}`;
          // Only check user-entered values (not initial or empty)
          if (!initialCells.includes(cellKey) && value !== 0) {
            newFeedback[cellKey] = checkCorrectValue(solutionBoard, rowIndex, colIndex, value);
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

  // Toggle between regular and notes mode
  const toggleNotesMode = () => {
    setNotesMode(!notesMode);
  };

  // Helper to get initial cells for a board
  const getInitialCells = (board) => {
    const initialPositions = [];
    board.forEach((row, rowIndex) => {
      row.forEach((value, colIndex) => {
        if (value !== 0) {
          initialPositions.push(`${rowIndex}-${colIndex}`);
        }
      });
    });
    return initialPositions;
  };

  // Start a new game with selected difficulty
  const startNewGame = (difficulty) => {
    // Generate puzzle and solution using boardFactory
    const { board: newBoard, solution } = generateSudoku(difficulty);
    // Set up puzzle initial state, board, and solution
    setInitialBoardState(newBoard);
    setBoard(newBoard);
    setSolutionBoard(solution);
    setSelectedCell(null);
    setCellNotes({});
    setCellFeedback({});
    setShowFeedback(false);
    setNotesMode(false);
    setShowMenu(false);
    // Initialize filled count based on initial clues and reset win state
    const initialCount = newBoard.flat().filter(v => v !== 0).length;
    setFilledCount(initialCount);
    setShowWinModal(false);
    setElapsedSeconds(0);
  };
  // Debug: fill board except last cell (for testing win detection)
  const debugFillBoard = () => {
    // Fill all user-editable cells (original blanks) except one final blank
    // Start from the initial puzzle state
    const newBoard = initialBoardState.map(row => [...row]);
    // Find all blank positions in the initial puzzle
    const blanks = [];
    initialBoardState.forEach((row, r) => {
      row.forEach((v, c) => {
        if (v === 0) blanks.push({ r, c });
      });
    });
    if (blanks.length === 0) return;
    // Leave the last blank unfilled
    const last = blanks[blanks.length - 1];
    // Fill all other blanks with the solution values
    blanks.forEach(({ r, c }) => {
      if (r === last.r && c === last.c) return;
      newBoard[r][c] = solutionBoard[r][c];
    });
    // Apply board and reset related state
    setBoard(newBoard);
    setCellNotes({});
    setCellFeedback({});
    setShowFeedback(false);
    setNotesMode(false);
    setShowMenu(false);
    // Clear undo/redo history
    setUndoStack([]);
    setRedoStack([]);
    // Compute filled count: initial clues + filled blanks
    const initialCount = initialBoardState.flat().filter(v => v !== 0).length;
    const filledBlanks = blanks.length - 1;
    setFilledCount(initialCount + filledBlanks);
    setShowWinModal(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>  
      {/* Debug Crosshair Overlay - always show for testing purposes */}
      {/* <DebugCrosshair /> */}
      {/* Game Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
      >
        {/* Blurred/Dimmed background overlay */}
        <Animated.View
          style={{
            ...styles.menuOverlay,
            opacity: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
          }}
        >
          {/* Animated element (can be replaced with Lottie or other animation) */}
          <Animated.View
            style={{
              transform: [{ scale: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
              marginBottom: 16,
            }}
          >
            {/* Placeholder for animation: replace with LottieView for advanced animation */}
            <Text style={{ fontSize: 48, textAlign: 'center' }}>⏸️</Text>
          </Animated.View>
          <View style={[styles.menuBox, { backgroundColor: theme.colors.numberPad.background, borderColor: theme.colors.numberPad.border }]}> 
            <TouchableOpacity style={styles.menuCloseButton} onPress={() => setShowMenu(false)}>
              <Text style={styles.menuCloseText}>✕</Text>
            </TouchableOpacity>
            {/* Resume Button */}
            <TouchableOpacity style={styles.menuButton} onPress={() => setShowMenu(false)}>
              <Text style={styles.menuButtonEmoji}>▶️</Text>
              <Text style={styles.menuButtonText}>Resume</Text>
            </TouchableOpacity>
            <Text style={[styles.menuTitle, { color: theme.colors.title }]}>🧩 Sudoku</Text>
            <Text style={[styles.menuSubtitle, { color: theme.colors.title }]}>Select Difficulty</Text>
            <TouchableOpacity style={[styles.menuButton, styles.menuButtonEasy]} onPress={() => startNewGame('easy')}>
              <Text style={styles.menuButtonEmoji}>😊</Text>
              <Text style={styles.menuButtonText}>Easy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuButton, styles.menuButtonChallenge]} onPress={() => startNewGame('medium')}>
              <Text style={styles.menuButtonEmoji}>😐</Text>
              <Text style={styles.menuButtonText}>Medium</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuButton, styles.menuButtonHard]} onPress={() => startNewGame('hard')}>
              <Text style={styles.menuButtonEmoji}>😎</Text>
              <Text style={styles.menuButtonText}>Hard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuButton, styles.menuButtonHard]} onPress={() => startNewGame('expert')}>
              <Text style={styles.menuButtonEmoji}>😈</Text>
              <Text style={styles.menuButtonText}>Expert</Text>
            </TouchableOpacity>
            {__DEV__ && (
              <TouchableOpacity style={[styles.menuButton, { backgroundColor: '#d0d0d0' }]} onPress={debugFillBoard}>
                <Text style={styles.menuButtonEmoji}>🐞</Text>
                <Text style={styles.menuButtonText}>Debug Fill</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </Modal>
      
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={[styles.menuIcon, { borderColor: theme.colors.title }]}
            onPress={() => setShowMenu(true)}
          >
            <Text style={{ color: theme.colors.title, fontSize: 18 }}>☰</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={[styles.title, { color: theme.colors.title }]}>Sudoku</Text>
          </View>
          <TouchableOpacity 
            style={[styles.buildButton, { borderColor: theme.colors.title }]} 
            onPress={toggleBuildNotes}
          >
            <Text style={[styles.buildNumber, { color: theme.colors.title }]}>Build {BUILD_NUMBER} ℹ️</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Timer row, now just above the board, with pause button */}
      <View style={styles.timerRow}>
        <Text style={styles.timerText}>{formatTime(elapsedSeconds)}</Text>
        <TouchableOpacity
          style={styles.pauseButton}
          onPress={() => setShowMenu(true)}
          accessibilityLabel="Pause Game"
        >
          <Text style={{ color: theme.colors.title, fontSize: 18 }}>⏸️</Text>
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
          cellNotes={cellNotes}
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
        </View>
      </View>
      
      <NumberPad 
        onSelectNumber={handleNumberSelect} 
        toggleNotesMode={toggleNotesMode}
        theme={theme} 
        board={board}
        selectedCell={selectedCell}
        notesMode={notesMode}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
      />

      {/* Build Notes Component */}
      <BuildNotes 
        version={BUILD_NUMBER}
        isVisible={showBuildNotes} 
        onClose={() => setShowBuildNotes(false)} 
        theme={theme}
      />
      {/* Win Modal */}
      <Modal visible={showWinModal} transparent animationType="slide">
        <View style={styles.winOverlay}>
          <View style={[styles.winBox, { backgroundColor: theme.colors.numberPad.background }]}>            
            <Text style={[styles.winText, { color: theme.colors.title }]}>🎉 Congratulations! 🎉</Text>
            <TouchableOpacity style={[styles.winButton, { backgroundColor: theme.colors.numberPad.background }]} onPress={() => { setShowWinModal(false); setShowMenu(true); }}>
              <Text style={[styles.winButtonText, { color: theme.colors.numberPad.text }]}>New Game</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'center',
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    minHeight: 48,
    marginBottom: 8,
    gap: 0,
  },
  headerTitleBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
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
  menuIcon: {
    marginRight: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  gridContainer: {
    width: 324, // Match grid width
    height: 324, // Match grid height
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
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  menuBox: {
    width: 260,
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  menuCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
  },
  menuCloseText: {
    fontSize: 18,
    color: '#333',
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  menuSubtitle: {
    fontSize: 16,
    marginBottom: 18,
  },
  menuButton: {
    width: 180,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  menuButtonEasy: {
    backgroundColor: '#d4edda',
  },
  menuButtonChallenge: {
    backgroundColor: '#ffeeba',
  },
  menuButtonHard: {
    backgroundColor: '#f8d7da',
  },
  menuButtonEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  menuButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  undoRedoButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#bbb',
    backgroundColor: '#f5f5f5',
    marginLeft: 8,
  },
  undoRedoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  // Win modal styles
  winOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  winBox: {
    width: 240,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  winText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  winButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 8,
  },
  winButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  timerRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    minHeight: 32,
    flexDirection: 'row',
    gap: 0,
  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#888',
    width: 64,
    textAlign: 'center',
    letterSpacing: 1,
    marginRight: 8,
  },
  pauseButton: {
    padding: 4,
  },
});

export default GameScreen;
