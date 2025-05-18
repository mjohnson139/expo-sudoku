import React from 'react';
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
 */
const LabeledBadge = ({ 
  label, 
  badgeStyle = {}, 
  theme,
  backgroundColor,
  children,
  containerStyle = {} 
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      
      <View style={[
        styles.badge,
        { backgroundColor: backgroundColor || theme.colors.numberPad.border },
        badgeStyle
      ]}>
        {children}
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
    minWidth: 80,
    height: 30,
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