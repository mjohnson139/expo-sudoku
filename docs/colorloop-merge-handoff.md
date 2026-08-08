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

### Branching

```
main ─── epic/colorloop ─── feature/colorloop-<step>   (PRs target epic/colorloop)
```

`epic/colorloop` is cut from `main`. Pushing it publishes an EAS Update branch of
the same name, so the epic is openable in Expo Go (project → Branches) even with
no step PR open.

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

### Finishing a change

- Update the tracker issue's checkboxes.
- Extend the `3.2.0` build-notes entry in `utils/buildNotes.js` (build notes are
  per release, not per step).
- **Rewrite this file for the next step.**

---

## Step 0 — the plan and the tracker ✅

`docs/colorloop-merge-plan.md` and issue #103. No app code.

---

## Step 1 — Number Slide on the hub *(next)*

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
4. **`games/numberslide/`** — `logic.ts` and the game screen, re-chromed:
   `ScreenHeader` for the back-to-hub affordance, `useAppTheme` for screen
   background, panels, buttons and text; the tile faces and the lit-tile colours
   stay as they are (plan §4.2).
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
  near-white background is the bug this step can ship without noticing. Check it,
  and leave a test as the floor if the check is not trivial.

### Visible in Expo Go when this lands

A fourth card on the hub. Tapping it opens Number Slide under this app's header,
in the theme the player has chosen, with tiles that slide, a timer, a best time,
and a win celebration. Back returns to the hub.

### How to verify

The four commands above, plus a device pass: slide tiles, win a board, feel the
haptic, switch the theme in Sudoku's menu and confirm Number Slide follows it,
and confirm the other three games look exactly as they did.
