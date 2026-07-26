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

## Next step: **Step 9 — the training ladder, and scoring**

Branch: **`feature/fungiku-ladder`** off `epic/fungiku`.
Plan: **§13** (research already gathered for this step — do not re-derive it),
plus §7's "Why feedback and hints come before scoring".

### Why this step exists

Fungiku is playable and now has a ceiling, but the only way to pick a board is a
row of raw size chips. There is no sense of progression, nothing to come back
for, and nothing that uses the two currencies the last two steps deliberately
built: `hintsUsed` (counted and persisted per puzzle) and `selectMistakes`.

The top end is settled — **10×10** — so the ladder can be denominated in sizes
without being reworked later. That was the whole reason board sizes came first.

### Read first

- **§13 of the plan.** A level is a `{size, seed}` pair; the storage migration;
  the timer question; the pointer to color-loop's ladder. All of it was
  researched for this step and parked. Do not repeat that work.
- `SudokuApp/games/fungiku/storage.js` — `FUNGIKU_STORAGE_VERSION` and what a
  version mismatch does today (returns null; the board starts fresh).
- `SudokuApp/games/fungiku/reducer.js` — `buildPuzzleState` is where a level
  would be turned into a board, and `hintsUsed` already rides along in state.
- `SudokuApp/games/fungiku/engine.js` — `SIZES`, `MIN_SIZE`, `MAX_SIZE`. The
  ladder picks its rungs from this range; do not hand-write a size list again.
- `SudokuApp/utils/gameProgress.js` → `describeFungikuProgress` — what the hub's
  Continue badge says today.
- The sibling repo's `games/colorloop/levels.ts` — a ladder with per-level star
  thresholds, already built and worth copying the shape of.

### Scope — ONLY this

1. **The ladder as data** — a table of `{size, seed}` rungs in its own module,
   plus whatever per-level target the scoring lands on.
2. **Progression + persistence.** This is the **first change that must not wipe
   someone's progress**: bump `FUNGIKU_STORAGE_VERSION` and write a real
   migration for the existing `{size, seed, marks, showMistakes, hintsUsed}`
   shape. A version mismatch currently discards the save silently, which is fine
   for a board and not fine for a ladder position.
3. **A level-select surface** as the primary path into a game, with the size
   chips kept as a free-play escape hatch (they are how a size gets checked by
   hand).
4. **Scoring**, denominated in what already exists — hints used, mistakes made.
   **Whether Fungiku gets a timer is a decision to make explicitly, not to
   inherit from Sudoku** (§13); a family puzzle that times you plays differently.
5. **The hub's Continue badge** naming the level rather than the board size.
6. **Tests** — above all, **assert that every rung in the table actually
   generates**. A typo becomes a crash for whoever reaches that level.

### Behaviors that are easy to get wrong

- **Generation cost is now a design input.** A 10×10 rung costs ~0.4s on the
  machine that measured it and more on a phone. Any level-select screen that
  generates boards to preview them, or pre-generates the next rung, will be slow
  in a way the size chips never were. The `generating` flag and the deferral in
  `FungikuContext` exist for exactly this and should be reused, not reinvented.
- **A test that generates every rung is the slowest test in the suite.** Step 8's
  numbers: a 10×10 takes ~3s *under Jest* (its transform costs ~7×), which is why
  the engine battery samples two seeds at the top size. If the ladder has several
  10×10 rungs, budget for it — or assert cheaply on bounds and generate a sample.
- **The size chips are wired to `SIZES`, derived from the engine bounds.** If the
  ladder gates sizes behind progression, that derivation is the thing to extend,
  not to bypass with a second hand-written list.
- **Anything new above the board joins `FungikuBoard`'s re-measure deps**,
  currently `[hint, solved, generating, measure]`, or the first tap after it
  appears lands on the wrong cell. A level banner is exactly that shape.
- **`hintsUsed` resets per puzzle and `showMistakes` carries across**, by design
  (`buildPuzzleState`). Scoring has to decide which side of that line it is on.

### Out of scope for this step

- **No generator re-engineering.** §12.1's four approaches are for the day the
  ceiling rises past 10. It isn't this step.
- **No art swap** — Step 10, gated on artwork rather than code.
- **No hint-strength work.** §12.4 found the forced-move nudge is shallow (2 of
  10 deductions from an empty 10×10). Real, and worth doing, but strengthening
  the propagator with pigeonhole reasoning is its own change.
- **No second channel for region identity.** Ten fills currently clear every
  floor with room (§12.2), so the unused `corners` shape cue stays unused.

### Visible in Expo Go when this lands

**A ladder you can climb**: pick a level, play it, see it recorded, and come back
to the next one — with the hub's Continue badge naming where you are.

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
4. **Ladder shape** — top end decided and now **built**: sizes 5×5 through
   10×10 are all reachable from the size chips (plan §12). 12×12 was asked for
   first and withdrawn once measured at 7.3 s to generate. Still open, and
   **Step 9 needs an answer**: is size a free choice, or unlocked by progression?
   Absent a steer it will ship as a ladder plus free play.
