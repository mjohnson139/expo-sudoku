import React, { useState } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';

const JoystickNavigator = ({ onMove, active = true }) => {
  const [touchStartPosition, setTouchStartPosition] = useState(null);
  const [currentDirection, setCurrentDirection] = useState(null);
  
  // Reduce the threshold distance to trigger a direction (in pixels)
  // Changed from 15 to 5 for more sensitive joystick response
  const MOVEMENT_THRESHOLD = 5.0;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => active,
    onMoveShouldSetPanResponder: () => active,
    
    // When touch starts, store the start position
    onPanResponderGrant: (evt) => {
      if (!active) return;
      
      const touch = evt.nativeEvent.touches[0];
      setTouchStartPosition({
        x: touch.pageX,
        y: touch.pageY
      });
      setCurrentDirection(null);
    },
    
    // As touch moves, calculate direction based on distance from start
    onPanResponderMove: (evt, gestureState) => {
      if (!active || !touchStartPosition) return;
      
      // Calculate distance from start
      const dx = gestureState.dx;
      const dy = gestureState.dy;
      
      // Determine the most prominent direction of movement
      // Only trigger if we've moved past threshold
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      
      let newDirection = null;
      
      if (absX > MOVEMENT_THRESHOLD || absY > MOVEMENT_THRESHOLD) {
        // Determine which axis is dominant (x or y)
        if (absX > absY) {
          // X-axis movement is stronger
          newDirection = dx > 0 ? 'right' : 'left';
        } else {
          // Y-axis movement is stronger
          newDirection = dy > 0 ? 'down' : 'up';
        }
        
        // Always call onMove as long as we're above threshold
        // This enables continuous movement while finger is moving
        if (newDirection) {
          setCurrentDirection(newDirection);
          onMove(newDirection);
        }
      }
    },
    
    // When touch ends, reset the state
    onPanResponderRelease: () => {
      setTouchStartPosition(null);
      setCurrentDirection(null);
    },
    
    onPanResponderTerminate: () => {
      setTouchStartPosition(null);
      setCurrentDirection(null);
    },
  });

  // If not active, don't render the gesture layer
  if (!active) return null;

  return (
    <View 
      style={styles.container} 
      {...panResponder.panHandlers}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent', // Makes the joystick invisible
  }
});

export default JoystickNavigator;