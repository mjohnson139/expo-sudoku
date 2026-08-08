# Color Loop & Number Slide — Merge Plan

**Two games from a sibling app move onto this hub as peers of Sudoku, Fungiku
and Cube Scramble.** Color Loop is a wrapping row/column slider — drag any row
or column and it wraps around the edge until every row is one solid colour.
Number Slide is the classic 15-puzzle at 3×3. Both come from
`mjohnson139/color-loop`, a standalone Expo app of the same SDK, the same React
Native version and the same architecture, written by the same operator.

The merge is not a port. It is an **absorption**: the code already runs on this
stack, and the work is making it a citizen of this platform rather than a guest
in its own app.

## For the implementer (start here)

- **Repos:** `mjohnson139/expo-sudoku` (the platform; app code in `SudokuApp/`)
  and `mjohnson139/color-loop` (the source, TypeScript, hub in `App.tsx`).
- **This document is the source of truth** for scope and approach — read it end
  to end before writing code.
- **Start here if you are a new session:** **`docs/colorloop-merge-handoff.md`**
  always describes *the next step only*. **Rewriting it for the following step is
  part of every step's definition of done.**
- **Process:** follow `.github/dev-process.md` — the tracker is issue **#103**,
  work **one delivery step per branch**, commit after each step, and **prompt the
  operator to test after each step.**
- **Branching: this feature lands on an epic branch, not `main`.**

  ```
  main ─── epic/color-loop ─── feature/color-loop-<step>   (PRs target the epic)
  ```

  Pushing `epic/color-loop` publishes an EAS Update branch of the same name
  (`.github/workflows/eas-publish.yml`), so the epic is always openable in Expo
  Go even with no step PR open.
- **Every step must ship something the operator can look at in Expo Go.** The
  epic's own exemption is Step 0, which is this document.
- **Nothing in `games/sudoku`, `games/fungiku/` or `games/cube/` changes
  behaviour.** Shared code (`hooks/`, `components/ScreenHeader`, `utils/`) may be
  *extended*, and every extension must leave existing callers pixel-identical —
  the rule `ScreenHeader`'s `dense` prop was added under (`docs/cube-plan.md`
  §8.6), and the reason Fungiku was opened to prove it.

## 1. Why these two games belong here

The hub already made the argument. Sudoku, Fungiku and Cube Scramble share
nothing but a front door and six imports, and that turned out to be the right
amount of coupling (`docs/cube-plan.md` §8.11). A fourth and fifth card cost the
platform a registry entry each.

What is specific to *these* two:

- **They are already this stack.** Expo SDK 54, RN 0.81, React 19, new
  architecture, `@react-native-async-storage/async-storage` 2.2.0 — the versions
  match this repo's `package.json` exactly. There is no upgrade hidden inside
  this epic.
- **They are the two puzzle shapes the box does not have.** Sudoku and Fungiku
  are both *deduction on a static grid*; the cube is a tool, not a puzzle the app
  sets you. Color Loop and Number Slide are **manipulation** puzzles — the board
  moves under your finger and the challenge is planning motion. A box of five
  puzzles that are all deduction is a narrower box than its name promises.
- **They bring something the platform lacks and cannot easily invent: a
  shareable code.** Every Color Loop board is `makeScrambled(seed, n, mode)`, so
  the string `4-K7P2Q` *is* the puzzle, on every device, forever. Fungiku already
  stores a seed and could do the same; the cube's scramble string already is one
  in all but name. This is the epic's most interesting cargo, and §4.5 is about
  deliberately **not** building a framework for it yet.
- **Maintaining one app is cheaper than two.** Two Expo projects, two EAS
  projects, two SDK upgrade treadmills, two sets of CI, for one operator.

### And the honest cost

The standalone Color Loop app has a **complete, deliberate visual identity** —
walnut desk, brass hardware, a documented motion language
(`color-loop/docs/identity.md`). Puzzle Box has **seven themes** and a shell that
owns which one is active. These cannot both fully survive. §4.2 is where that is
settled, and it is the decision most likely to be wrong.

## 2. What is actually being merged (measured, not estimated)

`mjohnson139/color-loop` at `e07eb82`, excluding `node_modules` and the two
prototype HTML files:

| Area | Files | Lines | Fate |
|------|-------|-------|------|
| Pure engines (`.ts`) | `colorloop/{puzzle,levels,match,colors,storage}`, `numberslide/{logic,storage}`, `utils/{rng,motion,theme,useBoardOrigin}` | 750 | **Move nearly unchanged** |
| UI (`.tsx`) | `App`, `components/{Confetti,Controls,HubDemos,Motion}`, `colorloop/{Board,ColorLoopGame,LevelSelect}`, `numberslide/NumberSlideGame` | 3,042 | Re-themed (§4.2), re-rooted (§4.3) |
| `utils/theme.ts` (the walnut/brass `THEME`) | 22 | **Deleted** — only `fmt()` survives (§4.2) |
| `games/colorloop/colors.ts` (7 hand-picked hues) | 14 | **Retired** for `utils/symbolSets.js` (§4.2) |
| Tests (`.ts`) | 7 files, **78 test cases** | 671 | Move; 2 files need a pure-core extraction first (§5) |
| Docs | `game-design.md`, `identity.md`, `testing-plan.md`, `fungiku-plan.md` | — | §8 |

Three numbers worth carrying:

