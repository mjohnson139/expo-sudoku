/**
 * Types for `utils/gameProgress.js` — see `utils/themes.d.ts` for why these
 * shims exist and what keeps them honest.
 *
 * Only `formatElapsed` is declared, and that is the whole point: it is the
 * shared part, and Color Loop's own `fmt()` collapses into it rather than
 * arriving as a sixth way to write mm:ss (plan §4.6). The `describe*Progress`
 * functions are **not** declared, because the epic's rule is that a new game's
 * `readProgress` lives next to the game — this file's inverted dependency was
 * the cube review's headline finding and this epic does not add to it.
 */
export declare function formatElapsed(seconds: number): string;
