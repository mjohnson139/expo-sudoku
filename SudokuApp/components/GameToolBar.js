import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useGameContext } from '../contexts/GameContext';
import { ACTIONS } from '../contexts/GameContext';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Constants for consistent sizes
const ICON_SIZE = 24;

/**
 * GameToolBar component containing game control buttons
 * Includes: undo, notes mode toggle, pause, and redo buttons
 */
const GameToolBar = () => {
  const { 
    theme, 
    notesMode,
    dispatch,
    undoStack,
    redoStack,
    isPaused,
    gameCompleted
  } = useGameContext();

  const handleUndo = () => {
    dispatch({ type: ACTIONS.UNDO });
  };

  const handleRedo = () => {
    dispatch({ type: ACTIONS.REDO });
  };

  const handleToggleNotesMode = () => {
    dispatch({ type: ACTIONS.TOGGLE_NOTES_MODE });
  };
  
  const handlePausePress = () => {
    dispatch({ type: ACTIONS.PAUSE_GAME });
  };

  const canUndo = undoStack.length > 0 && !gameCompleted;
  const canRedo = redoStack.length > 0 && !gameCompleted;

  return (
    <View style={[styles.toolbar, { borderColor: theme.colors.title }]}> 
      {/* Undo Button */}
      <TouchableOpacity
        style={[
          styles.toolbarButton, 
          { 
            opacity: canUndo ? 1 : 0.5, 
            borderColor: theme.colors.title,
            backgroundColor: theme.colors.numberPad.background
          }
        ]}
        onPress={handleUndo}
        disabled={!canUndo}
        accessibilityLabel="Undo"
      >
        <MaterialCommunityIcons 
          name="undo-variant" 
          size={ICON_SIZE} 
          color={theme.colors.title} 
        />
      </TouchableOpacity>
      
      {/* Redo Button - Moved next to Undo */}
      <TouchableOpacity
        style={[
          styles.toolbarButton, 
          { 
            opacity: canRedo ? 1 : 0.5, 
            borderColor: theme.colors.title,
            backgroundColor: theme.colors.numberPad.background
          }
        ]}
        onPress={handleRedo}
        disabled={!canRedo}
        accessibilityLabel="Redo"
      >
        <MaterialCommunityIcons 
          name="redo-variant" 
          size={ICON_SIZE} 
          color={theme.colors.title} 
        />
      </TouchableOpacity>
      
      {/* Notes Button */}
      <TouchableOpacity 
        style={[
          styles.toolbarButton, 
          { 
            opacity: gameCompleted ? 0.5 : 1,
            borderColor: theme.colors.title,
            backgroundColor: notesMode 
              ? theme.colors.numberPad.notesBackground 
              : theme.colors.numberPad.background
          }
        ]} 
        onPress={handleToggleNotesMode}
        disabled={gameCompleted}
        accessibilityLabel="Toggle Notes Mode"
      >
        <MaterialCommunityIcons 
          name="pencil" 
          size={ICON_SIZE} 
          color={theme.colors.title} 
        />
      </TouchableOpacity>
      
      {/* Pause/Play Button - toggles between icons */}
      <TouchableOpacity 
        style={[
          styles.toolbarButton, 
          { 
            opacity: gameCompleted ? 0.5 : 1,
            borderColor: theme.colors.title,
            backgroundColor: theme.colors.numberPad.background
          }
        ]} 
        onPress={handlePausePress}
        disabled={gameCompleted}
        accessibilityLabel={isPaused ? "Resume Game" : "Pause Game"}
      >
        <MaterialCommunityIcons 
          name={isPaused ? "play" : "pause"} 
          size={ICON_SIZE} 
          color={theme.colors.title} 
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    // Space out the buttons
    borderWidth: 0,
    backgroundColor: 'transparent',
    gap: 16, // Add gap between buttons
  },
  toolbarButton: {
    width: 46,
    height: 46,
    borderRadius: 10, // Square with rounded corners
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    // borderColor and backgroundColor now applied from theme in component
    // Raised effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 4,
  },
  // Removed toolbarButtonActive as it's no longer needed - using theme colors directly
});

export default GameToolBar;