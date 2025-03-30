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
  }
};

export default BUILD_NOTES;