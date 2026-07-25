import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
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
import useAppStateListener from '../hooks/useAppStateListener';
import useBoardSize from '../hooks/useBoardSize';

/**
 * Main game screen for Sudoku
 * Uses GameContext for state management
 */
const GameScreenContent = ({ onExitToHub }) => {
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
    showBuildNotes,
    gameCompleted
  } = useGameContext();

  // Use custom hook to handle app state changes
  useAppStateListener();
  
  // Shared with Fungiku's board (hooks/useBoardSize.js) — same numbers as before
  const gridContainerSize = useBoardSize();

  /**
   * Stable ‑ re‑created only when the game is completed (rare).
   * This means the Grid sees the *same* onCellPress during
   * routine SELECT_CELL dispatches.
   */
  const handleCellPress = useCallback((row, col) => {
    // Don't allow cell selection if game is completed
    if (gameCompleted) return;

    dispatch({
      type: ACTIONS.SELECT_CELL,
      payload: { row, col }
    });
  }, [dispatch, gameCompleted]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header with home button, menu button, title, theme selector */}
        <GameHeader onHomePress={onExitToHub} />

        {/* Top strip with Timer (right) */}
        <View style={{ width: gridContainerSize }}>
          <GameTopStrip style={{ marginTop: 12 }} />
        </View>

        {/* Game board */}
        <View style={{
          width: gridContainerSize,
          height: gridContainerSize
        }}>
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
        version={appJson.expo.version}
      />
    </View>
  );
};

/**
 * GameScreen wrapper that provides the GameProvider context
 *
 * Leaving for the hub unmounts this screen, and that is what pauses the game:
 * the timer interval lives in GameProvider, so it stops with the screen, and
 * `timerActive` is never persisted — a restored game always comes back paused
 * (see utils/storage.js). The clock therefore cannot advance while the player is
 * on the hub, and the board is waiting where they left it when they return.
 *
 * @param {Function} onExitToHub - provided by the router in App.js.
 */
const GameScreen = ({ onExitToHub }) => {
  return (
    <GameProvider>
      <GameScreenContent onExitToHub={onExitToHub} />
    </GameProvider>
  );
};

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
  }
});

export default GameScreen;
