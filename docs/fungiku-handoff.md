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

## Next step: **Step 5 — the real board UI**

Branch: **`feature/fungiku-board`** off `epic/fungiku`.
Plan: **§3 (the board)**, **§5 (accessibility)**, plus the §7 table row for step 5.

### Why this step exists

Fungiku is playable, but it is playable on **the engine preview's rough grid**:
flat pastel fills, hairline borders, a plain green banner for a win, and one
hardcoded 320px board that ignores the screen it is on. Sudoku's board is themed,
responsive and animated; Fungiku's is not. This step makes the board look like
part of the same app.

**It is also where the palette problem gets fixed** — see below. That is the one
item here with a real correctness angle, not just polish.

### Read first

- `SudokuApp/games/fungiku/FungikuBoard.js` — what you are replacing. Note what
  it already gets right and must keep: region-boundary borders (thick edge
  wherever the neighbor's region differs), the conflict ring *plus* red glyph so
  the signal is not color-only, and per-cell accessibility labels of the form
  `Row 1, column 4, orange region, mushroom, conflict`. **Do not regress those
  labels — the Playwright drive-through addresses cells through them.**
- `SudokuApp/utils/symbolSets.js` — `REGION_COLORS` / `getRegionColor` and the
  `mixWithWhite(color, 0.62)` that generates the pastel fills. **This is the
  palette bug's home.** Each entry also carries a `corners` shape cue that the
  Fungiku board does not use yet.
- `SudokuApp/components/Grid.js` + `components/Cell.js` — how Sudoku's board
  handles theming, selection and sizing. The reference for what "themed" means
  here; don't refactor them.
- `SudokuApp/screens/GameScreen.js` — `useGridContainerSize()` is the existing
  responsive-sizing hook (web gets `min(width,height) * 0.7` clamped 270–450,
  native gets a fixed 324). Fungiku's board should size the same way instead of
  its own `BOARD_MAX = 320`.
- `SudokuApp/utils/themes.js` — the seven themes a Fungiku board has to look
  right in. `classic`/`pastel` are the easy ones; **check `dark`** — today's
  pastel fills on a dark background are the untested case.
- `SudokuApp/hooks/useAppTheme.js` — reads the theme name out of *Sudoku's* saved
  state as a stopgap. Promoting this to a real app-level theme owned by the shell
  belongs in this step (see scope 5).

### Scope — ONLY this

1. **🎨 Palette tuning pass — do this first, it is the real bug.** At 7×7 and 8×8
   the pastel fills collide: **sky blue vs. blue** are nearly indistinguishable,
   and **orange vs. yellow** are close behind. Okabe–Ito is colorblind-safe at
   full saturation, but `mixWithWhite(…, 0.62)` compresses the hues toward a
   common light gray. Fix it properly — vary lightness as well as hue so adjacent
   regions differ on two channels, and **consider using the `corners` shape cue
   that already exists in `symbolSets.js`** so identity never rests on color
   alone. Verify at 8×8 across several seeds, not just one.
2. **The real board component** — themed cell fills, borders and region outlines
   drawn from `utils/themes.js` rather than hardcoded `#33333355`, and a board
   that sizes to the screen via the same approach as `useGridContainerSize()`.
3. **The win flow** — today a win is a static green banner. Give it the app's
   motion language (Sudoku has `WinModal` and a score animation to look at) and
   decide whether Fungiku wins in a modal or in place. Note the small bug: the
   counter hint still reads "Tap a cell: empty → ✕ → 🍄" after a win.
4. **Accessibility beyond the labels** — the labels are already good; add the
   things a themed board can lose: adequate contrast for the X glyph and the
   mushroom against every theme's fills, and a non-color cue for conflict that
   survives a dark theme.
5. **App-level theme** — replace `useAppTheme`'s read of Sudoku's saved state
   with a theme the shell owns, so the hub and Fungiku aren't inheriting a
   Sudoku implementation detail. Sudoku keeps its own `CHANGE_THEME` behavior;
   this is about where the *shell's* theme comes from.

### Behaviors that are easy to get wrong

- **Region outlines are the board's structure** (plan §3). They replace Sudoku's
  3×3 box lines and are how the player sees the regions at all — if the themed
  restyle makes them subtle, the puzzle becomes unreadable.
- **Don't let theming swallow the conflict signal.** Conflict has to stay obvious
  on a pastel fill *and* on a dark theme.
- **Keep the accessibility labels stable.** They are the test seam.
- **Don't touch the engine or the reducer.** This step is rendering. If a rule
  question comes up, the answer is already in `engine.js`.
- **8×8 is the stress case** for both palette and layout — a 320px board at 8×8
  gives 40px cells; check the mushroom glyph and X are still legible.

### Out of scope for this step

- **No assists, ladder or scoring** — auto-X, level progression and scoring are
  Step 6, including the §8 #5 assist-default question.
- **No art swap** — static mushroom PNGs are the floating Step 7.
- **No new game logic.** Marks, conflicts, win detection, undo/redo and
  persistence all landed in Step 4 and are covered by 107 passing tests.
- **No Sudoku restyling.** Read `Grid`/`Cell` for reference; leave them alone.

### Visible in Expo Go when this lands

A Fungiku board that looks like it belongs in the app: themed to match whatever
theme is active, sized to the screen, with **eight visually distinct regions at
8×8** and a win that feels like a win. Verify in a browser across at least
`classic` and `dark`, at 5×5 and 8×8, no page errors, and screenshot 8×8 in two
themes so the palette fix is reviewable side by side.

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

- **Fungiku's undo history is not persisted** — only `size` + `seed` + `marks`
  are. Leaving for the hub and returning gives you your board back with an empty
  undo stack. Deliberate (the stacks are mark snapshots and would bloat the save);
  revisit only if it bothers the operator.
- **The counter hint doesn't change after a win** — it still reads "Tap a cell:
  empty → ✕ → 🍄". Folded into Step 5's win flow.
- **Quitting a Sudoku game doesn't clear its save.** `saveState` skips writing
  when `gameStarted` is false, so the previous snapshot survives "New Game" until
  a difficulty is picked. Pre-existing, and self-consistent (the hub's Continue
  badge describes exactly the game re-entering Sudoku would restore), but it
  means "New Game" then leaving mid-choice still shows Continue.
- **Re-entering a game from the hub always lands on the Pause modal**, because a
  restored game is a paused game. Correct, but it means the header (and the way
  back home) is behind one Resume tap.
- **`useAppTheme` reads the theme out of Sudoku's saved state** so the hub and
  Fungiku follow the player's choice. Promoting this to a shell-owned theme is
  now **scope item 5 of Step 5**.

## Steps already done

| # | Step | Where |
|---|------|-------|
| 0 | Upgrade Expo SDK 53 → 54 | merged to `main` (#66) |
| 1 | Rendering seam — `Symbol.js` + `symbolSets.js` | merged to `main` (#67) |
| — | ~~Symbol-set toggle on the Sudoku board~~ | closed unmerged (#68) — superseded by the replan |
| 2 | Replan + engine + preview + hub design | merged to `epic/fungiku` (#69, `fecb271`) |
| 3 | Game shell + hub — router, registry, `HubScreen`, `FungikuScreen`, back-to-hub | PR to `epic/fungiku` |
| 4 | Fungiku state — reducer, tap-to-cycle marks, live conflicts, win, undo/redo, own-key persistence | PR to `epic/fungiku` |
