import AsyncStorage from '@react-native-async-storage/async-storage';
import debounce from '../../utils/debounce';
import { buildPuzzleState } from './reducer';
import { describeFungikuProgress } from '../../utils/gameProgress';

/**
 * Fungiku's persistence — its **own** key, so the two games can never clobber
 * each other's saved state (docs/fungiku-plan.md §6).
 *
 * Only `size`, `seed` and `marks` are written. Generation is deterministic, so
 * regions and the solution are rebuilt with `generate()` on restore rather than
 * stored — a second copy of derived data is just a staler copy. It also means a
 * saved game is tiny and survives changes to region-growing internals.
 */
export const FUNGIKU_STORAGE_KEY = '@FungikuGame';
export const FUNGIKU_STORAGE_VERSION = 1;

/**
 * Load and rehydrate a saved Fungiku game.
 *
 * @returns {Promise<Object|null>} a complete reducer state, or null when there
 *   is nothing saved (or the save can't be trusted).
 */
export const loadFungikuState = async () => {
  try {
    const serialized = await AsyncStorage.getItem(FUNGIKU_STORAGE_KEY);
    if (serialized === null) return null;

    const saved = JSON.parse(serialized);
    if (saved._v !== FUNGIKU_STORAGE_VERSION) {
      // Nothing worth migrating yet: a Fungiku board is seconds of play, so
      // starting fresh beats guessing at an old shape.
      return null;
    }

    // Rebuilding through buildPuzzleState also validates the save: a `marks`
    // array of the wrong length for this size is discarded, not rendered.
    return buildPuzzleState({ size: saved.size, seed: saved.seed, marks: saved.marks });
  } catch (error) {
    console.error('Error loading Fungiku state:', error);
    return null;
  }
};

/** Write a Fungiku game (debounced, with `.flush()` for unmount/background). */
export const saveFungikuState = debounce(async (state) => {
  try {
    await AsyncStorage.setItem(
      FUNGIKU_STORAGE_KEY,
      JSON.stringify({
        _v: FUNGIKU_STORAGE_VERSION,
        size: state.size,
        seed: state.seed,
        marks: state.marks,
      })
    );
  } catch (error) {
    console.error('Error saving Fungiku state:', error);
  }
}, 500);

/**
 * Summary for the hub's Continue affordance, or null when there is no board
 * worth returning to (see utils/gameProgress.js for the pure logic).
 */
export const readFungikuProgress = async () => {
  try {
    const serialized = await AsyncStorage.getItem(FUNGIKU_STORAGE_KEY);
    if (serialized === null) return null;
    return describeFungikuProgress(JSON.parse(serialized));
  } catch (error) {
    console.error('Error reading Fungiku progress:', error);
    return null;
  }
};
