import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useGameContext, ACTIONS } from '../contexts/GameContext';

/**
 * Custom hook to handle app state changes
 * Automatically pauses game when app is backgrounded and brings up pause modal on return
 * only if the game is in progress and not completed
 */
const useAppStateListener = () => {
  const { gameStarted, dispatch, gameCompleted } = useGameContext();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // Only handle the active state change when:
      // 1. The app is returning to the foreground (nextAppState === 'active')
      // 2. A game has been started (gameStarted === true)
      // 3. The game is not completed (gameCompleted === false)
      if (nextAppState === 'active' && gameStarted && !gameCompleted) {
        dispatch({ type: ACTIONS.PAUSE_GAME });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [gameStarted, dispatch, gameCompleted]);
};

export default useAppStateListener;