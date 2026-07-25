import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView, AppState, DeviceEventEmitter, NativeEventEmitter, NativeModules, Platform } from 'react-native';
import HubScreen from './screens/HubScreen';
import { HUB_ROUTE, getGame } from './games/registry';

/**
 * App shell and screen router.
 *
 * The route is either the hub or a game id from `games/registry.js`
 * (docs/fungiku-plan.md §6). Deliberately not a navigation library: two games
 * don't justify react-navigation's native setup, and this matches the sibling
 * color-loop app, whose hub also lives in its root component. Revisit if the app
 * ever grows genuinely deep navigation.
 *
 * Each game screen owns its own state and persistence, so leaving for the hub
 * unmounts it — which is also what guarantees its timer stops. Progress survives
 * because the screen hydrates from the same saved snapshot on the way back in.
 */
export default function App() {
  const [appKey, setAppKey] = useState(0);
  const [route, setRoute] = useState(HUB_ROUTE);

  const goToHub = useCallback(() => setRoute(HUB_ROUTE), []);

  useEffect(() => {
    // Handle app state changes
    const appStateSubscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        // Remount GameScreen to restore UI on resume
        setAppKey(prev => prev + 1);
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

  // An unknown route falls back to the hub rather than rendering nothing.
  const activeGame = route === HUB_ROUTE ? null : getGame(route);
  const ActiveGameScreen = activeGame?.Screen;

  return (
    <SafeAreaView
      style={{ flex: 1 }}
      onTouchStart={handleTouchStart}
      onClick={Platform.OS === 'web' ? handleTouchStart : undefined}
    >
      {ActiveGameScreen ? (
        <ActiveGameScreen key={`${activeGame.id}-${appKey}`} onExitToHub={goToHub} />
      ) : (
        <HubScreen onSelectGame={setRoute} />
      )}
    </SafeAreaView>
  );
}
