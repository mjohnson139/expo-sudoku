import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Animated } from 'react-native';
import { useGameContext } from '../contexts/GameContext';

/**
 * ScoreDisplay component that shows the current score with animations
 * Positioned on the left side of the GameTopStrip
 */
const ScoreDisplay = () => {
  const { score, theme, getLastScoreChange } = useGameContext();
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const prevScoreRef = useRef(score);
  const [pointsAdded, setPointsAdded] = useState(0);
  
  // Format score with thousands separators
  const formatScore = (score) => {
    return score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  // Trigger animation when score changes
  useEffect(() => {
    // Only animate if score increases
    if (score > prevScoreRef.current) {
      // Get the amount of points added
      const pointsChange = score - prevScoreRef.current;
      setPointsAdded(pointsChange);
      
      // Scale up animation for main score
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
      
      // Color flash animation
      Animated.sequence([
        Animated.timing(colorAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(colorAnim, {
          toValue: 0,
          duration: 450,
          useNativeDriver: false,
        })
      ]).start();
      
      // Floating "+points" animation
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 2,
          duration: 500,
          useNativeDriver: true,
        })
      ]).start(() => {
        floatAnim.setValue(0); // Reset for next animation
      });
    }
    
    // Update previous score reference
    prevScoreRef.current = score;
  }, [score, scaleAnim, colorAnim, floatAnim]);
  
  // Interpolate color for highlighting
  const textColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.title || '#333333', '#4CAF50']
  });
  
  // Floating text styles based on animation
  const floatingPointsOpacity = floatAnim.interpolate({
    inputRange: [0, 0.1, 0.9, 1, 2],
    outputRange: [0, 1, 1, 0.7, 0]
  });
  
  const floatingPointsTranslateY = floatAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, -25, -30]
  });
  
  return (
    <View style={styles.scoreContainer}>
      <View style={styles.scoreTextContainer}>
        {/* Floating points animation */}
        {pointsAdded > 0 && (
          <Animated.Text
            style={[
              styles.floatingPoints,
              {
                opacity: floatingPointsOpacity,
                transform: [
                  { translateY: floatingPointsTranslateY },
                  { scale: floatAnim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.8, 1.2, 1] }) }
                ],
                color: '#4CAF50' // Always show in green
              }
            ]}
          >
            +{pointsAdded}
          </Animated.Text>
        )}
        
        {/* Main score display */}
        <Animated.Text 
          style={[
            styles.scoreText,
            { 
              color: textColor,
              transform: [{ scale: scaleAnim }] 
            }
          ]}
        >
          {formatScore(score)}
        </Animated.Text>
      </View>
      <Text style={[styles.scoreLabel, { color: theme.colors.title }]}>
        SCORE
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  scoreTextContainer: {
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    position: 'relative', // For floating points positioning
    height: 32, // Fixed height to accommodate floating text
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  floatingPoints: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#4CAF50',
    width: '100%',
    top: 0,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
});

export default ScoreDisplay;