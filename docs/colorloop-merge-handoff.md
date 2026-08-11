# Color Loop merge — next step

**Read this first, then `docs/colorloop-merge-plan.md`.** This file always
describes *the next step only*. Rewriting it for the following step is part of
every step's definition of done — a step that leaves this describing finished
work has broken the chain for the next session.

Tracker: **issue #103**.

## Standing context

Two games — **Color Loop** (wrapping row/column slider) and **Number Slide**
(the sliding-tile classic at 3×3, 4×4 and 5×5) — move from the sibling app
`mjohnson139/color-loop` onto this hub as the fourth and fifth cards. Same Expo
SDK, same RN version, same operator. The plan is
`docs/colorloop-merge-plan.md`; read it end to end before writing code.

**⚠️ Fetch `mjohnson139/color-loop` and diff its `main` before porting
anything.** It is a live repo, not an archive, and the plan's inventory pins a
revision (`e07eb82`) that `main` has already moved past — Step 1 shipped a
3×3-only Number Slide before the operator pointed out that 4×4 and 5×5 had
landed upstream. Plan §2 has the warning in full. **Step 2 checked and found no
drift** (`main` is still `708d59a`, and its diff against `e07eb82` touches only
Number Slide files) — which is a result of the check, not a reason to skip it.

## How a step runs

Every step in this epic has the same three parts: **a branch, a starting prompt,
and a handoff.** The cube epic ran this informally across ten steps and it is
what kept a cold session productive; here it is written down.

### 1. Branching

```
main ─── epic/color-loop ─── feature/color-loop-<step>   (PRs target epic/color-loop)
```

- `epic/color-loop` is cut from `main` and **everything merges into it**, never
  into `main`. `main` never carries a half-merged game.
- **One delivery step per branch**, named `feature/color-loop-<short-skewer-name>`
  (`.github/dev-process.md`). Step 3 is `feature/color-loop-resume`.
- A step PR targets `epic/color-loop`, is squash-merged, and its branch is
  deleted.
- A follow-up correction that arrives *after* a step merged — the operator using
  it on a phone and finding something wrong — is its own branch and its own PR,
  numbered like the cube's `Step 7a`. Do not reopen a merged step.
- **The epic merges to `main` once, at Step 6**, with the architecture review as
  the sign-off. `epic/cube` and `epic/fungiku` both did exactly this.
- Pushing `epic/color-loop` publishes an EAS Update branch of the same name
  (`.github/workflows/eas-publish.yml`), so the epic is openable in Expo Go
  (project → Branches) even when no step PR is open. Each step PR also gets its
  own `pr-<N>` preview with a QR code, cleaned up when the PR closes.

### 2. The starting prompt

**A step starts from a one-line prompt, not a pasted brief.** That is the whole
reason this file exists — the brief is already written, in this file, and a
session that has to be re-briefed by hand is a session whose context nobody can
reproduce.

Each step below carries its own **Starting prompt** block, ready to paste into a
fresh session. The template, for writing the next one:

```
Work Step <N> of the Color Loop merge epic in mjohnson139/expo-sudoku.

Read docs/colorloop-merge-handoff.md first — it describes this step and only
this step — then docs/colorloop-merge-plan.md end to end before writing code.

Branch feature/color-loop-<name> off epic/color-loop. PR targets
epic/color-loop, never main. Tracker is issue #103.
```

Everything else the session needs — scope, what is out of scope, the traps, how
to verify — is in this file's section for that step. **If a step's prompt needs
to say more than the template, this file is under-written; fix the file, not the
prompt.**

### 3. The handoff (a step's definition of done)

A step is not done when the code works. It is done when the next session can
start from one line. In order:

1. **The step's own checks pass** — the commands under *Verify before you hand
   back*, below.
2. **The operator has tested it in Expo Go** and said so. This is the clause that
   mattered most on the cube: nearly every correction that epic made came from
   the operator using it on a phone between steps.
3. **The tracker's checkboxes are ticked** (issue #103), and anything the step
   settled or discovered is written into the plan — a decision that lives only in
   a PR description is lost.
