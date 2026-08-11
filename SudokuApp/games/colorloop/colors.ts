import { REGION_COLORS } from '../../utils/symbolSets';

/**
 * Color Loop's seven tile colours — **the platform palette's first seven**, not
 * a palette of its own (docs/colorloop-merge-plan.md §4.2).
 *
 * ### What was retired, and for what
 *
 * The sibling app shipped seven hand-picked hex values here. They are gone.
 * `utils/symbolSets.js` holds a ten-hue Okabe–Ito palette this repo has done
 * real work on — colorblind-safe by construction, with per-hue tint weights that
 * were *searched* rather than chosen, and a test pinning the ΔE floor and the
 * per-dichromacy baselines. Its own stated purpose is that there be "exactly one
 * source of colour truth", and landing a sixth independent palette beside it on
 * the day the app grows to five games is the opposite of that.
 *
 * The **saturated `color`** is taken, not the tinted `background`. Color Loop
 * tiles are solid blocks; Okabe–Ito's colorblind safety lives at full
 * saturation, and the tints are tuned for Fungiku's soft grid, which spends some
 * of it. The `color` field is also the one part of a palette entry that does not
 * vary with the theme, which is why this list is a module constant: the tiles
 * are the same seven hues on all seven themes, and it is the *chrome* around
 * them that follows the player's choice (`./palette.ts`).
 *
 * ### ⚠️ Seven. Not eight, not ten — seven.
 *
 * This is the least obvious coupling in the whole epic and it would not fail a
 * single existing test.
 *
 * `maxN()` in `puzzle.ts` is derived from `COLORS.length`, and `parseCode`
 * **clamps `n` to `maxN(mode)`**. Seven colours ⇒ `maxN('diag') === 4`. The
 * platform palette holds **ten**, which would make it **5** — so the code
 * `5-ABC-D`, which has always clamped to a 4×4 board, would silently start
 * producing a 5×5 one. **Every code anyone has ever shared would decode to a
 * different puzzle**, and nothing in either test suite would say a word about it.
 *
 * So the rule, from plan §4.2: *the palette may hold ten; Color Loop may not see
 * them.* `PALETTE_SIZE` is that rule, and `__tests__/puzzle.test.ts` pins both
 * `maxN('diag') === 4` and `maxN('rows') === 6` beside the scramble-compatibility
 * test — the coupling is enforced rather than remembered. If a hue is ever added
 * to `utils/symbolSets.js`, this file is *already* correct; that is the point of
 * slicing rather than spreading.
 *
 * ### The glyphs stay characters
 *
 * **Settled by the operator, 2026-08-11** (plan §9, open question 1): the
 * `●▲■◆★✦✚` the standalone app's players know are kept, rather than becoming the
 * `corners` silhouettes Fungiku's swatches carry.
 *
 * They are the same *idea* as `corners` — a non-colour channel of identity, so
 * two hues that read alike to someone are still told apart — and the redundancy
 * is the part that matters, not which mechanism supplies it. What that decision
 * costs is one line of bookkeeping: the glyph belongs to the *position* in this
 * list, so a hue and its glyph travel together and neither can be reordered
 * without the other. They are written as one array here for that reason, instead
 * of a glyph list beside a colour list that nothing keeps in step.
 */

/**
 * How many of the platform's hues Color Loop sees. **Changing this changes which
 * board every existing code decodes to** — see the warning above.
 */
export const PALETTE_SIZE = 7;

/**
 * The non-colour cue for each hue, in palette order. Position is the contract:
 * `GLYPHS[i]` decorates `REGION_COLORS[i]`.
 */
const GLYPHS = ['●', '▲', '■', '◆', '★', '✦', '✚'];

export interface ColorDef {
  /** The saturated hue a tile is filled with. */
  c: string;
  /** The glyph drawn on it — identity that survives a colour being missed. */
  g: string;
  /** The palette's own stable, non-visual name, for accessibility labels. */
  name: string;
}

export const COLORS: ColorDef[] = REGION_COLORS.slice(0, PALETTE_SIZE).map((entry, index) => ({
  c: entry.color,
  g: GLYPHS[index],
  name: entry.name,
}));
