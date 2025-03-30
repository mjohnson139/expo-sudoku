import React, { useState } from 'react';
import { View, StyleSheet, PanResponder, Dimensions } from 'react-native';

const GlobalJoystick = ({ onMove, active = true, threshold = 12.0, ignoredAreas = [] }) => {
  const [touchStartPosition, setTouchStartPosition] = useState(null);
  const [currentDirection, setCurrentDirection] = useState(null);

  // Helper function to check if a touch point is within any of the ignored areas
  const isTouchInIgnoredArea = (x, y) => {
    return ignoredAreas.some(area => {
      return (
        x >= area.x &&
        x <= area.x + area.width &&
        y >= area.y &&
        y <= area.y + area.height
      );
    });
  };
  
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: (evt) => {
      if (!active) return false;
      
      // Get touch coordinates
      const touch = evt.nativeEvent.touches[0];
      
      // Check if touch is within any ignored area
      if (isTouchInIgnoredArea(touch.pageX, touch.pageY)) {
        return false; // Don't capture the touch if it's in an ignored area
      }
      
      return true; // Capture the touch if not in an ignored area
    },
    
    onMoveShouldSetPanResponder: (evt) => {
      if (!active) return false;
      
      // Similar logic for move events
      const touch = evt.nativeEvent.touches[0];
      if (isTouchInIgnoredArea(touch.pageX, touch.pageY)) {
        return false;
      }
      
      return true;
    },
    
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
      
      if (absX > threshold || absY > threshold) {
        // Determine which axis is dominant (x or y)
        if (absX > absY) {
          // X-axis movement is stronger
          newDirection = dx > 0 ? 'right' : 'left';
        } else {
          // Y-axis movement is stronger
          newDirection = dy > 0 ? 'down' : 'up';
        }
        
        // Only call onMove if direction has changed
        if (newDirection && newDirection !== currentDirection) {
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
      pointerEvents="box-none" // This allows touches to pass through to underlying components if not handled
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
    zIndex: 100, // High z-index to be above other components
  }
});

export default GlobalJoystick;