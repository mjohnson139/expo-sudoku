const fs = require('fs');
const path = require('path');

/**
 * The floor under the `.d.ts` shims that let TypeScript read this app's
 * JavaScript (docs/colorloop-merge-plan.md §4.1, and `utils/themes.d.ts`'s
 * header for the whole argument).
 *
 * **A `.d.ts` is trusted absolutely.** With `allowJs` off, TypeScript resolves
 * `utils/color` to `utils/color.d.ts` and never opens `utils/color.js` — so
 * renaming or removing an export on the JavaScript side breaks the games at
 * runtime while `tsc --noEmit` stays perfectly green. That is the one real cost
 * of the shim approach over `allowJs`, and this is what pays it: every name a
 * shim declares has to still be exported by the module beside it.
 *
 * It reads both files rather than importing either. Requiring the modules would
 * be the more exact check and it is not available here: `ScreenHeader.js` pulls
 * in `react-native` and `@expo/vector-icons`, which this node-environment runner
 * deliberately does not transform. Reading the source keeps the guard cheap
 * enough to cover the components too, which are the shims most likely to drift.
 *
 * It reads the declarations rather than listing them, so a shim that grows a
 * function is covered without anybody remembering to come back here.
 */

const ROOT = path.resolve(__dirname, '..', '..');

/**
 * Each shim, and the module it is speaking for.
 *
 * Adding a row is how a new shim gets covered — but the first question is
 * always whether the shim is needed at all, since `allowJs` means inference
 * usually handles it. Three shims covered Step 1; `utils/color.js`,
 * `utils/gameProgress.js` and `hooks/useBoardSize.js` each had one and each
 * turned out not to need it.
 */
const SHIMS = [
  ['utils/themes.d.ts', 'utils/themes.js'],
  ['hooks/useAppTheme.d.ts', 'hooks/useAppTheme.js'],
  ['components/ScreenHeader.d.ts', 'components/ScreenHeader.js'],
];

/**
 * Every shim in the tree, so a shim added without a row above fails here rather
 * than going uncovered. `.d.ts` files that describe a `.ts` module are not
 * shims and there are none; if that changes, this is the assertion to widen.
 */
const findShims = () =>
  ['utils', 'hooks', 'components', 'games', 'screens']
    .filter((dir) => fs.existsSync(path.join(ROOT, dir)))
    .flatMap((dir) =>
      fs
        .readdirSync(path.join(ROOT, dir), { recursive: true })
        .filter((name) => String(name).endsWith('.d.ts'))
        .map((name) => `${dir}/${String(name).split(path.sep).join('/')}`)
    );

it('covers every shim in the tree', () => {
  expect(findShims().sort()).toEqual(SHIMS.map(([shim]) => shim).sort());
});

const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

/** The named values a shim declares — `interface` and `type` are not runtime. */
const declaredNames = (source) =>
  Array.from(source.matchAll(/^export declare (?:const|function)\s+(\w+)/gm)).map((m) => m[1]);

/** Every name a JavaScript module exports, however it spells the export. */
const exportedNames = (source) => {
  const names = Array.from(source.matchAll(/^export\s+(?:const|let|var|function|class)\s+(\w+)/gm))
    .map((m) => m[1]);

  for (const block of source.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const clause of block[1].split(',')) {
      const parts = clause.trim().split(/\s+as\s+/);
      const exported = (parts[1] || parts[0]).trim();
      if (exported) names.push(exported);
    }
  }

  return names;
};

const hasDefault = (source) => /^export default /m.test(source);

describe.each(SHIMS)('%s', (shimPath, modulePath) => {
  const shim = read(shimPath);
  const module = read(modulePath);

  it('declares something', () => {
    expect(declaredNames(shim).length + (hasDefault(shim) ? 1 : 0)).toBeGreaterThan(0);
  });

  it('declares only names the module actually exports', () => {
    const exported = exportedNames(module);
    const missing = declaredNames(shim).filter((name) => !exported.includes(name));
    expect(missing).toEqual([]);
  });

  // One direction only. A shim declaring a default the module does not have is
  // a lie the type checker will believe; a shim *omitting* a default it never
  // imports is just a shim that declares the part of the seam it uses, which is
  // what `gameProgress.d.ts` deliberately does.
  it('promises no default export the module does not have', () => {
    if (hasDefault(shim)) expect(hasDefault(module)).toBe(true);
  });
});
