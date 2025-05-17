import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, Animated } from 'react-native';
import { useGameContext } from '../contexts/GameContext';

/**
 * ScoreDisplay component that shows the current score with animations
 * Positioned on the left side of the GameTopStrip
 */
const ScoreDisplay = () => {
  const { score, theme, lastScoredCell } = useGameContext();
  
  // Animation values - separate values for different properties
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const floatPositionAnim = useRef(new Animated.Value(0)).current;
  const floatOpacityAnim = useRef(new Animated.Value(0)).current;
  
  // Animation for points coming from cells
  const cellToScoreAnim = useRef(new Animated.Value(0)).current;
  const cellOpacityAnim = useRef(new Animated.Value(0)).current;
  
  const prevScoreRef = useRef(score);
  const lastScoredCellRef = useRef(null);
  const [pointsAdded, setPointsAdded] = useState(0);
  const [cellPoints, setCellPoints] = useState(0);
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
  
  // Effect to handle points animation from cells
  useEffect(() => {
    // Check if we have a new scored cell
    if (lastScoredCell && 
        (!lastScoredCellRef.current || 
         lastScoredCell.row !== lastScoredCellRef.current.row || 
         lastScoredCell.col !== lastScoredCellRef.current.col)) {
      
      // Save the points that were scored
      setCellPoints(lastScoredCell.points);
      
      // Reset animations
      cellToScoreAnim.setValue(0);
      cellOpacityAnim.setValue(1);
      
      // Run cell-to-score animation
      Animated.timing(cellToScoreAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
      
      // Fade out gradually
      Animated.timing(cellOpacityAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start();
      
      // Update reference
      lastScoredCellRef.current = lastScoredCell;
    }
  }, [lastScoredCell, cellToScoreAnim, cellOpacityAnim]);
  
  // Calculate floating points transform based on animation progress
  const floatingPointsTranslateY = floatPositionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30]
  });
  
  const floatingPointsScale = floatPositionAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0.8, 1.2, 1]
  });
  
  // Calculate cell-to-score animation path
  // This assumes the cell is roughly below and to the right of the score display
  const cellPointsTranslateX = cellToScoreAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0], // Adjust based on your layout
  });
  
  const cellPointsTranslateY = cellToScoreAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0], // Adjust based on your layout
  });
  
  const cellPointsScale = cellToScoreAnim.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.8, 1.2, 1],
  });
  
  return (
    <View style={styles.scoreContainer}>
      <Text style={styles.scoreLabel}>SCORE</Text>
      
      <View style={[styles.scoreBadge, { backgroundColor: theme.colors.numberPad.border }]}>
        <View style={styles.scoreTextContainer}>
          {/* Floating points animation (from score) */}
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
          
          {/* Points flying from cell to score */}
          {cellPoints > 0 && (
            <Animated.Text
              style={[
                styles.cellPoints,
                {
                  opacity: cellOpacityAnim,
                  transform: [
                    { translateX: cellPointsTranslateX },
                    { translateY: cellPointsTranslateY },
                    { scale: cellPointsScale }
                  ],
                  color: '#4CAF50' // Always show in green
                }
              ]}
            >
              +{cellPoints}
            </Animated.Text>
          )}
          
          {/* Main score display */}
          <Animated.Text 
            style={[
              styles.scoreText,
              { 
                color: theme.colors.numberPad.text, // Match button text color
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            {formatScore(score)}
          </Animated.Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  scoreContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6, // Smaller corner radius for button-like feel
    marginTop: 2,
    elevation: 1, // Light shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    minWidth: 80, // Match width with timer badge
    height: 36, // Fixed height to match other badges
  },
  scoreTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative', // For floating points positioning
    height: 24, // Match timer height
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
    minWidth: 45, // Fixed width to prevent layout shifts
    fontFamily: 'monospace', // Use monospace font for fixed character width
  },
  floatingPoints: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#4CAF50',
    width: '100%',
    top: -18, // Position above the badge
  },
  cellPoints: {
    position: 'absolute',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#4CAF50',
    zIndex: 10, // Ensure it appears above other elements
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
    color: '#666', // Subtle color for label
    alignSelf: 'center', // Center align like the timer label
  },
});

export default ScoreDisplay;