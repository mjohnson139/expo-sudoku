# Fungiku — next-step handoff

**If you are a session picking up Fungiku work: this file is your entry point.
Read it first, then do the step described under "Next step" below.**

It always describes **exactly one step — the next one**. It is rewritten at the
end of every step so the following session can start from a one-line prompt.

## The one-line prompt that starts a session

```
Work in mjohnson139/expo-sudoku. Continue the Fungiku epic: check out
epic/fungiku, read docs/fungiku-handoff.md, and do the next step it describes.
```

Nothing else needs to be pasted. Everything a session needs is in this file and
the documents it points at.

## Before you finish: rewrite this file

**This is part of every step's definition of done.** Before you open your PR,
replace the "Next step" section with a brief for the step *after* yours, at the
same level of detail — scope, the files to read, the behaviors that are easy to
get wrong, what must be visible in Expo Go, and how to verify. Carry the open
questions forward. A step that leaves this file describing already-finished work
has broken the chain for the next session.

---

## Standing context (true for every step)

- **Repo:** `mjohnson139/expo-sudoku`. App code is in the **`SudokuApp/`**
  subdirectory (Expo · React Native · JavaScript).
- **Source of truth:** `docs/fungiku-plan.md`. Read it end to end before writing
  code — it has the rules (§1), input model (§2), board (§3), engine (§4), hub
  design (§6), the step table (§7), open questions (§8), and edge cases (§9).
- **Tracker:** GitHub issue **#65**. Tick your step's checkboxes as you go.
- **Process:** `.github/dev-process.md` — one delivery step per branch, commit
  after each step, **prompt the operator to test after each step.**

### Branching

Fungiku lands on an **epic branch**, never straight to `main`:

```
main ─── epic/fungiku ─── feature/fungiku-<step>   (PRs target the epic)
```

Branch from **`epic/fungiku`**, and open your PR **against `epic/fungiku`**.
The epic merges to `main` only once Fungiku is playable end to end, so `main`
never carries a half-built game mode.

### Every step must be visible in Expo Go

Hard requirement, not a nicety. Every step — including pure-logic ones — ships
something the operator can open and look at on a device. **A step whose only
evidence is a passing test suite is not done.** Preview/scaffolding surfaces are
explicitly temporary and get replaced by real UI as later steps land.

### Golden rules

- **Fungiku is a separate game mode. Classic Sudoku keeps working as it does
  today.** Do not modify `sudoku-gen` / `boardFactory`, the Sudoku reducer's game
  logic, `NumberPad`, notes, feedback, or Sudoku's win detection unless the
  current step explicitly calls for it.
- **The engine owns the Fungiku rules.** Import `findConflicts` / `isSolved` /
  `nextMark` / `MARKS` / `createEmptyMarks` / `generate` from
  `games/fungiku/engine.js`. If you find yourself hand-writing a
  row/column/region/adjacency check anywhere else, that's a bug.
- **Stay in scope.** Note anything you spot for a later step rather than fixing
  it now, and say so in your PR.

### Verify before handoff (from `SudokuApp/`)

```bash
npm test                          # Jest — keep the suite green and extend it
npx expo-doctor                   # expect 18/18
npx expo export --platform all    # web + iOS + Android must all bundle
```

Then **drive the web build in a browser** to confirm the step's visible outcome
really works. Chromium is preinstalled at `/opt/pw-browsers/chromium`
(`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`) — **do not run
`playwright install`**. Serve `dist/`, click through, confirm no page errors, and
screenshot the result.

### Finishing a step

Commit, update issue #65, **rewrite this file for the next step**, push your
branch, open a PR to `epic/fungiku` referencing #65, then **stop and prompt the
operator to test in Expo Go.**

---

## Next step: **Step 4 — Fungiku state: make the board playable**

Branch: **`feature/fungiku-state`** off `epic/fungiku`.
Plan: **§1 (rules)**, **§2 (input model)**, **§9 (edge cases)**, plus the §7 table
row for step 4.

