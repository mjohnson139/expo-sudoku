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

## Next step: **Step 7 — feedback on your moves, and hints**

Branch: **`feature/fungiku-feedback`** off `epic/fungiku`.
Plan: **§11**, which is the whole spec — read it end to end. Also §8 #6 and #7,
the two questions this step raises.

### Why this step exists

Two gaps, both requested by the operator. Today the board tells you when you have
**broken a rule** and nothing else: it never tells you a legal move was *wrong*,
and when you are genuinely stuck your only options are guess or walk away.

It comes before the ladder and scoring on purpose: **scoring has to know what a
mistake and a hint are worth.** Building scoring first would mean guessing at the
currency it is denominated in.

### Read first

- **`docs/fungiku-plan.md` §11** — the spec. Four kinds of feedback (§11.1) and a
  four-rung hint ladder (§11.2), with what each costs to build.
- `SudokuApp/games/fungiku/engine.js` — `generate()` already returns `solution`,
  and `findSolutions(regions, size, limit)` recovers it from a layout. That is all
  correctness feedback and the revealing hints need. What the engine does **not**
  have is any notion of a move being *forced*, which is what hint rung 2 needs.
- `SudokuApp/games/fungiku/reducer.js` — `selectConflicts` is the model to copy
  for a `selectMistakes`-style selector: **derive it, never store it**, or undo
  will leave stale flags behind. `selectRuleOutCells` shows the shape for "cells a
  hint would touch".
- `SudokuApp/games/fungiku/FungikuBoard.js` — where a mistake marker has to
  render. Note conflicts already own the ring and the recoloured glyph, so a
  mistake needs a *different* visual channel; and note the accessibility label
  format, which must grow to carry the new state.
- `SudokuApp/contexts/GameContext.js` + `components/modals/GameMenuModal.js` —
  Sudoku's **"Show Mistakes"** switch, its `showFeedback` flag and its
  `cellFeedback` map. Match its wording and placement so the app has one
  vocabulary for the idea. Read it; don't refactor it.
- `SudokuApp/games/fungiku/__tests__/reducer.test.js` — the style to extend. The
  selectors are pure and deserve the same coverage the others got.

### Scope — ONLY this

1. **Correctness feedback, opt-in** — a selector flagging mushrooms not in the
   solution, a switch to turn it on, and a board treatment distinct from
   conflicts. Off by default pending §8 #7.
2. **Positive confirmation** — a correct placement should *feel* correct, not
   merely fail to turn red. A settle or pulse in the app's motion language.
   §11.1 calls this the most-often-skipped half of feedback; do not skip it.
3. **Hint rungs 3 and 4** — reveal a correct mushroom, and point out a mistake.
   Both are trivial given the solution, both are one undoable action.
4. **Hint rung 2 (the nudge) — attempt it, and be honest if it does not land.**
   Naming a row/column/region where a deduction is *available* needs constraint
   propagation, not the existing backtracking solver. It is the real work here
   and the best hint in a teaching game. If it proves too big, ship rungs 3–4 and
   say plainly in the PR that the nudge is deferred — **do not fake it** by
   dressing up a reveal as a nudge.
5. **Count hints used per puzzle** — the ladder step needs it, and it is far
   easier to record now than to retrofit.
6. **Tests** for every new selector, and for the hint invariants below.

### Behaviors that are easy to get wrong

- **X marks are never wrong.** Correctness feedback applies to **mushrooms only**
  (§11.1). Flagging a "wrong" X is telling the player how to think.
- **There is no complete-but-wrong board.** Uniqueness means N mushrooms placed
  with no conflicts *is* the solution, so correctness feedback is purely a
  mid-solve aid — it can never be what tells you a finished board is wrong.
  A test asserting "a legal full board is never flagged" is worth having.
- **A hint must never place a conflicting mushroom.** Worse than no hint.
- **Derive feedback, don't store it.** Same reason conflicts are a selector: undo
  must not be able to leave a stale mistake marker on the board.
- **Conflicts and mistakes are different things** and can coexist on one cell. Do
  not let one visual treatment swallow the other, and keep both readable without
  color (plan §5) and on a dark theme.
- **Don't regress the cell accessibility labels** — they are the test seam. Extend
  the format, don't reshape it.

### Out of scope for this step

- **No ladder, progression or scoring** — Step 8. Count hints, don't price them.
- **No art swap** — Step 9, gated on artwork rather than code.
- **No Sudoku changes.** Its "Show Mistakes" is a reference for wording and
  placement, not something to refactor or share code with.

### Visible in Expo Go when this lands

Turn **Show Mistakes** on, place a mushroom that breaks no rule but is in the
wrong cell, and see it flagged as a mistake rather than as a conflict. Get stuck
and **ask for a hint**, and get help proportional to what you asked for. A correct
placement feels like one.

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
| 6 | Input ergonomics — drag to sweep X's, rule-out button | PR to `epic/fungiku` |
