// filepath: /Users/matthewjohnson/dev/expo-sudoku/SudokuApp/components/modals/PauseModal.js
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, Modal, Animated, View } from 'react-native';
import { useGameContext, ACTIONS } from '../../contexts/GameContext';

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
  const [floatAnim] = React.useState(new Animated.Value(0));
  
  // Start floating animation when paused
  const startFloatingAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        })
      ])
    ).start();
  };
  
  React.useEffect(() => {
    // Only animate if the game is paused and not completed
    if (isPaused && !gameCompleted) {
      Animated.timing(pauseAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        // Start floating animation after main animation completes
        startFloatingAnimation();
      });
    } else {
      Animated.timing(pauseAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      // Stop floating animation
      floatAnim.setValue(0);
    }
  }, [isPaused, gameCompleted]);

  const handleResume = () => {
    dispatch({ type: ACTIONS.RESUME_GAME });
  };

  const handleQuit = () => {
    dispatch({ type: ACTIONS.QUIT_GAME });
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
        {/* Add floating pause icon animation */}
        <Animated.Text
          style={{
            fontSize: 70,
            marginBottom: 20,
            opacity: pauseAnim,
            transform: [
              // Initial entrance animation
              { translateY: pauseAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
              { scale: pauseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
              // Continuous floating animation
              { translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) },
              { rotate: floatAnim.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', '5deg'] }) }
            ]
          }}
        >
          ⏸️
        </Animated.Text>
        
        <Animated.View
          style={{
            transform: [{ scale: pauseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
          }}
        >
          <View style={[styles.pauseBox, { backgroundColor: theme.colors.numberPad.background, borderColor: theme.colors.numberPad.border }]}> 
            <Text style={[styles.pauseTitle, { color: theme.colors.title }]}>Game Paused</Text>
            
            {/* Resume Button - with subtle animation */}
            <Animated.View style={{
              opacity: pauseAnim,
              transform: [
                { translateX: pauseAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) },
              ]
            }}>
              <TouchableOpacity 
                style={[styles.pauseButton, styles.resumeButton]} 
                onPress={handleResume}
              >
                <Text style={styles.pauseButtonEmoji}>▶️</Text>
                <Text style={styles.pauseButtonText}>Resume</Text>
              </TouchableOpacity>
            </Animated.View>
            
            {/* New Game Button - with subtle animation */}
            <Animated.View style={{
              opacity: pauseAnim,
              transform: [
                { translateX: pauseAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
              ]
            }}>
              <TouchableOpacity 
                style={[styles.pauseButton, styles.newGameButton]} 
                onPress={handleNewGame}
              >
                <Text style={styles.pauseButtonEmoji}>🏠</Text>
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