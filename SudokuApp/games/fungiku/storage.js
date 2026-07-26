import AsyncStorage from '@react-native-async-storage/async-storage';
import debounce from '../../utils/debounce';
import { buildPuzzleState } from './reducer';
import { FUNGIKU_STORAGE_VERSION, migrateFungikuSave } from './saveMigration';
import { describeFungikuProgress } from '../../utils/gameProgress';

/**
 * Fungiku's persistence — its **own** key, so the two games can never clobber
 * each other's saved state (docs/fungiku-plan.md §6).
 *
 * Only the puzzle identity (`difficulty`, `size`, `seed`) and `marks` are
 * written. Generation is deterministic, so regions and the solution are rebuilt
 * with `generate()` on restore rather than stored — a second copy of derived data
 * is just a staler copy. It also means a saved game is tiny and survives changes
 * to region-growing internals.
 *
 * The version and how an old save is brought forward live in ./saveMigration.js,
 * which is pure and therefore testable.
 */
export const FUNGIKU_STORAGE_KEY = '@FungikuGame';
export { FUNGIKU_STORAGE_VERSION };

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

    // An older save is upgraded rather than discarded — from Step 9 on, a save
    // carries choices the player made (plan §14.1).
    const saved = migrateFungikuSave(JSON.parse(serialized));
    if (!saved) return null;

    // Rebuilding through buildPuzzleState also validates the save: a `marks`
    // array of the wrong length for this size is discarded, not rendered.
    return buildPuzzleState({
      difficulty: saved.difficulty,
      size: saved.size,
      seed: saved.seed,
      marks: saved.marks,
      showMistakes: saved.showMistakes,
      hintsUsed: saved.hintsUsed,
    });
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
        // The rung the player picked. Stored alongside the size rather than
        // instead of it: the size is what the board *is*, the difficulty is what
        // it was chosen by, and a rung spanning two sizes cannot recover which.
        difficulty: state.difficulty,
        size: state.size,
        seed: state.seed,
        marks: state.marks,
        // The feedback switch is a preference and the hint count is per-puzzle
        // history, so both persist. `strokeOpen` and `hint` deliberately do not:
        // one is gesture bookkeeping, the other is advice that goes stale the
        // moment the board changes. Nor does anything about the rule-out assist —
        // it is an action the player taps, not a mode with a remembered setting.
        showMistakes: !!state.showMistakes,
        hintsUsed: state.hintsUsed || 0,
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
    // Migrated first, so a save written before difficulty existed still draws a
    // badge — and draws it with a rung name rather than falling back to a size.
    return describeFungikuProgress(migrateFungikuSave(JSON.parse(serialized)));
  } catch (error) {
    console.error('Error reading Fungiku progress:', error);
    return null;
  }
};
