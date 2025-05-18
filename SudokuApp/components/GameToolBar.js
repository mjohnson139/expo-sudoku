import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useGameContext } from '../contexts/GameContext';
import { ACTIONS } from '../contexts/GameContext';

/**
 * GameToolBar component containing game control buttons
 * Includes: undo, notes mode toggle, and redo buttons
 */
const GameToolBar = () => {
  const { 
    theme, 
    notesMode,
    dispatch,
    undoStack,
    redoStack
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

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  return (
    <View style={[styles.toolbar, { borderColor: theme.colors.title, backgroundColor: theme.colors.numberPad.background }]}> 
      {/* Undo Button */}
      <TouchableOpacity
        style={[
          styles.toolbarButton, 
          { opacity: canUndo ? 1 : 0.5, borderColor: theme.colors.title }
        ]}
        onPress={handleUndo}
        disabled={!canUndo}
      >
        <Text style={{ color: theme.colors.title, fontSize: 22, fontWeight: 'bold' }}>↶</Text>
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
      >
        <Text style={{ color: theme.colors.title, fontSize: 16 }}>✏️</Text>
      </TouchableOpacity>
      
      {/* Redo Button */}
      <TouchableOpacity
        style={[
          styles.toolbarButton, 
          { opacity: canRedo ? 1 : 0.5, borderColor: theme.colors.title }
        ]}
        onPress={handleRedo}
        disabled={!canRedo}
      >
        <Text style={{ color: theme.colors.title, fontSize: 22, fontWeight: 'bold' }}>↷</Text>
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