4. **The `3.2.0` build-notes entry is extended** in `utils/buildNotes.js` (build
   notes are per release, not per step).
5. **This file is rewritten for the next step** — its scope, its traps, its
   starting prompt, what it will look like in Expo Go. Move the finished step
   down to a one-paragraph ✅ record. **A step that leaves this file describing
   finished work has broken the chain**, and it is the single easiest thing to
   forget.

### Golden rules

1. **Every step ships something the operator can open in Expo Go.** Step 0 (the
   plan) and the final architecture review are the only exemptions, and both say
   so explicitly.
2. **Sudoku, Fungiku, Cube Scramble and now Number Slide do not change
   behaviour.** Shared code may be extended; every extension leaves existing
   callers pixel-identical. `ScreenHeader`'s `dense` prop is the pattern — opt-in,
   and Fungiku was opened to prove nothing moved.
3. **`games/colorloop/puzzle.ts` is frozen.** Every shared code decodes through
   it. A refactor that moves a generated board breaks every code anyone has
   shared. The test pins it; do not weaken the test.
4. **No framework.** Codes, seeds and progress-reading stay inside the games that
   own them. Plan §4.5, and the cube's review is the precedent.
5. **One rule, one function.** Where the incoming code and this repo both solve
   something (touch origins, persistence, confetti), either converge deliberately
   and say why, or leave both and write down that you chose to.

### Verify before you hand back (from `SudokuApp/`)

```bash
npm test                          # existing suite must stay green, plus the new tests
npm run typecheck                 # tsc --noEmit — the gate Step 1 added
npx expo-doctor                   # expect 18/18
npx expo export --platform all    # web + iOS + Android must all bundle
```

Then **prompt the operator to test in Expo Go.** Anything touching a gesture or
a layout that a browser renders differently is device-only — this project keeps
finding native-only bugs late. (Haptics used to be on that list and are not:
**the app has none**, and `expo-haptics` is no longer a dependency — plan §6.)

---

## Step 0 — the plan and the tracker ✅

`docs/colorloop-merge-plan.md`, this file, and issue #103. No app code. Merged
to `epic/color-loop` as the branch's first commit, so every step branches from a
tree that already contains its own brief.

## Step 1 — Number Slide on the hub ✅

The fourth card, and the whole platform seam proved against ~600 lines. Landed
`tsconfig.json` (`allowJs: true`, `checkJs: false`) plus the **three `.d.ts`
shims** that describe the parts of this app's JavaScript TypeScript infers
wrongly, a `typecheck` script, the Jest
`.ts`/`.tsx` transform in this repo's node environment, `utils/rng.ts`,
`utils/motion.ts` + `components/Motion.tsx`, `components/Confetti.tsx`, the two
`Controls` primitives the screen uses, `expo-clipboard`, and
`games/numberslide/` rendering **entirely** from `useAppTheme` through a pure
`palette.ts` whose contrast floors hold by construction on all seven themes. A
fourth registry entry, **with** a `readProgress` — see below. 148 new tests: the
incoming `logic.test.ts` cases untouched, the palette on every theme, the save's
shape, and a guard that stops the `.d.ts` shims drifting from the JavaScript they
speak for.

**Number Slide arrived with three board sizes, not one** (operator, 2026-08-09).
The port was written against the plan's pinned `e07eb82`; upstream `main` had
moved to `708d59a`, which makes the whole engine size-generic and adds 3×3 / 4×4
/ 5×5 chips and a size-carrying code (`4-K7P2Q`, with bare five-character codes
still meaning the 3×3 they always did). It is ported in full, including the
`scrambleSteps` freeze that keeps 3×3 at its historical 160 steps so every code
ever shared still reproduces byte-for-byte — **check `main` before porting
Step 2's 2,200 lines.**

