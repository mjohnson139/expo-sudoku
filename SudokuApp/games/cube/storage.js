/**
 * The cube screen's persistence — its own key, like every other game mode
 * (docs/cube-plan.md §7).
 *
 * One blob holds both the scramble on screen and the favorites list. They are
 * written together because they change together — saving a favorite is a tap on
 * the scramble that is already showing — and splitting them would buy two
 * AsyncStorage round trips and a way for the two to disagree.
 *
 * Only the **algorithm text** is stored, never the cube. The cube is a pure
 * function of the algorithm, so storing it would be a second, staler copy of
 * derived data, and it would break the moment the model changed shape.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import debounce from '../../utils/debounce';
import { normalizeAlg, readCubeSave } from './favorites';
import { describeCubeProgress } from '../../utils/gameProgress';

export const CUBE_STORAGE_KEY = '@CubeScramble';
export const CUBE_STORAGE_VERSION = 1;

// The blob's shape rules live in ./favorites.js, which imports nothing from
// React Native and is therefore testable. Re-exported so callers have one import.
export { readCubeSave };

/**
 * Load the saved scramble and favorites.
 *
 * @returns {Promise<{scramble: string, favorites: Array}>} always a usable
 *   object — "nothing saved" is an empty scramble and an empty list, not null,
 *   because the screen has the same job either way.
 */
export const loadCubeState = async () => {
  try {
    const serialized = await AsyncStorage.getItem(CUBE_STORAGE_KEY);
    if (serialized === null) return { scramble: '', favorites: [] };
    return readCubeSave(JSON.parse(serialized));
  } catch (error) {
    console.error('Error loading cube state:', error);
    return { scramble: '', favorites: [] };
  }
};

/** Write the scramble and favorites (debounced, with `.flush()` for unmount). */
export const saveCubeState = debounce(async ({ scramble, favorites }) => {
  try {
    await AsyncStorage.setItem(
      CUBE_STORAGE_KEY,
      JSON.stringify({
        _v: CUBE_STORAGE_VERSION,
        scramble: normalizeAlg(scramble),
        favorites: favorites || [],
      })
    );
  } catch (error) {
    console.error('Error saving cube state:', error);
  }
}, 400);

/**
 * Summary for the hub's Continue affordance, or null when there is nothing to
 * come back to (see utils/gameProgress.js for the pure logic).
 */
export const readCubeProgress = async () => {
  try {
    const serialized = await AsyncStorage.getItem(CUBE_STORAGE_KEY);
    if (serialized === null) return null;
    return describeCubeProgress(readCubeSave(JSON.parse(serialized)));
  } catch (error) {
    console.error('Error reading cube progress:', error);
    return null;
  }
};

export default { loadCubeState, saveCubeState, readCubeProgress };
