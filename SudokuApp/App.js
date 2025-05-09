import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, AppState, DeviceEventEmitter, NativeEventEmitter, NativeModules, Platform } from 'react-native';
import GameScreen from './screens/GameScreen';
import { saveGameStateImmediate } from './utils/storage';

export default function App() {
  const [appKey, setAppKey] = useState(0);
  // Reference to hold the current game context's state
  const gameStateRef = useRef(null);
  // Flag to track if we should auto-restore on next activation
  const shouldAutoRestoreRef = useRef(false);

  // Function to set the current game state reference
  const setGameStateRef = (state) => {
    gameStateRef.current = state;
  };

  useEffect(() => {
    // Handle app state changes
    const appStateSubscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'background') {
        // Auto-pause the game when going to background
        if (gameStateRef.current && gameStateRef.current.gameStarted && 
            !gameStateRef.current.showMenu && !gameStateRef.current.isPaused) {
          console.log('Auto-pausing game when going to background');
          
          // Dispatch action to pause the game
          if (gameStateRef.current.dispatch) {
            gameStateRef.current.dispatch({ type: 'PAUSE_GAME' });
            
            // Give a moment for the pause action to take effect before saving
            setTimeout(() => {
              // Now save the paused state
              saveGameStateImmediate(gameStateRef.current);
              shouldAutoRestoreRef.current = true;
              
              // Remember that we auto-paused
              global.wasPausedOnBackground = true;
              global.autoPausedOnBackground = true;
            }, 100);
          }
        } else if (gameStateRef.current && gameStateRef.current.gameStarted) {
          // Game is already paused or menu is showing
          saveGameStateImmediate(gameStateRef.current);
          shouldAutoRestoreRef.current = true;
          
          // Remember if the game was paused when we went to background
          global.wasPausedOnBackground = gameStateRef.current.isPaused;
        }
      } else if (nextState === 'active') {
        // Set flag to auto-restore game on component remount
        // The GameScreen component will read this flag
        if (shouldAutoRestoreRef.current) {
          // Set a global flag to indicate coming back from background
          // This allows components to implement safety mechanisms
          global.appResumedFromBackground = true;
          
          // Add a cooldown timer to avoid interfering with intentional pause actions
          // This indicates the app just resumed and will be cleared after a timeout
          global.justResumedFromBackground = true;
          setTimeout(() => {
            global.justResumedFromBackground = false;
          }, 2000);
          
          // Remount GameScreen to restore UI on resume
          setAppKey(prev => prev + 1);
          
          // Set a safety timeout at the app level
          setTimeout(() => {
            // If the game is still paused after resuming from background,
            // and we've already waited a bit, force unpause it as a backup mechanism
            if (gameStateRef.current && 
                gameStateRef.current.isPaused && 
                global.wasPausedOnBackground) {
              console.log('App-level safety timeout - forcing game resume');
              if (gameStateRef.current.dispatch) {
                gameStateRef.current.dispatch({ type: 'RESUME_GAME' });
              }
              global.appResumedFromBackground = false;
              global.wasPausedOnBackground = false;
            }
          }, 1500);
        }
      }
    });
    
    // Setup touch event interception for simulator taps
    // This helps with displaying the debug taps
    let lastTouchEvent = null;
    const handleTouch = (e) => {
      // Different handling based on platform
      if (Platform.OS === 'web') {
        // For web, handle mouse clicks
        const pageX = e.nativeEvent.pageX || e.nativeEvent.clientX;
        const pageY = e.nativeEvent.pageY || e.nativeEvent.clientY;
        
        if (pageX && pageY) {
          // Don't emit duplicate events for the same touch
          const touchKey = `${pageX}-${pageY}`;
          if (lastTouchEvent !== touchKey) {
            lastTouchEvent = touchKey;
            
            // Use a custom event for web
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('simulatorTap', {
                detail: { x: pageX, y: pageY }
              }));
            }
            
            // Reset after a short delay to prevent duplicate filtering
            setTimeout(() => {
              lastTouchEvent = null;
            }, 500);
          }
        }
      } else {
        // Native platforms (iOS/Android)
        const touch = e.nativeEvent.touches[0];
        if (touch) {
          // Don't emit duplicate events for the same touch
          const touchKey = `${touch.pageX}-${touch.pageY}`;
          if (lastTouchEvent !== touchKey) {
            lastTouchEvent = touchKey;
            
            // Emit event for DebugCrosshair to pick up
            DeviceEventEmitter.emit('simulatorTap', {
              x: touch.pageX,
              y: touch.pageY
            });
            
            // Reset after a short delay to prevent duplicate filtering
            setTimeout(() => {
              lastTouchEvent = null;
            }, 500);
          }
        }
      }
    };
    
    // Make this listener available globally
    global.touchHandler = handleTouch;
    
    return () => {
      appStateSubscription.remove();
      global.touchHandler = null;
    };
  }, []);

  // Handle touch events with platform awareness
  const handleTouchStart = (e) => {
    // Call the touch handler to capture simulator taps
    if (global.touchHandler) {
      global.touchHandler(e);
    }
  };

  return (
    <SafeAreaView 
      style={{ flex: 1 }}
      onTouchStart={handleTouchStart}
      onClick={Platform.OS === 'web' ? handleTouchStart : undefined}
    >
      <GameScreen 
        key={appKey} 
        setGameStateRef={setGameStateRef} 
        shouldAutoRestore={shouldAutoRestoreRef.current}
        resetShouldAutoRestore={() => { shouldAutoRestoreRef.current = false; }}
      />
    </SafeAreaView>
  );
}
