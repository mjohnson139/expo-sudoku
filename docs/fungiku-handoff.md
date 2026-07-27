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

## Next step: **Step 11 — earned assists (the wallet)**

Branch: **`feature/fungiku-wallet`** off `epic/fungiku`.
Plan: **§14.4** — read it in full, plus §11.2 (the hint ladder being priced) and
§2's "Rule out" (the other thing being metered). This step **inverts** what
`hintsUsed` is; §14.4 explains why, and the inversion is the whole point rather
than a refactor to be minimized.

### Scope — ONLY this

1. **A wallet in its own module** — `games/fungiku/wallet.js` (pure) plus its
   storage. `grant(kind, n)` / `spend(kind)` / `balance(kind)`, persisted under
   **its own global key**, the same shape as `@AppTheme`. **Not part of the
   per-puzzle save** — that is the point of the step: a balance that spans
   puzzles and sessions, where `hintsUsed` is per-puzzle history.
2. **Hints and Rule out both become metered consumables.** Both buttons: disabled
   at zero balance, and each shows what it has left. "Auto fill" in §14.4 *is* the
   existing Rule out button — confirmed with the operator — and it is metered
   too, not left free.
3. **Earning, denominated in what already exists**: boards solved, and how
   cleanly — **lives remaining is now a real number you can read** (`state.lives`,
   Step 10) and assists unspent. **Draft the rates and say in the PR that they are
   guesses**, flagged for on-device tuning. color-loop's star thresholds were left
   the same way and are still on its backlog (§13).
4. **Gifts and purchases are both just `grant()`.** Build the seam, not the store.

### Read first

- **§14.4** of the plan, and §11.2 for what each hint rung is worth.
- `SudokuApp/games/fungiku/reducer.js` — `hintsUsed` is incremented in
  `REQUEST_HINT` and `REVEAL_MUSHROOM`, and **not** by the STUCK branch, which
  deliberately gives nothing away and charges nothing. That asymmetry is the model
  for what a spend is.
- `SudokuApp/games/fungiku/storage.js` and `saveMigration.js` — read them to see
  what the wallet must **not** become part of. `FUNGIKU_STORAGE_VERSION` is now
  **3**; a wallet under its own key needs no bump at all, and if you find yourself
  writing `MIGRATIONS[3]` you have put the wallet in the wrong place.
- `SudokuApp/utils/appTheme.js` — the existing example of a small global
  preference with its own key. That is the shape to copy.
- `SudokuApp/games/fungiku/FungikuScreen.js` — the two buttons that get meters.

### Behaviors that are easy to get wrong

- **The wallet is not per-puzzle, and `hintsUsed` still is.** Keep both. Deleting
  `hintsUsed` and reading the wallet instead would lose "how much help did *this
  board* need", which is exactly what earning has to be computed from.
- **Spend on the action, not on the tap.** `REQUEST_HINT`'s "nothing is forced"
  answer is not a hint and must not cost anything — it already declines to count
  itself. A reveal is a second, deliberate tap and is its own spend.
- **A balance of zero has to look different from a disabled button.** Rule out is
  *already* disabled when there is nothing to mark, and Hint when the board is
  solved. Three reasons a button is dead, and the player needs to be able to tell
  "you cannot use this here" from "you have run out".
- **The wallet outlives the board, so granting has to be idempotent per win.**
  `solved` is derived from marks — undo and redo can cross the win line as many
  times as the player likes, and each crossing must not pay out again.
- **Do not make the game unwinnable.** A player at zero assists on a hard board
  with no way to earn is stuck with no way out. Decide what the floor is — a
  trickle, a daily grant, a minimum balance — and say which in the PR.
- **Anything new above the board joins `FungikuBoard`'s re-measure deps**
  (now `[hint, solved, generating, lives.left, measure]`), or the first tap after
  it appears lands on the wrong cell. If a balance is drawn in the counter row —
  which is where the hearts and "Generating…" already live, and is the pattern to
  copy — it must keep that row's height fixed.

### Out of scope for this step

- **No store, and no `react-native-iap` / RevenueCat.** Neither runs in Expo Go,
  so either would break the epic's "visible in Expo Go" rule (§14.4 states this
  once, with the Kids Category and parental-gate reasons too). Purchases are
  `grant()` and nothing more.
- **No art swap** — Step 12.
- **No board rating / propagator work** (§14.1, §12.1); difficulty stays
  size-only.
- **No changes to lives.** Three per board at every size, settled in Step 10.

### Visible in Expo Go when this lands

**Help is something you have, not something that is always there.** The Hint and
Rule out buttons carry a balance, spending one takes it down, and finishing a
board cleanly earns more.

### How to verify

