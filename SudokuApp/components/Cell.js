import React, { useMemo, memo } from 'react';
import { View, Text, StyleSheet, Platform, UIManager } from 'react-native';

// Enable layout animations for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Store common styles for Android
const ANDROID_TEXT_STYLE = Platform.OS === 'android' ? {
  includeFontPadding: false,
  textAlignVertical: 'center',
  fontWeight: '500',
  backfaceVisibility: 'hidden',
} : {};

// Performance-optimized Cell component
const Cell = ({ 
  value, 
  isSelected,
  isInitialCell, 
  relationType,
  isCorrect, 
  showFeedback, 
  extraStyle, 
  theme,
  notes = [] // Array of numbers 1-9 that are notes for this cell
}) => {
  // For Android, use a simplified calculation for better performance
  const backgroundColor = useMemo(() => {
    if (Platform.OS === 'android') {
      // Simplified background calculation for Android
      if (isSelected) return theme.colors.cell.selectedBackground;
      if (showFeedback && isCorrect === false) return '#ffebee';
      if (relationType) return theme.colors.cell.relatedBackground;
      return theme.colors.cell.background;
    } else {
      // Regular calculation for iOS
      if (isSelected) {
        return theme.colors.cell.selectedBackground;
      } else if (showFeedback && isCorrect === false) {
        return theme.colors.cell.incorrectBackground || '#ffebee';
      } else if (relationType) {
        return theme.colors.cell.relatedBackground;
      }
      return theme.colors.cell.background;
    }
  }, [isSelected, relationType, showFeedback, isCorrect, theme.colors.cell]);

  // Memoize text color calculation
  const textColor = useMemo(() => {
    if (isInitialCell) {
      // Use a more prominent color for initial values
      return theme.colors.cell.initialValueText;
    } else if (showFeedback) {
      return isCorrect 
        ? theme.colors.cell.correctValueText 
        : theme.colors.cell.incorrectValueText;
    }
    return theme.colors.cell.userValueText;
  }, [isInitialCell, showFeedback, isCorrect, theme.colors.cell]);

  // Memoize text style
  const textStyle = useMemo(() => [
    styles.text,
    { 
      color: textColor,
      fontWeight: isInitialCell ? 'bold' : '500', // Only initial cells are bold
      fontSize: isInitialCell ? 19 : 18, // Keep initial values slightly larger
    }
  ], [textColor, isInitialCell]);

  // Optimized notes rendering - only create when needed
  const notesElements = useMemo(() => {
    // Skip unnecessary calculations if no notes or value exists
    if (value !== 0 || notes.length === 0) return null;
    
    // Pre-compute notes color to avoid repetition in the loop
    const notesColor = theme.colors.cell.notesText || theme.colors.cell.userValueText;
    
    // Create a 3×3 grid of possible notes using pre-calculated positions
    return (
      <View style={styles.notesContainer}>
        {NOTE_POSITIONS.map(({ key, style }) => {
          // Only render if this note exists
          return (
            <View 
              key={key} 
              style={[styles.noteCell, style]}
            >
              {notes.includes(key) && (
                <Text style={[styles.noteText, { color: notesColor }]}>
                  {key}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    );
  }, [value, notes, theme.colors.cell.notesText, theme.colors.cell.userValueText]);

  // Combine all styles for the cell container
  const cellStyle = useMemo(() => [
    styles.cell, 
    { backgroundColor }, 
    extraStyle
  ], [backgroundColor, extraStyle]);

  // Unified rendering logic for all platforms
  if (value !== 0) {
    // Cell has a value
    return (
      <View style={cellStyle} accessibilityLabel={`Cell value: ${value}`}>
        <Text style={textStyle}>{value}</Text>
      </View>
    );
  } else {
    // Empty cell - may contain notes
    return (
      <View style={cellStyle} accessibilityLabel="Empty cell">
        {notesElements}
      </View>
    );
  }
};

// Pre-calculate note positions to avoid calculations in render
const NOTE_POSITIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
  const row = Math.floor((num - 1) / 3);
  const col = (num - 1) % 3;
  return {
    key: num,
    style: {
      left: `${col * 33.33}%`,
      top: `${row * 33.33}%`
    }
  };
});

const styles = StyleSheet.create({
  cell: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    // Minimal cross-platform optimizations 
    // No border styling here - borders are handled by Grid.js
    // This ensures consistent grid lines across all platforms
    elevation: 0, // Remove shadow complexity entirely
    overflow: 'hidden' // Prevent layout issues
  },
  text: {
    fontSize: 18,
    // Platform-specific optimizations
    ...(Platform.OS === 'web' ? {
      userSelect: 'none',
      cursor: 'default',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    } : {}),
    // Optimization for all platforms
    padding: 0,
    margin: 0
  },
  notesContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  noteCell: {
    position: 'absolute',
    width: '33.33%',
    height: '33.33%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteText: {
    fontSize: 9,
    fontWeight: '500',
    // Better text rendering on web
    ...(Platform.OS === 'web' ? {
      userSelect: 'none',
      cursor: 'default',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    } : {})
  }
});

// Custom props comparison function for React.memo
const arePropsEqual = (prevProps, nextProps) => {
  // Check if any of these props have changed
  return (
    prevProps.value === nextProps.value &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.relationType === nextProps.relationType &&
    prevProps.isCorrect === nextProps.isCorrect &&
    prevProps.showFeedback === nextProps.showFeedback &&
    prevProps.isInitialCell === nextProps.isInitialCell &&
    // Deep comparison of notes array only if relevant (for empty cells)
    (prevProps.value !== 0 || 
      JSON.stringify(prevProps.notes) === JSON.stringify(nextProps.notes)) &&
    // Deep comparison for extraStyle
    JSON.stringify(prevProps.extraStyle) === JSON.stringify(nextProps.extraStyle) &&
    // Only compare the specific theme properties we actually use
    prevProps.theme.colors.cell.background === nextProps.theme.colors.cell.background &&
    prevProps.theme.colors.cell.selectedBackground === nextProps.theme.colors.cell.selectedBackground &&
    prevProps.theme.colors.cell.relatedBackground === nextProps.theme.colors.cell.relatedBackground &&
    prevProps.theme.colors.cell.incorrectBackground === nextProps.theme.colors.cell.incorrectBackground &&
    prevProps.theme.colors.cell.initialValueText === nextProps.theme.colors.cell.initialValueText &&
    prevProps.theme.colors.cell.userValueText === nextProps.theme.colors.cell.userValueText &&
    prevProps.theme.colors.cell.correctValueText === nextProps.theme.colors.cell.correctValueText &&
    prevProps.theme.colors.cell.incorrectValueText === nextProps.theme.colors.cell.incorrectValueText &&
    prevProps.theme.colors.cell.notesText === nextProps.theme.colors.cell.notesText
  );
};

// Use React.memo with custom comparison function to prevent unnecessary re-renders
export default React.memo(Cell, arePropsEqual);
