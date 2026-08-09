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
landed upstream. Plan §2 has the warning in full.

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
  (`.github/dev-process.md`). Step 2 is `feature/color-loop-board`.
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

Then **prompt the operator to test in Expo Go.** Anything touching a gesture,
a haptic, or a layout that a browser renders differently is device-only —
this project keeps finding native-only bugs late.

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
`Controls` primitives the screen uses, `expo-clipboard`, `Vibration` →
`expo-haptics`, and `games/numberslide/` rendering **entirely** from `useAppTheme` through a pure
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

§4.1, §4.2, §4.4, §3 and §6 of the plan were all amended with what this step
found — **read those before Step 2, they are most of its brief.**

---

## Step 2 — Color Loop on the hub *(next)*

### Starting prompt

```
Work Step 2 of the Color Loop merge epic in mjohnson139/expo-sudoku.

Read docs/colorloop-merge-handoff.md first — it describes this step and only
this step — then docs/colorloop-merge-plan.md end to end before writing code.

Branch feature/color-loop-board off epic/color-loop. PR targets
epic/color-loop, never main. Tracker is issue #103.
```

**The game the epic is named after, on the hub as the fifth card — and the
palette swap, which is the one genuinely dangerous change in the whole epic.**

Step 1 answered every platform question: TypeScript, the shims, the Jest
transform, the registry entry, `ScreenHeader`, `useBoardSize`, the theme
adoption, haptics, clipboard, storage shape. **This step is mostly repetition of
settled decisions applied to 2,200 lines instead of 600** — plus two things that
are new, and they are where the care goes.

### Scope — ONLY this

0. **Diff upstream `main` first.** `git fetch` in `mjohnson139/color-loop` and
   read what has landed since the plan's `e07eb82`. Step 1 shipped a stale port
   because it trusted the pinned revision; Color Loop is nine times the code and
   has had the same time to move.
1. **The engines, unchanged:** `games/colorloop/{puzzle,levels,match}.ts`.
   `puzzle.ts` is **frozen** (golden rule 3) — it arrives byte-identical apart
   from its `colors` import.
2. **The palette swap.** `games/colorloop/colors.ts` is **retired** for
   `utils/symbolSets.js` (plan §4.2). Use the saturated `color`, not the tinted
   `background` — full saturation is where Okabe–Ito's colorblind safety lives,
   and the tints are tuned for Fungiku's soft grid.
3. **The `maxN` pin, in the same PR as the swap and never after it.** See *the
   trap*, below. It is the most important paragraph in this file.
4. **`games/colorloop/geometry.ts`** — `computeGeom` and `linesAt` extracted out
   of `Board.tsx` so `board.test.ts` runs in the node environment, exactly what
   `games/fungiku/geometry.js` and `games/cube/geometry.js` already are (plan §5).
5. **`games/colorloop/saveShape.ts`** — `sanitizeTraining` / `sanitizeMatchBest`
   extracted out of `storage.ts` for the same reason, and `@ColorLoop` as one
   versioned blob (plan §4.4). `games/numberslide/storage.ts` is the shape to
   copy.
6. **`Board.tsx` and the board's physics**, on the platform's touch rules.
7. **The inner hub becomes a menu** (plan §4.3): tapping the hub card lands on a
   **playable board**, and Free play / Training / Match are chosen from
   `ScreenHeader`'s menu button — where Fungiku's difficulty menu is.
   `FungikuMenuModal` is the shape to follow.
8. **Free play and the code system**, complete: generate, copy, paste, load.
9. **A fifth registry entry**, again with **no `readProgress`**.
10. **The rest of the incoming tests** — `puzzle`, `levels`, `match`, `board`,
    `storage`. Five of the seven files pass untouched once the two extractions
    exist.

### Explicitly out of scope

Color Loop's resumable board and hub badge (Step 3 — Number Slide's landed in
Step 1, and `games/numberslide/{storage,saveShape}.ts` is the arrangement to
copy, including the flush on unmount *and* on backgrounding). Training's ladder
and Match's gauntlets
as *finished* screens (Step 4) — they need only be reachable and not broken.
The proving pass over all ~100 restyled sites (Step 5). Converging
`useBoardOrigin` or the two confetti implementations (Step 6 decides both). Any
JavaScript→TypeScript conversion of existing files.

### ⚠️ The trap: the palette swap is part of the `puzzle.ts` freeze

This is the least obvious thing in the plan and it will not fail a single
existing test.

