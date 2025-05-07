import React from 'react';
import { View, StyleSheet } from 'react-native';
import Grid from '../components/Grid';
import NumberPad from '../components/NumberPad';
import BuildNotes from '../components/BuildNotes';
import GameHeader from '../components/GameHeader';
import GameTopStrip from '../components/GameTopStrip';
import GameOptions from '../components/GameOptions';
import GameToolBar from '../components/GameToolBar';
import GameMenuModal from '../components/modals/GameMenuModal';
import PauseModal from '../components/modals/PauseModal';
import WinModal from '../components/modals/WinModal';
import { GameProvider, useGameContext, ACTIONS } from '../contexts/GameContext';
import appJson from '../app.json';

// Get build number from app.json
const BUILD_NUMBER = appJson.expo.version;

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
    notesMode,
    showBuildNotes
  } = useGameContext();

  const handleCellPress = (row, col) => {
    dispatch({ 
      type: ACTIONS.SELECT_CELL, 
      payload: { row, col } 
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header with menu button, title, build info */}
      <GameHeader />
      
      {/* Top strip with Theme Selector (left) and Timer (right) */}
      <GameTopStrip />
      
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
      
      {/* Game options (feedback toggle and theme selector) */}
      <GameOptions />
      
      {/* Game toolbar (undo, notes toggle, redo) */}
      <GameToolBar />
      
      {/* Number pad */}
      <NumberPad 
        onSelectNumber={handleNumberSelect} 
        theme={theme} 
        board={board}
        selectedCell={selectedCell}
        notesMode={notesMode}
      />
      
      {/* Modals */}
      <GameMenuModal />
      <PauseModal />
      <WinModal />
      
      {/* Build notes */}
      <BuildNotes 
        isVisible={showBuildNotes} 
        onClose={() => dispatch({ type: ACTIONS.HIDE_BUILD_NOTES })} 
        theme={theme}
        version={BUILD_NUMBER} // Add the version prop
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
