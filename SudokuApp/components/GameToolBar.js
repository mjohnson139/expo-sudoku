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
          styles.toolbarButtonLeft, 
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
          styles.toolbarButtonMiddle, 
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
          styles.toolbarButtonRight, 
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
    // Remove border/background from container, let buttons create the bar look
    borderWidth: 0,
    backgroundColor: 'transparent',
    gap: 0,
  },
  toolbarButton: {
    width: 40,
    height: 40,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bbb',
    backgroundColor: '#f5f5f5',
    marginHorizontal: 0,
    // Raised effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 4,
    // Always show border, even when disabled
    // (no opacity or borderColor changes for disabled state)
  },
  toolbarButtonActive: {
    backgroundColor: '#e6f2fd', // subtle highlight for active (notes)
  },
  toolbarButtonLeft: {
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderRightWidth: 0,
  },
  toolbarButtonMiddle: {
    borderRadius: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  toolbarButtonRight: {
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    borderLeftWidth: 0,
  },
});

export default GameToolBar;