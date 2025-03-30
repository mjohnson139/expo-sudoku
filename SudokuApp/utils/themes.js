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
        selectedBackground: '#c2e3ff',
        initialValueText: '#000000',
        userValueText: '#0066cc',
        correctValueText: '#006400', // Dark green for correct values
        incorrectValueText: '#cc0000', // Red for incorrect values
        textFont: 'normal',
      },
      numberPad: {
        background: '#f0f0f0',
        border: '#555555',
        text: '#333333',
        shadow: '#000000',
        clearButton: '#ffe0e0',
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
        selectedBackground: '#3a506b',
        initialValueText: '#ffffff',
        userValueText: '#64b5f6',
        correctValueText: '#4caf50', // Green for correct values
        incorrectValueText: '#ff5252', // Red for incorrect values
        textFont: 'normal',
      },
      numberPad: {
        background: '#333333',
        border: '#666666',
        text: '#ffffff',
        shadow: '#000000',
        clearButton: '#b71c1c',
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
        cellBorder: '#d0d8e6',
        innerBorder: '#a6b1cb',
      },
      cell: {
        background: '#ffffff',
        selectedBackground: '#dbeeff',
        initialValueText: '#5b6a87',
        userValueText: '#638ecb',
        textFont: 'normal',
      },
      numberPad: {
        background: '#edf2f7',
        border: '#a6b1cb',
        text: '#5b6a87',
        shadow: '#d0d8e6',
        clearButton: '#ffd6d6',
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
        selectedBackground: '#ffe0b2',
        initialValueText: '#e65100',
        userValueText: '#ff8f00',
        correctValueText: '#2e7d32', // Dark green for correct values
        incorrectValueText: '#d50000', // Red for incorrect values
        textFont: 'normal',
      },
      numberPad: {
        background: '#ffe0b2',
        border: '#ffb74d',
        text: '#e65100',
        shadow: '#ffcc80',
        clearButton: '#ffab91',
      }
    }
  }
};

export default THEMES;