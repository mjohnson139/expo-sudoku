import React, { useState, useEffect } from 'react';
import { SafeAreaView, AppState, DeviceEventEmitter, NativeEventEmitter, NativeModules, Platform } from 'react-native';
import GameScreen from './screens/GameScreen';

export default function App() {
  const [appKey, setAppKey] = useState(0);

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

  return (
    <SafeAreaView 
      style={{ flex: 1 }}
      onTouchStart={handleTouchStart}
      onClick={Platform.OS === 'web' ? handleTouchStart : undefined}
    >
      <GameScreen key={appKey} />
    </SafeAreaView>
  );
}
