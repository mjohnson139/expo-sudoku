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

## Next step: **Step 8 — the training ladder and scoring**

Branch: **`feature/fungiku-ladder`** off `epic/fungiku`.
Plan: the §7 table row for step 8, plus **§8 #4**, which this step needs answered
(or defaulted, with the default stated in the PR).

### Why this step exists

Fungiku is a complete puzzle with feedback and hints, but it has **no shape as a
game**. You pick a size from four chips and press "New puzzle" for a random seed;
nothing tracks what you have done, nothing gets harder, nothing tells you that
you are improving. This step turns a puzzle generator into something worth coming
back to.

Feedback and hints landed first on purpose: **scoring now has real events to
price.** `hintsUsed` is already recorded per puzzle, and `selectMistakes` already
knows when a placement is wrong.

### Read first

- `SudokuApp/games/fungiku/reducer.js` — `hintsUsed` is already counted per
  puzzle and persisted; that is the hook scoring hangs off. Note how `changeSize`
  and `nextPuzzle` currently work (`changeSize` resets to seed 1, `nextPuzzle`
  bumps the seed) — a ladder replaces that with a level list.
- `SudokuApp/games/fungiku/storage.js` — persistence is `size` + `seed` + `marks`
  + `showMistakes` + `hintsUsed`. Ladder progress is the first thing needing a
  **schema change**: bump `FUNGIKU_STORAGE_VERSION` and decide what an old save
  migrates to. Today a version mismatch returns null and the board starts fresh —
  fine for a board, **not** fine for someone's progress.
- `SudokuApp/utils/gameProgress.js` + `games/registry.js` —
  `describeFungikuProgress` feeds the hub's Continue badge. With a ladder the
  badge probably wants to name the *level* rather than the board size.
- **The sibling color-loop app is the reference for exactly this problem** — it
  has a training ladder in `games/colorloop/levels.ts` with per-level star
  thresholds, and its `docs/game-design.md` covers the progression thinking. Read
  it before designing a second one from scratch.
- `SudokuApp/contexts/GameContext.js` — Sudoku's scoring (time-based, with
  completion bonuses) is one model. Fungiku has **no timer at all** today, which
  is a decision this step has to make deliberately rather than by accident.

### Scope — ONLY this

1. **A level ladder as data** — an ordered list, each level pinning a `size` and a
   `seed`. Both are already deterministic, so a level *is* a `{size, seed}` pair.
   Keep it a table in its own module so tuning is editing data.
2. **Progression + persistence** — which levels are complete, and what unlocks.
   Bump the storage version and **migrate**, don't discard.
3. **A level-select surface** replacing the raw size chips as the primary path.
   Keep a free-play route: the chips are how the 8×8 regression cases get
   checked, and free choice is a reasonable answer to §8 #4.
4. **Scoring** — decide what it measures and say why in the PR. Hints used and
   mistakes made are both available now. If it needs a timer, add one, and note
   that Fungiku deliberately had none until this point.
5. **Hub integration** — the Continue badge should reflect ladder position.
6. **Tests** — the ladder table and progression logic are pure; cover them. And
   **assert that every level in the table actually generates**: a bad
   `{size, seed}` pair would otherwise only fail when a player reaches it.

### Behaviors that are easy to get wrong

- **Every level must be generatable.** `generate()` throws below size 5; a typo
  in the table becomes a crash for whoever reaches that level. Assert the whole
  table.
- **Don't lose existing progress on the schema change.** A player mid-board today
  has `{size, seed, marks, showMistakes, hintsUsed}` and no ladder state; that has
  to migrate to something sensible, not a wiped save.
- **Star thresholds and difficulty curves are guesses until played.** Draft them,
  say in the PR that they are estimates, and flag them for tuning on device — the
  same way color-loop's ladder was left.
- **Keep free play reachable**, or the 8×8 palette and layout cases get harder to
  check.
- **Don't let scoring change what a hint does.** Hints are counted already; this
  step prices them, it does not redesign them.

