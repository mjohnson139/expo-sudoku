import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

/**
 * A component that animates number changes with a rolling/counting up effect
 */
const RollingNumber = ({ value, style }) => {
  // Format the value with leading zeros
  const formattedValue = value.toString().padStart(2, '0');

  // Create animation values for each digit
  const firstDigitAnim = useRef(new Animated.Value(0)).current;
  const secondDigitAnim = useRef(new Animated.Value(0)).current;
  
  // Previously displayed values - for proper animation when a new digit appears
  const prevFirstDigit = useRef(parseInt(formattedValue[0])).current;
  const prevSecondDigit = useRef(parseInt(formattedValue[1])).current;

  // Update animation when value changes
  useEffect(() => {
    const firstDigit = parseInt(formattedValue[0]);
    const secondDigit = parseInt(formattedValue[1]);
    
    // Trigger animation for all digits at once
    Animated.parallel([
      Animated.timing(firstDigitAnim, {
        toValue: firstDigit,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(secondDigitAnim, {
        toValue: secondDigit,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Update refs for next animation
    prevFirstDigit.current = firstDigit;
    prevSecondDigit.current = secondDigit;
  }, [formattedValue, firstDigitAnim, secondDigitAnim]);

  // Create a digit roll with all numbers
  const renderDigitRoll = (animValue) => (
    <View style={styles.digitColumn}>
      <Animated.View
        style={{
          transform: [
            {
              translateY: animValue.interpolate({
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

  return (
    <View style={styles.container}>
      {renderDigitRoll(firstDigitAnim)}
      {renderDigitRoll(secondDigitAnim)}
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
    fontSize: 16,
    fontWeight: 'bold',
    height: 24,
    lineHeight: 24,
    textAlign: 'center',
  },
});

export default RollingNumber;