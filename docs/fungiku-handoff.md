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

## Next step: **Step 10 — lives and mistakes**

Branch: **`feature/fungiku-lives`** off `epic/fungiku`.
Plan: **§14.2 and §14.3** — read **both, in full**, plus §14's preamble and
§11.1 (which §14.3 supersedes). This step deletes things earlier steps built
deliberately. §14.3 explains why each removal is sound; do not re-derive those
arguments and do not put the deleted behaviors back.

### Why these two are one step

§14.2 is a new input gesture (tap = ✕, double-tap = 🍄) and §14.3 is what a
mushroom placement now costs. They are the same input surface, and building the
double-tap without the life cost would ship a mushroom-placing gesture with no
consequence attached. **Do not split them.**

### Scope — ONLY this

1. **Tap places ✕, double-tap places 🍄** (§14.2), replacing the three-state
   cycle. Tap on a filled cell (either mark) clears it — that is what keeps every
   state reachable once the cycle is gone. Drag-to-sweep is unchanged: a stroke
   still only paints or erases ✕ and still never disturbs a mushroom.
2. **A wrong mushroom is flagged immediately, leaves a red ✕, and costs a life**
   (§14.3). **Three lives at every size** — not scaled per difficulty (the
   operator's answer). At zero lives the **same board** restarts: same seed,
   marks cleared, lives reset. A fresh board would punish twice and throw away
   deduction already done.
3. **Undo does not refund a life** — *"you don't get lives with info."* Undo still
   retracts the mark.
4. **Delete the "Show mistakes" toggle**, `TOGGLE_MISTAKES` and the
   `showMistakes` field (§14.3 answers open question §8 #7 by deletion). This
   needs a **storage migration to v3** — the plumbing is now in
   `games/fungiku/saveMigration.js`, so it is one `MIGRATIONS[2]` entry.
5. **Decide the conflict rendering explicitly, and say which in the PR** — see
   below. This is a required output of this step, not an optional note.
6. **Lives visible on screen**, and it should not move the board (see the deps
   note below).

### Read first

- **§14.2, §14.3** of the plan, and §11.1 for what is being superseded.
- `SudokuApp/games/fungiku/reducer.js` — `CYCLE_CELL` is the action that becomes
  two, and `nextMark`/`MARK_CYCLE` in `engine.js` is the cycle being retired.
- `SudokuApp/games/fungiku/FungikuBoard.js` — the `PanResponder`, the 6px
  tap-vs-drag threshold, and where a second tap has to be detected.
- `SudokuApp/games/fungiku/saveMigration.js` — how to add the v2 → v3 step. The
  file's header states the rule: **add an entry, never edit an existing one.**
- `SudokuApp/games/fungiku/difficulty.js` — three lives at every size means this
  file should need **no change at all**; if you are editing it, re-read §14.3.

### Behaviors that are easy to get wrong

- **Do not make single taps wait for the double-tap window.** The naive detector
  delays every ✕ by ~250 ms, and the ✕ is the most common gesture in the game.
  Place the ✕ **immediately** and *upgrade* the cell if a second tap lands inside
  the window.
- **The upgrade must be one undo entry, not two.** Otherwise undo after a
  double-tap strands a ✕ the player never asked for. `BEGIN_STROKE`/`PAINT_CELLS`
  already solve exactly this shape for drags — the same trick applies.
- **The detector belongs inside the existing gesture, not beside it.** The board
  claims every touch at touch-down to win the ScrollView race (§2). A second
  `PanResponder` or a child `Touchable` will never see the second tap.
- **A screen reader cannot express a double tap.** Cells carry
  `onAccessibilityTap`; placing a mushroom needs an explicit alternative action
  named in the `accessibilityLabel` (`accessibilityState` does not survive to the
  web).
- **This is a device question.** Double-tap timing — and whether a child can
  produce one reliably — cannot be answered in a browser (§2, "A pattern worth
  knowing"). Both native bugs the operator has found were invisible on web.
- **Anything new above the board joins `FungikuBoard`'s re-measure deps**
  (`[hint, solved, generating, measure]`), or the first tap after it appears
  lands on the wrong cell. A lives counter is exactly that shape. **Two places
  now dodge this properly and are the patterns to copy:** the always-mounted
  counter row (which is where "Generating…" lives) and the header's subtitle,
  which Step 9 used for the difficulty because its height never changes.

### The decision this step owes the next one

Once a wrong mushroom is converted to a ✕ on placement, every mushroom left on
the board sits at a solution cell — and two solution cells can never share a row,
column or region, or touch. **So two placed mushrooms can no longer conflict,
ever.** That makes several existing paths unreachable by construction:

- the live conflict rendering from Steps 4–5,
- `selectMistakes`, `showMistakes` / `TOGGLE_MISTAKES`,
- hint rung 1 (`HINT_KINDS.MISTAKE`),
- `selectRevealCell`'s -1 branch.

§14.3 calls the loss of the "these two are fighting" read real, and asks you to
**decide explicitly whether to remove the conflict rendering or leave it dormant,
and say which in the PR.** Otherwise a later session finds highlighting that
never fires and assumes it is broken. `findConflicts` itself **stays** — the
engine needs it for generation, solving and the reveal-safety check.

Note the screen's status line currently reports conflicts
(`${conflicts.size} mushrooms breaking a rule` in `FungikuScreen`); whichever way
you decide, that string is part of the decision.

### Out of scope for this step

- **No wallet or metering** — Step 11 (§14.4). `hintsUsed` stays the per-puzzle
  counter it is.
- **No art swap** — Step 12.
- **No board rating / propagator work** (§14.1, §12.1); difficulty stays
  size-only.
- **No new difficulty work.** The menu landed in Step 9 and lives are not
  per-difficulty.

### Visible in Expo Go when this lands

**A wrong guess costs you something.** You tap to rule a cell out, double-tap to
commit a mushroom, and a wrong commitment turns red and takes one of your three
lives — three mistakes and the board you were working on starts over.

### How to verify

`npm test` · `npx expo-doctor` (18/18) · `npx expo export --platform all`, then
drive the web build (serve `dist/`, Chromium at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome` —
**note the versioned path**, `/opt/pw-browsers/chromium` is a file, not the
binary; do not run `playwright install`). Prove the migration on a **real** save:
write a v2 blob into `localStorage['@FungikuGame']`, reload, and confirm the
board and its marks come back. Then **ask the operator for a device pass** — the
double-tap is the part a browser cannot answer.

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
4. ~~**Ladder shape**~~ — **answered 2026-07-26, and not with a ladder**
   (plan §14.1). Size is neither a free choice nor progression-gated: it is what
   **difficulty** means. Easy 5-6, Medium 7, Hard 8-9, Expert 10, free play kept.
5. ~~**Assist defaults**~~ — moot: the rule-out assist became a button you tap
   rather than a mode with a setting, so there is no default to choose. (§2)
6. **How strong should hints go?** (§11) The ladder ends at *reveal a correct
   mushroom*, which solves a cell outright. Right for a family game, or does it
   want capping at a nudge? Related: a reveal is currently only reachable when
   nothing is forced, so a frustrated player cannot skip to the answer — see the
   first note below.
7. ~~**Should "Show mistakes" default on for younger players?**~~ — **answered
   by deletion, 2026-07-26** (plan §14.3). Correctness feedback stops being
   optional: a wrong guess is flagged immediately and costs a life, so the toggle
   goes away in Step 10. The trial-and-error worry that made it opt-in is
   answered by making guesses expensive rather than by hiding the answer.
8. **Should metering Rule out survive contact with a child?** (plan §14.4)
   Decided metered, but rule-out saves tedium rather than insight. Worth
   re-checking after a family play session.
9. **Does a rung that spans two sizes read as inconsistent?** (new, Step 9) Easy
   hands out 5×5 or 6×6 and Hard 8×8 or 9×9, picked from the seed — so two Easy
   games in a row can be different sizes. It is deterministic (a
   `{difficulty, seed}` pair is always the same board) and it is what the plan's
   table asks for, but on device it may just read as "Easy is sometimes bigger".
   Pinning each rung to one size is a one-line change in
   `games/fungiku/difficulty.js` (`share` counts) if the operator prefers it.

### Noted in passing, for a later step

- **A save is migrated now, not discarded — and the plumbing has one rule.**
  `games/fungiku/saveMigration.js` holds `FUNGIKU_STORAGE_VERSION` and a
  `MIGRATIONS` map keyed by the version each function upgrades *from*. **Add an
  entry; never edit an existing one** — an old entry describes a shape already on
  real devices. It is a separate module from `storage.js` on purpose: it is pure,
  and the Jest environment is plain node with no AsyncStorage.
- **The migration derives difficulty from size, never size from difficulty.**
  Easy spans 5-6, so re-resolving a saved board's size from its new rung would
  hand the player a different board and strand their deductions. `size` is what
  the board *is*; `difficulty` is what it was chosen by, and a rung spanning two
  sizes cannot recover which. Both are persisted for that reason.
- **An explicitly-passed bad size still throws.** `resolvePuzzleIdentity` resolves
  a size from the difficulty **only when no size was given**; a size that *was*
  given passes straight through so `generate()` rejects it loudly. A caller
  passing size 4 has a bug, and quietly substituting a 5×5 would hide it. There
  is a test pinning this in both directions.
- **The difficulty menu is a seam, and rated seeds are what it is waiting for.**
  Everything above `sizeForDifficulty` speaks in rungs; the only thing a rung
  resolves to today is a board size. When the propagator is strong enough to rate
  boards (§12.4 measured it at 2 of 10 deductions from an empty 10×10), rating
  slots in behind that one function **with no UI change**. Do not add a second
  concept of difficulty next to it.
- **Free play and the seed field are behind one constant.**
  `SHOW_DEVELOPER_CONTROLS` in `FungikuMenuModal.js`. Flip it to `false` and the
  menu is four difficulty buttons; the size chips and the seed input are how a
  size or a reported board gets checked by hand until then.
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
  left alone, and the operator confirmed on device that it holds at 10×10** — it
  is about absolute finger travel, not cell size, so it needs no per-size
  treatment. Note the shape of that question though: web draws a 10×10 cell at
  45px, *larger* than a native 5×5 cell, so no browser check could have answered
  it either way.
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
| 8 | Bigger boards — `MAX_SIZE = 10`, a tenth region colour tuned for CVD, no-wrap `getRegionColor`, generation announced, legibility at 32px, cost bound in rounds, board lines redrawn as a snapped overlay | merged to `epic/fungiku` (#75, `d4d2018`), operator-tested on device |
| 9 | Difficulty menu — rungs mapped into `SIZES`, size-from-seed, menu modal, free play + seed behind one flag, real v1→v2 save migration, hub badge names the rung | PR to `epic/fungiku` |

## Steps still to come

| # | Step | Plan |
|---|------|------|
| 10 | **Lives & mistakes** — tap ✕ / double-tap 🍄, wrong guess costs a life, three lives then restart | §14.2, §14.3 |
| 11 | **Earned assists** — a wallet; hints and rule-out metered, earned by solving | §14.4 |
| 12 | **Art swap** — floating, gated on artwork rather than code | §7 |

**Replanned 2026-07-26.** The old Step 9 was a training ladder with per-level
star thresholds; the operator asked instead for the difficulty menu the
platform's other game already has, so that basic mechanics work the same way
across games. Plan §13 keeps the ladder research for the day it is wanted on top
of difficulty.
