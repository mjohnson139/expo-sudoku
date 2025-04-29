import React from 'react';
import { StyleSheet, Text, TouchableOpacity, Modal, View } from 'react-native';
import { useGameContext } from '../../contexts/GameContext';
import { ACTIONS } from '../../contexts/GameContext';

/**
 * Win Modal displayed when player successfully completes a game
 */
const WinModal = () => {
  const { theme, showWinModal, dispatch } = useGameContext();

  const handleNewGame = () => {
    // Hide the win modal first
    dispatch({ type: ACTIONS.HIDE_WIN_MODAL });
    // Show the menu to let player select a new game
    dispatch({ type: ACTIONS.SHOW_MENU });
  };

  return (
    <Modal 
      visible={showWinModal} 
      transparent 
      animationType="slide"
    >
      <View style={styles.winOverlay}>
        <View style={[styles.winBox, { backgroundColor: theme.colors.numberPad.background }]}>            
          <Text style={[styles.winText, { color: theme.colors.title }]}>🎉 Congratulations! 🎉</Text>
          <TouchableOpacity 
            style={[styles.winButton, { backgroundColor: theme.colors.numberPad.background }]} 
            onPress={handleNewGame}
          >
            <Text style={[styles.winButtonText, { color: theme.colors.numberPad.text }]}>New Game</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
});

export default WinModal;