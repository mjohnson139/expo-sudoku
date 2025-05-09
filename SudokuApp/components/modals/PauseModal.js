// filepath: /Users/matthewjohnson/dev/expo-sudoku/SudokuApp/components/modals/PauseModal.js
import React from 'react';
import { 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  Modal, 
  Animated, 
  View,
  BackHandler
} from 'react-native';
import { useGameContext } from '../../contexts/GameContext';

/**
 * Pause Modal that appears when the game is paused
 * Provides options to resume the game or quit to the menu
 */
const PauseModal = () => {
  const { 
    theme,
    isPaused,
    dispatch,
  } = useGameContext();

  // Animation for pause modal
  const [pauseAnim] = React.useState(new Animated.Value(0));
  const animationRef = React.useRef(null);
  
  // Add safety timeout to auto-resume if stuck
  React.useEffect(() => {
    // Check if we're coming back from background or in cooldown period
    if ((global.appResumedFromBackground || global.justResumedFromBackground) && isPaused) {
      console.log('App resumed from background or in cooldown period and paused - setting safety timeout');
      // Set a timeout to force resume if UI is stuck
      const timeoutId = setTimeout(() => {
        console.log('Safety timeout triggered - forcing resume');
        dispatch({ type: 'RESUME_GAME' });
        global.appResumedFromBackground = false;
      }, 500); // Short timeout to help if UI is stuck
      
      return () => clearTimeout(timeoutId);
    }
  }, [dispatch, isPaused]);
  
  // Add BackHandler for Android to ensure we can always resume
  React.useEffect(() => {
    if (isPaused) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        dispatch({ type: 'RESUME_GAME' });
        return true; // Prevent default back behavior
      });
      
      return () => backHandler.remove();
    }
  }, [isPaused, dispatch]);
  
  // Animation effect
  React.useEffect(() => {
    // Cancel any running animation
    if (animationRef.current) {
      animationRef.current.stop();
    }
    
    if (isPaused) {
      // Run open animation
      animationRef.current = Animated.timing(pauseAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false, // Changed to false for more reliable state
      });
      animationRef.current.start();
    } else {
      // Run close animation
      animationRef.current = Animated.timing(pauseAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false, // Changed to false for more reliable state
      });
      animationRef.current.start();
    }
    
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [isPaused, pauseAnim]);

  const handleResume = () => {
    // Allow the game to be resumed
    dispatch({ type: 'RESUME_GAME' });
  };

  const handleQuit = () => {
    // Quit to main menu
    dispatch({ type: 'QUIT_GAME' });
  };
  
  // Force unpause if the modal is stuck (helpful after background/foreground transition)
  const handleOverlayPress = () => {
    // Only handle overlay press in dev mode (for debugging) or as a safety measure
    if (__DEV__ || global.appResumedFromBackground) {
      console.log('Force resuming game from overlay press');
      dispatch({ type: 'RESUME_GAME' });
      // Reset the app resumed flag if it was set
      if (global.appResumedFromBackground) {
        global.appResumedFromBackground = false;
      }
    }
  };

  return (
    <Modal
      visible={isPaused}
      transparent
      animationType="none" // Changed from "fade" to avoid animation conflicts
      onRequestClose={handleResume} // Add hardware back button handler
      statusBarTranslucent={true}
      supportedOrientations={['portrait', 'landscape']} // Support orientation changes
    >
      {/* Touchable area that covers the entire screen */}
      <TouchableOpacity 
        activeOpacity={1}
        style={styles.safetyTouchable}
        onPress={handleOverlayPress}
      >
        {/* Blurred/Dimmed background overlay */}
        <Animated.View
          style={{
            ...styles.pauseOverlay,
            opacity: pauseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
          }}
          pointerEvents="box-none" // Allow touch events to pass through
        >
        <Animated.View
          style={{
            transform: [{ scale: pauseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
          }}
        >
          <View style={[styles.pauseBox, { backgroundColor: theme.colors.numberPad.background, borderColor: theme.colors.numberPad.border }]}> 
            <Text style={[styles.pauseTitle, { color: theme.colors.title }]}>Game Paused</Text>
            
            {/* Resume Button - Made larger and more prominent */}
            <TouchableOpacity 
              style={[styles.pauseButton, styles.resumeButton]} 
              onPress={handleResume}
              activeOpacity={0.7} // More responsive feel
            >
              <Text style={styles.pauseButtonEmoji}>▶️</Text>
              <Text style={[styles.pauseButtonText, { fontSize: 18, fontWeight: 'bold' }]}>Resume Game</Text>
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
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Safety touchable that covers the entire screen
  safetyTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flex: 1,
    width: '100%',
    height: '100%',
    zIndex: 1000,
  },
  pauseOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    width: '100%',
    height: '100%',
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
    paddingVertical: 15, // Slightly larger
    marginBottom: 18,    // More space before quit button
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