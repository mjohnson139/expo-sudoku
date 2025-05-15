import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import THEMES from '../utils/themes';

// Helper function to calculate relative luminance for WCAG contrast calculations
function getLuminance(hexColor) {
  // Convert hex to RGB
  let r = parseInt(hexColor.slice(1, 3), 16) / 255;
  let g = parseInt(hexColor.slice(3, 5), 16) / 255;
  let b = parseInt(hexColor.slice(5, 7), 16) / 255;
  
  // Apply gamma correction
  r = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  g = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  b = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  
  // Calculate luminance
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Calculate contrast ratio
function getContrastRatio(color1, color2) {
  const luminance1 = getLuminance(color1);
  const luminance2 = getLuminance(color2);
  
  const brightest = Math.max(luminance1, luminance2);
  const darkest = Math.min(luminance1, luminance2);
  
  return (brightest + 0.05) / (darkest + 0.05);
}

// Evaluate WCAG compliance
function evaluateContrast(ratio) {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA Large';
  return 'Fail';
}

// Component to display a color swatch with text
const ColorSwatch = ({ label, textColor, backgroundColor }) => {
  const ratio = getContrastRatio(textColor, backgroundColor);
  const level = evaluateContrast(ratio);
  
  return (
    <View style={[styles.swatch, { backgroundColor }]}>
      <Text style={[styles.swatchText, { color: textColor }]}>
        {label}
      </Text>
      <Text style={[styles.swatchRatio, { color: textColor }]}>
        {ratio.toFixed(1)}:1 ({level})
      </Text>
    </View>
  );
};

// Main component
const ThemeContrastChecker = ({ themeName = 'classic' }) => {
  const theme = THEMES[themeName];
  const cells = theme.colors.cell;
  
  // Create test cases for important color combinations
  const colorTests = [
    {
      label: 'Initial Value',
      textColor: cells.initialValueText,
      backgroundColor: cells.background,
    },
    {
      label: 'User Value',
      textColor: cells.userValueText,
      backgroundColor: cells.background,
    },
    {
      label: 'Correct Value',
      textColor: cells.correctValueText,
      backgroundColor: cells.background,
    },
    {
      label: 'Incorrect Value',
      textColor: cells.incorrectValueText,
      backgroundColor: cells.background,
    },
    {
      label: 'Incorrect on Error Bg',
      textColor: cells.incorrectValueText,
      backgroundColor: cells.incorrectBackground || '#ffebee',
    },
    {
      label: 'Notes Text',
      textColor: cells.notesText,
      backgroundColor: cells.background,
    },
    {
      label: 'User on Selected',
      textColor: cells.userValueText,
      backgroundColor: cells.selectedBackground,
    },
    {
      label: 'Initial on Prefilled',
      textColor: cells.initialValueText,
      backgroundColor: cells.prefilled || cells.background,
    },
    {
      label: 'User on Related',
      textColor: cells.userValueText,
      backgroundColor: cells.relatedBackground || cells.background,
    },
  ];
  
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{theme.name} Theme Contrast Check</Text>
      <View style={styles.swatchGrid}>
        {colorTests.map((test, index) => (
          <ColorSwatch
            key={index}
            label={test.label}
            textColor={test.textColor}
            backgroundColor={test.backgroundColor}
          />
        ))}
      </View>
      <Text style={styles.legend}>
        WCAG Guidelines: AAA (7:1), AA (4.5:1), AA Large (3:1)
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  swatch: {
    width: '48%',
    height: 80,
    marginBottom: 12,
    borderRadius: 8,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swatchText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  swatchRatio: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  legend: {
    marginTop: 16,
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default ThemeContrastChecker;