// Theme system for the Sudoku app
export const THEMES = {
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
        prefilled: '#f0f8ff', // Light blue background for prefilled cells
        selectedBackground: '#b3d7ff', // Increased contrast from #c2e3ff
        initialValueText: '#000000',
        userValueText: '#0057b8', // Darkened from #0066cc for better contrast
        correctValueText: '#006400', // Dark green for correct values
        incorrectValueText: '#cc0000', // Red for incorrect values
        incorrectBackground: '#ffebee', // Light red background for incorrect values
        textFont: 'normal',
        hoverBackground: '#e1f5fe', // Light blue hover effect
        touchedBackground: '#d4e9fd', // Slightly dimmer than selected
        relatedBackground: '#ecf5fe', // Very light blue for related cells
        boxRelatedBackground: '#edf8ff', // Very light blue for box highlighting
        rowRelatedBackground: '#f3f9ff', // Even lighter blue for row highlighting
        columnRelatedBackground: '#f0f6ff', // Slightly different for column highlighting
        sameValueBackground: '#e6f4ff', // Another shade for same value highlighting
        initialCellBackground: '#e6f2e6', // Light green tint for initial cells
        notesText: '#4a648c', // Darkened from #6d81ad for better contrast
      },
      numberPad: {
        background: '#f0f0f0',
        border: '#555555',
        text: '#333333',
        shadow: '#000000',
        clearButton: '#ffe0e0',
        notesBackground: '#e6f2fd', // Light blue background for notes mode
      }
    }
  },
  dark: {
    name: 'Dark',
    colors: {
      background: '#121212',
      title: '#ffffff',
      grid: {
        background: '#1e1e1e',
        border: '#ffffff',
        boxBorder: '#aaaaaa', // Thicker border for 3x3 boxes
        cellBorder: '#444444',
        innerBorder: '#666666',
      },
      cell: {
        background: '#2c2c2c',
        prefilled: '#2a3040', // Darker blue tint for prefilled cells
        selectedBackground: '#466284', // Enhanced from #3a506b for more contrast
        initialValueText: '#ffffff',
        userValueText: '#82c4ff', // Lightened from #64b5f6 for better contrast
        correctValueText: '#5cda60', // Brightened green from #4caf50 for better contrast
        incorrectValueText: '#ff6b6b', // Brightened red from #ff5252 for better contrast
        incorrectBackground: '#3a1c1c', // Dark red background for incorrect values
        textFont: 'normal',
        hoverBackground: '#263238', // Dark blue hover effect
        touchedBackground: '#34465a', // Slightly dimmer than selected
        relatedBackground: '#2d3745', // Subtle highlight for dark theme
        boxRelatedBackground: '#2a394a', // Darker blue-gray for box highlighting
        rowRelatedBackground: '#293645', // Slightly different for row highlighting
        columnRelatedBackground: '#2d3c4e', // Different shade for column highlighting
        sameValueBackground: '#303f51', // Another shade for same value highlighting
        initialCellBackground: '#264026', // Dark green tint for initial cells
        notesText: '#a8c7ff', // Brightened from #8ab4f8 for better contrast
      },
      numberPad: {
        background: '#333333',
        border: '#666666',
        text: '#ffffff',
        shadow: '#000000',
        clearButton: '#b71c1c',
        notesBackground: '#263c5a', // Darker blue background for notes mode
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
        boxBorder: '#5b6a87', // Added boxBorder which was missing
        cellBorder: '#d0d8e6',
        innerBorder: '#a6b1cb',
      },
      cell: {
        background: '#ffffff',
        prefilled: '#f0f4ff', // Added prefilled color which was missing
        selectedBackground: '#c9e0ff', // Darkened from #dbeeff for better contrast
        initialValueText: '#5b6a87',
        userValueText: '#4a6ca8', // Darkened from #638ecb for better contrast
        correctValueText: '#2e7d32', // Added correctValueText which was missing
        incorrectValueText: '#c62828', // Added incorrectValueText which was missing
        incorrectBackground: '#ffebee', // Added incorrectBackground
        textFont: 'normal',
        hoverBackground: '#e9f0fa', // Added hover effect
        touchedBackground: '#d9e7f7', // Added touched background
        relatedBackground: '#edf3fa', // Added related background
        boxRelatedBackground: '#e5eff8', // Added box related background
        rowRelatedBackground: '#edf5ff', // Added row related background
        columnRelatedBackground: '#e9f1f8', // Added column related background
        sameValueBackground: '#e1edfb', // Added same value background
        initialCellBackground: '#ebf5eb', // Light green tint for initial cells
        notesText: '#687a9e', // Darkened from #8ca2c0 for better contrast
      },
      numberPad: {
        background: '#edf2f7',
        border: '#a6b1cb',
        text: '#5b6a87',
        shadow: '#d0d8e6',
        clearButton: '#ffd6d6',
        notesBackground: '#e6eef7', // Soft blue background for notes mode
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
        prefilled: '#fff3e0', // Cream background for prefilled cells
        selectedBackground: '#ffcd85', // Darkened from #ffe0b2 for better contrast
        initialValueText: '#b34500', // Darkened from #e65100 for better contrast
        userValueText: '#d17000', // Darkened from #ff8f00 for better contrast
        correctValueText: '#1e5e24', // Darkened from #2e7d32 for better contrast
        incorrectValueText: '#b50000', // Slightly darkened from #d50000
        incorrectBackground: '#ffedeb', // Light red background for incorrect values
        textFont: 'normal',
        hoverBackground: '#fff8e1', // Light yellow hover effect
        touchedBackground: '#ffedc9', // Light orange for touched
        relatedBackground: '#fff3e0', // Very light orange for related
        boxRelatedBackground: '#fff6e6', // Light warm yellow for box highlighting
        rowRelatedBackground: '#fff8ed', // Very light warm yellow for row highlighting
        columnRelatedBackground: '#fff5e0', // Slightly different for column highlighting
        sameValueBackground: '#fff0d6', // Another shade for same value highlighting
        initialCellBackground: '#e6f0e2', // Light warm green tint for initial cells
        notesText: '#d17200', // Darkened from #ff9800 for better contrast
      },
      numberPad: {
        background: '#ffe0b2',
        border: '#ffb74d',
        text: '#e65100',
        shadow: '#ffcc80',
        clearButton: '#ffab91',
        notesBackground: '#fff0d9', // Light orange background for notes mode
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
        prefilled: '#fdebd0', // Light peach background for prefilled cells
        selectedBackground: '#f8c982', // Darker from #fad7a0 for better contrast
        initialValueText: '#a82c1e', // Darkened from #c0392b for better contrast
        userValueText: '#c26818', // Darkened from #e67e22 for better contrast
        correctValueText: '#1e8449', // Darkened from #27ae60 for better contrast
        incorrectValueText: '#a82c1e', // Changed to be distinct from userValueText
        incorrectBackground: '#fee5e0', // Added light red background for incorrect values
        textFont: 'normal',
        hoverBackground: '#fef5e7', // Light peach hover effect
        touchedBackground: '#fce2c4', // Light peach for touched
        relatedBackground: '#fef0e2', // Very light peach for related
        boxRelatedBackground: '#fef0e4', // Light peach for box highlighting
        rowRelatedBackground: '#fef4eb', // Very light peach for row highlighting
        columnRelatedBackground: '#feefe0', // Slightly different for column highlighting
        sameValueBackground: '#fee8d5', // Another shade for same value highlighting
        initialCellBackground: '#e5f0e2', // Light green tint with sunrise warmth
        notesText: '#b35c00', // Darkened from #e67e22 for better contrast
      },
      numberPad: {
        background: '#fef2cc',
        border: '#f39c12',
        text: '#d35400',
        shadow: '#f39c12',
        clearButton: '#f1c40f',
        notesBackground: '#fdf1e0', // Light orange background for notes mode
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
        prefilled: '#b3e5fc', // Light blue background for prefilled cells
        selectedBackground: '#64c8f9', // Darker from #81d4fa for better contrast
        initialValueText: '#014880', // Slightly darkened from #01579b
        userValueText: '#0175b5', // Darkened from #0288d1 for better contrast
        correctValueText: '#00796b', // Slightly darkened from #00897b
        incorrectValueText: '#c12626', // Slightly darkened from #d32f2f
        incorrectBackground: '#ffeaee', // Light red background for incorrect values
        textFont: 'normal',
        hoverBackground: '#e1f5fe', // Light blue hover effect
        touchedBackground: '#b4e0fc', // Medium blue for touched
        relatedBackground: '#e0f4fe', // Very light blue for related
        boxRelatedBackground: '#e1f5fd', // Light blue for box highlighting
        rowRelatedBackground: '#e8f8fe', // Very light blue for row highlighting
        columnRelatedBackground: '#e4f6fd', // Slightly different for column highlighting
        sameValueBackground: '#d9f0fa', // Another shade for same value highlighting
        initialCellBackground: '#d9efe8', // Light teal-green tint for initial cells
        notesText: '#0277bd', // Darkened from #039be5 for better contrast
      },
      numberPad: {
        background: '#b3e5fc',
        border: '#4fc3f7',
        text: '#01579b',
        shadow: '#4fc3f7',
        clearButton: '#80deea',
        notesBackground: '#dbf0fa', // Light blue background for notes mode
      }
    }
  },
  twilight: {
    name: 'Twilight',
    colors: {
      background: '#292838', // Deep blue-purple background
      title: '#a495e6',
      grid: {
        background: '#353346',
        border: '#7b68ee',
        boxBorder: '#9575cd', // Thicker border for 3x3 boxes
        cellBorder: '#4a4462',
        innerBorder: '#65599b',
      },
      cell: {
        background: '#353346',
        prefilled: '#3a3654', // Darker purple background for prefilled cells
        selectedBackground: '#604e9e', // Increased contrast from #4e4376
        initialValueText: '#cfc0f2', // Lightened from #b39ddb for better contrast
        userValueText: '#b296ef', // Lightened from #9575cd for better contrast
        correctValueText: '#97da9a', // Lightened from #81c784 for better contrast
        incorrectValueText: '#ff8a8a', // Lightened from #e57373 for better contrast
        incorrectBackground: '#4a2f2f', // Dark red background for incorrect values
        textFont: 'normal',
        hoverBackground: '#4a4169', // Slightly lighter purple for hover
        touchedBackground: '#473e6d', // Medium purple for touched
        relatedBackground: '#3c3854', // Subtle highlight for dark theme
        boxRelatedBackground: '#383550', // Purple for box highlighting
        rowRelatedBackground: '#353347', // Slightly different for row highlighting
        columnRelatedBackground: '#3a3852', // Another shade for column highlighting
        sameValueBackground: '#3e3c59', // Another shade for same value highlighting
        initialCellBackground: '#2e3c2e', // Dark green tint for initial cells
        notesText: '#c9bcf0', // Lightened from #b39ddb for better contrast
      },
      numberPad: {
        background: '#4a4462',
        border: '#65599b',
        text: '#b39ddb',
        shadow: '#1a1625',
        clearButton: '#7986cb',
        notesBackground: '#3a3558', // Dark purple background for notes mode
      }
    }
  }
};

export default THEMES;