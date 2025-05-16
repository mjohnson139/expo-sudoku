import React, { useRef, useEffect } from 'react';
import { Animated, View, StyleSheet } from 'react-native';

/**
 * A component that displays a rolling digit animation
 * for timer numbers (with proper zero padding)
 */
const TimerDigit = ({ value, style }) => {
  // Create animated value for current digit
  const animatedValue = useRef(new Animated.Value(value)).current;

  // Update animation when value changes
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [value]);

  // Create digits list (0-9)
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.digitContainer,
          {
            transform: [
              {
                translateY: animatedValue.interpolate({
                  inputRange: [0, 9],
                  outputRange: [0, -9 * 20], // Each digit is 20 height units
                }),
              },
            ],
          },
        ]}
      >
        {digits.map(digit => (
          <View key={digit} style={styles.digit}>
            <Animated.Text style={[styles.digitText, style]}>
              {digit.toString().padStart(2, '0')}
            </Animated.Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 20,
    width: 20,
    overflow: 'hidden',
  },
  digitContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  digit: {
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TimerDigit;