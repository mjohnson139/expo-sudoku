import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Number Slide's persistence — its own key, like every other game
 * (docs/colorloop-merge-plan.md §4.4).
 *
 * ### The key is renamed and there is nothing to migrate
 *
 * The sibling app wrote an unprefixed `numberSlideBest`. This one writes
 * `@NumberSlide`, matching `@SudokuGame` / `@FungikuGame` / `@CubeScramble`, and
 * **no migration is written** — deliberately, and it is worth saying out loud
 * because caution points the other way. AsyncStorage is scoped to the installed
 * app. A player's standalone Color Loop install is `com.mjohnson139.colorloop`;
 * this build is `com.mjohnson139.sudokuapp`, a different app whose storage it
 * can never see. There is no save to preserve, so a migration would be code that
 * could only ever be dead.
 *
 * ### One versioned blob, from the first commit
 *
 * The eleven unprefixed keys the sibling app used become one object per game.
 * `_v` is here from the start because the cube's §7.2 lesson is that a save file
 * reshaped twice costs more than one designed once — and Step 3 will add the
 * resumable board to this same blob.
 *
 * Read by shape rather than by version: a key that is absent and a key that is
 * corrupt want the same answer anyway, so nothing branches on `_v` and nothing
 * should have to. The number is here so a file can say what wrote it.
 */

export const NUMBER_SLIDE_STORAGE_KEY = '@NumberSlide';

/** 1 — the first shape. Step 3 adds the in-progress board beside `best`. */
export const NUMBER_SLIDE_STORAGE_VERSION = 1;

export interface NSBest {
  secs: number;
  moves: number;
  name: string;
}

export interface NSSave {
  best: NSBest | null;
}

/** The empty save, so "nothing stored" and "stored garbage" produce one shape. */
const EMPTY: NSSave = { best: null };

/**
 * Validate a best by shape. A NaN out of a timer, or a `name` that arrived as a
 * number, must not come back as a board the screen cannot draw.
 */
export function readNumberSlideSave(raw: unknown): NSSave {
  if (!raw || typeof raw !== 'object') return EMPTY;
  const best = (raw as { best?: unknown }).best;
  if (!best || typeof best !== 'object') return EMPTY;

  const { secs, moves, name } = best as { secs?: unknown; moves?: unknown; name?: unknown };
  if (!Number.isFinite(secs) || !Number.isFinite(moves)) return EMPTY;
  if ((secs as number) < 0 || (moves as number) < 0) return EMPTY;

  return {
    best: {
      secs: Math.floor(secs as number),
      moves: Math.floor(moves as number),
      name: typeof name === 'string' ? name.slice(0, 12) : '',
    },
  };
}

/** The saved best, or null when there is not a usable one. */
export async function loadBest(): Promise<NSBest | null> {
  try {
    const serialized = await AsyncStorage.getItem(NUMBER_SLIDE_STORAGE_KEY);
    if (serialized === null) return null;
    return readNumberSlideSave(JSON.parse(serialized)).best;
  } catch (error) {
    console.error('Error loading Number Slide save:', error);
    return null;
  }
}

export function saveBest(best: NSBest): void {
  AsyncStorage.setItem(
    NUMBER_SLIDE_STORAGE_KEY,
    JSON.stringify({ _v: NUMBER_SLIDE_STORAGE_VERSION, best })
  ).catch((error) => {
    console.error('Error saving Number Slide save:', error);
  });
}