- **`THEME.` is referenced at about 100 sites**, and they are not spread evenly:
  `ColorLoopGame.tsx` 39, `NumberSlideGame.tsx` 23, `LevelSelect.tsx` 13,
  `Controls.tsx` 12, `App.tsx` 9 — and **`Board.tsx` only 2.** The chrome is
  themed; the board essentially is not. That asymmetry is what sizes §4.2: the
  reskin is **chrome work**, which is the cheap kind, and the board changes by
  swapping which palette it imports rather than by being restyled.
- **`utils/rng.ts` is nine lines** (`mulberry32`) and both games plus the match
  seeding depend on it. Fungiku has its own generator seeding in
  `games/fungiku/engine.js`. Do **not** unify them in this epic — see §4.5.
- **`games/colorloop/puzzle.ts` has a pinned-byte-compatibility contract.** Every
  shared code ever produced decodes through `parseCode`/`makeScrambled`, and
  `color-loop`'s `puzzle.test.ts` exists to keep the default scramble depth
  byte-identical. **Any change to that file that moves a generated board breaks
  every code anyone has ever shared.** Treat it as frozen.

## 3. The platform contract, and where these two games sit against it

The cube's architecture review (`docs/cube-plan.md` §8.11) named the contract by
counting imports. Repeating that count for the newcomers is the fastest way to
see the work:

| Platform seam | Sudoku | Fungiku | Cube | Color Loop | Number Slide |
|---|---|---|---|---|---|
| `games/registry.js` entry | ✅ | ✅ | ✅ | **missing** | **missing** |
| `hooks/useAppTheme` | own reducer | ✅ | ✅ | **fixed palette** | **fixed palette** |
| `hooks/useBoardSize` | ✅ | ✅ | ✅ | own `computeGeom` | own inline math |
| `components/ScreenHeader` | own `GameHeader` | ✅ | ✅ | **own back link** | **own back link** |
| `readProgress` → hub badge | ✅ | ✅ | ✅ | **missing** | **missing** |
| `hooks/useBoardOrigin` | — | ✅ | — | own copy (identical intent) | own copy |
| Persistence | `usePersistentReducer` | `usePersistentReducer` | own writer | own writer | own writer |

Read that table as the step list in miniature. Five rows are genuinely missing
and are what Steps 1–3 build. Two rows — `useBoardOrigin` and persistence — are
*duplication*, and the review already ruled on that shape of thing: converge only
where the second implementation is doing the same job. `useBoardOrigin` is; the
persistence writers are not (Color Loop stores eleven independent preference
keys, not one game blob).

**Step 1 closed four of Number Slide's five missing rows** — registry entry,
`useAppTheme`, `useBoardSize({ fill: true })` and `ScreenHeader` — and left
`readProgress` for Step 3 on purpose. Its `useBoardOrigin` copy came across as-is
and now lives at `games/numberslide/useBoardOrigin.ts`: inside the game rather
than beside the platform's in `hooks/`, because a second `hooks/useBoardOrigin`
differing only by file extension is the worst available name for it. Step 2 needs
the same file for Color Loop and should decide then whether to lift it somewhere
both games can see; **Step 6 still owns whether the platform ends up with one
hook or two.**

### One thing the newcomers bring the other way

`color-loop/utils/motion.ts` and `components/Motion.tsx` are a **written motion
vocabulary** — durations, easings, springs, a stagger constant, and four
primitives (`FadeSlideIn`, `PopIn`, `ScalePress`, `useCountUp`). This repo has
none. Fungiku's celebration timings are constants inside
`games/fungiku/celebration.js`; the cube has no entrance motion at all.

**This epic ports the vocabulary but does not retrofit anything onto it.** The
tokens land in `SudokuApp/utils/motion.js` because two games arriving already use
them; whether Fungiku's celebration should be rewritten on top is a *finding*, not
a step. Three callers is when that question gets asked, and it will have three.

## 4. The five decisions that shape the epic

### 4.1 The games stay TypeScript, and the app learns to read it

`SudokuApp/` is 100% JavaScript with no `tsconfig.json` and no `babel.config.js`.
The incoming code is 4,463 lines of TypeScript.

**Decision: enable TypeScript in `SudokuApp/`; do not transliterate the games to
JavaScript.**

Hand-converting 3,000 lines of working, tested, device-proven UI is the highest-risk,
lowest-value work in the epic, and it would delete the type safety that makes
`puzzle.ts`'s code contract legible (`Mode`, `Grid`, `PlayCtx`'s discriminated
union). Expo compiles `.ts`/`.tsx` with no config beyond a `tsconfig.json`, and
mixed JS/TS trees are ordinary.

The cost is exactly three things, and none is large:

1. `tsconfig.json` extending `expo/tsconfig.base`, plus `typescript` and
   `@types/react` as devDependencies.
2. A `typecheck` script (`tsc --noEmit`) added to the pre-merge gates. **New
   gate — say so in the PR.** Note it only covers the `.ts`/`.tsx` files;
   `allowJs` is deliberately off so the existing JavaScript is not suddenly
   under a type checker nobody asked for.
3. The Jest transform (§5).

**Do not convert existing JavaScript to TypeScript in this epic**, including
files the new games touch. A creeping conversion is how a merge becomes a
rewrite.

#### What Step 1 found: it is four things, and `allowJs: false` has a price