`npm test` · `npx expo-doctor` (18/18) · `npx expo export --platform all`, then
drive the web build (serve `dist/`, Chromium at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome` — **note the versioned
path**, `/opt/pw-browsers/chromium` is a file, not the binary; do not run
`playwright install`). Prove the wallet **survives a reload and a puzzle change**,
which is the whole claim of the step, and prove a win pays out exactly once
across an undo/redo of the winning move. Then **ask the operator for a device
pass**.

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
   first note below. Step 11 prices it, which is a partial answer: a reveal that
   costs something is a different question from a reveal that is free.
7. ~~**Should "Show mistakes" default on for younger players?**~~ — **answered
   by deletion, 2026-07-26** (plan §14.3). Correctness feedback stops being
   optional: a wrong guess is flagged immediately and costs a life, so the toggle
   goes away in Step 10 — **shipped**: the toggle, `TOGGLE_MISTAKES` and
   `showMistakes` are deleted and the v2→v3 migration drops the saved field. The
   trial-and-error worry that made it opt-in is answered by making guesses
   expensive rather than by hiding the answer.
8. **Should metering Rule out survive contact with a child?** (plan §14.4)
   Decided metered, but rule-out saves tedium rather than insight. Worth
   re-checking after a family play session — **and it lands in Step 11**, so this
   is the moment it stops being hypothetical.
11. **Is a 320 ms double-tap window right for a child?** — the first device pass
    said tapping was unpredictable; that turned out to be the 6px tap-vs-drag
    threshold rather than the window, and the second pass with it fixed was
    "working fine". The window itself is still untuned.
    Original note: — **new, and a device
    question.** `DOUBLE_TAP_MS` in `games/fungiku/FungikuBoard.js`. Set longer
    than a platform double-tap (~250 ms) on purpose: a small finger is slower, and
    the cost of being generous is one extra tap while the cost of being strict is
    a mushroom that "won't go in". No browser can answer it — a mouse click and a
    finger on glass are not the same gesture.
12. **Should the red ✕ left by a wrong guess be erasable?** — **new.** It ships as
    an ordinary ✕ (plan §14.3 says so explicitly), consistent with rule-out and
    hint marks, so a later tap clears it — which also lets a player erase the
    record of their own mistake. Revisit if it reads wrong in play.
9. ~~**Does a rung that spans two sizes read as inconsistent?**~~ — **approved on
   device, 2026-07-26.** Easy hands out 5×5 or 6×6 and Hard 8×8 or 9×9, picked
   from the seed, so two Easy games in a row can be different sizes. The operator
   tested Step 9 in Expo Go and passed it as-is. Pinning each rung to one size is
   still a one-line change to the `share` counts in `games/fungiku/difficulty.js`
   if it starts to grate in play.
10. ~~**Should the difficulty menu open on arrival?**~~ — **approved on device,
    2026-07-26.** It opens when there is nothing to continue (matching Sudoku) and
    never interrupts a restored or in-progress board. Revisit only if it annoys.

### Noted in passing, for a later step

- **The invariant everything since Step 10 rests on: every mushroom on the board
  is at a solution cell.** A wrong one is converted to a red ✕ the instant it is
  placed, and marks arriving from an older save go through the same rule in
  `buildPuzzleState` (`enforcePlacedMushroomsAreCorrect`). **If you ever add a
  path that puts a mushroom on the board, it must go through that judgement** —
  a great deal was deleted on the strength of this holding, and the deletions do
  not announce themselves when it breaks.
- **The conflict rendering was removed, not left dormant** (the decision Step 10
  owed, plan §14.3). Two mushrooms on the board are two distinct solution cells,
  and solution cells never share a row, column or region and never touch — so two
  placed mushrooms *cannot* conflict. Gone with it: the ring, the status line's
  conflict count, `selectConflicts`, `selectMistakes`, hint rung 1
  (`HINT_KINDS.MISTAKE`), and `selectRevealCell`'s "a wrong mushroom is in the
  way" case. **`findConflicts` stays in the engine** — generation, `isSolved` and
  the reveal-safety check all still need it. The loss is real: the "these two are
  fighting" read is gone. It was the direct consequence of immediate feedback, not
  an oversight.
- **`conflictInk` outlived the conflict ring it was named for.** It is the
  palette's contrast-checked "this is wrong" ink, verified against every fill
  (`utils/symbolSets.js`, and there is a test pinning the contrast floor). It now
  draws the red ✕. Do not delete it as dead code because its name says conflict.
- **Losing is a dialog, not a wipe.** The reducer does **not** clear the board on
  the third mistake: it leaves it at `lives === 0` still holding the mark that
  killed it, and `RESTART_BOARD` — which the player presses in
  `FungikuOutOfLivesModal` — does the clearing. The first version wiped in the
  same breath and the operator's report was that the board just emptied with no
  idea why. **`lives === 0` therefore means "a restart is pending"**, which is
  what the modal is driven by; because lives are persisted, quitting to the hub
  mid-dialog and coming back lands on it again rather than stranding a board with
  no lives and no way to start it over.
- **A wrong guess is announced on three channels**, because one was not enough on
  device: the cell shakes and its ✕ goes red *and* heavier (`close-thick`, so the
  flag does not rest on colour alone), the heart that just emptied beats, and the
  counter row says it in words. `lastMistake` carries the event and `mistakeSeq`
  is a **monotonic** counter that survives the transient being cleared — without
  it, two wrong guesses in the same cell would hand out the same `seq` and the
  animation would not re-fire.
- **Lives are not part of the undo history, and that is deliberate.** The stacks
  hold mark snapshots and nothing else, so undo retracts a mistake's mark and
  leaves the life spent — *"you don't get lives with info"* (§14.3). If you ever
  put another cost in state, decide the same question explicitly rather than
  letting `pushHistory` answer it for you.
- **Tap-vs-drag is "did the finger reach another cell", not a pixel distance.**
  It was a flat 6px, which was survivable while a tap only cycled a mark — a
  shaky tap became a one-cell stroke and painted the same ✕, so it never showed.
  The double-tap ended that: a wobble past 6px on either half turns that half into
  a stroke and breaks the pairing, or (when the second half starts on a ✕) into an
  *erase* stroke that wipes the cell. **That was the operator's "tapping is very
  unpredictable" on device.** `MAX_TAP_TRAVEL` survives only as a backstop for a
  finger that has left the board.
- **Nothing in the counter row may size itself from its contents.** It is
  width-matched to the board (`useBoardSize`) for a load-bearing reason: it sits
  in a ScrollView whose content container centres its children, so a row wider
  than the screen widens the container and pushes every centred sibling — the
  board included — right, off the edge. Adding the hearts did exactly that and
  left the last column untappable. The row is two fixed lines; keep it that way,
  or the board moves.
- **The double-tap detector lives inside the board's one `PanResponder`, and the
  ✕ is never deferred.** The board claims every touch at touch-down to win the
  ScrollView race, so a second `PanResponder` or a child `Touchable` would never
  see the second tap. The first tap dispatches `TAP_CELL` immediately and the
  second *upgrades* the cell via `PLACE_MUSHROOM`; the upgrade amends the first
  tap's undo entry (`upgradableCell`) instead of pushing a second, so undo after a
  double-tap never strands a ✕ the player did not ask for.
- **Custom accessibility actions do not reach the web.** Placing a mushroom is
  exposed as a named `placeMushroom` action alongside `onAccessibilityTap`,
  because a screen reader cannot express a double tap — but react-native-web does
  not map custom actions, so on web a screen-reader user can rule out and clear
  but cannot commit a mushroom. Native VoiceOver/TalkBack are fine. Worth fixing
  if web accessibility ever matters; it needs a real alternative affordance, not
  another prop.
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
- **One red commit status on every PR is not yours.** The
  `EAS Update — @mjohnson139/expo-sudoku` status errors with *"This Expo account
  doesn't have a member with a GitHub user that has admin access to this
  repository"* — an Expo GitHub App permissions issue, identical on #76 and #77,
  unrelated to any diff. The workflow-based **EAS Update PR preview** job is the
  one that actually publishes the preview, and it passes. Don't chase it; the
  operator can fix it in the Expo account's GitHub settings if it ever matters.
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
  `FungikuBoard` re-measures in an effect keyed on
  `[hint, solved, generating, lives.left]` — the first two mount a banner, the
  rest only change what the always-mounted counter row draws and are cheap
  insurance. **Anything new added above the board must be added to those deps**,
  or the first tap after it appears lands on the wrong cell.

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
- **Rule-out marks are ordinary X marks once placed** — and so is the red ✕ a
  wrong guess leaves (plan §14.3, shipped clearable; §8 #12). Removing the
  mushroom that implied them leaves them behind; undo takes the whole fill back
  instead.
  Retracting them per-mushroom would need per-mark provenance, which is ambiguous
  as soon as two mushrooms rule out the same cell.
- **`accessibilityState.checked` does not reach `aria-checked` on web.** Any
  toggle has to name its state in its `accessibilityLabel` — that is the only
  place a screen reader or a test can read it reliably. (The "Show Mistakes"
  switch this was written for is gone as of Step 10; the rule outlives it, and the
  cell labels are still the seam the browser checks address the board through.)

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
| 9 | Difficulty menu — rungs mapped into `SIZES` by *share*, size-from-seed, menu modal built to Sudoku's, free play + seed behind one constant, real v1→v2 save migration, difficulty in the header rather than a banner, hub badge names the rung | merged to `epic/fungiku` (#77, `02fcdf1`), operator-tested on device |
| 10 | Lives & mistakes — tap ✕ / double-tap 🍄 replacing the cycle, wrong mushroom flagged immediately as a red ✕ costing one of three lives, zero lives restarts the same board *behind a dialog*, undo never refunds, "Show mistakes" deleted, v2→v3 migration, conflict rendering **removed** | **this step** (#79) — device-tested twice, two rounds of fixes |

## Steps still to come

| # | Step | Plan |
|---|------|------|
| 11 | **Earned assists** — a wallet; hints and rule-out metered, earned by solving | §14.4 |
| 12 | **Art swap** — floating, gated on artwork rather than code | §7 |

**Replanned 2026-07-26.** The old Step 9 was a training ladder with per-level
star thresholds; the operator asked instead for the difficulty menu the
platform's other game already has, so that basic mechanics work the same way
across games. Plan §13 keeps the ladder research for the day it is wanted on top
of difficulty.
