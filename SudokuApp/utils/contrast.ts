import { contrastRatio, hexToRgb, mix } from './color';

/**
 * Two helpers that turn a derived colour into a *legible* derived colour.
 *
 * ### Why they are here rather than in a game
 *
 * `ensureContrast` was written in Step 1 inside `games/numberslide/palette.ts`,
 * where it had one caller. Step 2 gives it a second — `games/colorloop/palette.ts`
 * does exactly the same job for exactly the same reason — and the epic's fifth
 * golden rule is that where two places solve one problem, they either converge
 * deliberately or the choice not to gets written down. A contrast search
 * duplicated into two games is the worst of the available answers: the two
 * copies would drift, and the finding below would have to be rediscovered.
 *
 * So it is promoted, exactly as plan §4.5 promotes `mulberry32` — a function
 * with two real callers moving to `utils/`, which is the opposite of inventing a
 * framework for one. `games/numberslide/palette.ts` re-exports both names, so
 * its own tests and imports are untouched and Number Slide is byte-for-byte the
 * screen it was.
 *
 * These live in a `.ts` file beside `utils/color.js` rather than inside it
 * because plan §4.1 forbids converting existing JavaScript in this epic, and a
 * new TypeScript module for new TypeScript callers costs nothing.
 */

/**
 * `color`, blended toward black or white until it clears `min` against
 * `against` — the nearest colour to the one asked for that is legible on it.
 *
 * **Both directions are searched, at each distance, and that is not
 * over-engineering.** Picking a direction from the background's luminance is the
 * obvious implementation and it is wrong twice over: a dark ink on a mid-tone
 * fill has to get *darker*, not lighter, and against a mid-tone background
 * neither endpoint is guaranteed to reach a given ratio, so the direction that
 * can succeed is not always the one a rule of thumb names. Sunrise's amber
 * accent is the live example — it caught this the first time Step 1's test ran,
 * at 3.97:1 where 4.5 was asked for.
 *
 * Terminates: weight reaches 1 in twenty steps, and the worst case returns
 * whichever endpoint got closest.
 */
export function ensureContrast(color: string, against: string, min: number): string {
  let best = color;
  let bestRatio = contrastRatio(color, against);
  if (bestRatio >= min) return color;

  for (let weight = 0.05; weight <= 1.0001; weight += 0.05) {
    for (const target of ['#000000', '#ffffff']) {
      const candidate = mix(color, target, Math.min(1, weight));
      const ratio = contrastRatio(candidate, against);
      if (ratio >= min) return candidate;
      if (ratio > bestRatio) {
        best = candidate;
        bestRatio = ratio;
      }
    }
  }
  return best;
}

/**
 * `color`, blended until it clears `min` against **every** colour in `against`.
 *
 * The Color Loop case, and the reason this is a second function rather than a
 * loop at the call site: a glyph sits on a tile, but a *cover* or a *key chip*
 * sits over a board of seven different hues at once, and a colour fixed up
 * against the worst of them can easily have been pushed past legibility on
 * another. Searching once against the whole set is the only way to land a colour
 * that reads on all of them.
 *
 * Returns the first candidate that clears every entry, or the one with the best
 * worst-case ratio if none does.
 */
export function ensureContrastAll(color: string, against: string[], min: number): string {
  const worst = (candidate: string) =>
    against.reduce((lowest, other) => Math.min(lowest, contrastRatio(candidate, other)), Infinity);

  let best = color;
  let bestRatio = worst(color);
  if (bestRatio >= min) return color;

  for (let weight = 0.05; weight <= 1.0001; weight += 0.05) {
    for (const target of ['#000000', '#ffffff']) {
      const candidate = mix(color, target, Math.min(1, weight));
      const ratio = worst(candidate);
      if (ratio >= min) return candidate;
      if (ratio > bestRatio) {
        best = candidate;
        bestRatio = ratio;
      }
    }
  }
  return best;
}

/** `hex` at `alpha`, as an `rgba()` string — for translucent surfaces. */
export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