The list above is right about the shape and wrong about the total. **Built in
Step 1, the cost came out as:**

1. `tsconfig.json`, `typescript`, `@types/react` — **and `@types/jest`**, because
   the incoming `.test.ts` files are `.ts` and therefore under the new gate too.
2. The `typecheck` script.
3. The Jest transform.
4. **A `.d.ts` beside every JavaScript module the games import.** This is the one
   the plan did not see, and it follows directly from `allowJs: false`: with it
   off, TypeScript does not merely skip type-*checking* the JavaScript — it
   cannot **resolve** a `.js` module at all, so `import useAppTheme from
   '../../hooks/useAppTheme'` is `TS2307: Cannot find module`. Every guest game
   is going to import the platform seam, so something has to bridge it.

**The bridge is hand-written declarations, and `allowJs` stays off.** Six shims
covered all of Step 1: `hooks/useAppTheme`, `hooks/useBoardSize`,
`components/ScreenHeader`, `utils/color`, `utils/themes`, `utils/gameProgress` —
which is, exactly, §3's platform-seam table written in types. That is a better
artefact than `allowJs: true, checkJs: false` would have been, and it is why the
constraint is worth keeping rather than relaxing.

It has one real cost, and it is worth stating rather than discovering: **a
`.d.ts` is trusted absolutely.** TypeScript resolves `utils/color` to
`utils/color.d.ts` and never opens `utils/color.js`, so renaming an export on the
JavaScript side breaks the games at runtime with `tsc --noEmit` still green.
`utils/__tests__/typeShims.test.js` is the floor under that: it reads each shim
and each module and fails if a shim declares a name the module no longer exports.
**Extend that list whenever a shim is added** — Step 2 will need at least
`utils/symbolSets`.

Two smaller findings from the same step, both of which will bite Step 2 if they
are not written down:

- **`utils/rng` and `utils/motion` land as `.ts`, not the `.js` §3 and the Step 1
  scope called for.** §2's own inventory has them under *"Pure engines (`.ts`) —
  move nearly unchanged"*, and that is the reading to follow: written as `.js`
  they would each need a shim of their own, which is pure cost for two files this
  epic owns outright and nothing else imports.
- **Babel and types pin to versions, not to `latest`.** `@babel/preset-typescript`
  and `@babel/preset-react` must be `^7` (their current majors need
  `@babel/core ^8`; this repo is on 7), and `@types/react` / `@types/jest` must be
  what the SDK expects (`~19.1.10`, `29.5.14`) or **`expo-doctor` drops off 18/18
  on a version mismatch** — which is exactly the check §10 says to run in the step
  that adds the dependency rather than at merge time.

### 4.2 The games adopt this app's themes outright — including the puzzle palette

**Settled by the operator, 2026-08-08:** *"I want color loop to fit into the
color themes here. There is no attachment to the walnut and brass."*

Three options were considered; the answer is the most thorough one:

| Option | What it means | Verdict |
|---|---|---|
| **A. Full theme adoption** | Both games render from `useAppTheme`; walnut and brass are deleted | **Adopted** (operator, 2026-08-08) |
| **B. Fixed palette** | Both games keep their own chrome and stay dark whatever the theme | Rejected — the theme selector becomes a lie on two of five cards, and the hub would hand off to a screen that looks like a different app |
| **C. Chrome themed, board not** | Only the frame follows the theme; the tiles and brass stay | Rejected — was the plan's first recommendation on the assumption the desk identity was worth preserving. It is not, and A is better on the merits below |

So: screen background, `ScreenHeader`, panels, buttons, labels, sliders, modals,
win cards, `NumberSlideGame`'s parchment `TILE` faces, and every one of the ~100
`THEME.` sites resolve through `useAppTheme`. `utils/theme.ts`'s `THEME` object
is **deleted** rather than ported; only its `fmt()` helper survives, folding into
`utils/gameProgress.js`'s `formatElapsed`.

#### And the puzzle hues come from `utils/symbolSets.js`, not from `colors.ts`

This is what makes A clearly right rather than merely more uniform, and it was
not obvious until the app's own palette was read properly.

`games/colorloop/colors.ts` is **seven hand-picked hex values** with a glyph
each. `utils/symbolSets.js` is a **ten-hue Okabe–Ito palette** that this repo has
already done serious work on:

- Colorblind-safe by construction, with **light and dark variants** whose
  per-hue tint weights were *searched, not chosen* — maximising worst-pair
  CIEDE2000 under protan, deutan and tritan simulation, subject to a lightness
  band and contrast floors.
- `readableOn()` gives a guaranteed-legible ink for each fill, so a glyph never
  disappears into its own tile.
- `utils/__tests__/symbolSets.test.js` pins the ΔE floor, the lightness band, the
  contrast ratios and the per-dichromacy baselines, so a later "let's soften the
  palette" tweak fails a test instead of quietly reintroducing a bug.
- The file's own stated purpose is that there be **"exactly one source of colour
  truth."** Landing a sixth and seventh independent palette beside it, on the day
  the app doubles its game count, is the opposite of that.

Color Loop's glyphs (`●▲■◆★✦✚`) are the **same idea as the swatches' `corners`**
— a non-colour channel of identity so two hues that read alike to someone are
still distinguishable. Keep the redundancy; align the mechanism with
`components/Symbol.js` rather than carrying a second one.

