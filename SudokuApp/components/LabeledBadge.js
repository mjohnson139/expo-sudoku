import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BADGE_STYLE } from '../utils/themes';

/**
 * A consistent badge component with a label that can be reused across the app
 * @param {string} label - The text label displayed above the badge
 * @param {object} badgeStyle - Additional style for the badge container
 * @param {object} theme - The current theme 
 * @param {string} backgroundColor - Optional override for the badge background color
 * @param {React.ReactNode} children - Content to render inside the badge
 * @param {object} containerStyle - Optional style for the outer container
 * @param {number} maxTextWidth - Optional max width for content scaling calculation (default: 80)
 * @param {number} minScale - Minimum scale to apply to content when it's too large (default: 0.8)
 */
const LabeledBadge = ({ 
  label, 
  badgeStyle = {}, 
  theme,
  backgroundColor,
  children,
  containerStyle = {},
  maxTextWidth = 80,
  minScale = 0.8
}) => {
  const [contentWidth, setContentWidth] = useState(0);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef(null);

  // Calculate scale based on content size
  const scale = contentWidth > maxTextWidth ? 
    Math.max(minScale, maxTextWidth / contentWidth) : 
    1;
    
  // Handle content size measurement with useCallback for better performance
  const onContentLayout = useCallback((event) => {
    const { width } = event.nativeEvent.layout;
    setContentWidth(width);
    setIsOverflowing(width > maxTextWidth);
  }, [maxTextWidth]);

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      
      <View style={[
        styles.badge,
        { backgroundColor: backgroundColor || theme.colors.numberPad.border },
        badgeStyle
      ]}>
        <View 
          ref={contentRef}
          style={[
            styles.contentContainer,
            isOverflowing && { transform: [{ scale }] }
          ]}
          onLayout={onContentLayout}
        >
          {children}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  badge: {
    ...BADGE_STYLE,
    minWidth: 90,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
    color: '#666',
    alignSelf: 'center',
  },
});

export default LabeledBadge;