import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useGameContext } from '../contexts/GameContext';
import { ACTIONS } from '../contexts/GameContext';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

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
    isPaused
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

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  return (
    <View style={[styles.toolbar, { borderColor: theme.colors.title }]}> 
      {/* Undo Button */}
      <TouchableOpacity
        style={[
          styles.toolbarButton, 
          { opacity: canUndo ? 1 : 0.5, borderColor: theme.colors.title }
        ]}
        onPress={handleUndo}
        disabled={!canUndo}
        accessibilityLabel="Undo"
      >
        <MaterialCommunityIcons 
          name="undo-variant" 
          size={24} 
          color={theme.colors.title} 
        />
      </TouchableOpacity>
      
      {/* Redo Button - Moved next to Undo */}
      <TouchableOpacity
        style={[
          styles.toolbarButton, 
          { opacity: canRedo ? 1 : 0.5, borderColor: theme.colors.title }
        ]}
        onPress={handleRedo}
        disabled={!canRedo}
        accessibilityLabel="Redo"
      >
        <MaterialCommunityIcons 
          name="redo-variant" 
          size={24} 
          color={theme.colors.title} 
        />
      </TouchableOpacity>
      
      {/* Notes Button */}
      <TouchableOpacity 
        style={[
          styles.toolbarButton, 
          { 
            borderColor: theme.colors.title,
            backgroundColor: notesMode 
              ? styles.toolbarButtonActive.backgroundColor 
              : 'transparent'
          }
        ]} 
        onPress={handleToggleNotesMode}
        accessibilityLabel="Toggle Notes Mode"
      >
        <MaterialCommunityIcons 
          name="pencil" 
          size={24} 
          color={theme.colors.title} 
        />
      </TouchableOpacity>
      
      {/* Pause/Play Button - toggles between icons */}
      <TouchableOpacity 
        style={[
          styles.toolbarButton, 
          { borderColor: theme.colors.title }
        ]} 
        onPress={handlePausePress}
        accessibilityLabel={isPaused ? "Resume Game" : "Pause Game"}
      >
        <MaterialCommunityIcons 
          name={isPaused ? "play" : "pause"} 
          size={24} 
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
    borderColor: '#bbb',
    backgroundColor: '#f5f5f5',
    // Raised effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 4,
    // Always show border, even when disabled
  },
  toolbarButtonActive: {
    backgroundColor: '#e6f2fd', // subtle highlight for active (notes)
  },
});

export default GameToolBar;