**What the save holds changed twice under the operator, and both changes are in
plan §4.4.** The personal best came out (2026-08-08) — the wrong scoreboard for a
game whose whole point is a shareable code — and then the **board itself went
in** (2026-08-09: *"the number slide should act like the other games storing
progress continually"*). So `@NumberSlide` holds `{ size, seed, board, empty,
moves, secs }`, written on every move, flushed on unmount and on backgrounding,
cleared on a solve, restored behind a hydration gate — and the card carries a
Continue badge reading `4×4 · 01:24` over `12 moves`. **That is Step 3's Number
Slide half, done; only Color Loop's is left.**

**The TypeScript seam was rebuilt once, mid-step** (operator, 2026-08-08: *"it's
sounding like the platform is fragmented between js and ts"*). It began as
`allowJs: false` with six shims, one per JavaScript module the games import;
measuring showed three of the six merely repeated what inference already knew.
`allowJs: true` + `checkJs: false` keeps the guarantee the constraint was written
for — the JavaScript is still not type-checked — and leaves only the three
declarations that are load-bearing. **Plan §4.1 has the table of why each
survives; read it before adding a fourth.** The short rule: *prefer deleting a
shim to adding one.*

**The app has no haptics at all** (operator, 2026-08-09: *"I want to remove all
haptics"*). Plan §6 had called for converging the incoming games' `Vibration`
onto this app's `expo-haptics`; doing it and then undoing it showed there was
nothing to converge *to* — once Number Slide's buzz came out, the whole app's
haptic surface was one `impactAsync` on the cube's hold-to-prime gesture. Both
are gone and so is the dependency. **The cube's is a behaviour change to a
shipped game**, made knowingly: its hold already closed a ring and filled the `′`
key at the threshold, so nothing that was only felt is now unsignalled. Apply
that test before removing a buzz anywhere else.

**And one real bug, found by the operator on the device, worth the whole
paragraph plan §4.4 gives it:** Number Slide's clock stayed frozen for the whole
of every *restored* game. "Is the clock running" was a `useRef`, and the effect
that owns the `setInterval` cannot depend on a ref — its dependency was
`moves > 0`, which on a fresh board flips with the first move and starts the
interval **by accident**, and on a restored board never changes at all. It
typechecked and passed every one of the 1,059 tests. The rule it generalises to:
**anything an effect must react to is state; a ref beside it is only for closures
created once** — and Color Loop's screen has the same timer-plus-`PanResponder`
shape.

§4.1, §4.2, §4.4, §3, §6 and §10 of the plan were all amended with what this step
found — **read those before Step 2, they are most of its brief.**

---

## Step 2 — Color Loop on the hub ✅

The game the epic is named after, as the fifth card, and **the palette swap that
was the one genuinely dangerous change in the epic**. Landed: the three engines
(`puzzle.ts` **byte-identical**, `levels.ts` unchanged, `match.ts` changed only
where it formats a clock), the two pure-core extractions `geometry.ts` and
`saveShape.ts`, `Board.tsx` with its physics untouched and its two colours themed,
`ColorLoopScreen` + `ColorLoopMenuModal` + `LevelSelect`, `Seg` and `Slider` in
`components/Controls.tsx`, the `@ColorLoop` blob, and a fifth registry entry with
no `readProgress`. 187 new tests (1,246 total).

**The palette swap is pinned, not remembered.** `colors.ts` takes
`REGION_COLORS.slice(0, PALETTE_SIZE)` — slicing rather than spreading, so an
eleventh platform hue *cannot* reach Color Loop and move `maxN('diag')` from 4 to
5. The pin that matters is `parseCode('5-ABC-D')` still yielding a 4×4: that is
the actual failure — a code decoding to a different board — rather than the
arithmetic behind it.

**Three decisions the step was asked to make, all in plan §3, §4.2 and §4.5:**

- **`useBoardOrigin` is now one guest copy, at `utils/useBoardOrigin.ts`**, with
  three callers (both boards and the `Slider`). It carries the platform hook's
  non-finite guard and `toLocal`, so **Step 6 has no behavioural difference left
  to reconcile** — only the `.js`/`.ts` split, which §4.1 forbids closing here.
- **`ensureContrast` and `withAlpha` moved to `utils/contrast.ts`** on their
  second caller; `games/numberslide/palette.ts` re-exports both and is otherwise
  untouched.
- **The glyphs stay characters** (operator, 2026-08-11), which closes the narrow
  half of open question 1.

**Two findings, both about contrast, both in plan §4.2:**

1. **A colour fixed up against the worst member of a set is not fixed up against
   the set.** The glyph is drawn on all seven hues; pushed dark enough for
   yellow it fails on blue. `ensureContrastAll` searches once over the whole set,
   and it is one nested loop.
2. **Sometimes there is no composite.** Step 1's rule — hold overlay text to the
   scrim-over-board composite — has no single answer when the board under the
   scrim is seven colours. The win card is therefore **opaque by construction**,
   which satisfies the rule rather than dodging it. Where translucency is
   genuinely unavoidable (the armed cover, at 0.97) the ink is held against all
   *eight* composites and the test measures all eight.

Also: nothing buzzes (the detent and settle vibrations were deleted, and both
are still confirmed on screen), the result card now reads `00:12` rather than
`0:12` because `formatElapsed` is the app's one clock format, and
**no fourth `.d.ts` shim was needed** — inference typed all five newly-imported
JavaScript modules correctly.

**⚠️ And one thing that looks like an oversight and is not.** Color Loop keeps a
free-play personal best — a `bestMap`, a `BEST` stat, a *"Best to beat"* line and
a name prompt on a solve — which is precisely the set of four things Step 1
**deleted** from Number Slide. It was raised on 2026-08-11, checked against Step
1's diff, and **kept by the operator**. Plan §4.4 has the reasoning (free play is
one board shape in Number Slide and a fifteen-way settings space in Color Loop,
and the name has to be asked for somewhere because the match card is signed with
it). **Do not reconcile the two games in a later step without a decision and a
date** — §4.4's own opening bullet is what made this look wrong, and it is now
corrected.

§2, §3, §4.1, §4.2, §5, §7, §9 and §10 of the plan were amended with what this
step found.

---

## Step 3 — the board that survives the hub *(next)*

### Starting prompt

```
Work Step 3 of the Color Loop merge epic in mjohnson139/expo-sudoku.

