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

## Next step: **Step 8 — bigger boards, up to 12×12**

Branch: **`feature/fungiku-big-boards`** off `epic/fungiku`.
Plan: **§12** end to end (it is all new, written 2026-07-25), plus the §7 note
"Why bigger boards come before the ladder".

### Why this step exists

The operator asked for the ladder to reach **12×12**. That answers half of §8 #4,
and it is not a table entry — it is an engineering problem. Two things built for
boards of 5–8 do not survive the jump, and one of them is measured to be
catastrophic:

- **Generation is synchronous and superlinear.** Twelve seeds per size on this
  machine: 8×8 median **6 ms**, 10×10 **284 ms**, 11×11 **2.5 s**, 12×12
  **7.3 s median and 41.8 s worst case**. Nothing *failed* at any size — the
  boards are correct — but tapping "New puzzle" on a 12×12 freezes the app for
  seven seconds typically. That reads as a crash. Full table in §12.1.
- **The palette has nine colours and wraps.** `getRegionColor` does
  `regionId % palette.length`, so at 10, 11 and 12 regions **two different
  regions render identically**. Region colour is the only way the player sees
  region boundaries, so that is a correctness bug at those sizes, not a cosmetic
  one. §12.2 has the measurement showing 12 well-chosen fills would actually be
  *better* separated (ΔE 21.80) than the 9 that ship today (17.11).

The ladder (now Step 9) has to know its own ceiling, and one candidate fix here —
baking level layouts as data — is itself a ladder design decision. Doing sizes
first avoids building a 5–8 ladder and then reworking it.

### Read first

- **§12 of the plan.** It has the generation timings, the palette measurement, the
  27-pixel legibility list, and four candidate approaches to the cost ranked
  cheapest-first. Do not re-derive any of it.
- `SudokuApp/games/fungiku/engine.js` — `generate()` grows regions randomly and
  then perturbs toward uniqueness (`findSolutions` → `breakSolution`, up to
  `PERTURB_BUDGET` rounds). **The cost is in that loop, and §12.1 candidate #1 is
  to profile it before optimizing**: whether it is the number of rounds or the
  cost of each search changes the fix completely. `MIN_SIZE = 5` exists; there is
  no upper bound, so size 20 is accepted and never returns.
- `SudokuApp/utils/symbolSets.js` — `HUE_ORDER` + `LIGHT_TINTS`/`DARK_TINTS`
  build both theme palettes; `getRegionColor` wraps. The `corners` shape cue in
  this module is **defined but unused by the Fungiku board** — twelve regions is
  where colour alone starts carrying too much, so this is the moment to add a
  second channel.
- `SudokuApp/utils/__tests__/symbolSets.test.js` — holds the ΔE 15 worst-pair
  floor that the current palette clears at 17.11. Extending to 12 must keep it
  green; §12.2 says that is achievable.
- `SudokuApp/hooks/useBoardSize.js` — returns a fixed **324** on native, so a
  12×12 cell is **27 px** (web's 450 gives 37 px). §12.3 lists what breaks at
  that size — notably the mistake badge at `cell * 0.28` ≈ 7 px.
- `SudokuApp/games/fungiku/FungikuScreen.js` — where the size chips live. Four
  chips become up to eight; that is a layout question, not just a data one.

### Scope — ONLY this

1. **Make 12×12 generate promptly, or cap honestly.** Profile the perturbation
   loop first (§12.1 #1), then pick from #2–#4. Whatever the outcome, the app must
   never block the main thread for seconds: a loading state around generation
   (§12.1 #3) is a safety net worth having regardless of how fast it gets.
   **If 12×12 cannot be made interactive, cap the ladder where it can be and say
   so in the PR** — an honest 10×10 ceiling beats a 12×12 that freezes.
2. **Add `MAX_SIZE = 12`** and reject above it, the same way sizes below 5 are
   rejected today. Right now there is no upper bound at all.
3. **Extend the palette to 12 distinguishable fills per theme**, derived the same
   way §5's was — maximize the worst pairwise CIEDE2000 distance under the
   lightness band. **Do not eyeball it, and do not stop at ΔE:** check the three
   new hues under colourblind simulation (§12.2), because Okabe–Ito was chosen for
   CVD safety and a hue picked purely to maximize ΔE for normal vision can collide
   under deutan or protan.
4. **Make `getRegionColor` stop wrapping silently.** Repeating a colour across two
   regions must be impossible-by-construction or loud, not quiet.
5. **A legibility pass at 27 px** (§12.3): mistake badge, conflict ring, region
   borders, glyph size. Sizes tuned for 5×5 do not scale down by themselves.
6. **Sizes reachable from the UI**, so the operator can actually play a 12×12 in
   Expo Go.
7. **Tests** — the palette floor extended to 12 entries, `MAX_SIZE` rejection, and
   a generation test at the top size that would catch a regression to
   multi-second cost. Keep it a bound with headroom, not a tight timing assert:
   CI machines vary.

### Behaviors that are easy to get wrong

- **Don't ship a size the app cannot generate promptly.** This is the one
  requirement that outranks "support 12×12".
- **A timing test on CI is a flake factory.** Assert a generous ceiling (or count
  perturbation rounds instead of milliseconds) rather than a tight duration.
- **Re-tune the palette with the same objective, never by hand.** The test floor
  exists precisely so a well-meaning hand-picked swatch can't quietly regress
  separation.
- **ΔE is not colourblind safety.** They are different properties; twelve hues is
  where that gap starts to matter.
- **The board's measured origin.** If this step adds anything above the board (a
  generation spinner, for instance), it must go into the deps of `FungikuBoard`'s
  re-measure effect — currently `[hint, solved, measure]` — or the first tap after
  it appears lands on the wrong cell. `onLayout` does not save you; see the note
  below.
- **Bigger boards mean smaller cells mean fatter fingers.** The existing tap
  threshold (6 px before a tap becomes a stroke) was tuned against ~40 px cells.
  At 27 px it may need revisiting — and that is a device question, not a browser
  one.

### Out of scope for this step

- **No ladder, no scoring** — Step 9. This step decides the ceiling the ladder
  will use; it does not build progression. Research already gathered for that step
  is parked in plan **§13** so it isn't lost.
- **No art swap** — Step 10, gated on artwork rather than code.
- **No hint-strength work.** §12.4 found the forced-move nudge is shallow (it
  averages 1–2 deductions from an empty board at any size), which will be more
  obvious on a 12×12. Real, and worth doing — but strengthening the propagator
  with pigeonhole reasoning is its own change. Note it in the PR; don't smuggle it
  in.

### Visible in Expo Go when this lands

**A playable 12×12** — twelve visibly different region colours, legible marks at
27-pixel cells, and a "New puzzle" tap that either returns quickly or shows an
honest loading state instead of freezing. If the ceiling ends up below 12, the
largest size that *is* playable, with the reason in the PR.

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
4. **Ladder shape** — **top end decided: 12×12** (operator, 2026-07-25; plan
   §12). Still open: **is size a free choice or unlocked by progression?**
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
