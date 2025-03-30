// Build notes for the Sudoku app
// Each version's notes are stored in this file

export const BUILD_NOTES = {
  '1.0.1': {
    title: 'Initial Working Version',
    date: '2023-11-01',
    notes: [
      'Fixed blank screen issue',
      'Added valid initial Sudoku board',
      'Implemented basic cell selection',
      'Added number pad functionality',
      'Created grid layout with proper styling'
    ]
  },
  '1.0.2': {
    title: 'Theme System Implementation',
    date: '2023-11-01',
    notes: [
      'Added theme system with 3 themes (Classic, Dark, Pastel)',
      'Added theme selector button',
      'Fixed bug: initial board numbers are now read-only',
      'Added build number display for tracking changes',
      'Improved UI/UX for better user experience'
    ]
  },
  '1.0.3': {
    title: 'Enhanced Styling & Themes',
    date: '2023-11-01',
    notes: [
      'Improved grid borders for better 3x3 box visibility',
      'Enhanced cell selection styling',
      'Added distinct styling for prefilled cells',
      'Improved theme system with more detailed color options',
      'Added Sunset theme with warm color palette',
      'Fixed styling issues with cell borders'
    ]
  },
  '1.0.4': {
    title: 'Build Notes System',
    date: '2023-11-01',
    notes: [
      'Added build notes system to track changes',
      'Implemented optional floating notes panel',
      'Added toggle button to show/hide build notes',
      'Improved non-intrusive UI for notes display',
      'Notes are now stored in repo for historical tracking'
    ]
  },
  '1.0.5': {
    title: 'Cell Feedback & Theme Expansion',
    date: '2023-11-02',
    notes: [
      'Added cell feedback feature to show correct/incorrect answers',
      'Added feedback toggle switch on game screen',
      'Removed bottom Notes button for cleaner UI',
      'Added three new themes: Sunrise, Ocean, and Twilight',
      'Enhanced theme colors and consistency',
      'Added solution checker for real-time feedback',
    ]
  },
  '1.0.6': {
    title: 'Improved Startup Experience',
    date: '2023-11-02',
    notes: [
      'Added custom startup script (start-app.sh) for consistent port usage',
      'Implemented automatic detection of previous Expo processes',
      'Added option to kill previous processes when starting the app',
      'Fixed potential port conflicts with existing Expo processes',
      'Improved startup reliability across different environments'
    ]
  },
  '1.0.9': {
    title: 'UI Enhancement - Centered Controls',
    date: '2023-11-03',
    notes: [
      'Centered the feedback and theme controls together for better usability',
      'Improved spacing between UI elements',
      'Added gap between controls for cleaner layout',
      'Enhanced UI organization and visual hierarchy',
      'Fixed alignment issues in the control panel'
    ]
  },
  '1.1.0': {
    title: 'Touch Highlighting & Gesture Controls',
    date: '2023-11-03',
    notes: [
      'Added touch-based cell highlighting when sliding finger across board',
      'Implemented gesture tracking system for responsive UI feedback',
      'Enhanced cell interaction with hover effects for all themes',
      'Improved user experience through tactile gesture feedback',
      'Optimized touch responsiveness across the game grid'
    ]
  },
  '1.1.1': {
    title: 'Improved Touch Tracking',
    date: '2023-11-03',
    notes: [
      'Fixed touch tracking when sliding finger across the game board',
      'Simplified cell highlighting system for better performance',
      'Improved hover effect responsiveness during play',
      'Optimized PanResponder implementation for smoother interaction',
      'Enhanced visual feedback when navigating the board with touch'
    ]
  },
  '1.2.0': {
    title: 'Enhanced Touch & Related Cell Highlighting',
    date: '2023-11-03',
    notes: [
      'Completely redesigned touch tracking system for accurate cell selection',
      'Added highlighting for related cells (same row, column, and 3x3 box)',
      'Added highlighting for cells with the same number as the selected cell',
      'Improved touch response during finger sliding across the board',
      'Added distinct visual states for touched vs. selected vs. related cells',
      'Enhanced theme system with new color options for all cell states'
    ]
  },
  '1.2.1': {
    title: 'Touch Tracking System Fix',
    date: '2023-11-03',
    notes: [
      'Fixed touch tracking when sliding finger across the board',
      'Implemented accurate hit detection for cell highlighting',
      'Touch now properly highlights cells as finger moves over them',
      'Cell stays selected when finger is lifted',
      'Fixed position calculations for hit testing',
      'Improved overall touch responsiveness'
    ]
  },
  '1.3.0': {
    title: 'Enhanced Cell Selection & Relations',
    date: '2023-11-04',
    notes: [
      'Improved cell selection system with simple touch interaction',
      'Added visual highlighting for cells in the same row as selected cell',
      'Added visual highlighting for cells in the same column as selected cell',
      'Added visual highlighting for cells in the same 3x3 box as selected cell',
      'Added visual highlighting for cells with the same value as selected cell',
      'Implemented distinct colors for different types of related cells',
      'Enhanced theme system with new color options for cell relations'
    ]
  },
  '1.3.1': {
    title: 'Enhanced Preselected Cell Styling',
    date: '2023-11-04',
    notes: [
      'Improved visual distinction between preselected cells and selected cells',
      'Added green tint backgrounds for initial cells to make them stand out',
      'Made initial cell numbers slightly larger and bolder',
      'Enhanced color scheme to differentiate between initial values and user inputs',
      'Updated all themes with dedicated initial cell styling'
    ]
  },
  '1.3.2': {
    title: 'Simplified Cell Background Styling',
    date: '2023-11-04',
    notes: [
      'Removed distinct background color for prefilled cells',
      'Maintained larger and bolder text for prefilled numbers',
      'Unified background appearance across all regular cells',
      'Improved visual clarity by relying on text styling for prefilled cells',
      'Enhanced overall board consistency'
    ]
  }
};

export default BUILD_NOTES;