Read docs/colorloop-merge-handoff.md first — it describes this step and only
this step — then docs/colorloop-merge-plan.md end to end before writing code.

Branch feature/color-loop-resume off epic/color-loop. PR targets
epic/color-loop, never main. Tracker is issue #103.
```

**Color Loop's board is still lost the moment you tap home, and its card is the
only one on the hub with no Continue badge.** This step closes both — the last
row of plan §3's platform-contract table, and the half of §4.6 that Step 1 did
not pull forward.

It is a **small step with one genuinely dangerous corner**, and the corner is not
the storage. Read *the trap* below before writing the effect.

### Scope — ONLY this

1. **The board in flight, in `@ColorLoop`.** The blob, the version and both
   flushes already exist (`games/colorloop/{storage,saveShape}.ts`), so this is
   an addition to a shape that was designed for it, not a reshape. What goes in:
   `{ seed, n, mode, grid, moves, secs, phase }` — plan §4.6 names exactly that
   set. `games/numberslide/saveShape.ts` is the reader to copy, including its
   **validate-by-shape** rule: a grid whose values are not the multiset the mode
   implies is a board that renders happily and cannot be solved.
2. **The hydration gate already exists** and the screen already waits behind it;
   what changes is that a restored board is dealt instead of a fresh one.
3. **Cleared on a solve.** A finished puzzle is not something to continue, and a
   save left behind gives the card a badge that reopens a win screen.
4. **A `describeColorLoopProgress` in `games/colorloop/saveShape.ts`** — *next to
   the game*, importing `formatElapsed` **from** `utils/gameProgress.js` rather
   than being added to it. The cube's review named that file's inverted
   dependency as its headline finding and a sixth import would ship it again.
5. **`readProgress` on the fifth registry entry**, reading through that
   describer.
6. **The fallback badge.** Plan §4.6 offers `Training · 7 of 18 · 14★` for when
   there is no board to return to. **Decide whether it ships**: Number Slide
   deliberately draws *no* badge for an untouched board, because every visit
   deals one and a permanent "Continue" means nothing — and Color Loop has the
   same property. A standing badge is a different claim from a Continue badge,
   and the card has one line for both.
7. **Tests**: the reader's shape rules, the describer's output including the
   nothing-to-continue case, and a round trip proving a restored board is the
   board that was saved.

### Explicitly out of scope

**Color Loop's free-play personal best.** It looks like Step 1's deleted
leaderboard and it is not a leftover — kept by the operator on 2026-08-11, with
the reasoning in plan §4.4 and a note on `BestEntry` in `saveShape.ts`. Whether
the `BEST` block earns its third of the stat row is a **Step 5** question.

Training and Match as *finished* screens (Step 4 — they are reachable and
unpolished, which is what Step 2 scoped). The proving pass over the restyled
sites (Step 5). Converging `useBoardOrigin` or the two confetti implementations
(Step 6 decides both, and Step 2 left it exactly one decision each). Any
JavaScript→TypeScript conversion.

### ⚠️ The trap: this is the step where the clock bug becomes reachable

`ColorLoopScreen`'s header carries a note saying the clock was checked against
Step 1's frozen-clock bug and is clear — **and it says, in as many words, that
this is the step where that has to be read again.** Do read it.

The bug (plan §4.4): "is the clock running" was a `useRef`, and **the effect that
owns the `setInterval` cannot depend on a ref**. On a fresh board the first move
flips some *other* state and the interval starts by accident; on a **restored**
board nothing in the dependency list ever changes and the clock sits frozen for
the whole game. It typechecked and passed 1,059 tests.

Color Loop is currently safe for a reason that this step removes: its interval
depends on `phase`, which is state, **and there is nothing to restore**. Once a
started board comes back from storage, the restore path has to set `phase` to
`'live'` and re-anchor `startTimeRef` to `Date.now() - secs * 1000` — and if
either of those is done through a ref, or the effect is given a cleverer
dependency list, the clock freezes exactly as Number Slide's did.

**The check is thirty seconds and no test substitutes for it:** start a board,
make a move, go to the hub, come back, and watch the clock for five seconds.

### Behaviours that are easy to get wrong

- **`phase` is three-valued and only one of them is resumable.** An `armed` board
  has not been started, a `won` board is finished. Restoring either is a Continue
  badge that means nothing — and `armed` is the state a *fresh* board is in, so
  "no save" and "saved but unstarted" must not be told apart by the player.
- **The clock resumes; time on the hub is not counted.** That falls out of the
  screen being unmounted there rather than needing a rule (plan §4.4).
- **Only free play persists its size and goal.** `ColorLoopScreen` holds `prefs`
  separately from the live `n`/`mode` for exactly this reason. A restored *board*
  carries its own `n`/`mode`, which may be a level's or a match's — do not write
  those back into `prefs` on restore.
- **A match in flight is more than a board.** `PlayCtx` for a match carries the
  code, the preset, the per-board seeds, the index and the splits. Either persist
  the whole context or **deliberately do not resume matches** and say which — a
  half-restored match that forgets your first two splits is worse than one that
  starts again.
- **The `_v` is already 1.** Adding fields to a version nothing branches on is
  the intended use; `readColorLoopSave` reads by shape, because a key that is
  absent and a key that is corrupt want the same answer.
- **`readColorLoopSave` never returns null** — it falls back field by field,
  because losing a physics value must not cost the player eighteen training
  stars. The *board* is the opposite: it is all-or-nothing, so it wants its own
  reader that can refuse. Do not weaken the blob reader to accommodate it.

### Visible in Expo Go when this lands

Start a Color Loop board, make a few moves, tap home. The card reads something
like `4×4 · 01:24` over `9 moves`. Tap it and the board is the board you left —
same tiles, same clock, still running. Solve it and the badge goes away.

### How to verify

```bash
npm test                          # existing suite must stay green, plus the new tests
npm run typecheck                 # tsc --noEmit
npx expo-doctor                   # expect 18/18
npx expo export --platform all    # web + iOS + Android must all bundle
```

Then the device pass, and **the clock check above is the one that matters** — it
is the only failure in this step that every automated gate will miss. Also:
leave mid-board by backgrounding the app rather than by tapping home (a different
flush path), and confirm the other five cards are unchanged.
