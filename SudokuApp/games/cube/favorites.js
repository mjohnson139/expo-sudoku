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

import { isValidAlg } from './moves';

/** Enough to keep a practice session's worth without the list becoming an
 *  archive nobody scrolls. Oldest fall off the end. */
export const MAX_FAVORITES = 50;

/** Collapse whitespace so `R  U` and `R U` are one scramble, not two. */
export const normalizeAlg = (alg) => String(alg || '').trim().replace(/\s+/g, ' ');

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

/**
 * Bring a stored blob into the shape the screen expects, discarding anything
 * that no longer parses.
 *
 * Lives here rather than in `storage.js` so it can be tested: `storage.js`
 * imports AsyncStorage, and the test runner is a plain node environment. This is
 * the function that has to survive a save written by an older build, a newer
 * one, and a corrupt one, so it is exactly the part worth testing.
 */
export const readCubeSave = (raw) => {
  if (!raw || typeof raw !== 'object') return { scramble: '', favorites: [] };

  const scramble = normalizeAlg(raw.scramble);

  return {
    scramble: scramble.length > 0 && isValidAlg(scramble) ? scramble : '',
    favorites: sanitizeFavorites(raw.favorites),
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
