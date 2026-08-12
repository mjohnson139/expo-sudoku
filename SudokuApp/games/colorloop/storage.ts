import AsyncStorage from '@react-native-async-storage/async-storage';
import debounce from '../../utils/debounce';
import {
  COLOR_LOOP_STORAGE_VERSION,
  ColorLoopSave,
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
 * **There is no `readColorLoopProgress` here yet.** The hub card gets no
 * Continue badge in this step, because nothing in this blob is a board to
 * continue — that is Step 3 (plan §4.6), which adds both the in-flight board and
 * the `describeColorLoopProgress` that reads it, next to the game rather than in
 * `utils/gameProgress.js`.
 */

export const COLOR_LOOP_STORAGE_KEY = '@ColorLoop';

export type { ColorLoopSave };
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
