import AsyncStorage from '@react-native-async-storage/async-storage';
import debounce from '../../utils/debounce';
import {
  NSSave,
  NUMBER_SLIDE_STORAGE_VERSION,
  describeNumberSlideProgress,
  readNumberSlideSave,
} from './saveShape';

/**
 * Number Slide's persistence — its own key, like every other game on the hub
 * (docs/colorloop-merge-plan.md §4.4).
 *
 * ### The board is kept, continually
 *
 * The sibling app persisted a best time and nothing else: a board in flight was
 * lost the moment you left the screen. That is not how this hub behaves —
 * Sudoku, Fungiku and the cube all survive a trip to the front door, and
 * Fungiku's §6 established it as platform behaviour rather than a per-game
 * choice. A guest game does not get to quietly break it.
 *
 * So every move is written, debounced, and **flushed on unmount and on
 * backgrounding**: a game screen unmounts the instant the player taps home, and
 * a 500ms debounce with no flush would drop the move they made just before
 * leaving. `usePersistentReducer` makes exactly the same two arrangements for
 * Sudoku and Fungiku; this screen is not a reducer, so it makes them itself.
 *
 * ### What is stored, and what is not
 *
 * The board, the gap, the size, the seed, the move count and the clock. The
 * seed is kept even though the board is stored outright — it is the *code*, the
 * thing the player can share, and it cannot be recovered from a scrambled board.
 *
 * A solved board is **cleared** rather than saved. There is nothing to continue
 * about a finished puzzle, and leaving one saved would give the card a Continue
 * badge that reopens a win screen.
 *
 * ### The key is renamed and there is nothing to migrate
 *
 * The sibling app wrote unprefixed keys; this writes `@NumberSlide`, matching
 * `@SudokuGame` / `@FungikuGame` / `@CubeScramble`. **No migration is written**,
 * and it is worth saying out loud because caution points the other way:
 * AsyncStorage is scoped to the installed app, and a standalone Color Loop
 * install is `com.mjohnson139.colorloop` — a different app whose storage this
 * build can never see. A migration would be code that could only ever be dead.
 *
 * `_v` is written from the first commit anyway; the cube's §7.2 lesson is that a
 * save reshaped twice costs more than one designed once. Nothing branches on it
 * and nothing should have to — `readNumberSlideSave` reads by shape, because a
 * key that is absent and a key that is corrupt want the same answer.
 */

export const NUMBER_SLIDE_STORAGE_KEY = '@NumberSlide';

export { NUMBER_SLIDE_STORAGE_VERSION, readNumberSlideSave };
export type { NSSave };

/** The board to come back to, or null when there is not a usable one. */
export async function loadNumberSlideState(): Promise<NSSave | null> {
  try {
    const serialized = await AsyncStorage.getItem(NUMBER_SLIDE_STORAGE_KEY);
    if (serialized === null) return null;
    return readNumberSlideSave(JSON.parse(serialized));
  } catch (error) {
    console.error('Error loading Number Slide state:', error);
    return null;
  }
}

/** Write the board in flight (debounced, with `.flush()` for unmount/background). */
export const saveNumberSlideState = debounce(async (save: NSSave) => {
  try {
    await AsyncStorage.setItem(
      NUMBER_SLIDE_STORAGE_KEY,
      JSON.stringify({ _v: NUMBER_SLIDE_STORAGE_VERSION, ...save })
    );
  } catch (error) {
    console.error('Error saving Number Slide state:', error);
  }
}, 500);

/** Forget the board — solved, so there is nothing to continue. */
export async function clearNumberSlideState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(NUMBER_SLIDE_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing Number Slide state:', error);
  }
}

/**
 * Summary for the hub's Continue affordance, or null when there is nothing to
 * come back to (see `./saveShape.ts` for the pure logic).
 */
export async function readNumberSlideProgress(): Promise<{
  label: string;
  detail: string;
} | null> {
  try {
    const serialized = await AsyncStorage.getItem(NUMBER_SLIDE_STORAGE_KEY);
    if (serialized === null) return null;
    return describeNumberSlideProgress(readNumberSlideSave(JSON.parse(serialized)));
  } catch (error) {
    console.error('Error reading Number Slide progress:', error);
    return null;
  }
}
