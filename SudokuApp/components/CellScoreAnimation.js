import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, StyleSheet, Dimensions } from 'react-native';
import { useGameContext } from '../contexts/GameContext';

/**
 * CellScoreAnimation - shows floating '+points' animation above the last scored cell
 * Uses the same animation logic as ScoreDisplay's floating points
 */
const CellScoreAnimation = () => {
  const { lastScoredCell, theme } = useGameContext();

  // Animation values (same as ScoreDisplay)
  const floatPositionAnim = useRef(new Animated.Value(0)).current;
  const floatOpacityAnim = useRef(new Animated.Value(0)).current;

  // Track last cell and points
  const lastScoredCellRef = useRef(null);
  const [animatedPoints, setAnimatedPoints] = useState(0);
  const [cellForAnim, setCellForAnim] = useState(null);

  // Trigger animation when a new cell is scored - combined for better performance
  useEffect(() => {
    if (
      lastScoredCell &&
      (!lastScoredCellRef.current ||
        lastScoredCell.row !== lastScoredCellRef.current.row ||
        lastScoredCell.col !== lastScoredCellRef.current.col)
    ) {
      setAnimatedPoints(lastScoredCell.points);
      setCellForAnim({ row: lastScoredCell.row, col: lastScoredCell.col });
      
      // Reset animations
      floatPositionAnim.setValue(0);
      floatOpacityAnim.setValue(0);
      
      // Run both animations in parallel for better performance
      Animated.parallel([
        Animated.timing(floatPositionAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
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
        ])
      ]).start(() => {
        // Reset all values after animation completes
        floatPositionAnim.setValue(0);
        floatOpacityAnim.setValue(0);
        setAnimatedPoints(0);
        setCellForAnim(null);
      });
      
      // Update reference
      lastScoredCellRef.current = lastScoredCell;
    }
  }, [lastScoredCell, floatPositionAnim, floatOpacityAnim]);

  // Don't render if no cell or no points
  if (!cellForAnim || animatedPoints === 0) return null;

  // Calculate cell position (center of cell in grid)
  const left = `${((cellForAnim.col + 0.5) * 100) / 9}%`;
  const top = `${((cellForAnim.row + 0.5) * 100) / 9}%`;

  // Animation transforms (same as ScoreDisplay)
  const floatingPointsTranslateY = floatPositionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30],
  });
  const floatingPointsScale = floatPositionAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0.8, 1.2, 1],
  });

  return (
    <Animated.View
      style={[
        styles.animationContainer,
        { left, top },
        {
          opacity: floatOpacityAnim,
          transform: [
            { translateY: floatingPointsTranslateY },
            { scale: floatingPointsScale },
          ],
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.floatingPoints}>+{animatedPoints}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  animationContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 30,
    zIndex: 1000,
    // Center the animation over the cell center
    transform: [{ translateX: 0 }, { translateY: 0 }],
  },
  floatingPoints: {
    // No absolute positioning, so it starts at the center of the cell
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#4CAF50',
    width: '100%',
    // Remove top: -18, so it starts at the cell center
    textShadowColor: 'rgba(255,255,255,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
});

export default CellScoreAnimation;