### Out of scope for this step

- **No art swap** — Step 9, gated on artwork rather than code.
- **No new feedback or hint behavior.** Step 7 shipped both; if the operator wants
  the hint ladder to escalate differently (see the note below), that is its own
  change, not this step.
- **No engine changes.** Levels are `{size, seed}` pairs over the existing
  generator.

### Visible in Expo Go when this lands

A **level list** you progress through, with completed levels marked, and a score
or rating when you solve one. The hub's Fungiku card says where you are in the
ladder.

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

- **A reveal is only reachable when nothing is forced.** The hint button gives the
  weakest hint that still helps, so while any forced deduction exists you get a
  nudge and never a reveal. That is deliberate — it is the pedagogically right
  default for a family game — but it means a frustrated player cannot skip to the
  answer. Flagged against §8 #6; making reveal always available is a small change
  if the operator wants it.
- **Native gesture/animation bugs do not reproduce in the web build, and a
  passing browser check can be a false pass.** Both bugs the operator has found
  were invisible on web — see plan §2, "A pattern worth knowing". Use the browser
  to prove nothing broke; ask for a device pass to prove the native bug is fixed.
- **One `Animated.Value` per cell, never one shared value pointed at "the current
  cell".** Resetting a shared value happens immediately while re-pointing it is a
  React state update, so for a frame it is still attached to the *previous* cell.
  On device that showed up as the previously placed mushroom shrinking.
- **Never mix `setValue()` with `useNativeDriver: true`** — plan §2 has the full
  rule. The native driver does not keep the JS value in step, so a value that is
  reset with `setValue()` can be left stranded at the reset value *permanently*.
  On device that showed up as five of eight mushrooms sitting small on a solved
  board. If you `setValue()` it, drive it with `useNativeDriver: false`,
  `stopAnimation()` before restarting, and finish with an explicit rest.
- **A banner mounting above the board invalidates the board's measured origin.**
  `onLayout` does not save you: on web it is backed by a ResizeObserver, which
  watches size and not position, so a board that merely *moves* never fires it.
  `FungikuBoard` re-measures in an effect keyed on `[hint, solved]` — the two
  things that mount a banner. **Anything new added above the board must be added
  to those deps**, or the first tap after it appears lands on the wrong cell.

- **Dragging on the board never scrolls the page.** The board claims every touch
  at touch-down — that is the fix for the operator's device report that a vertical
  drag scrolled instead of painting (plan §2, "The ScrollView race"). It means the
  board is not a place you can scroll from; drag outside it. Fine on a tall phone
  even at 8×8; revisit if the screen grows.
- **Web cells are no longer keyboard-focusable.** They were `TouchableOpacity`
  (focusable buttons) and are now plain `View`s, because the board owns the touch
  and a child Touchable would never see a press. Labels and `onAccessibilityTap`
  are intact; keyboard tabbing to a cell is not. Revisit if web keyboard play
  ever matters.
- **Rule-out marks are ordinary X marks once placed.** Removing the mushroom that
  implied them leaves them behind; undo takes the whole fill back instead.
  Retracting them per-mushroom would need per-mark provenance, which is ambiguous
  as soon as two mushrooms rule out the same cell.
- **`accessibilityState.checked` does not reach `aria-checked` on web.** Any
  toggle has to name its state in its `accessibilityLabel` — that is the only
  place a screen reader or a test can read it reliably. Step 7 adds a
  "Show Mistakes" switch; it will need the same treatment.

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
| 5 | Board UI — palette fix with a tested ΔE floor, themed + responsive board, animated win | merged to `epic/fungiku` (#71, `905bfa2`) |
| 6 | Input ergonomics — drag to sweep X's, rule-out button | merged to `epic/fungiku` (#72, `e896fb6`) |
| 7 | Feedback & hints — mistake flagging, forced-deduction nudge, reveal, placement pop | PR to `epic/fungiku` |
