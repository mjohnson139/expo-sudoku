import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Animated } from 'react-native';
import { useGameContext } from '../contexts/GameContext';

/**
 * ScoreDisplay component that shows the current score with animations
 * Positioned on the left side of the GameTopStrip
 */
const ScoreDisplay = () => {
  const { score, theme } = useGameContext();
  
  // Animation values - separate values for different properties
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const floatPositionAnim = useRef(new Animated.Value(0)).current;
  const floatOpacityAnim = useRef(new Animated.Value(0)).current;
  const prevScoreRef = useRef(score);
  const [pointsAdded, setPointsAdded] = useState(0);
  const [scoreColor, setScoreColor] = useState(theme.colors.title || '#333333');
  
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
      
      // Color flash animation (using state instead of animated)
      setScoreColor('#4CAF50'); // Green flash
      setTimeout(() => {
        setScoreColor(theme.colors.title || '#333333'); // Back to normal
      }, 600);
      
      // Floating "+points" position animation
      Animated.timing(floatPositionAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }).start(() => {
        floatPositionAnim.setValue(0); // Reset for next animation
      });
      
      // Floating "+points" opacity animation
      Animated.sequence([
        Animated.timing(floatOpacityAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(floatOpacityAnim, {
          toValue: 0.7,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(floatOpacityAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        })
      ]).start(() => {
        floatOpacityAnim.setValue(0); // Reset for next animation
      });
    }
    
    // Update previous score reference
    prevScoreRef.current = score;
  }, [score, scaleAnim, floatPositionAnim, floatOpacityAnim, theme.colors.title]);
  
  // Calculate floating points transform based on animation progress
  const floatingPointsTranslateY = floatPositionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30]
  });
  
  const floatingPointsScale = floatPositionAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0.8, 1.2, 1]
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
                opacity: floatOpacityAnim,
                transform: [
                  { translateY: floatingPointsTranslateY },
                  { scale: floatingPointsScale }
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
              color: scoreColor, // Using state for color
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