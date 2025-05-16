import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

/**
 * A component that animates number changes with a rolling/counting up effect
 */
const RollingNumber = ({ value, style }) => {
  // Use formatted values with zero padding
  const formattedValue = value.toString().padStart(2, '0');

  // Create refs for animation values of each digit
  const firstDigitRef = useRef(new Animated.Value(parseInt(formattedValue[0]))).current;
  const secondDigitRef = useRef(new Animated.Value(parseInt(formattedValue[1]))).current;

  // Update animation when value changes
  useEffect(() => {
    // Parse current digits
    const newFirstDigit = parseInt(formattedValue[0]);
    const newSecondDigit = parseInt(formattedValue[1]);

    // Animate first digit
    Animated.timing(firstDigitRef, {
      toValue: newFirstDigit,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Animate second digit
    Animated.timing(secondDigitRef, {
      toValue: newSecondDigit,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [formattedValue, firstDigitRef, secondDigitRef]);

  // Create digit strips (0-9)
  const renderDigitStrip = (animatedValue) => {
    return (
      <View style={styles.digitColumn}>
        <Animated.View
          style={{
            transform: [
              {
                translateY: animatedValue.interpolate({
                  inputRange: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
                  outputRange: [0, -24, -48, -72, -96, -120, -144, -168, -192, -216],
                }),
              },
            ],
          }}
        >
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <Text key={digit} style={[styles.digit, style]}>
              {digit}
            </Text>
          ))}
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderDigitStrip(firstDigitRef)}
      {renderDigitStrip(secondDigitRef)}
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
  },
  digit: {
    height: 24,
    lineHeight: 24,
    textAlign: 'center',
  },
});

export default RollingNumber;