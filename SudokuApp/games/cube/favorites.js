/**
 * The favorites list, as pure list operations (docs/cube-plan.md §7).
 *
 * Kept apart from `storage.js` for the same reason `gameProgress.js` is kept
 * apart from the games: this is the part with rules in it — dedupe, ordering,
 * the cap — and it runs in the node test environment because it imports nothing
 * from React Native.
 *
 * **A favorite is identified by its algorithm, not by a generated id.** Two
 * saves of the same scramble are the same favorite, which is exactly what a
 * player means, and it makes "is this one saved?" a lookup instead of a search
 * through timestamps. It also makes every test deterministic.
 */

import { sanitizeAlgorithms } from './algorithms';
import { isValidAlg, normalizeAlg } from './moves';
import { sanitizeSolves, sanitizeWorkspace } from './solveList';

/** Enough to keep a practice session's worth without the list becoming an
 *  archive nobody scrolls. Oldest fall off the end. */
export const MAX_FAVORITES = 50;

/**
 * Collapse whitespace so `R  U` and `R U` are one scramble, not two.
 *
 * It now lives in `moves.js`, because the solves list keys off algorithm text
 * too and two copies of this rule would be two ways for the two lists to
 * disagree about what one scramble is. Re-exported because this is where every
 * caller already looks for it.
 */
export { normalizeAlg };

/** Is this algorithm already saved? */
export const isFavorite = (favorites, alg) => {
  const key = normalizeAlg(alg);
  return (favorites || []).some((favorite) => favorite.alg === key);
};

/**
 * Add a scramble, newest first.
 *
 * Returns the list unchanged when the scramble is already saved or isn't valid
 * notation — the caller renders from the returned list, so "nothing happened" is
 * expressed by identity rather than by a flag.
 *
 * @param {Array} favorites
 * @param {string} alg
 * @param {number} [savedAt] epoch ms, injectable for tests
 */
export const addFavorite = (favorites, alg, savedAt = Date.now()) => {
  const key = normalizeAlg(alg);
  const list = favorites || [];

  if (key.length === 0 || !isValidAlg(key)) return list;
  if (isFavorite(list, key)) return list;

  return [{ alg: key, savedAt }, ...list].slice(0, MAX_FAVORITES);
};

/** Remove a scramble. Unknown algorithms leave the list alone. */
export const removeFavorite = (favorites, alg) => {
  const key = normalizeAlg(alg);
  const list = favorites || [];
  const next = list.filter((favorite) => favorite.alg !== key);
  return next.length === list.length ? list : next;
};

/**
 * Drop anything that isn't a saved scramble.
 *
 * Storage is the boundary where a file written by an older build — or by a build
 * that had a bug — comes back in, so the list is filtered on the way out of it
 * rather than trusted. A favorite that no longer parses would otherwise take the
 * screen down when it was tapped.
 */
export const sanitizeFavorites = (raw) => {
  if (!Array.isArray(raw)) return [];

  const seen = new Set();
  const clean = [];

  raw.forEach((entry) => {
    const alg = normalizeAlg(entry && entry.alg);
    if (alg.length === 0 || seen.has(alg) || !isValidAlg(alg)) return;
    seen.add(alg);
    clean.push({
      alg,
      savedAt: Number.isFinite(entry.savedAt) ? entry.savedAt : 0,
    });
  });

  return clean.slice(0, MAX_FAVORITES);
};

/** What the screen gets when there is nothing saved, or nothing readable. Five
 *  fields now — `algorithms` joined in Cube Methods Step 1. See `readCubeSave`. */
const EMPTY_SAVE = () => ({
  scramble: '',
  favorites: [],
  solves: [],
  algorithms: [],
  workspace: { solveId: null, view: null },
});

/**
 * Bring a stored blob into the shape the screen expects, discarding anything
 * that no longer parses.
 *
 * Lives here rather than in `storage.js` so it can be tested: `storage.js`
 * imports AsyncStorage, and the test runner is a plain node environment. This is
 * the function that has to survive a save written by an older build, a newer
 * one, and a corrupt one, so it is exactly the part worth testing.
 *
 * ### The shape, decided once (plan §7.1)
 *
 * ```js
 * { _v, scramble, favorites, solves, algorithms, workspace }
 * ```
 *
 * `solves` and `workspace` are Step 4's addition, and `solves[].phases` is
 * Step 6's slot sitting empty in the file already — the alternative is
 * reshaping the file twice and writing two migrations (plan §8.5).
 *
 * **`algorithms` is the Cube Methods epic's addition** (its §2 and §3.1): the
 * library goes in the blob that is already here rather than into a key of its
 * own, because tagging a run will write a solve *and* a library entry in one
 * action and `CubeContext` is already the single debounced writer for
 * everything the operator authored. A second key would buy two writers and two
 * ways for them to disagree. `CUBE_STORAGE_VERSION` becomes 3 with it — a label
 * on the file, not a branch anything reads.
 *
 * **Both directions of version skew work and neither needs a migration step.**
 * A Step 5 file has no `solves` key, and `sanitizeSolves(undefined)` is the
 * empty list — which is the truth, because that build could not keep a solve.
 * A Step 4 file opened by a Step 5 build reads its `scramble` and `favorites`
 * and ignores the rest. A pre-library file has no `algorithms` key and
 * `sanitizeAlgorithms(undefined)` answers the same way, for the same reason.
 */
export const readCubeSave = (raw, catalogue) => {
  if (!raw || typeof raw !== 'object') return EMPTY_SAVE();

  const savedScramble = normalizeAlg(raw.scramble);
  const scramble =
    savedScramble.length > 0 && isValidAlg(savedScramble) ? savedScramble : '';
  // User methods will be sanitized here before these dependent collections in Step 5.
  const solves = sanitizeSolves(raw.solves, catalogue);

  return {
    scramble,
    favorites: sanitizeFavorites(raw.favorites),
    solves,
    algorithms: sanitizeAlgorithms(raw.algorithms, catalogue),
    workspace: sanitizeWorkspace(raw.workspace, { solves, scramble }),
  };
};

export default {
  addFavorite,
  removeFavorite,
  isFavorite,
  sanitizeFavorites,
  normalizeAlg,
  readCubeSave,
};
