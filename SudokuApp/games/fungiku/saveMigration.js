/**
 * Fungiku's saved-game shape, and how an older one is brought forward.
 *
 * Pure: no AsyncStorage, no React. That is why it is not in `./storage.js` —
 * the migration is the part worth unit-testing, and the test runner is a plain
 * node environment (see package.json's jest config).
 *
 * **Why this exists now.** Until Step 9 a version mismatch just returned null:
 * a Fungiku board was seconds of play, so discarding it beat guessing at an old
 * shape. Step 9 is where that stops being true — `difficulty` is the first field
 * a save carries that the player *chose*, and Step 11's assist wallet will ride
 * along behind it. From here a bump migrates (plan §14.1, §13).
 *
 * **The rule for the next bump:** add a `MIGRATIONS` entry keyed by the version
 * it upgrades *from*, returning the next version's shape. Never edit an existing
 * one — it describes a shape already on real devices.
 */
import { difficultyForSize, isDifficulty } from './difficulty';

/**
 * v1 — `{size, seed, marks, showMistakes, hintsUsed}` (Steps 4-8).
 * v2 — v1 plus `difficulty`, the rung the player picked (Step 9).
 */
export const FUNGIKU_STORAGE_VERSION = 2;

/**
 * v1 → v2: name the rung the saved board belongs to.
 *
 * The saved **size is left exactly as it was**, and the difficulty is derived
 * *from* it rather than the other way around. Re-resolving the size from the new
 * difficulty would silently hand back a different board — which is the one thing
 * a migration must not do: the marks in this save are deductions about *this*
 * grid.
 */
const v1ToV2 = (saved) => ({
  ...saved,
  difficulty: difficultyForSize(saved.size),
});

/** Keyed by the version each function upgrades *from*. */
const MIGRATIONS = {
  1: v1ToV2,
};

/**
 * Bring a saved blob up to `FUNGIKU_STORAGE_VERSION`.
 *
 * @param {Object|null} saved - the parsed blob straight out of storage
 * @returns {Object|null} a current-shape blob, or null when there is nothing
 *   trustworthy to restore: no save, a shape with no board in it, a version from
 *   the future (a downgraded app — it cannot know what was added), or a version
 *   with no path forward.
 */
export const migrateFungikuSave = (saved) => {
  if (!saved || typeof saved !== 'object') return null;
  if (!Number.isFinite(saved.size) || !Array.isArray(saved.marks)) return null;

  let version = Number.isFinite(saved._v) ? saved._v : 0;
  let current = saved;

  // A future version is not a mismatch to repair — the fields it added are
  // unknown here, so the honest move is to leave it alone and start fresh.
  if (version > FUNGIKU_STORAGE_VERSION) return null;

  while (version < FUNGIKU_STORAGE_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) return null;
    current = step(current);
    version += 1;
  }

  // Belt and braces: a hand-edited or corrupt `difficulty` should not reach the
  // menu as a rung that does not exist.
  return {
    ...current,
    _v: FUNGIKU_STORAGE_VERSION,
    difficulty: isDifficulty(current.difficulty)
      ? current.difficulty
      : difficultyForSize(current.size),
  };
};

export default migrateFungikuSave;
