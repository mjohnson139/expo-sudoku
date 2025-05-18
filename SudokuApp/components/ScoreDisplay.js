import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Text, Animated, Dimensions, Easing, Platform } from 'react-native';
import { useGameContext } from '../contexts/GameContext';
import LabeledBadge from './LabeledBadge';

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
  // New animated value for counting up effect - initialize with current score
  const countAnim = useRef(new Animated.Value(score)).current;
  
  // We no longer need these animations as they're handled by the CellScoreAnimation component
  // Keeping the refs defined but unused to avoid breaking code
  
  // Refs for position measuring
  const scoreContainerRef = useRef();
  const scoreLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  
  const prevScoreRef = useRef(score);
  const lastScoredCellRef = useRef(null);
  const [pointsAdded, setPointsAdded] = useState(0);
  const [cellPoints, setCellPoints] = useState(0);
  const [cellAnimPosition, setCellAnimPosition] = useState({ startX: 0, startY: 0 });
  const [scoreColor, setScoreColor] = useState(theme.colors.title || '#333333');
  // State to hold the displayed score during animation
  const [displayedScore, setDisplayedScore] = useState(score);
  
  // Format score with thousands separators
  const formatScore = (score) => {
    return score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  // Measure the position of the score container
  const measureScorePosition = useCallback(() => {
    if (scoreContainerRef.current) {
      scoreContainerRef.current.measure((x, y, width, height, pageX, pageY) => {
        scoreLayoutRef.current = {
          x: pageX,
          y: pageY,
          width,
          height,
          centerX: pageX + width / 2,
          centerY: pageY + height / 2
        };
      });
    }
  }, []);
  
  // Trigger position measurement on layout
  useEffect(() => {
    // Delay the measurement slightly to ensure all components are properly laid out
    const timer = setTimeout(() => {
      measureScorePosition();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [measureScorePosition]);
  
  // Calculate the cell position based on row and column
  const calculateCellPosition = useCallback((row, col) => {
    // Get window dimensions to help with calculations
    const windowWidth = Dimensions.get('window').width;
    const windowHeight = Dimensions.get('window').height;
    
    // Estimate the grid position (this would be better with actual measurements)
    // These are estimations and may need adjustment based on actual layout
    const gridTopMargin = windowHeight * 0.15; // Estimated distance from top to grid
    const gridCellSize = Math.min(windowWidth, windowHeight) / 11; // Estimated cell size
    
    // Calculate cell position (center of the cell)
    const cellX = (windowWidth / 2 - gridCellSize * 4.5) + col * gridCellSize + gridCellSize / 2;
    const cellY = gridTopMargin + row * gridCellSize + gridCellSize / 2;
    
    return { x: cellX, y: cellY };
  }, []);
  
  // Trigger animation when score changes
  useEffect(() => {
    // Only animate if score increases
    if (score > prevScoreRef.current) {
      // Get the amount of points added
      const pointsChange = score - prevScoreRef.current;
      setPointsAdded(pointsChange);
      
      // Set the initial value of countAnim to previous score
      countAnim.setValue(prevScoreRef.current);
      
      // Create parallel animations
      Animated.parallel([
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
        ]),
        
        // Count up animation from previous score to new score
        Animated.timing(countAnim, {
          toValue: score,
          duration: 800, // Count up over 800ms
          easing: Easing.out(Easing.ease),
          useNativeDriver: false, // This animation can't use native driver as we need JS value
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
  }, [score, scaleAnim, floatPositionAnim, floatOpacityAnim, countAnim, theme.colors.title]);
  
  // Update displayed score when animation value changes
  useEffect(() => {
    // Add listener to update displayed score as animation progresses
    const listener = countAnim.addListener(({ value }) => {
      // Round to nearest integer and update displayed score
      setDisplayedScore(Math.round(value));
    });
    
    // Clean up listener on unmount
    return () => {
      countAnim.removeListener(listener);
    };
  }, [countAnim]);
  
  // We no longer need this effect as cell animations are handled by CellScoreAnimation
  // Just keep track of the last scored cell for reference
  useEffect(() => {
    if (lastScoredCell && 
        (!lastScoredCellRef.current || 
         lastScoredCell.row !== lastScoredCellRef.current.row || 
         lastScoredCell.col !== lastScoredCellRef.current.col)) {
      
      // Update the reference only
      lastScoredCellRef.current = lastScoredCell;
    }
  }, [lastScoredCell]);
  
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
    <View ref={scoreContainerRef} onLayout={measureScorePosition}>
      <LabeledBadge 
        label="SCORE"
        theme={theme}
        containerStyle={styles.badgeContainer}
      >
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
          
          {/* Main score display */}
          <Animated.Text 
            style={[
              styles.scoreText,
              { 
                color: theme.colors.numberPad.text,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            {formatScore(displayedScore)}
          </Animated.Text>
        </View>
      </LabeledBadge>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
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
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    width: 60, // Fixed width for score
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
    zIndex: 10,
  }
});

export default ScoreDisplay;