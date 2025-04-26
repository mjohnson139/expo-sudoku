import React, { useState, useEffect } from 'react';
import { SafeAreaView, AppState, DeviceEventEmitter, NativeEventEmitter, NativeModules } from 'react-native';
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
      // Get touch location from event
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
          // when user intentionally taps the same spot twice
          setTimeout(() => {
            lastTouchEvent = null;
          }, 500);
        }
      }
    };
    
    // Use a React ref to store the touch handler
    const touchHandlerRef = React.useRef(handleTouch);
    
    return () => {
      appStateSubscription.remove();
      touchHandlerRef.current = null;
    };
  }, []);

  return (
    <SafeAreaView 
      style={{ flex: 1 }}
      onTouchStart={(e) => {
        // Call the touch handler to capture simulator taps
        if (touchHandlerRef.current) {
          touchHandlerRef.current(e);
        }
      }}
    >
      <GameScreen key={appKey} />
    </SafeAreaView>
  );
}
