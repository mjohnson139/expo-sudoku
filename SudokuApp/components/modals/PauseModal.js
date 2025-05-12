// filepath: /Users/matthewjohnson/dev/expo-sudoku/SudokuApp/components/modals/PauseModal.js
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, Modal, Animated, View } from 'react-native';
import { useGameContext } from '../../contexts/GameContext';

/**
 * Pause Modal that appears when the game is paused
 * Provides options to resume the game or quit to the menu
 */
const PauseModal = () => {
  const {
    theme,
    isPaused,
    gameCompleted,
    dispatch,
  } = useGameContext();

  // Animation for pause modal
  const [pauseAnim] = React.useState(new Animated.Value(0));
  
  React.useEffect(() => {
    // Only animate if the game is paused and not completed
    if (isPaused && !gameCompleted) {
      Animated.timing(pauseAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(pauseAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isPaused, gameCompleted]);

  const handleResume = () => {
    dispatch({ type: 'RESUME_GAME' });
  };

  const handleQuit = () => {
    dispatch({ type: 'QUIT_GAME' });
  };

  return (
    <Modal
      visible={isPaused && !gameCompleted}
      transparent
      animationType="fade"
    >
      {/* Blurred/Dimmed background overlay */}
      <Animated.View
        style={{
          ...styles.pauseOverlay,
          opacity: pauseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
        }}
      >
        <Animated.View
          style={{
            transform: [{ scale: pauseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
          }}
        >
          <View style={[styles.pauseBox, { backgroundColor: theme.colors.numberPad.background, borderColor: theme.colors.numberPad.border }]}> 
            <Text style={[styles.pauseTitle, { color: theme.colors.title }]}>Game Paused</Text>
            
            {/* Resume Button */}
            <TouchableOpacity 
              style={[styles.pauseButton, styles.resumeButton]} 
              onPress={handleResume}
            >
              <Text style={styles.pauseButtonEmoji}>▶️</Text>
              <Text style={styles.pauseButtonText}>Resume</Text>
            </TouchableOpacity>
            
            {/* Quit Button */}
            <TouchableOpacity 
              style={[styles.pauseButton, styles.quitButton]} 
              onPress={handleQuit}
            >
              <Text style={styles.pauseButtonEmoji}>🏠</Text>
              <Text style={styles.pauseButtonText}>Quit Game</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  pauseOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  pauseBox: {
    width: 260,
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  pauseTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  pauseButton: {
    width: 180,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  resumeButton: {
    backgroundColor: '#d4edda',
  },
  quitButton: {
    backgroundColor: '#f8d7da',
  },
  pauseButtonEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  pauseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});

export default PauseModal;