Use the palette's **saturated `color`**, not its tinted `background`. Color Loop
tiles are solid blocks, and full saturation is exactly where Okabe–Ito's
colorblind safety lives — the `background` tints are tuned for Fungiku's soft
grid and spend some of it.

#### ⚠️ The trap this creates, and the rule that defuses it

`maxN()` in `puzzle.ts` is **derived from the palette's length**:

```ts
export function maxN(mode: Mode): number {
  return mode === 'diag' ? Math.floor((COLORS.length + 1) / 2) : 6;
}
```

Seven colours ⇒ `maxN('diag') === 4`. A ten-colour palette would make it **5**.
And `parseCode` **clamps `n` to `maxN(mode)`** — so the code `5-ABC-D`, which
today clamps to a 4×4 board, would silently start producing a 5×5 one. That is
the §2 freeze broken from a file nobody would think to check, and it would not
fail a single existing test.

**The rule: Color Loop takes the first seven entries of the platform palette, and
its view of the palette stays length 7.** The palette may hold ten; Color Loop
may not see them. **Add a test pinning `maxN('diag') === 4` and `maxN('rows') ===
6`** next to the existing scramble-compatibility test, so the coupling is
enforced rather than remembered.

#### The contrast floor is not optional

Step 8 of the cube epic found tinted backgrounds landing ΔE 0.9–2.6 apart on dark
themes and had to move the tint to borders and labels. Parchment text
(`#f4ecdd`) on the *Classic* theme's `#f8f8f8` background is that bug, already
written and shipping the moment a `THEME.` site is missed. Every restyled site
gets checked against all seven themes, `utils/color.js`'s `relativeLuminance` and
`readableOn` are what to check with, and the cube's contrast test is the pattern
to copy.

##### And Step 1 found the shape that makes it cheap: derive, then *construct* the floor

`games/numberslide/palette.ts` is the pattern for Step 2 to copy, and it has three
properties worth naming, because the third is what turns a checklist into a
guarantee:

1. **The mapping is one pure function**, `numberSlidePalette(theme, isDark)`, with
   no React and no React Native in it — so all seven themes are testable in the
   node runner, the same split `games/*/geometry.js` already uses.
2. **Every part is played by the token that already plays it in Sudoku**: the
   tray is `grid.background`, a tile face is `cell.background`, a number on a tile
   is `cell.initialValueText`, and the accent — solved board, primary button, code
   chip, SOLVED badge — is `cell.userValueText`, the colour each theme prints the
   *player's own answer* in. That last one is also the only token that differs on
   all seven, which is what makes cycling the theme visibly carry the screen.
3. **`ensureContrast(colour, against, min)` blends toward black or white until the
   ratio clears**, so the floor holds by construction and an *eighth* theme
   arrives legible instead of arriving as a device bug. The test is the floor
   under that, not a description of hand-picked hues.

Two traps inside it, both found by the test on its first run rather than by
reading:

- **The push direction has to be searched in both directions.** Choosing it from
  the background's luminance is the obvious implementation and it is wrong twice:
  a dark ink on a mid-tone fill has to get *darker*, and against a mid-tone
  background neither endpoint is guaranteed to reach a given ratio. Sunrise's
  amber accent is the live example — 3.97:1 where 4.5 was asked for.
- **A win card's text does not sit on the background.** It sits on the scrim, over
  a board that has just turned accent-coloured, and that composite is a third
  colour. Measured against the page it passes; measured against what is actually
  behind it, a light theme lands near 3.4:1. Compute the composite
  (`mix(litTile, background, alpha)`) and hold the text to *that*. The same will
  be true of every overlay Color Loop brings.

One more, which is a design finding rather than a contrast one: **the scrim must
not be heavy enough to hide the celebration.** At 0.86 the solved board's accent
was gone under it; 0.72 — the sibling app's own weight — keeps the board present
and still clears every text floor.

#### What this costs

More than option C did, and the cost is concentrated where the plan already
measured it: `ColorLoopGame.tsx` 39 sites, `NumberSlideGame.tsx` 23,
`LevelSelect.tsx` 13, `Controls.tsx` 12. **`Board.tsx` is still only 2** — the
board draws from `COLORS`, so swapping its palette source is a one-line import
change plus the glyph alignment, not a restyle. The theming work is chrome work,
which is the cheap kind.

