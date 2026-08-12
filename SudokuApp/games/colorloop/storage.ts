import AsyncStorage from '@react-native-async-storage/async-storage';
import debounce from '../../utils/debounce';
import {
  COLOR_LOOP_STORAGE_VERSION,
  ColorLoopBoard,
  ColorLoopSave,
  describeColorLoopProgress,
  emptyColorLoopSave,
  readColorLoopSave,
} from './saveShape';

/**
 * Color Loop's persistence — one key, like every other game on the hub
 * (docs/colorloop-merge-plan.md §4.4).
 *
 * The sibling app wrote **eleven** unprefixed keys and read them back with
 * `multiGet`; this writes one `@ColorLoop` blob and parses it with the pure
 * reader in `./saveShape.ts`. Nothing is migrated: a standalone Color Loop
 * install is a different app, and its storage is not visible from this bundle.
 *
 * Writes are debounced and every caller that cannot afford to wait 500ms calls
 * `.flush()` — the same arrangement `games/numberslide/storage.ts` makes, and
 * for the same two reasons: a game screen unmounts the instant the player taps
 * home, and a backgrounded app may not get another turn.
 *
 * ### The board is kept, continually — Step 3
 *
 * Step 2 wrote settings, bests and stars and let the board go. It does not any
 * more: `save.board` carries `{ seed, n, mode, grid, moves, secs, phase, ctx }`,
 * written on every move, flushed on unmount and on backgrounding, and set to
 * null on a solve. Sudoku, Fungiku, the cube and Number Slide all survive a trip
 * to the front door, and Fungiku's §6 established that as platform behaviour
 * rather than a per-game choice — a guest game does not get to quietly break it.
 *
 * **Clearing means writing `board: null`, not `removeItem`.** The board shares a
 * blob with the eighteen training stars and the best times, and a finished
 * puzzle is not a reason to forget those.
 */

export const COLOR_LOOP_STORAGE_KEY = '@ColorLoop';

export type { ColorLoopBoard, ColorLoopSave };
export { COLOR_LOOP_STORAGE_VERSION };

/**
 * Everything the player has set or earned.
 *
 * Falls back field by field rather than all at once, and never rejects the blob
 * outright — see `readColorLoopSave`. A read that throws is a first launch as
 * far as this screen is concerned.
 */
export async function loadColorLoopSave(): Promise<ColorLoopSave> {
  try {
    const serialized = await AsyncStorage.getItem(COLOR_LOOP_STORAGE_KEY);
    if (serialized === null) return emptyColorLoopSave();
    return readColorLoopSave(JSON.parse(serialized));
  } catch (error) {
    console.error('Error loading Color Loop state:', error);
    return emptyColorLoopSave();
  }
}

/**
 * Write the whole save (debounced, with `.flush()` for unmount/background).
 *
 * The whole blob rather than a patch, because the screen holds all of it in
 * state anyway and a partial write is how two settings changed in the same
 * second lose one of themselves.
 */
export const saveColorLoop = debounce(async (save: ColorLoopSave) => {
  try {
    await AsyncStorage.setItem(
      COLOR_LOOP_STORAGE_KEY,
      JSON.stringify({ _v: COLOR_LOOP_STORAGE_VERSION, ...save })
    );
  } catch (error) {
    console.error('Error saving Color Loop state:', error);
  }
}, 500);

/**
 * Summary for the hub's Continue affordance, or null when there is nothing to
 * come back to (see `./saveShape.ts` for the pure logic).
 */
export async function readColorLoopProgress(): Promise<{
  label: string;
  detail: string;
} | null> {
  try {
    const serialized = await AsyncStorage.getItem(COLOR_LOOP_STORAGE_KEY);
    if (serialized === null) return null;
    return describeColorLoopProgress(readColorLoopSave(JSON.parse(serialized)).board);
  } catch (error) {
    console.error('Error reading Color Loop progress:', error);
    return null;
  }
}
