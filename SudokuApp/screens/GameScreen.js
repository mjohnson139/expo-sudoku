import React from 'react';
import { View, StyleSheet } from 'react-native';
import Grid from '../components/Grid';
import NumberPad from '../components/NumberPad';
import BuildNotes from '../components/BuildNotes';
import GameHeader from '../components/GameHeader';
import GameTimer from '../components/GameTimer';
import GameToolBar from '../components/GameToolBar';
import GameMenuModal from '../components/modals/GameMenuModal';
import WinModal from '../components/modals/WinModal';
import { GameProvider, useGameContext } from '../contexts/GameContext';

/**
 * Main game screen for Sudoku
 * Uses GameContext for state management
 */
const GameScreenContent = () => {
  const { 
    board, 
    selectedCell, 
    initialCells, 
    theme, 
    showFeedback, 
    cellFeedback, 
    cellNotes, 
    dispatch,
    handleNumberSelect,
    undoStack,
    redoStack,
    showBuildNotes
  } = useGameContext();

  const handleCellPress = (row, col) => {
    dispatch({ 
      type: 'SELECT_CELL', 
      payload: { row, col } 
    });
  };

  const handleUndo = () => {
    dispatch({ type: 'UNDO' });
  };

  const handleRedo = () => {
    dispatch({ type: 'REDO' });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header with menu button, title, build info */}
      <GameHeader />
      
      {/* Timer with pause button */}
      <GameTimer />
      
      {/* Game board */}
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
      
      {/* Game controls toolbar (above number pad) */}
      <GameToolBar />
      
      {/* Number pad */}
      <NumberPad 
        onSelectNumber={handleNumberSelect} 
        theme={theme} 
        board={board}
        selectedCell={selectedCell}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
      />
      
      {/* Modals */}
      <GameMenuModal />
      <WinModal />
      
      {/* Build notes */}
      <BuildNotes 
        isVisible={showBuildNotes} 
        onClose={() => dispatch({ type: 'HIDE_BUILD_NOTES' })} 
        theme={theme}
      />
    </View>
  );
};

/**
 * GameScreen wrapper that provides the GameProvider context
 */
const GameScreen = () => {
  return (
    <GameProvider>
      <GameScreenContent />
    </GameProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  gridContainer: {
    width: 324, // Match grid width
    height: 324, // Match grid height
  },
});

export default GameScreen;
