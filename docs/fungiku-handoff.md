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

## Next step: **Step 6 — drag to sweep X's (+ the auto-X assist)**

Branch: **`feature/fungiku-input`** off `epic/fungiku`.
Plan: **§2, and specifically the "Drag to sweep X's" subsection** — the operator
asked for this directly, and that subsection is the spec. Read it before anything
else.

### Why this step exists

**Ruling out cells is the most repetitive thing about playing Fungiku.** Once you
know a mushroom can't be anywhere along a row, or anywhere touching one you have
already placed, you currently tap each of those cells individually — and each one
takes *one* tap to reach X. The operator's words: *"I want to be able to drag my
finger to place Xs in places where mushrooms wouldn't be."* This is the gesture
that makes X's cheap enough to actually reason with, and it is the last thing
standing between the current build and a game that feels good to play.

### Read first

- **`docs/fungiku-plan.md` §2, "Drag to sweep X's"** — the behavior spec: drag
  paints X and never cycles, the first cell decides paint-vs-erase for the whole
  stroke, mushrooms are never overwritten, one undo entry per stroke, and fast
  diagonal strokes must fill every cell crossed. Both hazards are written up
  there too; do not skip them.
- `SudokuApp/games/fungiku/FungikuBoard.js` — what you are changing. Today every
  cell is its own `TouchableOpacity` with an `onPress`. A drag needs a **single
  responder over the whole board** that maps a point to a cell, so this is the
  one real restructure in the step.
- `SudokuApp/games/fungiku/reducer.js` — `CYCLE_CELL` and `CLEAR_MARKS` are the
  models to copy. `pushHistory` already snapshots the whole `marks` array, which
  is exactly what "one undo entry per stroke" needs — add a `PAINT_CELLS`-style
  action that applies a whole stroke through one `pushHistory`, rather than
  dispatching per cell.
- `SudokuApp/hooks/useBoardSize.js` — the board's pixel size, which you need to
  turn a touch point into a row/column.
- `SudokuApp/games/fungiku/__tests__/reducer.test.js` — extend this. The stroke
  reducer is pure and deserves the same coverage as cycling.

### Scope — ONLY this

1. **The drag gesture on the board.** One `PanResponder` on the board container;
   resolve the cell under the finger and paint as the stroke moves.
2. **A stroke action in the reducer** — takes the set of cells and the mode
   (paint X / erase to empty), applies it in one go, records **one** undo entry,
   and skips mushroom cells.
3. **Taps keep working exactly as they do now**, including the full
   `empty → X → 🍄 → empty` cycle and the accessibility labels. A tap is a
   degenerate stroke only if that does not change tap behavior — otherwise keep
   the tap path separate.
4. **Auto-X assist (the other half of §2's assist bullet)** — a toggle that, when
   a mushroom is placed, fills X into that mushroom's row, column, region and
   eight neighbors. **Off by default** unless the operator answers §8 #5
   otherwise. Reuse the same stroke action so it is one undo entry.
5. **Extend the Jest suite** for the stroke reducer and the auto-X fill.

### Behaviors that are easy to get wrong

- **`locationX`/`locationY` lie on the new architecture.** In a `PanResponder`
  they are relative to the touched *child*, not the responder. Use
  `pageX`/`pageY` minus the board's measured origin, and **re-measure at gesture
  grant**, not only on layout — this screen's board sits under a win banner that
  mounts and unmounts, so the board moves. (§2 has the full note; the sibling
  color-loop app lost time to exactly this.)
- **The board lives inside a `ScrollView`.** A vertical drag will fight it. You
  will need to claim the responder deliberately (and probably
  `onMoveShouldSetPanResponderCapture`) so a sweep paints instead of scrolling —
  and check that the page can still be scrolled by dragging *outside* the board.
- **Interpolate between move events.** A fast stroke delivers sparse points; walk
  the line between consecutive points, or a quick swipe leaves gaps.
- **Never overwrite a mushroom.** Losing a deduced placement to a stray swipe is
  the worst failure this feature can have.
- **Don't regress the accessibility labels.** They are how the browser tests
  address cells, and they are Fungiku's only non-visual channel.

### Out of scope for this step

- **No ladder, progression or scoring** — that is Step 7.
- **No art swap** — Step 8, and it is gated on artwork rather than code.
- **No engine or win-detection changes.** X's still have no effect on winning; a
  drag that fills the whole board with X's must not win it (there is already a
  test for that shape — keep it green).

### Visible in Expo Go when this lands

**Swipe a finger across a row of cells and watch them all become ✕ in one
motion**, then swipe back over them to clear them, with a single Undo taking back
the whole sweep. Turn the auto-X toggle on, place a mushroom, and watch its row,
column, region and neighbors fill themselves in.

### ⚠️ This step cannot be signed off in a browser

Playwright can fake a mouse drag on the web build and you **should** add that —
it will catch the geometry being wrong. But whether the gesture fights the
ScrollView, whether a tap-with-jitter accidentally paints, and whether the stroke
feels responsive under a real thumb are all device questions. **Get an Expo Go
pass from the operator before this merges**, and say so in the PR.

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
- **Quitting a Sudoku game doesn't clear its save.** `saveState` skips writing
  when `gameStarted` is false, so the previous snapshot survives "New Game" until
  a difficulty is picked. Pre-existing, and self-consistent (the hub's Continue
  badge describes exactly the game re-entering Sudoku would restore), but it
  means "New Game" then leaving mid-choice still shows Continue.
- **Re-entering a game from the hub always lands on the Pause modal**, because a
  restored game is a paused game. Correct, but it means the header (and the way
  back home) is behind one Resume tap.
- **Sudoku still keeps its own copy of the theme.** Step 5 moved the *shell* off
  Sudoku's saved game and onto `@AppTheme` (`utils/appTheme.js`), and Sudoku
  writes through to it when the player cycles themes — but Sudoku still hydrates
  its own `currentThemeName` from its own save. Making Sudoku read the shared key
  is the other half, and it touches Sudoku's hydration path, so it was left out.
- **The region palette is tuned, not hand-picked.** `utils/symbolSets.js` derives
  its fills from per-hue tint weights chosen by maximizing the worst pairwise
  CIEDE2000 distance under a lightness band. `utils/__tests__/symbolSets.test.js`
  holds the floor. **Re-tune with the same objective — do not eyeball it.**

## Steps already done

| # | Step | Where |
|---|------|-------|
| 0 | Upgrade Expo SDK 53 → 54 | merged to `main` (#66) |
| 1 | Rendering seam — `Symbol.js` + `symbolSets.js` | merged to `main` (#67) |
| — | ~~Symbol-set toggle on the Sudoku board~~ | closed unmerged (#68) — superseded by the replan |
| 2 | Replan + engine + preview + hub design | merged to `epic/fungiku` (#69, `fecb271`) |
| 3 | Game shell + hub — router, registry, `HubScreen`, `FungikuScreen`, back-to-hub | merged to `epic/fungiku` (#70, `a9caf92`) |
| 4 | Fungiku state — reducer, tap-to-cycle marks, live conflicts, win, undo/redo, own-key persistence | merged to `epic/fungiku` (#70, `a9caf92`) |
| 5 | Board UI — palette fix with a tested ΔE floor, themed + responsive board, animated win | PR to `epic/fungiku` |