5. ~~**Assist defaults**~~ — moot: the rule-out assist became a button you tap
   rather than a mode with a setting, so there is no default to choose. (§2)
6. **How strong should hints go?** (§11) The ladder ends at *reveal a correct
   mushroom*, which solves a cell outright. Right for a family game, or does it
   want capping at a nudge? Related: a reveal is currently only reachable when
   nothing is forced, so a frustrated player cannot skip to the answer — see the
   first note below.
7. **Should "Show mistakes" default on for younger players?** (§11) It turns a
   deduction puzzle into trial-and-error for anyone who leaves it on, which argues
   for off — but "off" for a seven-year-old may just mean stuck. Ships **off**
   today.

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
- **The region palette is tuned, not hand-picked — and ΔE is not its objective.**
  `utils/symbolSets.js` derives ten fills from per-hue tint weights. Step 8
  found that maximizing worst-pair CIEDE2000 for normal vision produces palettes
  that are *worse than the previous one under dichromat simulation*, so the
  objective is now inverted: normal-vision separation is a constraint (no worse
  than before), colourblind separation is what gets maximized, and the contrast
  floors are constraints on which tints are candidates at all. Plan §12.2 has
  the numbers and the method. **Re-tune with that objective — do not eyeball it,
  and do not "simplify" it back to ΔE.**
- **Simulating colourblindness: check that gray stays gray.** The widely-copied
  Viénot matrices come in two forms, and the LMS-space one applied to linear RGB
  is wrong in a way that is invisible on saturated colours — it turned mid-gray
  teal and survived an entire tuning run. Every row of the correct sRGB form sums
  to 1. `simulateCvd` in `utils/color.js` is the one implementation; use it.
- **A generation hitch above 8×8 is announced, not hidden.** `startPuzzle` defers
  through `requestAnimationFrame` *and* a `setTimeout` for sizes ≥ 9, because
  setting a flag only schedules a render — generating in the same turn blocks the
  thread before the spinner is ever drawn. The indicator lives inside the
  always-mounted counter row so the board never moves (see the origin note above).
- **Board constants step down below 40px cells** (`tightCells` in
  `FungikuBoard`): conflict ring inset and stroke, mistake badge. That threshold
  leaves 5×5-8×8 as they were. **The 6px tap-vs-drag threshold was deliberately
  left alone** — it is the one item in plan §12.3 that only a device can settle,
  since web draws a 10×10 cell at 45px, larger than a native 5×5 cell.
- **The region-boundary stroke is deliberate, and settled.** It was removed on
  2026-07-26 (a region is a colour, so the stroke looked like the same
  information twice, and dropping it deleted 140 lines of special cases) and
  **put straight back at the operator's call, for colourblind players** — when
  two adjacent fills are hard to tell apart, the stroke is what still says the
  region ends here. **Do not remove it as a simplification; that experiment has
  been run.** Plan §12.5. `corners` in `utils/symbolSets.js` is still available
  as a third channel if one is ever wanted.
- **Every line on the board is drawn by `FungikuGridLines`, not by cell borders**
  (plan §12.5, from an operator device report). Per-cell borders drew every
  interior region boundary **twice** — once by each neighbour, so at double the
  frame's weight — and mitered at every corner, and ate width off both fills.
  The overlay draws each edge once, centred on it, with region segments extended
  half a stroke so junctions fill by overlap. **If you add anything to it: it must
  keep `pointerEvents="none"` and must not change the board's box**, because
  `cellFromPoint` resolves every tap against that origin.
- **Every line is snapped to the device pixel grid** (`PixelRatio.roundToNearestPixel`
  on position *and* thickness). A 1px line centred on a cell edge lands at
  `y = 35.5` → device rows 106.5-109.5 on a 3× screen, which antialiases into a
  faint smear whose visibility depends on the fill behind it. That read as "the
  grid has misses" when in fact every edge was drawn. **When a rendering bug
  looks patternless, audit the geometry instead of the screenshot** — plan §12.5.
- **Within-region grid lines take their colour from the fill, not the theme.**
  `grid.cellBorder` is tuned for Sudoku's white cells — in Pastel it is `#d0d8e6`,
  invisible on a saturated region fill. The contrast-picked ink at low alpha is
  legible on every fill by construction, the same rule the glyph already used.

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
| 7 | Feedback & hints — mistake flagging, forced-deduction nudge, reveal, placement pop | merged to `epic/fungiku` (#73, `12f72c3`) |
| 8 | Bigger boards — `MAX_SIZE = 10`, a tenth region colour tuned for CVD, no-wrap `getRegionColor`, generation announced, legibility at 32px, cost bound in rounds, board lines redrawn as an overlay | this PR |
