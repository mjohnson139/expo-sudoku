import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The shell's theme preference, under its own key.
 *
 * Step 3 had the hub and Fungiku read `currentThemeName` out of *Sudoku's* saved
 * game — expedient, but it meant the shell depended on a Sudoku implementation
 * detail, and the theme vanished whenever there was no saved Sudoku game to read
 * it from. The preference is app-level, so it gets an app-level key.
 *
 * Sudoku still keeps the theme in its own reducer state (that is what it renders
 * from) and writes through to this key whenever the player cycles the theme, so
 * there is one preference and the shell follows it.
 */
export const APP_THEME_KEY = '@AppTheme';

/** @returns {Promise<string|null>} the saved theme name, or null if unset. */
export const loadAppThemeName = async () => {
  try {
    return await AsyncStorage.getItem(APP_THEME_KEY);
  } catch (error) {
    console.error('Error loading app theme:', error);
    return null;
  }
};

/** Persist the shell's theme name. Failures are non-fatal — the theme is a preference. */
export const saveAppThemeName = async (themeName) => {
  try {
    if (typeof themeName === 'string' && themeName.length > 0) {
      await AsyncStorage.setItem(APP_THEME_KEY, themeName);
    }
  } catch (error) {
    console.error('Error saving app theme:', error);
  }
};
