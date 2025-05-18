// filepath: /Users/matthewjohnson/dev/expo-sudoku/SudokuApp/components/modals/PauseModal.js
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, Modal, Animated, View } from 'react-native';
import { useGameContext, ACTIONS } from '../../contexts/GameContext';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Constants for consistent sizes
const ICON_SIZE = 24;

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
      // Animate in
      Animated.timing(pauseAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      // Animate out
      Animated.timing(pauseAnim, {
        toValue: 0,
        duration: 300, // Slightly faster exit animation
        useNativeDriver: true,
      }).start();
    }
  }, [isPaused, gameCompleted]);

  const handleResume = () => {
    dispatch({ type: ACTIONS.RESUME_GAME });
  };

  const handleNewGame = () => {
    dispatch({ type: ACTIONS.NEW_GAME });
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
            // Both enter and exit animations for the pause box
            opacity: pauseAnim,
            transform: [
              { scale: pauseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
              { translateY: pauseAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }
            ],
          }}
        >
          <View style={[styles.pauseBox, { backgroundColor: theme.colors.numberPad.background, borderColor: theme.colors.numberPad.border }]}> 
            <Text style={[styles.pauseTitle, { color: theme.colors.title }]}>Game Paused</Text>
            
            {/* Resume Button - with enter/exit animation */}
            <Animated.View style={{
              opacity: pauseAnim,
              transform: [
                // The button slides in from left and out to left
                { translateX: pauseAnim.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) },
              ]
            }}>
              <TouchableOpacity 
                style={[styles.pauseButton, styles.resumeButton]} 
                onPress={handleResume}
              >
                <MaterialCommunityIcons 
                  name="play" 
                  size={ICON_SIZE}
                  color="#333" 
                  style={styles.pauseButtonIcon}
                />
                <Text style={styles.pauseButtonText}>Resume</Text>
              </TouchableOpacity>
            </Animated.View>
            
            {/* New Game Button - with enter/exit animation */}
            <Animated.View style={{
              opacity: pauseAnim,
              transform: [
                // The button slides in from right and out to right
                { translateX: pauseAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
              ]
            }}>
              <TouchableOpacity 
                style={[styles.pauseButton, styles.newGameButton]} 
                onPress={handleNewGame}
              >
                <MaterialCommunityIcons 
                  name="home" 
                  size={ICON_SIZE}
                  color="#333" 
                  style={styles.pauseButtonIcon}
                />
                <Text style={styles.pauseButtonText}>New Game</Text>
              </TouchableOpacity>
            </Animated.View>
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
  newGameButton: {
    backgroundColor: '#f8d7da',
  },
  pauseButtonIcon: {
    marginRight: 8,
  },
  pauseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});

export default PauseModal;