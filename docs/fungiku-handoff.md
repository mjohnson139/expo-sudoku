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

## Next step: **Step 8 — bigger boards, up to 10×10**

Branch: **`feature/fungiku-big-boards`** off `epic/fungiku`.
Plan: **§12** end to end (all new, 2026-07-25), plus the §7 note "Why bigger
boards come before the ladder".

### Why this step exists

The ladder needs a ceiling, and it is now decided: **10×10**. The operator asked
for 12×12 first; measuring the generator showed a 12×12 takes **7.3 seconds
median and 41.8 seconds worst case**, synchronously on the main thread, so the
target moved down to the last affordable size. Cost per size goes off a cliff:

| Size | median | worst |
|------|--------|-------|
| 8×8 | 6 ms | 25 ms |
| 10×10 | **284 ms** | **584 ms** |
| 11×11 | 2,536 ms | 5,096 ms |
| 12×12 | 7,286 ms | 41,830 ms |

**Read that as good news for this step.** The hard engineering problem — making
the uniqueness loop cheap enough for 12×12 — is off the table. What remains is
small and concrete:

- **The palette wraps at 9.** `getRegionColor` does `regionId % palette.length`
  over nine entries, so **at 10 regions, region 9 renders identically to region
  0**. Region colour is the only way the player sees region boundaries, so that is
  a correctness bug at the new top size. §12.2 measured that 10 well-chosen fills
  reach worst-pair ΔE 23.78 — *better* separated than the 9 shipping today at
  17.11 — so this is a one-colour problem with headroom.
- **There is no upper bound at all.** `MIN_SIZE = 5` exists; `generate()` accepts
  size 20 and never returns.
- **Cells get to 32 px** at 10×10 inside the fixed 324pt native board, and several
  constants were tuned against 5×5.

### Read first

- **§12 of the plan.** Generation timings, the palette measurement, the
  32-pixel legibility list, and (in §12.1) the four ranked approaches to
  generation cost — kept for the day the ceiling might rise, **not work for this
  step**. Do not re-derive any of it.
- `SudokuApp/games/fungiku/engine.js` — `MIN_SIZE` and the perturbation loop
  (`generate` → `findSolutions` → `breakSolution`, up to `PERTURB_BUDGET` rounds).
  You are adding a bound here, not rewriting the loop.
- `SudokuApp/utils/symbolSets.js` — `HUE_ORDER` + `LIGHT_TINTS`/`DARK_TINTS` build
  both theme palettes; `getRegionColor` wraps. The `corners` shape cue in this
  module is **defined but unused by the Fungiku board** — worth knowing the second
  channel exists if the tenth colour proves hard to place.
- `SudokuApp/utils/__tests__/symbolSets.test.js` — holds the ΔE 15 worst-pair
  floor that today's palette clears at 17.11. Extending to 10 must keep it green;
  §12.2 says that is comfortable.
- `SudokuApp/hooks/useBoardSize.js` — fixed **324** on native, so a 10×10 cell is
  **32 px** (web's 450 gives 45 px, which is why the browser will not show you the
  problem).
- `SudokuApp/games/fungiku/FungikuScreen.js` — where the size chips live. Four
  chips become six; that is a layout question, not just a data one.

### Scope — ONLY this

1. **Add `MAX_SIZE = 10`** to the engine and reject above it, the same way sizes
   below 5 are rejected today.
2. **Add a 10th region colour per theme**, derived the same way §5's palette was —
   maximize the worst pairwise CIEDE2000 distance under the lightness band. **Do
   not eyeball it, and do not stop at ΔE:** check the new hue under colourblind
   simulation (§12.2). Okabe–Ito was chosen for CVD survival, and one hue picked
   purely to maximize ΔE for normal vision can still collide under deutan or
   protan.
3. **Make `getRegionColor` stop wrapping silently.** Two regions sharing a colour
   must be impossible-by-construction or loud, not quiet — that is the bug class
   this step is closing, and leaving the modulo in place just moves the boundary
   to 11.
4. **Sizes 9 and 10 reachable from the UI**, so the operator can actually play a
   10×10 in Expo Go. Six chips need a layout that survives a narrow phone.
5. **Confirm the generation hitch is acceptable at the top size** — 284 ms median,
   584 ms worst, on the main thread. Either show a brief loading state or verify on
   device that it is imperceptible. **Don't assume; a visible freeze on "New
   puzzle" reads as a bug.**
6. **A legibility pass at 32 px** (§12.3): mistake badge (`cell * 0.28` ≈ 9 px),
   conflict ring, region borders, glyph size.
7. **Tests** — the palette floor extended to 10 entries, `MAX_SIZE` rejection, and
   a **generation-cost bound at the top size**. 10×10 sits one size below a
   ten-times cliff, so a change that makes generation modestly slower would turn
   the top size from *hitch* into *freeze* with no other symptom.

### Behaviors that are easy to get wrong

- **A timing test on CI is a flake factory.** Assert a generous ceiling, or count
  perturbation rounds instead of milliseconds — rounds are machine-independent,
  which is what you actually want from a regression bound.
- **Re-tune the palette with the same objective, never by hand.** The test floor
  exists precisely so a well-meaning hand-picked swatch can't quietly regress
  separation.
- **ΔE is not colourblind safety.** Different properties; one new hue is a small
  risk, not no risk.
- **The board's measured origin.** If this step adds anything above the board — a
  generation spinner, for instance — it must go into the deps of `FungikuBoard`'s
  re-measure effect, currently `[hint, solved, measure]`, or the first tap after it
  appears lands on the wrong cell. `onLayout` will not save you; see the note
  below.
- **Smaller cells, same fingers.** The 6-pixel tap-vs-drag threshold was tuned
  against roughly 40 px cells. At 32 px there is less room to press without
  registering a stroke, and **that is a device question the browser cannot answer**
  — web renders at 45 px, larger than native, so the browser is the wrong place to
  judge any of §12.3.

### Out of scope for this step

- **No generator re-engineering.** §12.1's four approaches exist for the day the
  ceiling might rise past 10. At 10 the generator is fast enough; leave it alone
  and spend the step on the palette, the bound, and legibility.
- **No ladder, no scoring** — Step 9. This step fixes the ceiling the ladder will
  use; it does not build progression. Research already gathered for that step is
  parked in plan **§13** so it isn't lost.
- **No art swap** — Step 10, gated on artwork rather than code.
- **No hint-strength work.** §12.4 found the forced-move nudge is shallow (2 of 10
  deductions from an empty 10×10 board). Real, and worth doing — but strengthening
  the propagator with pigeonhole reasoning is its own change. Note it in the PR;
  don't smuggle it in.

### Visible in Expo Go when this lands

**A playable 10×10** — ten visibly different region colours with no repeat,
legible marks at 32-pixel cells, and a "New puzzle" tap at the top size that
doesn't read as a freeze.

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
4. **Ladder shape** — **top end decided: 10×10** (operator, 2026-07-25; plan
   §12). 12×12 was asked for first and withdrawn once measured at 7.3 s to
   generate. Still open: **is size a free choice or unlocked by progression?**
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
| 7 | Feedback & hints — mistake flagging, forced-deduction nudge, reveal, placement pop | merged to `epic/fungiku` (#73, `12f72c3`) |