### Why this step exists

Fungiku now has a real screen off the hub, but the thing on it is still a
**read-only engine preview** — you can look at generated boards and reseed them,
and that is all. This step is where Fungiku becomes **a game you can play**: tap
cells to place mushrooms, see conflicts as you go, and win.

### Read first

- `SudokuApp/games/fungiku/engine.js` — **the rules already live here.** Exports
  `MARKS`, `nextMark`, `createEmptyMarks`, `findConflicts`, `isSolved`,
  `countMushrooms`, `generate({ size, seed })`, `MIN_SIZE`. Read the whole file
  before writing state code; you should not need to write a single
  row/column/region/adjacency check yourself.
- `SudokuApp/games/fungiku/__tests__/engine.test.js` — how the engine is already
  covered, and the style to extend for the reducer.
- `SudokuApp/games/fungiku/FungikuScreen.js` — the shell you build into. Its
  body is `<FungikuPreview theme={theme} />` and that is the line that changes.
- `SudokuApp/games/fungiku/FungikuPreview.js` — the read-only scaffolding. Its
  board rendering (region-boundary borders, `getRegionColor`) is a fine starting
  point to lift; Step 5 replaces it with the real board component.
- `SudokuApp/contexts/GameContext.js` + `hooks/usePersistentReducer.js` — the
  **pattern** to follow for Fungiku's own context: a reducer, a provider, and
  persistence through `usePersistentReducer`. Read it as a model, don't edit it.
- `SudokuApp/utils/storage.js` — Sudoku's persistence. Note it is written around
  a **single hardcoded key** (`STORAGE_KEY = '@SudokuGame'`) and a Sudoku-shaped
  `stripTransient`; Fungiku needs its own key and its own transient list, so
  expect to generalize this or add a Fungiku sibling. **Keep the two games'
  keys separate** — that is a §6 requirement.
- `SudokuApp/games/registry.js` — Fungiku's entry has `readProgress: null`. Once
  Fungiku persists state, give it a real `readProgress` so its hub card gets the
  same **Continue** badge Sudoku has. `utils/gameProgress.js` is where the pure,
  unit-tested progress-summary logic lives.

### Scope — ONLY this

1. **`games/fungiku/reducer.js` (or `FungikuContext.js`)** — Fungiku's own state:
   the generated puzzle (regions + solution), the player's `marks`, size, seed,
   derived conflicts, win flag, and undo/redo.
2. **Tap-to-cycle input** — `empty → X → 🍄 → empty` via `nextMark`. X is an aid
   only: it must never affect win detection.
3. **Live conflict highlighting** — recompute via `findConflicts` on every
   change. Conflicts are shown, **not blocked**; the player fixes them.
4. **Win detection** via `isSolved`, plus the **`🍄 X/N` counter** in the header
   (`countMushrooms`).
5. **Undo/redo** over mark changes.
6. **Persistence** under Fungiku's own storage key, so a Fungiku game survives
   leaving for the hub and relaunching — and a real `readProgress` in the
   registry so the hub card shows Continue. **Store `size` + `seed` + `marks`
   only** and rebuild the puzzle with `generate({ size, seed })` on restore:
   generation is deterministic, so persisting regions and the solution would just
   be a second, staler copy of the truth.
7. **Extend the Jest suite**: reducer behavior (cycling, undo/redo, win, X's not
   counting), and the progress summary if you add one for Fungiku.

### Behaviors that are easy to get wrong

- **X's are cosmetic.** `isSolved` must be reached with X's anywhere on the
  board, and a board full of X's and no mushrooms is not a win.
- **Conflicts don't block.** Placing a mushroom that conflicts must succeed and
  simply highlight — this is how the player reasons.
- **Win is N mushrooms placed legally, not a filled grid** (plan §1). There is no
  "every cell filled" step; don't reach for Sudoku's `filledCount` model.
