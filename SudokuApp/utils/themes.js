// Theme system for the Sudoku app
export const SUDOKU_THEMES = {
  classic: {
    name: 'Classic',
    colors: {
      background: '#f8f8f8',
      title: '#333333',
      grid: {
        background: '#ffffff',
        border: '#000000',
        boxBorder: '#333333', // Thicker border for 3x3 boxes
        cellBorder: '#aaaaaa',
        innerBorder: '#666666',
      },
      cell: {
        background: '#ffffff',
        prefilled: '#ffffff', // No background color for prefilled cells
        selectedBackground: '#add8e6', // Standard light blue highlight for all themes
        initialValueText: '#000000',
        userValueText: '#0057b8', // Darkened from #0066cc for better contrast
        correctValueText: '#006400', // Dark green for correct values
        incorrectValueText: '#cc0000', // Red for incorrect values
        incorrectBackground: '#ffebee', // Light red background for incorrect values
        textFont: 'normal',
        hoverBackground: '#e1f5fe', // Light blue hover effect
        touchedBackground: '#d4e9fd', // Slightly dimmer than selected
        relatedBackground: '#f2f2f2', // Darker shade of board background
        boxRelatedBackground: '#f2f2f2', // Same as related background
        rowRelatedBackground: '#f2f2f2', // Same as related background
        columnRelatedBackground: '#f2f2f2', // Same as related background
        sameValueBackground: '#f2f2f2', // Same as related background
        initialCellBackground: '#ffffff', // No special background for initial cells
        notesText: '#4a648c', // Darkened from #6d81ad for better contrast
      },
      numberPad: {
        background: '#f0f0f0',
        border: '#555555',
        text: '#333333',
        shadow: '#000000',
        clearButton: '#ffe0e0',
        notesBackground: '#e6f2fd', // Light blue background for notes mode
      },
      difficulty: {
        easy: '#d4edda',    // Green for easy
        medium: '#ffeeba',  // Yellow for medium
        hard: '#f8d7da',    // Pink for hard
        expert: '#f8d7da'   // Pink for expert (same as hard)
      }
    }
  },
  dark: {
    name: 'Dark',
    colors: {
      background: '#121212',
      title: '#ffffff',
      grid: {
        background: '#d3d3d3', // Light gray
        border: '#ffffff',
        boxBorder: '#aaaaaa', // Thicker border for 3x3 boxes
        cellBorder: '#444444',
        innerBorder: '#666666',
      },
      cell: {
        background: '#2c2c2c',
        prefilled: '#2c2c2c', // No background color for prefilled cells
        selectedBackground: '#4d88ff', // Brighter blue highlight for dark theme
        initialValueText: '#ffffff',
        userValueText: '#82c4ff', // Lightened from #64b5f6 for better contrast
        correctValueText: '#5cda60', // Brightened green from #4caf50 for better contrast
        incorrectValueText: '#ff6b6b', // Brightened red from #ff5252 for better contrast
        incorrectBackground: '#3a1c1c', // Dark red background for incorrect values
        textFont: 'normal',
        hoverBackground: '#263238', // Dark blue hover effect
        touchedBackground: '#34465a', // Slightly dimmer than selected
        relatedBackground: '#232323', // Darker shade of board background
        boxRelatedBackground: '#232323', // Same as related background
        rowRelatedBackground: '#232323', // Same as related background
        columnRelatedBackground: '#232323', // Same as related background
        sameValueBackground: '#232323', // Same as related background
        initialCellBackground: '#2c2c2c', // No special background for initial cells
        notesText: '#a8c7ff', // Brightened from #8ab4f8 for better contrast
      },
      numberPad: {
        background: '#333333',
        border: '#666666',
        text: '#ffffff',
        shadow: '#000000',
        clearButton: '#b71c1c',
        notesBackground: '#263c5a', // Darker blue background for notes mode
      },
      difficulty: {
        easy: '#1c4a23',    // Dark green for easy
        medium: '#93702a',  // Dark gold for medium
        hard: '#842029',    // Dark red for hard
        expert: '#842029'   // Dark red for expert (same as hard)
      }
    }
  },
  pastel: {
    name: 'Pastel',
    colors: {
      background: '#f0f4f8',
      title: '#5b6a87',
      grid: {
        background: '#ffffff',
        border: '#5b6a87',
        boxBorder: '#5b6a87',
        cellBorder: '#d0d8e6',
        innerBorder: '#a6b1cb',
      },
      cell: {
        background: '#ffffff',
        prefilled: '#ffffff', // No background color for prefilled cells
        selectedBackground: '#add8e6', // Standard light blue highlight
        initialValueText: '#5b6a87',
        userValueText: '#4a6ca8', // Darkened from #638ecb for better contrast
        correctValueText: '#2e7d32', // Added correctValueText which was missing
        incorrectValueText: '#c62828', // Added incorrectValueText which was missing
        incorrectBackground: '#ffebee', // Added incorrectBackground
        textFont: 'normal',
        hoverBackground: '#e9f0fa', // Added hover effect
        touchedBackground: '#d9e7f7', // Added touched background
        relatedBackground: '#f0f0f7', // Darker shade of board background
        boxRelatedBackground: '#f0f0f7', // Same as related background
        rowRelatedBackground: '#f0f0f7', // Same as related background
        columnRelatedBackground: '#f0f0f7', // Same as related background
        sameValueBackground: '#f0f0f7', // Same as related background
        initialCellBackground: '#ffffff', // No special background for initial cells
        notesText: '#687a9e', // Darkened from #8ca2c0 for better contrast
      },
      numberPad: {
        background: '#edf2f7',
        border: '#a6b1cb',
        text: '#5b6a87',
        shadow: '#d0d8e6',
        clearButton: '#ffd6d6',
        notesBackground: '#e6eef7', // Soft blue background for notes mode
      },
      difficulty: {
        easy: '#d4edda',    // Green for easy
        medium: '#ffeeba',  // Yellow for medium
        hard: '#f8d7da',    // Pink for hard
        expert: '#f8d7da'   // Pink for expert (same as hard)
      }
    }
  },
  sunset: {
    name: 'Sunset',
    colors: {
      background: '#fff8e1', // Warm yellow background
      title: '#ff6f00',
      grid: {
        background: '#fffbf0',
        border: '#ff6f00',
        boxBorder: '#ff9800', // Thicker border for 3x3 boxes
        cellBorder: '#ffcc80',
        innerBorder: '#ffb74d',
      },
      cell: {
        background: '#fffbf0',
        prefilled: '#fffbf0', // No background color for prefilled cells
        selectedBackground: '#add8e6', // Standard light blue highlight
        initialValueText: '#b34500', // Darkened from #e65100 for better contrast
        userValueText: '#d17000', // Darkened from #ff8f00 for better contrast
        correctValueText: '#1e5e24', // Darkened from #2e7d32 for better contrast
        incorrectValueText: '#b50000', // Slightly darkened from #d50000
        incorrectBackground: '#ffedeb', // Light red background for incorrect values
        textFont: 'normal',
        hoverBackground: '#fff8e1', // Light yellow hover effect
        touchedBackground: '#ffedc9', // Light orange for touched
        relatedBackground: '#f9f0dd', // Darker shade of board background
        boxRelatedBackground: '#f9f0dd', // Same as related background
        rowRelatedBackground: '#f9f0dd', // Same as related background
        columnRelatedBackground: '#f9f0dd', // Same as related background
        sameValueBackground: '#f9f0dd', // Same as related background
        initialCellBackground: '#fffbf0', // No special background for initial cells
        notesText: '#d17200', // Darkened from #ff9800 for better contrast
      },
      numberPad: {
        background: '#ffe0b2',
        border: '#ffb74d',
        text: '#e65100',
        shadow: '#ffcc80',
        clearButton: '#ffab91',
        notesBackground: '#fff0d9', // Light orange background for notes mode
      },
      difficulty: {
        easy: '#d4edda',    // Green for easy
        medium: '#ffeeba',  // Yellow for medium
        hard: '#f8d7da',    // Pink for hard
        expert: '#f8d7da'   // Pink for expert (same as hard)
      }
    }
  },
  sunrise: {
    name: 'Sunrise',
    colors: {
      background: '#fef6e8', // Soft cream background
      title: '#d35400',
      grid: {
        background: '#fff9f1',
        border: '#e74c3c',
        boxBorder: '#d35400', // Thicker border for 3x3 boxes
        cellBorder: '#f7cdb5',
        innerBorder: '#f39c12',
      },
      cell: {
        background: '#fff9f1',
        prefilled: '#fff9f1', // No background color for prefilled cells
        selectedBackground: '#add8e6', // Standard light blue highlight
        initialValueText: '#a82c1e', // Darkened from #c0392b for better contrast
        userValueText: '#c26818', // Darkened from #e67e22 for better contrast
        correctValueText: '#1e8449', // Darkened from #27ae60 for better contrast
        incorrectValueText: '#a82c1e', // Changed to be distinct from userValueText
        incorrectBackground: '#fee5e0', // Added light red background for incorrect values
        textFont: 'normal',
        hoverBackground: '#fef5e7', // Light peach hover effect
        touchedBackground: '#fce2c4', // Light peach for touched
        relatedBackground: '#f7ede0', // Darker shade of board background
        boxRelatedBackground: '#f7ede0', // Same as related background
        rowRelatedBackground: '#f7ede0', // Same as related background
        columnRelatedBackground: '#f7ede0', // Same as related background
        sameValueBackground: '#f7ede0', // Same as related background
        initialCellBackground: '#fff9f1', // No special background for initial cells
        notesText: '#b35c00', // Darkened from #e67e22 for better contrast
      },
      numberPad: {
        background: '#fef2cc',
        border: '#f39c12',
        text: '#d35400',
        shadow: '#f39c12',
        clearButton: '#f1c40f',
        notesBackground: '#fdf1e0', // Light orange background for notes mode
      },
      difficulty: {
        easy: '#d4edda',    // Green for easy
        medium: '#ffeeba',  // Yellow for medium
        hard: '#f8d7da',    // Pink for hard
        expert: '#f8d7da'   // Pink for expert (same as hard)
      }
    }
  },
  ocean: {
    name: 'Ocean',
    colors: {
      background: '#e0f7fa', // Light cyan background
      title: '#0277bd',
      grid: {
        background: '#e8f5f8',
        border: '#0288d1',
        boxBorder: '#0277bd', // Thicker border for 3x3 boxes
        cellBorder: '#b3e5fc',
        innerBorder: '#4fc3f7',
      },
      cell: {
        background: '#e8f5f8',
        prefilled: '#e8f5f8', // No background color for prefilled cells
        selectedBackground: '#add8e6', // Standard light blue highlight
        initialValueText: '#014880', // Slightly darkened from #01579b
        userValueText: '#0175b5', // Darkened from #0288d1 for better contrast
        correctValueText: '#00796b', // Slightly darkened from #00897b
        incorrectValueText: '#c12626', // Slightly darkened from #d32f2f
        incorrectBackground: '#ffeaee', // Light red background for incorrect values
        textFont: 'normal',
        hoverBackground: '#e1f5fe', // Light blue hover effect
        touchedBackground: '#b4e0fc', // Medium blue for touched
        relatedBackground: '#daeaed', // Darker shade of board background
        boxRelatedBackground: '#daeaed', // Same as related background
        rowRelatedBackground: '#daeaed', // Same as related background
        columnRelatedBackground: '#daeaed', // Same as related background
        sameValueBackground: '#daeaed', // Same as related background
        initialCellBackground: '#e8f5f8', // No special background for initial cells
        notesText: '#0277bd', // Darkened from #039be5 for better contrast
      },
      numberPad: {
        background: '#b3e5fc',
        border: '#4fc3f7',
        text: '#01579b',
        shadow: '#4fc3f7',
        clearButton: '#80deea',
        notesBackground: '#dbf0fa', // Light blue background for notes mode
      },
      difficulty: {
        easy: '#d4edda',    // Green for easy
        medium: '#ffeeba',  // Yellow for medium
        hard: '#f8d7da',    // Pink for hard
        expert: '#f8d7da'   // Pink for expert (same as hard)
      }
    }
  },
  twilight: {
    name: 'Twilight',
    colors: {
      background: '#292838', // Deep blue-purple background
      title: '#a495e6',
      grid: {
        background: '#7a778c', // 45% lighter than #353346
        border: '#7b68ee',
        boxBorder: '#9575cd', // Thicker border for 3x3 boxes
        cellBorder: '#4a4462',
        innerBorder: '#65599b',
      },
      cell: {
        background: '#353346',
        prefilled: '#353346', // No background color for prefilled cells
        selectedBackground: '#7d6af9', // Bright purple-blue highlight for twilight theme
        initialValueText: '#cfc0f2', // Lightened from #b39ddb for better contrast
        userValueText: '#b296ef', // Lightened from #9575cd for better contrast
        correctValueText: '#97da9a', // Lightened from #81c784 for better contrast
        incorrectValueText: '#ff8a8a', // Lightened from #e57373 for better contrast
        incorrectBackground: '#4a2f2f', // Dark red background for incorrect values
        textFont: 'normal',
        hoverBackground: '#4a4169', // Slightly lighter purple for hover
        touchedBackground: '#473e6d', // Medium purple for touched
        relatedBackground: '#2d2b3b', // Darker shade of board background
        boxRelatedBackground: '#2d2b3b', // Same as related background
        rowRelatedBackground: '#2d2b3b', // Same as related background
        columnRelatedBackground: '#2d2b3b', // Same as related background
        sameValueBackground: '#2d2b3b', // Same as related background
        initialCellBackground: '#353346', // No special background for initial cells
        notesText: '#c9bcf0', // Lightened from #b39ddb for better contrast
      },
      numberPad: {
        background: '#4a4462',
        border: '#65599b',
        text: '#b39ddb',
        shadow: '#1a1625',
        clearButton: '#7986cb',
        notesBackground: '#3a3558', // Dark purple background for notes mode
      },
      difficulty: {
        easy: '#1c4a23',    // Dark green for easy
        medium: '#93702a',  // Dark gold for medium
        hard: '#842029',    // Dark red for hard
        expert: '#842029'   // Dark red for expert (same as hard)
      }
    }
  }
};

export default SUDOKU_THEMES;