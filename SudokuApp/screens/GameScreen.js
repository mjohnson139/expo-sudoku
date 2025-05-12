import React from 'react';
import { View, StyleSheet, Platform, Dimensions, Text } from 'react-native';
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
      {/* Header with menu button, title, theme selector */}
      <GameHeader />

      {/* Top strip with Timer (right) */}
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

      {/* Version number at bottom of screen */}
      <Text style={[styles.versionText, { color: theme.colors.title }]}>
        v{BUILD_NUMBER}
      </Text>

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

// Get responsive grid container size
const getGridContainerSize = () => {
  // Base size for mobile
  const baseSize = 324;

  // For web platform, use responsive sizing based on screen width
  if (Platform.OS === 'web') {
    const { width, height } = Dimensions.get('window');
    const smallerDimension = Math.min(width, height);

    // Limit grid size on web for larger screens
    // On small screens, make it proportionally smaller
    const maxWebSize = 450; // Maximum grid size on web
    const minWebSize = 270; // Minimum grid size on web

    // Calculate the responsive size based on screen dimensions
    const responsiveSize = Math.min(
      maxWebSize,
      Math.max(minWebSize, smallerDimension * 0.7)
    );

    // Round to nearest pixel for clean rendering
    return Math.floor(responsiveSize);
  }

  // Return default size for mobile platforms
  return baseSize;
};

// Get the dimensions based on platform
const gridContainerSize = getGridContainerSize();

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    ...(Platform.OS === 'web' ? {
      paddingTop: 20, // Add extra padding on web for better layout
      paddingBottom: 20,
      maxWidth: 600, // Limit width on web for large screens
      marginHorizontal: 'auto', // Center on web
    } : {})
  },
  gridContainer: {
    width: gridContainerSize,
    height: gridContainerSize,
  },
  versionText: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 10,
    marginBottom: 5,
  }
});

export default GameScreen;