```ts
export function maxN(mode: Mode): number {
  return mode === 'diag' ? Math.floor((COLORS.length + 1) / 2) : 6;
}
```

`maxN` is **derived from the palette's length**, and `parseCode` **clamps `n` to
`maxN(mode)`**. Seven colours ⇒ `maxN('diag') === 4`. `utils/symbolSets.js` holds
**ten**, which would make it **5** — so the code `5-ABC-D`, which today clamps to
a 4×4 board, would silently start producing a 5×5 one. Every code anyone has
shared would decode to a different puzzle, and nothing in either suite would say
a word.

**The rule: Color Loop takes the first seven entries of the platform palette and
its view of the palette stays length 7.** The palette may hold ten; Color Loop
may not see them. **Add a test pinning `maxN('diag') === 4` and `maxN('rows') ===
6`** next to the scramble-compatibility test, and land it in the same commit as
the swap.

### Behaviours that are easy to get wrong

- **The glyphs.** Color Loop's `●▲■◆★✦✚` are the same idea as the swatches'
  `corners` — a non-colour channel of identity. **Keep the redundancy**; align
  the mechanism with `components/Symbol.js` rather than carrying a second one.
  Whether they stay characters or become the silhouettes is **open question 1**,
  and it is better settled by looking at a board than by argument — so build one
  and ask the operator.
- **Touches resolve through `pageX/pageY` minus a measured origin**, never
  `locationX/locationY`. Color Loop's board, its slider and Number Slide were all
  bitten by this on the SDK 54 upgrade.
- **`useBoardOrigin` is currently two hooks** — the platform's in `hooks/` and the
  copy Step 1 parked at `games/numberslide/useBoardOrigin.ts`. Color Loop needs
  the same thing. **Decide where the guest copy lives now that there are two
  callers** and write down what you chose; the real convergence with the platform
  hook is still Step 6's.
- **`USE_NATIVE = Platform.OS !== 'web'`** is not a workaround to simplify away,
  and it now lives in `utils/motion.ts` for you.
- **`useBoardSize({ fill: true })`** knows about the 600pt centred web container;
  Color Loop's `computeGeom` sizing off `useWindowDimensions` capped at 440 does
  not. Reconcile them the way `NumberSlideScreen` did, or the board and the header
  disagree about the middle of the page on web.
- **A row wider than the board widens the ScrollView's content container** and
  pushes every centred sibling off-screen — Fungiku shipped that bug with a row of
  hearts, and Color Loop's controls and match splits are exactly that shape of
  row.
- **The `dev` screen (friction, flick, magnet, twin) does not ship on the hub.**
  Keep the sliders behind the menu on the epic branch and decide before the merge
  to `main` whether they become a real setting or come out — **open question 3**.
  `Controls.tsx`'s `Slider` and `Seg` were deliberately not ported in Step 1; they
  arrive with this step if the sliders do.
- **New colours go through `palette.ts`'s pattern, not into styles.** Step 1's
  `games/numberslide/palette.ts` is the template: one pure function, floors that
  hold by construction via `ensureContrast`, and a test over all seven themes.
  **Two of its findings will recur here** — the contrast push has to search both
  directions, and text on an overlay must be measured against the *composite*
  (scrim over whatever is behind it), not against the page. Plan §4.2 has both.
- **Try inference before writing a `.d.ts`.** `allowJs` is on and `checkJs` is
  off, so TypeScript reads the JavaScript and types it without any help most of
  the time — `utils/symbolSets.js` very likely needs nothing. A shim is for the
  three-in-six case where inference is *wrong* (plan §4.1 tabulates them), and
  every one added has to join the list in `utils/__tests__/typeShims.test.js`,
  which now fails if a shim exists that it does not name.

### Visible in Expo Go when this lands

A fifth card. Tapping **Color Loop** lands straight on a playable board — no
second front door — under this app's header, in the player's theme, with tiles in
the Okabe–Ito hues the rest of the app uses. Drag a row or a column and it wraps.
Solve it and it celebrates. The menu button opens Free play / Training / Match.
The code chip copies, and a pasted code loads the same board it loads on the
sibling app. **No walnut and no brass anywhere**, on either game.

### How to verify

The four commands above, plus a device pass. **The gesture is the whole game and
a browser will not tell you how it feels** — drag rows and columns, flick them,
check the magnet settle, and say so in the PR. Then: cycle all seven themes on
both new cards, load a code that was generated by the standalone app and confirm
it produces the same board, and confirm the other four games look exactly as they
did.
