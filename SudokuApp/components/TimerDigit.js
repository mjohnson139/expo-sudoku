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
                  outputRange: [0, -9 * 24], // Each digit is 24 height units
                }),
              },
            ],
          },
        ]}
      >
        {digits.map(digit => (
          <View key={digit} style={styles.digit}>
            <Animated.Text style={[styles.digitText, style]}>
              {digit}
            </Animated.Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 24,
    width: 16,
    overflow: 'hidden',
  },
  digitContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  digit: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitText: {
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 24,
    textAlign: 'center',
  },
});

export default TimerDigit;