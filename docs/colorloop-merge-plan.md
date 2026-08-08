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
  main ─── epic/colorloop ─── feature/colorloop-<step>   (PRs target the epic)
  ```

  Pushing `epic/colorloop` publishes an EAS Update branch of the same name
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
| UI (`.tsx`) | `App`, `components/{Confetti,Controls,HubDemos,Motion}`, `colorloop/{Board,ColorLoopGame,LevelSelect}`, `numberslide/NumberSlideGame` | 3,042 | Re-chromed (§4.2), re-rooted (§4.3) |
| Tests (`.ts`) | 7 files, **78 test cases** | 671 | Move; 2 files need a pure-core extraction first (§5) |
| Docs | `game-design.md`, `identity.md`, `testing-plan.md`, `fungiku-plan.md` | — | §8 |

Three numbers worth carrying:

- **`THEME.` is referenced at about 100 sites**, and they are not spread evenly:
  `ColorLoopGame.tsx` 39, `NumberSlideGame.tsx` 23, `LevelSelect.tsx` 13,
  `Controls.tsx` 12, `App.tsx` 9 — and **`Board.tsx` only 2.** The chrome is
  themed; the board essentially is not. That asymmetry is what makes §4.2 cheap.
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

### 4.2 The theme owns the chrome; the board keeps its own palette

This is the decision the epic will be judged on.

Color Loop's fixed dark palette and Puzzle Box's seven themes cannot both win.
Three options were considered:

| Option | What it means | Verdict |
|---|---|---|
| **A. Full reskin** | Both games render entirely from `useAppTheme`; walnut and brass are deleted | Rejected — throws away a designed identity for uniformity nobody asked for, and about 100 style sites is the most expensive way to do it |
| **B. Fixed palette** | Both games keep their own chrome and stay dark whatever the theme | Rejected — the theme selector becomes a lie on two of five cards, and the hub would hand off to a screen that looks like a different app |
| **C. Chrome themed, board not** | Screen background, header, panels, buttons and text come from `useAppTheme`; the tiles, the puzzle colours, and brass-as-reward stay | **Adopted** |

**C is not a compromise, it is what the app already does.** Fungiku's mushrooms,
region colours, hearts (`#d1495b`) and coins (`#c8952b`) are fixed values chosen
for the game, sitting inside a themed screen. The cube's stickers are the
standard colour scheme and are not up for theming. Colour that *carries meaning
inside the puzzle* is the game's; colour that frames it is the theme's. Color
Loop's own identity doc states the same rule from the other side: *"saturated
colour stays on the board; brass = reward."*

Concretely:

- `games/colorloop/colors.ts` (the seven puzzle hues), the tile faces in
  `NumberSlideGame`'s `TILE`, and the board's own felt/socket surfaces: **keep**.
- Screen background, `ScreenHeader`, panels, buttons, labels, sliders, modals,
  the win card's frame: **`useAppTheme`**.
- **Brass (`#e0a943`) survives as Color Loop's accent** — it is the games'
  registry `accent`, the same way `#a0522d` is Fungiku's, and it is what the win
  card and `NEW RECORD!` use. Number Slide gets its own accent.
- **The contrast floor is not optional.** Step 8 of the cube epic found tinted
  backgrounds landing ΔE 0.9–2.6 apart on dark themes and had to move the tint to
  borders and labels. Parchment text (`#f4ecdd`) on the *Classic* theme's
  `#f8f8f8` background is that bug, already written. Every text colour that
  currently comes from `THEME` must resolve through the theme or be checked
  against all seven backgrounds. `utils/color.js`'s `relativeLuminance` is there
  for it, and the cube's contrast test is the pattern to copy.

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
   return to: `Training · 7 of 18 · 14★` for Color Loop, the best time for
   Number Slide.

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
- **The web build is the gap worth naming.** `color-loop` deploys to Vercel on
  every push, and its game-design doc calls the web build the acquisition funnel:
  a shared code should open a browser straight onto that board. This repo has no
  web deploy at all — the workflow is named *"EAS Publish & Web Deploy"* and has
  no deploy job. Merging without one **loses a shipped capability**. It is not in
  the step list below because it is infrastructure rather than a game; it is open
  question 5, and it should be answered before the epic merges to `main`.

## 7. Delivery steps

One branch per step, each PR targeting `epic/colorloop`, each ending with the
operator testing in Expo Go.

- **Step 0 — this plan** and the tracker issue. *(this PR)*
- **Step 1 — Number Slide on the hub.** The smaller game first, deliberately: it
  has no inner hub, no code system and no ladder, so it proves the whole seam
  — TypeScript, the Jest transform, the registry entry, `ScreenHeader`, the theme
  split — against 600 lines instead of 1,700. Ships: `tsconfig.json`, the test
  transform, `utils/motion.js` + `components/Motion.tsx`, `utils/rng.js`,
  `expo-clipboard`, `games/numberslide/`, a fourth hub card. **When this lands
  the platform question is answered and Step 2 is mostly repetition.**
- **Step 2 — Color Loop on the hub.** The board, the physics, free play, the code
  system, `Confetti`, `Controls`. The inner hub becomes the menu (§4.3);
  Training and Match are reachable but unpolished. Fifth hub card.
- **Step 3 — resume, and the badges.** Versioned one-blob saves for both games
  (§4.4), a board that survives a trip to the hub, and both `readProgress`
  implementations living next to their games (§4.6).
- **Step 4 — Training and Match, at home.** The 18-rung ladder and the match
  gauntlets under this app's chrome: `LevelSelect` on `ScreenHeader`, star
  thresholds intact, result cards copying through `expo-clipboard`. The ladder's
  thresholds are still estimates (`color-loop`'s backlog) — this is the step that
  says so out loud rather than the step that tunes them.
- **Step 5 — the contrast and motion pass.** Every one of the ~100 restyled sites
  checked against all seven themes with a test as the floor, entrances on the
  house `STAGGER`, and the two win celebrations reconciled — whether Color Loop's
  count-up card and Fungiku's win dialog stay two things is decided here, with
  three callers on the table, not two.
- **Step 6 — the architecture review and the merge decision.** Modelled on the
  cube's Step 10, against the same bar, and exempt from the Expo-Go rule for the
  same reason. It answers: is `utils/gameProgress.js`'s inverted dependency now
  bad enough to fix with five games on it; is `useBoardOrigin` one hook or two;
  does the platform own a persistence primitive or does Fungiku; and **can
  `epic/colorloop` merge to `main`.** Plus storage compatibility, `expo-doctor`
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

1. **Is §4.2 the right call?** Chrome themed, board and brass kept. The
   alternative worth reconsidering is *Color Loop keeps its dark desk entirely*
   and the theme selector simply does not apply to it — defensible if the desk is
   the point. It is much cheaper, and it makes the app look like two apps.
2. **Does Color Loop keep its name on this hub?** *Color Loop* was the app; here
   it is a card. It reads well next to *Fungiku* and *Cube Scramble*, so the
   default is to keep it. Same question, quietly, for *Number Slide* — the
   classic's real name is the 15-puzzle.
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
5. **Does Puzzle Box get a web deploy?** §6. Without one the merge loses Color
   Loop's shipped web build, and a shared code has nowhere friction-free to land.
   URL-embedded codes (`…/play?code=MS-K7P2Q`) were the highest-leverage next
   step in the standalone app's own roadmap and are strictly better on a hub that
   can route to any game.
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
