# Color Loop merge — next step

**Read this first, then `docs/colorloop-merge-plan.md`.** This file always
describes *the next step only*. Rewriting it for the following step is part of
every step's definition of done — a step that leaves this describing finished
work has broken the chain for the next session.

Tracker: **issue #103**.

## Standing context

Two games — **Color Loop** (wrapping row/column slider) and **Number Slide**
(3×3 fifteen-puzzle) — move from the sibling app `mjohnson139/color-loop` onto
this hub as the fourth and fifth cards. Same Expo SDK, same RN version, same
operator. The plan is `docs/colorloop-merge-plan.md`; read it end to end before
writing code.

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
  (`.github/dev-process.md`). Step 1 is `feature/color-loop-numberslide`.
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
2. **Sudoku, Fungiku and Cube Scramble do not change behaviour.** Shared code may
   be extended; every extension leaves existing callers pixel-identical.
   `ScreenHeader`'s `dense` prop is the pattern — opt-in, and Fungiku was opened
   to prove nothing moved.
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
npx tsc --noEmit                  # new gate from Step 1 on
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

---

## Step 1 — Number Slide on the hub *(next)*

### Starting prompt

```
Work Step 1 of the Color Loop merge epic in mjohnson139/expo-sudoku.

Read docs/colorloop-merge-handoff.md first — it describes this step and only
this step — then docs/colorloop-merge-plan.md end to end before writing code.

Branch feature/color-loop-numberslide off epic/color-loop. PR targets
epic/color-loop, never main. Tracker is issue #103.
```

**Bring the smaller of the two games over, and in doing so answer every platform
question the bigger one will ask.**

Number Slide first is a deliberate ordering. It has no inner hub, no code system,
no training ladder and no match mode, so the seam — TypeScript, the Jest
transform, the registry entry, `ScreenHeader`, the theme split — gets proven
against ~600 lines instead of ~1,700. When this lands, Step 2 is mostly
repetition of settled decisions.

### Scope — ONLY this

1. **TypeScript in `SudokuApp/`** — `tsconfig.json` extending
   `expo/tsconfig.base`, `typescript` + `@types/react` as devDependencies, a
   `typecheck` script. **`allowJs` stays off**: the existing JavaScript is not
   going under a type checker in this epic (plan §4.1).
2. **The Jest transform** — `testMatch` extended to `*.test.{js,ts}`, a
   `^.+\\.tsx?$` transform with `@babel/preset-typescript`. Same node
   environment, no `jest-expo`, no jsdom (plan §5).
3. **`utils/rng.js`** (`mulberry32`, nine lines) and **`utils/motion.js` +
   `components/Motion.tsx`** (`DUR`/`EASE`/`SPRING`/`STAGGER`, and
   `FadeSlideIn`/`PopIn`/`ScalePress`/`useCountUp`). Ported, **not** retrofitted
   onto Fungiku or the cube (plan §3).
4. **`games/numberslide/`** — `logic.ts` and the game screen, **rendering
   entirely from `useAppTheme`** (plan §4.2, settled by the operator on
   2026-08-08: *"I want color loop to fit into the color themes here. There is no
   attachment to the walnut and brass."*). `ScreenHeader` for the back-to-hub
   affordance. The parchment `TILE` constants (`bg`, `ink`, `litBg`, `litInk`)
   are **not** ported as-is — they come from the theme, and the "lit" tile is the
   theme's own emphasis colour. `utils/theme.ts`'s `THEME` object does not come
   across at all; only `fmt()` does, folding into `formatElapsed`.
5. **`components/Confetti.tsx`** and whichever `Controls` primitives the screen
   actually uses — no more.
6. **`expo-clipboard`**, and `Vibration` → `expo-haptics`.
7. **A fourth registry entry** with `id`, `title`, `tagline`, `icon`, `accent`,
   `Screen`. **No `readProgress` yet** — Step 3 owns saves and badges, and a
   badge with nothing behind it is worse than no badge.
8. **The 17 incoming `logic.test.ts` cases**, green in the node environment.

### Explicitly out of scope

Color Loop (all of it). Resumable boards and hub badges (Step 3). Any change to
Fungiku's or the cube's celebration, confetti or motion. Converging
`useBoardOrigin` — Number Slide's copy comes along as-is and Step 6 decides. Any
JavaScript→TypeScript conversion of existing files.

### Behaviors that are easy to get wrong

- **`UIManager.setLayoutAnimationEnabledExperimental(true)` at module scope**
  must survive the move — without it the tile slide animation silently does
  nothing on Android.
- **`USE_NATIVE = Platform.OS !== 'web'`** is not a workaround to simplify away;
  react-native-web only has the JS driver, and mixing `setValue()` with
  `useNativeDriver: true` is a known trap here (`docs/fungiku-plan.md` §2).
- **Touches resolve through `pageX/pageY` minus a measured origin**, never
  `locationX/locationY`.
- **`useBoardSize`** knows about the 600pt centred web container; Number Slide's
  own `useWindowDimensions` math does not. Reconcile, or the board and the header
  disagree about where the middle is on web.
- **Contrast across all seven themes.** Parchment text on the Classic theme's
  near-white background is the bug this step can ship without noticing — and
  after §4.2 it is the *only* failure mode left, since every colour now comes
  from somewhere. Check it, and leave a test as the floor if the check is not
  trivial. `utils/color.js`'s `relativeLuminance` and `readableOn` are the tools;
  `utils/__tests__/symbolSets.test.js` is the pattern.
- **The Vercel deploy's build settings live in Vercel's dashboard, not in this
  repo** (plan §6). This is the step that adds `tsconfig.json`, so it is the step
  where a dashboard build command can start failing with no PR check to catch it.
  Confirm the web deploy still builds before handing back.

### Visible in Expo Go when this lands

A fourth card on the hub. Tapping it opens Number Slide under this app's header,
in the theme the player has chosen, with tiles that slide, a timer, a best time,
and a win celebration. Back returns to the hub. **No walnut and no brass
anywhere** — cycling the theme should carry the whole screen with it.

### How to verify

The four commands above, plus the web deploy, plus a device pass: slide tiles,
win a board, feel the haptic, **cycle through all seven themes and confirm every
part of the screen follows** — that is the step's headline claim and the one
thing a single screenshot cannot show — and confirm the other three games look
exactly as they did.
