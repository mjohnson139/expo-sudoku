import React from 'react';
import { StyleSheet, Text, TouchableOpacity, Modal, View } from 'react-native';
import { useGameContext } from '../../contexts/GameContext';
import { ACTIONS } from '../../contexts/GameContext';

/**
 * Win Modal displayed when player successfully completes a game
 */
const WinModal = () => {
  const { theme, showWinModal, elapsedSeconds, difficulty, score, dispatch } = useGameContext();

  const handleNewGame = () => {
    // Hide the win modal first
    dispatch({ type: ACTIONS.HIDE_WIN_MODAL });
    // Show the menu to let player select a new game
    dispatch({ type: ACTIONS.SHOW_MENU });
  };
  
  // Format time from seconds to mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Format score with thousands separators
  const formatScore = (score) => {
    return score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  // Get difficulty label with first letter capitalized
  const getDifficultyLabel = () => {
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
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
          
          <View style={styles.statsContainer}>
            <Text style={[styles.statsTitle, { color: theme.colors.title }]}>Game Summary</Text>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: theme.colors.title }]}>Score:</Text>
              <Text style={[styles.statValue, { color: theme.colors.title }]}>{formatScore(score)}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: theme.colors.title }]}>Time:</Text>
              <Text style={[styles.statValue, { color: theme.colors.title }]}>{formatTime(elapsedSeconds)}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: theme.colors.title }]}>Difficulty:</Text>
              <Text style={[styles.statValue, { color: theme.colors.title }]}>{getDifficultyLabel()}</Text>
            </View>
          </View>
          
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
    width: 280,
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
  statsContainer: {
    width: '100%',
    marginVertical: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  winButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 16,
  },
  winButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WinModal;