- **Undo/redo must not desync derived state** — conflicts and the counter are
  derived from `marks`, so recompute rather than storing and rewinding them
  separately.
- **Don't let Fungiku's save clobber Sudoku's.** Separate keys, separate
  transient-field lists. Verify by starting both games and relaunching.
- **The engine owns the rules.** If you hand-write an adjacency or region check
  outside `engine.js`, that's a bug.

### Out of scope for this step

- **No finished board UI.** Region-boundary polish, themed cell styling, the win
  flow/animation and the palette tuning pass are **Step 5**. Getting it playable
  on top of the preview's rough grid is the goal here.
- **No palette fixing.** At 8 regions sky blue/blue read similarly as pastel
  fills (orange/yellow too). Still logged against **Step 5**.
- **No assists, ladder or scoring** — that is Step 6, including the auto-X
  toggle (§8 #5).
- **No Sudoku changes.** Fungiku gets its own reducer and context; Sudoku's are
  a reference, not a shared dependency to refactor.

### Visible in Expo Go when this lands

Open Fungiku from the hub and **play it**: tap a cell through
empty → X → 🍄, watch conflicting mushrooms highlight, watch the `🍄 X/N`
counter climb, and **win a 5×5**. Leaving for the hub and coming back must find
the board where you left it, with a Continue badge on the Fungiku card. Verify in
a browser end to end (a 5×5 is small enough to solve by clicking through), no
page errors, and screenshot both a mid-game conflict state and the win.

---

## Open questions for the operator (carry these forward)

1. ~~**Mode name**~~ — decided: **"Fungiku"** (internal id `fungiku`).
2. **App name** — **still unanswered, and now visible on screen.** Step 3 shipped
   the placeholder **"Puzzle Box"** (tagline "Pick a puzzle") in
   `SudokuApp/utils/appIdentity.js` — change those two constants and the hub
   follows. A final answer also has to land in `app.json` (`expo.name`,
   `web.name`/`shortName`), the icon and the store listing. Keep "Sudoku"
   (undersells Fungiku), pick a neutral puzzle-collection brand, or lead with the
   family name?
3. ~~**Hub vs. resume on launch**~~ — built hub-first in Step 3: the app opens on
   the hub and the Sudoku card carries a *Continue* badge. Revisit only if the
   operator dislikes it on device.
4. **Ladder shape** — v1 targets 5×5 → 8×8. Where should it top out, and is size
   a free choice or unlocked by progression? *(Step 6 concern.)*
5. **Assist defaults** — should auto-X be on by default for younger players?
   *(Step 6 concern.)*

### Noted in passing, for a later step

- **Quitting a Sudoku game doesn't clear its save.** `saveState` skips writing
  when `gameStarted` is false, so the previous snapshot survives "New Game" until
  a difficulty is picked. Pre-existing, and self-consistent (the hub's Continue
  badge describes exactly the game re-entering Sudoku would restore), but it
  means "New Game" then leaving mid-choice still shows Continue.
- **Re-entering a game from the hub always lands on the Pause modal**, because a
  restored game is a paused game. Correct, but it means the header (and the way
  back home) is behind one Resume tap.
- **`useAppTheme` reads the theme out of Sudoku's saved state** so the hub and
  Fungiku follow the player's choice. A genuinely app-level theme owned by the
  shell is the right home for this once Fungiku has real UI to theme (Step 5).

## Steps already done

| # | Step | Where |
|---|------|-------|
| 0 | Upgrade Expo SDK 53 → 54 | merged to `main` (#66) |
| 1 | Rendering seam — `Symbol.js` + `symbolSets.js` | merged to `main` (#67) |
| — | ~~Symbol-set toggle on the Sudoku board~~ | closed unmerged (#68) — superseded by the replan |
| 2 | Replan + engine + preview + hub design | merged to `epic/fungiku` (#69, `fecb271`) |
| 3 | Game shell + hub — router, registry, `HubScreen`, `FungikuScreen`, back-to-hub | PR to `epic/fungiku` |