Brass does not survive as a colour, but it does survive as an idea: Color Loop's
registry `accent` is the one place a game is allowed its own hue (Fungiku's
`#a0522d`, the cube's `#c62828`), and picking it from the palette keeps even that
inside the source of truth.

### 4.3 Color Loop's inner hub becomes a menu, not a second front door

`ColorLoopGame.tsx` contains its own four-screen router
(`'home' | 'training' | 'play' | 'dev'`) with its own home screen, because it
*was* an app. Dropped onto this hub unchanged, the player taps "Color Loop" on
the front door and arrives at… another front door.

**Decision: the inner `home` screen becomes a mode menu reached from
`ScreenHeader`'s menu button, exactly where Fungiku's difficulty menu is.**
Tapping the hub card lands on a playable board.

- Free play, Training and Match are what the menu chooses between. Fungiku's
  `FungikuMenuModal` is the shape to follow, and *"a game with a difficulty menu
  should open it from the same place in either game"* is already
  `ScreenHeader`'s stated contract.
- `LevelSelect` stays a full screen — an 18-rung ladder with stars is not a
  modal — but it is reached from the menu, and its back affordance returns to the
  board, not to a hub.
- **The `dev` screen (physics sliders: friction, flick, magnet, twin) does not
  ship on the hub.** It is a tuning surface for an unfinished tuning pass
  (`color-loop`'s backlog: *"dial in touch feel on device"*). Keep the sliders
  behind the menu on the epic branch, and decide before the merge to `main`
  whether they become a real setting or come out. Open question 3.
- Number Slide has no inner hub and needs none.

### 4.4 Storage keys are renamed, and there is nothing to migrate

Color Loop's eleven keys are unprefixed (`colorLoopSize`, `colorLoopBest`,
`numberSlideBest`, …). This repo's convention is `@SudokuGame`, `@FungikuGame`,
`@CubeScramble`, `@AppTheme`.

**Decision: rename to `@ColorLoop` / `@NumberSlide` and write no migration.**

The reasoning is worth stating because it is easy to get wrong out of caution:
AsyncStorage is scoped to the installed app, and the merged app is
`com.mjohnson139.sudokuapp`. A player's standalone Color Loop install
(`com.mjohnson139.colorloop`) is a **different app** whose storage this build can
never see. There is no save to preserve, so a migration would be code that can
only ever be dead. Say this in the PR rather than leaving it to be re-derived.

Two consequences to honour:

- Consolidate the eleven keys into **one blob per game**, matching the platform
  (`@ColorLoop` holding size, mode, name, bests, physics, training, matchBest;
  `@NumberSlide` holding the best). Write it versioned (`_v`) from the first
  commit — the cube's §7.2 lesson is that a save file reshaped twice costs more
  than one designed once.
- **A player's Color Loop board is currently not resumable at all** — the games
  persist bests and settings, never an in-progress board. See §4.6.

**Step 1 built `@NumberSlide` and then removed it again** (operator, 2026-08-08:
*"let's remove the high score portion of the number slide"*), and the removal is
the more useful record. A personal best on a game whose whole point is a
*shareable* code is the wrong scoreboard — the board is the same board on
everyone's phone, so the interesting comparison is against the person you sent
the code to, not against yourself last Tuesday. Number Slide therefore persists
**nothing** as of Step 1, and its card carries no badge.

The consequence for §4.6 is real: **`describeNumberSlideProgress` has no standing
to fall back to.** Number Slide's Continue badge now depends entirely on the
resumable board Step 3 adds — there is no "best time" second-best answer. Color
Loop still has `Training · 7 of 18 · 14★`.

### 4.5 Codes are the platform's most interesting idea, and this epic does not build a framework for it

Color Loop's whole product concept (`color-loop/docs/game-design.md`) rests on
one property: **a board is a pure function of a code**, so a code is a puzzle, a
challenge and an invitation at once. Fungiku stores a seed. The cube's scramble
is a shareable string already.

The temptation, on the day the fourth and fifth games land, is to build the
shared thing: a code grammar, a `SharedPuzzle` interface, a platform-wide
challenge screen.

**Do not.** The cube's review set this rule and it applies with more force here:
*"a cube-shaped abstraction with one implementation is a cost with no benefit…
this step must not produce a plugin framework, a game SDK, or a base class."*
What lands in this epic is Color Loop's code system **inside Color Loop**,
unchanged and byte-compatible. The platform-wide version is a later epic that
will have three real callers to design against instead of one.

The one thing worth doing now because it costs almost nothing: keep
`utils/rng.js`'s `mulberry32` as a shared util rather than a Color Loop private,
since both incoming games and the match seeding already share it. That is
promoting a function with two callers, which is the opposite of building a
framework.

### 4.6 What "Continue" means for a game with no saved board

Every hub card can carry a Continue badge from `readProgress`. Neither incoming
game has anything to continue: they persist a personal best and settings, and a
board in flight is lost the moment you leave.

Two ways out, and the epic takes both, in order:

1. **Make the boards resumable** (Step 3). It is genuinely cheap — a Color Loop
   board is `{ seed, n, mode, grid, moves, secs, phase }` and a Number Slide
   board is `{ seed, tiles, moves, secs }`. Once saved, "Continue" means on these
   cards exactly what it means on the other three, and leaving for the hub stops
   costing the player their run — which is the platform behaviour Fungiku's §6
   established and a guest game should not quietly break.
2. **Fall back to standing**, the way the cube does when there is no solve to
   return to: `Training · 7 of 18 · 14★` for Color Loop. **Number Slide has no
   fallback** — its best time was removed in Step 1 (§4.4), so its card is
   blank until there is a board to resume.

`describeColorLoopProgress` and `describeNumberSlideProgress` go **next to the
games**, not into `utils/gameProgress.js`. The cube's review named that file's
inverted dependency as its headline finding — a shared util importing three
games' internals — and adding a fourth and fifth import to it would be shipping
the known bug twice. `formatElapsed` is the shared part and stays; Color Loop's
own `fmt()` collapses into it.

## 5. Tests: 78 cases, two runners, one node environment

The two suites disagree about everything except the assertion library:

| | Puzzle Box | Color Loop |
|---|---|---|
| Preset | none — `babel-jest` + `@babel/preset-env` | `jest-expo` |
| Environment | `node` | jsdom (via preset) |
| Match | `**/__tests__/**/*.test.js` | `**/__tests__/**/*.test.ts` |
| Count | ~834 | 78 |

**Decision: one runner, and it is this repo's.** The node environment is what
makes ~834 tests fast and is the reason the cube's pure core is testable at all;
adopting `jest-expo` to accommodate 78 tests would be the tail wagging the dog.

The change is small: extend `testMatch` to `*.test.{js,ts}`, add a
`^.+\\.tsx?$` transform with `@babel/preset-typescript`, and keep everything
else. **Five of the seven incoming test files then pass untouched** — they import
only pure modules.

The other two are the interesting part, and the fix is this repo's own
convention rather than a concession:

- **`board.test.ts` imports `computeGeom` and `linesAt` from `Board.tsx`**, which
  imports `Animated` and `PanResponder`. Extract both into
  `games/colorloop/geometry.ts` — precisely what `games/fungiku/geometry.js` and
  `games/cube/geometry.js` already are. `linesAt` is *"which line did this grab
  land on"*: arithmetic that decides what the player touched, which is exactly
  the kind of logic this repo keeps in a pure module and pins.
- **`storage.test.ts` imports the sanitizers**, which sit in a file that imports
  AsyncStorage. Extract `sanitizeTraining`/`sanitizeMatchBest` into a pure
  `games/colorloop/saveShape.ts` — what `games/fungiku/saveMigration.js` and
  `games/cube/solveList.js` are, for the same reason.

Both extractions are worth doing on their own merits, and doing them buys the
whole suite in a plain node environment with no `jest-expo` and no jsdom.

**Add, at minimum:** a round trip proving every `LEVELS` seed still generates the
same board after the move (the §2 freeze, pinned rather than asserted), and the
contrast floor from §4.2 across all seven themes.

## 6. Dependencies, identity, and release housekeeping

**Dependencies to add: one.** `expo-clipboard` (~8.0.8) — both games copy codes
and result cards. Everything else the incoming code imports is already here:
`react-native-safe-area-context`, `@react-native-async-storage/async-storage`,
`expo-status-bar`. `babel-preset-expo` is not needed as an explicit dependency
here the way it is in `color-loop` (this app has no `babel.config.js` and resolves
it through Expo's metro transformer).

**Dependency to converge:** the incoming games buzz with RN's `Vibration`; this
app uses `expo-haptics` (added by the cube's Step 8). Move them to
`expo-haptics` — one API for one thing, and `Vibration` has no iOS intensity
control. It fires in a place only a device can judge, so it is a device-test line
in every step that touches it.

**Identity and release:**

- `app.json` — `web.description` currently reads *"Two logic puzzles and a 3D
  Rubik's cube behind one hub"* and becomes wrong the moment Step 1 lands. It is
  a one-line edit but it must not be forgotten at merge time.
- `APP_NAME` stays **Puzzle Box** and `APP_TAGLINE` stays *"Pick a puzzle"*.
  `utils/appIdentity.js` already records why the slug and bundle identifier do
  not move; the same argument applies to Color Loop's, which are simply retired.
- **Version `3.2.0`**, one build-notes entry per the standing rule (build notes
  are per release, not per step), extended as steps land and made to describe the
  whole feature at merge time.
- README gains two game sections and the folder-structure list gains two entries.
- **The web build.** Both apps deploy to Vercel, and **Puzzle Box's deploy is
  configured in Vercel's dashboard rather than in this repo** (operator,
  2026-08-08 — it is what most of the functionality has been tested on). There is
  no `vercel.json` here and no deploy job in the workflow despite its name, which
  is why a repo-only reading of this misses it; `SudokuApp/web/` (its
  `index.html`, `manifest.json`, `robots.txt`, apple-touch-icon) is the visible
  half. **Nothing is lost by merging**, and Color Loop's own Vercel project is
  retired with the repo.

  Two things follow that do matter. **The build must keep bundling for web at
  every step** — `npx expo export --platform all` is already a gate and it covers
  this. And **the deploy's build settings live outside version control**, so if
  Step 1's TypeScript addition changes what the build command needs, the
  dashboard is the place that breaks and no PR check will catch it. Verify the
  Vercel deploy explicitly in the step that adds `tsconfig.json`.

  **Step 1 did, and the answer is that nothing about the build command changes.**
  `npx expo export --platform web` produces the same `dist/` it did before — the
  new `.ts`/`.tsx` is compiled by `babel-preset-expo` through Metro, which has
  supported TypeScript without configuration for years and does not read
  `tsconfig.json` to do it. `typescript` itself is only ever run by the
  `typecheck` script.

  The one hazard worth naming, because it is the one that could still bite: the
  new packages are **devDependencies**, so a deploy that installed with
  `--omit=dev` would not have them. It does not, and this can be settled without
  the dashboard — `@babel/core` has been a devDependency of this app since before
  the hub existed and Metro cannot bundle without it, so a production-only install
  would have been failing the whole time. `typescript` joining that list is
  therefore free. **What still needs an eye at merge time is only whether the
  dashboard pins an old Node or an install flag** — the repo cannot answer that
  one.

  What is *not* built either side is the piece Color Loop's roadmap called the
  highest-leverage next step: **a URL that carries a code**
  (`…/play?code=MS-K7P2Q`) so a shared board opens straight into the game rather
  than onto a hub. That is open question 5 — genuinely better on a hub that can
  route to any game, and out of scope for the merge itself.

## 7. Delivery steps

One branch per step, each PR targeting `epic/color-loop`, each ending with the
operator testing in Expo Go. **Every step has a branch, a starting prompt and a
handoff** — the three-part process is written out in
`docs/colorloop-merge-handoff.md` under *How a step runs*, and each step's
starting prompt lives in that file's section for it.

| Step | Branch |
|---|---|
| 0 — the plan | merged directly to `epic/color-loop` |
| 1 — Number Slide | `feature/color-loop-numberslide` |
| 2 — Color Loop | `feature/color-loop-board` |
| 3 — resume and badges | `feature/color-loop-resume` |
| 4 — training and match | `feature/color-loop-training` |
| 5 — contrast and motion | `feature/color-loop-polish` |
| 6 — review and merge | `feature/color-loop-review` |

A correction that arrives after a step merged is its own branch and PR, numbered
`Step Na` — the cube's Step 7a and 8a are the precedent. Do not reopen a merged
step.

- **Step 0 — this plan** and the tracker issue. *(this PR)*
- **Step 1 — Number Slide on the hub.** ✅ The smaller game first, deliberately:
  it has no inner hub, no code system and no ladder, so it proves the whole seam
  — TypeScript, the Jest transform, the registry entry, `ScreenHeader`, and **the
  full theme adoption of §4.2** — against 600 lines instead of 1,700. Shipped:
  `tsconfig.json` and six `.d.ts` shims, the test transform,
  `utils/motion.ts` + `components/Motion.tsx`, `utils/rng.ts`, `expo-clipboard`,
  `Vibration` → `expo-haptics`, `games/numberslide/` rendering entirely from
  `useAppTheme` through a pure `palette.ts`, a fourth hub card with no
  `readProgress`. **The platform question is answered and Step 2 is mostly
  repetition** — §4.1 and §4.2 above carry what it found.
- **Step 2 — Color Loop on the hub.** The board, the physics, free play, the code
  system, `Confetti`, `Controls` — all on the theme. **`colors.ts` is retired for
  `utils/symbolSets.js` here**, with the `maxN` pin from §4.2 landing in the same
  PR as the palette swap, never after it. The inner hub becomes the menu (§4.3);
  Training and Match are reachable but unpolished. Fifth hub card.
- **Step 3 — resume, and the badges.** Versioned one-blob saves for both games
  (§4.4), a board that survives a trip to the hub, and both `readProgress`
  implementations living next to their games (§4.6).
- **Step 4 — Training and Match, at home.** The 18-rung ladder and the match
  gauntlets under this app's chrome: `LevelSelect` on `ScreenHeader`, star
  thresholds intact, result cards copying through `expo-clipboard`. The ladder's
  thresholds are still estimates (`color-loop`'s backlog) — this is the step that
  says so out loud rather than the step that tunes them.
- **Step 5 — the contrast and motion pass.** Steps 1–2 theme each game as it
  lands; this step is the one that *proves* it. Every one of the ~100 restyled
  sites checked against all seven themes with a test as the floor, the puzzle
  palette's ΔE and contrast guarantees confirmed to still hold with Color Loop as
  a consumer (the existing `symbolSets.test.js` is the pattern and may simply
  need extending), entrances on the house `STAGGER`, and the two win celebrations
  reconciled — whether Color Loop's count-up card and Fungiku's win dialog stay
  two things is decided here, with three callers on the table, not two.
- **Step 6 — the architecture review and the merge decision.** Modelled on the
  cube's Step 10, against the same bar, and exempt from the Expo-Go rule for the
  same reason. It answers: is `utils/gameProgress.js`'s inverted dependency now
  bad enough to fix with five games on it; is `useBoardOrigin` one hook or two;
  does the platform own a persistence primitive or does Fungiku; and **can
  `epic/color-loop` merge to `main`.** Plus storage compatibility, `expo-doctor`
  18/18, `expo export --platform all`, `npm test`, `tsc --noEmit`, build notes
  and `app.json`.

Steps 1 and 2 are the epic. Steps 3–5 are what stops it being a port. Step 6 is
what stops it being a mess.

## 8. What happens to the `color-loop` repo

**Nothing is deleted until the epic merges to `main`.** Until then `color-loop`
is the reference for anything ambiguous, and its Vercel deploy is the only place
these games are playable on the web.

At merge:

- `color-loop`'s `CLAUDE.md` decision log records that the games moved and where
  they now live, and its README says so at the top. The repo becomes an archive,
  not a fork to keep in sync — **there is no scenario where a fix lands in both.**
- `docs/game-design.md` (the code-system product concept, the phased roadmap,
  the Firebase design, the monetization comparison) and `docs/identity.md` (the
  motion language) **come with the games** — they are the reasoning behind code
  that now lives here. They arrive as `docs/colorloop-game-design.md` and
  `docs/colorloop-identity.md`, unedited except for path references.
- `color-loop/docs/fungiku-plan.md` is a **stale copy** of this repo's own plan,
  written when the third game was going to be built there. It does not come back.
- `color-loop/docs/testing-plan.md` describes a tiered plan (Playwright web
  smoke, Maestro native flows) that this repo does not have. It is a **proposal
  for this repo**, not a document about Color Loop, and it should be evaluated on
  those terms — separately, after the merge.
- The EAS project `ca5927ba-…` is retired; `e6c3fb8f-…` is the only one.

## 9. Open questions for the operator

1. ~~**Is §4.2 the right call?**~~ **Answered by the operator, 2026-08-08**:
   *"I want color loop to fit into the color themes here. There is no attachment
   to the walnut and brass."* Full theme adoption, and the puzzle palette comes
   from `utils/symbolSets.js` too. §4.2 is rewritten around it. What is still
   open underneath it is narrow but real: **do Color Loop's glyphs stay as
   characters (`●▲■◆★✦✚`) or become the swatches' `corners` silhouettes?** Both
   are valid non-colour cues; the characters are what players of the standalone
   app know, the silhouettes are what this app already draws. Cheap either way,
   and better settled by looking at a board than by argument.
2. **Does Color Loop keep its name on this hub?** *Color Loop* was the app; here
   it is a card. It reads well next to *Fungiku* and *Cube Scramble*, so the
   default is to keep it. Same question, quietly, for *Number Slide* — the
   classic's real name is the 15-puzzle. **Step 1 shipped the default** (the card
   reads *Number Slide*); renaming a card is a one-line change in the registry,
   so it stays cheap to answer later.
3. **Do the physics sliders ship?** Friction, flick, magnet and twin are
   currently a dev screen for an unfinished tuning pass. Options: a real setting
   in the menu, a hidden dev surface on the epic branch only, or delete them and
   ship the tuned constants. §4.3.
4. **Are training and match one game or two cards?** The hub currently promises
   *"a puzzle"* per card, and Color Loop would arrive carrying three modes behind
   a menu. That is Fungiku's shape (difficulty menu) and is probably right — but
   a *Match* card that is explicitly "race a friend on a code" is the most
   shareable thing in the app, and burying it one tap deep is how it never gets
   used.
5. ~~**Does Puzzle Box get a web deploy?**~~ **It already has one** (operator,
   2026-08-08) — configured in Vercel's dashboard, not in this repo, which is why
   the plan first read it as missing. §6 is corrected. **What is still open is
   the useful half: does a shared code get a URL?** `…/play?code=MS-K7P2Q`
   landing straight on the board was the highest-leverage next step in the
   standalone app's own roadmap, and it is strictly better on a hub that can
   route to any game. Out of scope for the merge; worth deciding whether it is
   the epic that follows it.
6. **Do the other games get codes?** Not in this epic (§4.5). But Fungiku already
   stores a seed and its boards are deterministic, so *"here is the exact board I
   just solved"* is nearly free for it, and the cube's scramble string already is
   a code. Worth knowing whether that is where the box is heading, because it
   changes what Step 6 should recommend.
7. **Number Slide at 4×4?** It is hardcoded to 3×3 and the logic is size-generic
   in most places. Out of scope for the merge; cheap afterwards.

## 10. Edge cases and things that are easy to get wrong

- **`makeScrambled` is frozen.** §2. A "harmless" refactor of the scramble loop
  invalidates every code ever shared. The existing test pins it; do not weaken it.
- **And the palette is part of that freeze**, which is the least obvious thing in
  this document. `maxN()` is derived from `COLORS.length` and `parseCode` clamps
  `n` to it, so **growing Color Loop's palette from 7 to 10 changes which board a
  code produces** — silently, with every existing test still green. §4.2 has the
  rule (Color Loop sees seven entries) and the pin to add.
- **`locationX`/`locationY` is a trap on this architecture**, and both incoming
  games plus their slider were bitten by it on the SDK 54 upgrade. Everything
  resolves touches through `pageX/pageY` minus a measured origin. When
  `useBoardOrigin` converges, **keep this repo's version** — it re-measures at
  gesture *grant*, not only on layout, which `color-loop`'s does not, and a
  flex-centred board moves when anything above it appears.
- **`LayoutAnimation` needs the Android opt-in.** `NumberSlideGame.tsx` calls
  `UIManager.setLayoutAnimationEnabledExperimental(true)` at module scope. It
  must survive the move, and it must not fight anything.
- **`useNativeDriver` and `setValue`** must not mix (`docs/fungiku-plan.md`
  §2). The incoming code uses `USE_NATIVE = Platform.OS !== 'web'`, which is the
  same rule spelled differently — do not "simplify" it to `true`.
- **`Vibration` fires on win in both games.** After the move to `expo-haptics`,
  this is device-test-only. No browser check covers it.
- **The web container is 600pt wide and centred** on this app's screens
  (`HubScreen`, `useBoardSize`). Color Loop's board sizes itself off
  `useWindowDimensions` capped at 440. They will disagree; `useBoardSize({ fill:
  true })` is the platform answer and knows about the 600pt container.
- **A row wider than the board widens the ScrollView's content container** and
  pushes every centred sibling off-screen — Fungiku shipped that bug with a row
  of hearts. Color Loop's controls and match splits are exactly that shape of
  row.
- **Sudoku writes the theme through to `@AppTheme`** and the shell follows it.
  New games read `useAppTheme` and must not write it; a second writer is a second
  source of truth.
- **Two confetti implementations will exist** (`games/fungiku/confetti.js` and
  the incoming `components/Confetti.tsx`). That is acceptable through Step 4 and
  is Step 5's to decide. Do not merge them in passing.
- **`expo-doctor` expects 18/18.** Adding `typescript` and `expo-clipboard`
  is exactly the kind of change that moves it; run it in the step that adds them,
  not at merge time.
