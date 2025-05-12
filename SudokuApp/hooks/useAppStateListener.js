import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useGameContext, ACTIONS } from '../contexts/GameContext';

/**
 * Custom hook to handle app state changes
 * Automatically pauses game when app is backgrounded and brings up pause modal on return
 */
const useAppStateListener = () => {
  const { gameStarted, dispatch, gameCompleted } = useGameContext();
  
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && gameStarted) {
        // Only show pause modal if game is in progress but not completed
        if (!gameCompleted) {
          dispatch({ type: ACTIONS.PAUSE_GAME });
        }
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, [gameStarted, dispatch, gameCompleted]);
};

export default useAppStateListener;