/**
 * The cube screen's persistence — its own key, like every other game mode
 * (docs/cube-plan.md §7).
 *
 * One blob holds the scramble on screen, the favorites list, every solve the
 * operator has written, the algorithm library, and which solve was open. They
 * are written together because they change together — saving a favorite is a tap
 * on the scramble that is already showing, and tagging a run from a solve will
 * write a solve and a library entry in one action — and splitting them would buy
 * five AsyncStorage round trips and five ways for them to disagree.
 *
 * Only the **algorithm text** is stored, never the cube. The cube is a pure
 * function of the algorithm, so storing it would be a second, staler copy of
 * derived data, and it would break the moment the model changed shape. That
 * holds for a solve exactly as it holds for a scramble.
 *
 * **What is not in here is as deliberate as what is** (plan §7.1): the scrub
 * position, the view angle and the turn speed are where the operator is
 * standing rather than what they wrote, and restoring someone into the middle
 * of a half-played scramble is worse than opening it whole.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import debounce from '../../utils/debounce';
import { normalizeAlg, readCubeSave } from './favorites';
import { describeCubeProgress } from '../../utils/gameProgress';

export const CUBE_STORAGE_KEY = '@CubeScramble';

/**
 * 3 since Cube Methods Step 1, which added `algorithms`. (2 was Cube Step 4,
 * which added `solves` and `workspace`.)
 *
 * **It is a label, not a branch.** Nothing branches on it and nothing should
 * have to: `readCubeSave` reads every version by shape, because a key that is
 * absent and a key that is corrupt want the same answer anyway. The number is
 * here so a file can say what wrote it — which is worth something when an
 * operator's file turns up in a bug report, and worth nothing at all to the
 * reader. A pre-library file has no `algorithms` key and sanitizes to `[]`,
 * which is the truth about the build that wrote it; a library file opened by an
 * older build reads its scramble and solves and ignores the rest.
 */
export const CUBE_STORAGE_VERSION = 3;

// The blob's shape rules live in ./favorites.js, which imports nothing from
// React Native and is therefore testable. Re-exported so callers have one import.
export { readCubeSave };

/**
 * Load the scramble, the favorites, the solves, the algorithm library and the
 * workspace.
 *
 * @returns {Promise<{scramble: string, favorites: Array, solves: Array,
 *   algorithms: Array, workspace: {solveId: string|null}}>} always a usable
 *   object — "nothing saved" is an empty scramble and empty lists, not null,
 *   because the screen has the same job either way. `readCubeSave(null)` is
 *   that object, so the two failure paths and the happy one agree by
 *   construction.
 */
export const loadCubeState = async () => {
  try {
    const serialized = await AsyncStorage.getItem(CUBE_STORAGE_KEY);
    if (serialized === null) return readCubeSave(null);
    return readCubeSave(JSON.parse(serialized));
  } catch (error) {
    console.error('Error loading cube state:', error);
    return readCubeSave(null);
  }
};

/** Two finite angles or nothing — so a NaN out of a gesture cannot be written
 *  into the file and come back as a cube nobody can see. */
const sanitizeSavedView = (view) =>
  view && Number.isFinite(view.yaw) && Number.isFinite(view.pitch)
    ? { yaw: view.yaw, pitch: view.pitch }
    : null;

/**
 * Write everything the operator authored (debounced, with `.flush()` for
 * unmount).
 *
 * **The view angle joined it on 2026-08-06** and is the one thing in the file
 * that is not authored text. Plan §7.1 has the amended rule: the angle you
 * turned the cube to is something you did on purpose and expect to find as you
 * left it, where the scrub position and the turn speed are still not.
 */
export const saveCubeState = debounce(
  async ({ scramble, favorites, solves, algorithms, workspace }) => {
    try {
      await AsyncStorage.setItem(
        CUBE_STORAGE_KEY,
        JSON.stringify({
          _v: CUBE_STORAGE_VERSION,
          scramble: normalizeAlg(scramble),
          favorites: favorites || [],
          solves: solves || [],
          // The algorithm library (docs/cube-methods-plan.md §3.1). Written
          // beside the solves rather than under its own key because the two
          // change together — tagging a run writes both — and because there is
          // exactly one debounced writer for everything the operator authored.
          algorithms: algorithms || [],
          workspace: {
            // **No `solving` any more** (docs/cube-flow-plan.md §3.2). The solve
            // is a route, and the id is written only while that route is on the
            // stack — so an id here means "a solve was open" and the flag it
            // took two fields to say is one. `readCubeSave` reads every version
            // by shape, so dropping a key costs no `_v` bump and no migration.
            solveId: (workspace && workspace.solveId) || null,
            // The angle the cube was left turned to. Written by shape rather
            // than trusted, the same as everything else in here — and read back
            // through `sanitizeWorkspace`, which is what decides whether a pair
            // of numbers is an angle.
            view: sanitizeSavedView(workspace && workspace.view),
          },
        })
      );
    } catch (error) {
      console.error('Error saving cube state:', error);
    }
  },
  400
);

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
