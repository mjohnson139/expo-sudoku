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
  },
  '1.4.0': {
    title: 'Invisible Joystick Navigation',
    date: '2023-11-05',
    notes: [
      'Added gesture-based navigation system that works like an invisible joystick',
      'Press anywhere on the grid and slide in a direction to move the selected cell',
      'Added toggle switch to enable/disable the joystick feature',
      'Joystick activates from any touch point, making one-handed play easier',
      'Cell selection moves in the direction of finger movement'
    ]
  },
  '1.5.0': {
    title: 'Improved Number Pad Interaction',
    date: '2023-11-06',
    notes: [
      'Updated number pad to toggle numbers in cells instead of just setting them',
      'Tapping a number that already exists in a cell now clears the cell',
      'Removed the clear button for cleaner interface',
      'Added automatic disabling of number buttons when a number has been used 9 times',
      'Visual feedback shows disabled numbers with reduced opacity',
      'Improved overall game flow and usability'
    ]
  },
  '1.5.1': {
    title: 'Adjustable Joystick Sensitivity',
    date: '2023-11-07',
    notes: [
      'Added controls to adjust joystick sensitivity',
      'Sensitivity can be increased or decreased in increments of 0.1',
      'Lower values make the joystick more sensitive (responds to smaller movements)',
      'Higher values make the joystick less sensitive (requires larger movements)',
      'Sensitivity setting is only shown when joystick is enabled',
      'Valid range from 0.5 to 20.0 for different user preferences'
    ]
  },
  '1.5.2': {
    title: 'Global Joystick & Enhanced Controls',
    date: '2023-11-08',
    notes: [
      'Implemented full-screen joystick navigation that works everywhere on the screen',
      'Changed joystick sensitivity increments to 0.5 for faster adjustments',
      'Updated default joystick sensitivity to 12.0 for better control',
      'Smart touch detection avoids interfering with buttons and controls',
      'Improved user experience with one-handed gameplay anywhere on screen',
      'Added measurement system to determine interactive vs. joystick areas'
    ]
  },
  '1.5.4': {
    title: 'Restored Board-Only Joystick',
    date: '2023-11-09',
    notes: [
      'Reverted to the original joystick implementation that works only on the game board',
      'Maintained the adjustable sensitivity controls (0.5 increments)',
      'Kept the default sensitivity value of 12.0 for optimal control',
      'Removed the global overlay joystick that caused interaction issues',
      'Simplified the architecture for better reliability and performance',
      'Enhanced focus on gameplay within the board area'
    ]
  },
  '1.6.0': {
    title: 'Cell Notes Feature',
    date: '2023-11-10',
    notes: [
      'Added the ability to place notes in empty cells',
      'Cell notes display as small numbers in a 3×3 grid within each cell',
      'Added a toggle switch for "Notes Mode" that changes number input behavior',
      'In Notes Mode, tapping a number adds/removes it from selected cell\'s notes',
      'Visual indicators show when Notes Mode is active (button styling and label)',
      'Notes are automatically removed when a cell value is set',
      'Number pad is fully usable in Notes Mode even for maxed-out digits',
      'Added theme support with appropriate colors for notes in all themes'
    ]
  },
  '1.6.1': {
    title: 'Enhanced Notes with Smart Auto-Clearing',
    date: '2023-11-11',
    notes: [
      'Added pencil icon toggle for notes mode in a compact toolbar',
      'Implemented smart auto-clearing of notes when related cells are filled',
      'Notes are now removed when a number is placed in the same row, column, or 3×3 box',
      'Improved visual styling of notes mode toggle button',
      'Simplified the UI by moving notes toggle to the number pad area',
      'Reduced screen space usage of controls for better gameplay experience',
      'Improved overall notes management for better Sudoku solving workflow'
    ]
  },
  '1.6.2': {
    title: 'Compact Notes Button Redesign',
    date: '2023-11-12',
    notes: [
      'Redesigned the notes toggle to match the build info button style',
      'Added a small pencil icon (✏️) for the notes mode button',
      'Made the notes button more compact and space-efficient',
      'Notes button now shows active state with highlighted background',
      'Removed redundant UI elements to create a more streamlined interface',
      'Better visual consistency with other UI controls'
    ]
  },
  '1.6.3': {
    title: 'Development Guidelines Update',
    date: '2025-04-02',
    notes: [
      'Added comprehensive custom coding instructions',
      'Updated development workflow documentation',
      'Added best practices for React Native Expo development',
      'Documented folder structure and build notes guidelines',
      'Improved version management procedures'
    ]
  },
  '1.7.0': {
    title: 'Android Performance Optimization',
    date: '2025-04-02',
    notes: [
      'Removed joystick navigation feature to improve performance on Android devices',
      'Optimized Grid component with enhanced memoization to reduce unnecessary renders',
      'Improved Cell component rendering with conditional optimizations',
      'Added useCallback for event handlers to prevent function recreation',
      'Restructured component hierarchy for better performance',
      'Reduced lag when tapping cells and inputting numbers'
    ]
  },
  '1.7.1': {
    title: 'EAS Build from GitHub Setup',
    date: '2025-04-14',
    notes: [
      'Added EAS build configuration for GitHub Actions',
      'Created workflow for automated builds on main branch updates',
      'Added support for building both Android and iOS platforms',
      'Configured project for CI/CD pipeline integration',
      'Setup proper directory structure for EAS builds'
    ]
  },
  '1.7.2': {
    title: 'Removed Hard-coded Boards',
    date: '2025-04-20',
    notes: [
      'Removed hard-coded initialBoard and BOARDS constants in GameScreen.js',
      'Introduced emptyBoard placeholder for sudoku-gen integration'
    ]
  },
  '1.8.0': {
    title: 'Dynamic Puzzle Generation',
    date: '2025-04-20',
    notes: [
      'Integrated sudoku-gen library for dynamic puzzle generation',
      'Implemented boardFactory utility with puzzle and solution generation',
      'Updated GameScreen to use boardFactory and dynamic boards and solutions'
    ]
  },
  '1.9.0': {
    title: 'Expanded Difficulty Levels',
    date: '2025-04-20',
    notes: [
      'Added Medium and Expert difficulty options to game menu',
      'Updated UI to select Easy, Medium, Hard, Expert',
      'Bumped build number to 1.9.0'
    ]
  },
  '2.0.0': {
    title: 'Switch to EAS Update Workflow',
    date: '2025-04-23',
    notes: [
      'Major workflow change: migrated from EAS Build to EAS Update for CI/CD',
      'Removed failing iOS build process from GitHub Actions',
      'Now using branch-based EAS Update for instant over-the-air updates',
      'Improved release process and simplified build management',
      'This marks the start of a new, more agile development workflow'
    ]
  },
  '2.1.0': {
    title: 'Major Code Refactoring',
    date: '2025-04-28',
    notes: [
      'Complete refactoring of GameScreen component using context-based architecture',
      'Added GameContext with reducer pattern for centralized state management',
      'Extracted UI into dedicated components: GameHeader, GameTimer, GameOptions, GameToolBar',
      'Created separate modal components: GameMenuModal and WinModal',
      'Implemented utility files for game logic and undo/redo management',
      'Redesigned GameToolBar with improved layout including undo, notes, pause and redo buttons',
      'Reduced GameScreen from ~1000 lines to under 100 lines for better maintainability',
      'Prepared architecture for upcoming AsyncStorage implementation'
    ]
  },
  '2.2.0': {
    title: 'UI and UX Improvements',
    date: '2025-05-07',
    notes: [
      'Added dedicated GameTopStrip component that aligns perfectly with the game grid',
      'Fixed timer to only start after a game has actually been started',
      'Moved theme selector from top strip to the game menu for a cleaner interface',
      'Redesigned pause button to be icon-only for minimal visual interference',
      'Removed large pause icon from the pause modal for a cleaner design',
      'Changed "Quit to Menu" button to "Quit Game" for clarity',
      'Made timer text more consistent with the game\'s overall theme',
      'Added gameStarted flag to improve game state management'
    ]
  }
};

export default BUILD_NOTES;