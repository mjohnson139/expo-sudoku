import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useGameContext, ACTIONS } from '../contexts/GameContext';

/**
 * Custom hook to handle app state changes
 * Handles both backgrounding and returning to the app
 */
const useAppStateListener = () => {
  const { gameStarted, dispatch, gameCompleted } = useGameContext();
  const appState = useRef(AppState.currentState);
  
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // When app is going to background
      if ((nextAppState === 'background' || nextAppState === 'inactive') && 
          appState.current === 'active') {
        // If a game is in progress and not completed, pause the timer
        if (gameStarted && !gameCompleted) {
          dispatch({ type: ACTIONS.PAUSE_TIMER });
        }
      } 
      // When app is coming back to foreground
      else if (nextAppState === 'active' && 
              (appState.current === 'background' || appState.current === 'inactive')) {
        // If a game is in progress but not completed, show pause modal
        if (gameStarted && !gameCompleted) {
          dispatch({ type: ACTIONS.PAUSE_GAME });
        }
        // If game is completed, do nothing special
      }
      
      // Update app state reference
      appState.current = nextAppState;
    });
    
    return () => {
      subscription.remove();
    };
  }, [gameStarted, dispatch, gameCompleted]);
};

export default useAppStateListener;