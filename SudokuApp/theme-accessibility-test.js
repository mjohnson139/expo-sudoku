// Theme accessibility test script
import THEMES from './utils/themes';

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
  if (ratio >= 3) return 'AA Large Text';
  return 'Fail';
}

// Test color combinations for each theme
function testThemeAccessibility() {
  const results = {};
  
  Object.keys(THEMES).forEach(themeName => {
    const theme = THEMES[themeName];
    const cells = theme.colors.cell;
    const grid = theme.colors.grid;
    
    console.log(`\n===== Testing ${theme.name} Theme =====`);
    
    // Test important color combinations
    const tests = [
      {
        name: 'Initial Value Text on Background',
        foreground: cells.initialValueText,
        background: cells.background,
      },
      {
        name: 'User Value Text on Background',
        foreground: cells.userValueText,
        background: cells.background,
      },
      {
        name: 'Correct Value Text on Background',
        foreground: cells.correctValueText,
        background: cells.background,
      },
      {
        name: 'Incorrect Value Text on Background',
        foreground: cells.incorrectValueText,
        background: cells.background,
      },
      {
        name: 'Incorrect Value Text on Incorrect Background',
        foreground: cells.incorrectValueText,
        background: cells.incorrectBackground || '#ffebee',
      },
      {
        name: 'Notes Text on Background',
        foreground: cells.notesText,
        background: cells.background,
      },
      {
        name: 'User Value Text on Selected Background',
        foreground: cells.userValueText,
        background: cells.selectedBackground,
      },
      {
        name: 'Initial Value Text on Prefilled Background',
        foreground: cells.initialValueText,
        background: cells.prefilled || cells.background,
      },
      {
        name: 'User Value Text on Related Background',
        foreground: cells.userValueText,
        background: cells.relatedBackground || cells.background,
      },
    ];
    
    results[themeName] = tests.map(test => {
      const ratio = getContrastRatio(test.foreground, test.background);
      const level = evaluateContrast(ratio);
      console.log(`${test.name}: ${ratio.toFixed(2)} (${level})`);
      
      return {
        ...test,
        ratio,
        level,
      };
    });
  });
  
  return results;
}

// Run tests
const accessibilityResults = testThemeAccessibility();

// Export results for potential use in UI
export default accessibilityResults;