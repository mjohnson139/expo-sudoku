import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

/**
 * A component that animates number changes with a rolling/counting up effect
 * All digits roll up together in a unified animation
 */
const RollingNumber = ({ value, style }) => {
  // Format the value with leading zeros
  const formattedValue = value.toString().padStart(2, '0');
  
  // Track previous value for animation
  const [prevValue, setPrevValue] = useState(formattedValue);
  
  // Animation progress value (0 to 1)
  const animProgress = useRef(new Animated.Value(0)).current;
  
  // Update animation when value changes
  useEffect(() => {
    // Save current value before updating
    setPrevValue(formattedValue);
    
    // Reset animation
    animProgress.setValue(0);
    
    // Start new animation
    Animated.timing(animProgress, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [formattedValue]);
  
  // Render a single digit with animation
  const renderDigit = (index) => {
    const prevDigit = parseInt(prevValue[index]);
    const currentDigit = parseInt(formattedValue[index]);
    
    // If the digits are the same, just render without animation
    if (prevDigit === currentDigit) {
      return (
        <View style={styles.digitColumn}>
          <Text style={[styles.digit, style]}>{currentDigit}</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.digitColumn}>
        {/* Current digit (moves in from bottom) */}
        <Animated.View
          style={[
            styles.digitWrapper,
            {
              transform: [
                {
                  translateY: animProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [24, 0], // Start below, move to position
                  }),
                },
              ],
              opacity: animProgress,
            },
          ]}
        >
          <Text style={[styles.digit, style]}>{currentDigit}</Text>
        </Animated.View>
        
        {/* Previous digit (moves out to top) */}
        <Animated.View
          style={[
            styles.digitWrapper,
            {
              transform: [
                {
                  translateY: animProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -24], // Start in position, move out top
                  }),
                },
              ],
              opacity: animProgress.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [1, 0.3, 0],
              }),
            },
          ]}
        >
          <Text style={[styles.digit, style]}>{prevDigit}</Text>
        </Animated.View>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      {renderDigit(0)}
      {renderDigit(1)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitColumn: {
    width: 12,
    height: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  digitWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  digit: {
    fontSize: 16,
    fontWeight: 'bold',
    height: 24,
    lineHeight: 24,
    textAlign: 'center',
  },
});

export default RollingNumber;