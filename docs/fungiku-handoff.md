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

## Next step: **Step 13 — close the epic: merge `epic/fungiku` to `main`**

Branch: **none of your own.** This step's deliverable is a **PR from
`epic/fungiku` to `main`**, plus whatever small fixes the final pass turns up
(those go on `feature/fungiku-close` off `epic/fungiku`, and land on the epic
before it merges).

**Step 12 was the last building step and it has landed.** Every row of §7's step
table is ticked. What is left is the thing the epic branch was created to make
possible: putting a finished game mode on `main` in one reviewable move.

### Do not start by writing code

The two things that gate this step are both operator decisions, and one of them
has been open since Step 3:

1. **The device pass on Step 12.** The sprout and the win wave are animations,
   and §12.7 says plainly what a browser could and could not settle: web ignores
   `useNativeDriver` entirely, so **the browser never exercised the one thing the
   two-view nesting exists to satisfy.** Ask for it explicitly, on a real phone,
   at 5×5 and at 10×10.
2. **The app name** — open question #2 below, and now on every screen. The hub
   still says the Step 3 placeholder **"Puzzle Box"**. Merging to `main` is the
   moment it stops being a placeholder and starts being what the app is called in
   the store, so this is the last cheap chance to change it. It is two constants
   in `SudokuApp/utils/appIdentity.js`, plus `app.json` (`expo.name`,
   `web.name`/`shortName`), the icon, and the listing.

Do not guess at either. **A step that merges an epic on an unanswered brand
question has made the decision by not making it.**

### Scope — ONLY this

1. **Play the whole game through once, end to end**, not just the last thing that
   changed: hub → Fungiku → each of the four difficulties → win one → lose one on
   purpose → spend every assist → quit to the hub mid-board and come back →
   relaunch cold onto a restored board. Then the same for Sudoku, because the
   golden rule was that it kept working and nobody has checked it in eleven steps.
2. **Fix only what that pass breaks.** Anything it merely *reveals* — the open
   questions, the noted-in-passing list — is a follow-up issue against `main`, not
   a reason to hold the merge.
3. **Open the PR to `main`** with the epic's story: what Fungiku is, the eleven
   steps that built it, and — honestly — what is still a guess (the coin rates,
   §14.4; the hint ceiling, §8 #6; colourblind separation since the region strokes
   went, §8 #16).
4. **Retire the developer controls, or decide out loud not to.**
   `SHOW_DEVELOPER_CONTROLS` in `FungikuMenuModal.js` currently ships free play,
   the seed field **and the gift-ten-coins button** to anyone who opens the menu.
   A gift button on `main` is an economy nobody has to play for. Flipping it to
   `false` is a one-line change; leaving it is a choice that has to be argued.

### Read first

- `docs/fungiku-plan.md` §7 (the whole table is now history), §14.4 (what is
  still a guess), and **§12.7** (what Step 12 actually did, and why the browser
  could not judge it).
- `SudokuApp/utils/appIdentity.js` and `app.json` — the two halves of the name.
- `SudokuApp/games/fungiku/FungikuMenuModal.js` — `SHOW_DEVELOPER_CONTROLS`.
- The "Noted in passing" list below. It is the follow-up backlog; **turn it into
  issues rather than carrying it into `main`'s handoff.**

### Behaviors that are easy to get wrong

- **A merge to `main` is not a step you can un-ship.** Every other step landed on
  the epic, where a mistake cost one revert. This one puts Fungiku in front of
  whoever installs the app.
- **`main` has moved.** Steps 0 and 1 merged there directly and nothing since;
  check whether anything else has landed and merge `main` into the epic *first*,
  so the PR to `main` is a clean fast-forward-able diff rather than a conflict
  resolved under review.
- **The epic is 12 steps of commits.** Do not squash it into one — the commit
  messages are the only record of why several decisions went the way they did.
- **Sudoku still hydrates its own theme** (see the note below). That is a known,
  deliberate half-fix, not something the final pass should "discover" and fix in
  the merge PR.

### Out of scope for this step

- **No new features, and no economy tuning.** The rates are guesses awaiting a
  play session (§14.4); tuning them is its own change driven by the operator's
  numbers.
- **No store, no IAP** — unchanged since Step 11.
- **No board rating / propagator work** (§14.1, §12.1).
- **No palette re-tuning** (§12.2) and **no re-litigating the tile look** (§12.5).

### Visible in Expo Go when this lands

**Nothing changes, and that is the point** — the app the operator has been
testing off the epic branch becomes the app on `main`.

### How to verify

`npm test` · `npx expo-doctor` (18/18) · `npx expo export --platform all`, then
drive the web build (serve `dist/`, Chromium at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome` — **note the versioned
path**, `/opt/pw-browsers/chromium` is a file, not the binary; do not run
`playwright install`; `npm install` first, the container starts with no
`node_modules`). Then the full manual pass above, **and the operator's device
pass**, which is the one that actually gates the merge.

---

## Previous step: **Step 12 — the art swap** ✅

Landed as **motion, not artwork**. The operator's answer to the step's opening
question was route 1 with a rider: *"We don't have any art work at this point so
we will stick with what we have but anyway to add some fun animations for when
they appear?"* — so the glyph stayed and the step spent itself on the seam and on
two animations. Plan §12.7 has the whole account. The brief that produced it is
kept below for one step, then can go.

<details>
<summary>The original Step 12 brief</summary>

Branch: **`feature/fungiku-art`** off `epic/fungiku`.
Plan: **§7** (the step table's last row) and **§5**, "What is reused vs. new".
Also read `SudokuApp/utils/symbolSets.js` and `SudokuApp/components/Symbol.js`
end to end — **Step 1 built the seam this step is here to use**, and the whole
point is that swapping the art should not need any other file to change.

**This is the last step of the epic.** When it lands, `epic/fungiku` merges to
`main` — so the step's definition of done includes checking the whole game over
once, not just the thing it changed.

### The one thing to settle before writing any code

**§7 has always called this step "floating, gated on artwork rather than code."**
There is no artwork in the repo. So the first act of this step is to ask the
operator which of these they want, and *say in the PR which was chosen*:

1. **Ship the seam only** — confirm a drawn/vector mushroom can be dropped in,
   land whatever placeholder improves on the icon glyph, and close the epic. The
   art arrives later as an asset-only change.
2. **Draw it in code** — an SVG/vector mushroom built here, no external asset.
   `react-native-svg` is already a dependency (check `package.json` before
   promising it). **Checked, 2026-07-29: it is not.** Route 2 would have meant
   adding a dependency, which is worth knowing if the art question ever reopens.
3. **Wait for a supplied asset** — in which case this step is a no-op and the
   epic merges without it.

Do not guess. A step that invents artwork the operator did not ask for is worse
than a step that ships the seam and says so.

### Scope — ONLY this

1. **The mushroom, the X, and the region fills all come from `symbolSets.js`
   already.** Whatever lands must go through `Symbol.js` — no component may reach
   past it for a glyph.
2. **Contrast survives the swap.** `utils/symbolSets.js` has a **tested contrast
   floor** against every one of the ten region fills, and `conflictInk` is
   contrast-checked the same way. Art that is a fixed-colour image cannot satisfy
   a per-fill contrast rule, so either it stays tintable or the test has to be
   confronted honestly rather than relaxed.
3. **Legibility at 32-pixel cells** (§12.3) — a 10×10 board on a phone draws cells
   that small. Whatever replaces the glyph has to read there, not just at 60px.

### Read first

- `SudokuApp/components/Symbol.js` and `SudokuApp/utils/symbolSets.js` — the seam
  and the palette. §12.2 explains **why the palette's objective is colourblind
  separation and not ΔE**; do not touch the tuning while changing the art.
- `SudokuApp/utils/__tests__/symbolSets.test.js` — the contrast floor that any new
  ink has to clear.
- `SudokuApp/games/fungiku/FungikuBoard.js` — where a cell is drawn, including
  `tightCells` (constants that step down below 40px) and the placement pop, which
  is one `Animated.Value` **per cell** for a reason.
- Plan §12.3 for the legibility work already done at 32px.

### Behaviors that are easy to get wrong

- **Never mix `setValue()` with `useNativeDriver: true`** — plan §2 has the rule
  and two device bugs that came from breaking it. The placement pop is JS-driven
  on purpose.
- **Anything new above the board joins `FungikuBoard`'s re-measure deps**
  (`[hint, solved, generating, lives.left, measure]`), or the first tap after it
  appears lands on the wrong cell. The art swap should not add anything above the
  board at all — if it does, that is the dependency to update.
- **The region-boundary stroke stays.** It was removed once and put straight back
  at the operator's call, for colourblind players (§12.5). Do not remove it as a
  simplification; that experiment has been run.
- **Native rendering bugs do not reproduce on web.** Both device bugs the operator
  has found were invisible in the browser (plan §2). A passing browser check
  proves nothing broke; it cannot prove the art looks right on a phone.

### Out of scope for this step

- **No store, no IAP.** Settled in Step 11 and unchanged: purchases are
  `grant()` and neither `react-native-iap` nor RevenueCat runs in Expo Go.
- **No economy tuning here.** The Step 11 rates are guesses awaiting a play
  session (§14.4); retuning them is its own change, driven by the operator's
  numbers rather than by a step that happens to be open.
- **No board rating / propagator work** (§14.1, §12.1); difficulty stays
  size-only.
- **No palette re-tuning** (§12.2). Changing the glyph is not a reason to move the
  fills.

### Visible in Expo Go when this lands

**The board stops looking like an icon font.** Whatever is agreed above is on the
board at every size, and the app is ready for `epic/fungiku` to merge to `main`.

### How to verify

`npm test` · `npx expo-doctor` (18/18) · `npx expo export --platform all`, then
drive the web build (serve `dist/`, Chromium at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome` — **note the versioned
path**, `/opt/pw-browsers/chromium` is a file, not the binary; do not run
`playwright install`; `npm install` first, the container starts with no
`node_modules`). Screenshot **5×5 and 10×10 in both themes** — the small board is
where legibility is decided. Then **ask the operator for a device pass**, and ask
explicitly whether the epic is ready to merge to `main`.

</details>

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
   note below. **Step 11 priced it rather than capping it**: a reveal costs 4
   coins against a nudge's 2 and a rule-out's 1, so the strongest rung is the one
   you can least afford. Whether that is enough, or whether it wants capping
   outright, is still open and is a play-session question.
7. ~~**Should "Show mistakes" default on for younger players?**~~ — **answered
   by deletion, 2026-07-26** (plan §14.3). Correctness feedback stops being
   optional: a wrong guess is flagged immediately and costs a life, so the toggle
   goes away in Step 10 — **shipped**: the toggle, `TOGGLE_MISTAKES` and
   `showMistakes` are deleted and the v2→v3 migration drops the saved field. The
   trial-and-error worry that made it opt-in is answered by making guesses
   expensive rather than by hiding the answer.
8. **Should metering Rule out survive contact with a child?** (plan §14.4)
   **Shipped metered in Step 11** — and still open, because it is a play question
   and no browser can answer it. Rule-out saves tedium rather than insight, so
   metering it charges a younger player for finger work. It is priced cheapest
   (1 coin against a hint's 2) for exactly that reason; if it still grates, making
   it free is deleting one `spendCoins` call in `FungikuContext.js`, and the
   economy survives it because hints are what actually price help.
9. ~~**Does a rung that spans two sizes read as inconsistent?**~~ — **approved on
   device, 2026-07-26.** Easy hands out 5×5 or 6×6 and Hard 8×8 or 9×9, picked
   from the seed, so two Easy games in a row can be different sizes. The operator
   tested Step 9 in Expo Go and passed it as-is. Pinning each rung to one size is
   still a one-line change to the `share` counts in `games/fungiku/difficulty.js`
   if it starts to grate in play.
10. ~~**Should the difficulty menu open on arrival?**~~ — **approved on device,
    2026-07-26.** It opens when there is nothing to continue (matching Sudoku) and
    never interrupts a restored or in-progress board. Revisit only if it annoys.
11. ~~**Does the double-tap work on a device?**~~ — **approved on device,
    2026-07-28, after two rounds.** The first pass reported tapping as
    "very unpredictable"; the cause was **not** the double-tap window but the 6px
    tap-vs-drag threshold, which turned any wobbly tap into a stroke and broke the
    pairing (see the note above). With that fixed the operator's verdict was
    "working fine". **`DOUBLE_TAP_MS` (320 ms) is still untuned** — it is set
    longer than a platform double-tap on purpose, because a small finger is
    slower. Watch for a mushroom that "won't go in"; no browser can answer it.
12. **Should the red ✕ left by a wrong guess be erasable?** It ships as an ordinary
    ✕ (plan §14.3 says so explicitly), consistent with rule-out and hint marks, so
    a later tap clears it — which also lets a player erase the record of their own
    mistake. Revisit if it reads wrong in play.
13. **Is a full wipe the right price for running out of lives?** — **asked and
    answered once, 2026-07-28: keep it as §14.3 specifies.** Every mark goes, the
    ✕ deductions included, and the operator chose that over keeping them. The
    dialog is what makes it survivable — it says the puzzle is the same one before
    the board clears. Worth re-asking after a child has hit it.
14. **Are the coin rates right?** (plan §14.4, §12.9) **The prices are now the
    operator's** — rule-out 1, **hint 5, reveal 20** (2026-07-29) — but **the
    earning side is still the original guess**, and the two have not been played
    against each other. A win pays 3–8 plus bonuses, so a reveal is two or three
    whole boards' work and a brand-new wallet (10 coins) cannot buy one at all.
    That may be exactly the intent; it is a play question. `DAILY_FLOOR_COINS`
    now derives from the hint price so the floor still buys *something that
    helps*. Start 10 coins; rule-out 1, hint 5, reveal 20; a win pays a base by
    rung (Easy 3 → Expert 8) plus 1 per life still standing and 2 for asking for
    no hints; a daily floor raises the balance *to* 4 if it has fallen below. The
    questions a session answers: does an Easy board pay enough to keep playing,
    does Expert pay enough to be worth it, and does the floor ever feel like the
    only thing keeping you going? color-loop's star thresholds were left the same
    way and are still on its backlog (§13).

15. **Is the daily floor the right shape for a floor?** It is what stops the game
    becoming unwinnable — a player at zero on a hard board always has four coins
    tomorrow. But a child who plays twice in an evening never sees it, and a
    child who plays once a week is topped up to the same four either way. The
    alternatives rejected were a per-win minimum (no help to a player who cannot
    finish the board they are on) and a permanent minimum balance (assists are
    free, with extra steps). Worth re-asking once someone has actually run out.

16. **Does the board still work for a colourblind player?** The tile redesign
    (2026-07-29, plan §12.5) removed the region-boundary stroke, which was the
    **second channel** — the thing that said *the region ends here* when two
    adjacent fills were hard to tell apart. It had been removed once before and
    put back for exactly this reason. Colour is now the only region signal. The
    palette is still tuned for dichromat separation (§12.2) so it may well hold,
    but it has not been checked under simulation *since the strokes went*, and
    `corners` in `utils/symbolSets.js` is still sitting there as a third channel
    if it does not.

### Noted in passing, for a later step

- **Nothing that celebrates may key on `solved`.** It is a *condition* derived
  from `marks` — true on every render where the board happens to be complete,
  including the first render after a remount. Use **`winSeq`** from the context,
  which counts transitions into solved that the provider actually watched, and
  **do nothing while it is 0**. Plan §12.12; this cost three operator-visible bugs
  (the wave replaying on resume, the dialog reopening, and reopening *empty*).
- **The provider renders before hydration, with the default empty board.** So
  `solved` really does go false → true when a save loads. Any "did this just
  become true?" watcher has to be gated on `hydrated` and **adopt** the restored
  value on its first pass instead of treating it as a change. The first version of
  `winSeq` got this wrong and a browser check caught it.
- **An animation that must start from a known place has to be *put* there — third
  instance.** The confetti burst only ever played once per mount because its value
  ended at 1 and was never wound back (the dialog returns `null` while hidden, so
  refs survive). Same family as the `Animated.loop` reset trap (§12.9) and the
  hint ring. Use a zero-duration timing, not `setValue`, when the value is
  native-driven.
- **Arriving on a finished board shows no win dialog**, deliberately (§12.12).
  Re-entering from the hub, relaunching, or returning from the background all
  count as arriving. *New puzzle* and *Difficulty* are always under the board.

- **`aria-hidden` is the portable one.** `accessibilityElementsHidden` is
  iOS-only and **react-native-web does not map `importantForAccessibility` at
  all**, so hiding something from assistive tech with that pair changes nothing
  on the web. RN maps `aria-hidden` to both native equivalents — one prop covers
  iOS, Android and the web. Plan §12.11; a browser check caught the first
  attempt.
- **Anything held at `opacity: 0` to reserve its height is still read aloud.**
  The win dialog mounts its payout early so revealing it cannot resize a centred
  box; that means it also has to be `aria-hidden` until it is actually shown, or
  the result is announced a beat before the player sees it and a live region
  fires against an invisible number.
- **A centred dialog cannot grow.** Low or top-anchored, a block appearing inside
  a dialog pushes one edge; centred, it pushes *both* — the title and the buttons
  move apart at the moment the player is reading them. Reserve the height.
- **Confetti (and anything like it) is deterministic, not random.**
  `confetti.js` hashes the piece index. `Math.random()` would re-roll on every
  render and make each piece jump to a new trajectory mid-flight, and "the pieces
  go in all directions" is only testable if the answer is the same twice.
- **The confetti palette is deliberately not the region palette.** Those ten
  colours are tuned for dichromat separation as fills behind a glyph (§12.2).
  Reusing them for decoration would tie a cosmetic choice to a load-bearing one,
  so retuning the board's legibility would restyle the confetti and vice versa.
- **The payout no longer narrates, and that was an operator call** (§12.11), not
  a simplification anyone should undo. The reasons are still all *named* — that
  was the point of narrating them — they just arrive together, one beat after the
  confetti. `stepIndex`, `step`, `STEP_MS` and `SETTLE_MS` are gone from
  `useCoinAward`.

- **The hint popover lives inside `FungikuBoard`'s card, as a sibling of the
  touch box, and both halves of that are load-bearing** (plan §12.10). Not
  *inside* the touch box, because the board claims every touch at touch-down in
  the capture phase — a child there can never receive a press, so Dismiss and
  Reveal would be dead. Not up in the screen, because it would then need the
  board's measured origin and `measureInWindow` is async: it would arrive a frame
  late, in the wrong place, on the one interaction whose whole value is pointing
  accurately. As a sibling it is in the board's own coordinates — the same space
  `cellFromPoint` uses — and outside the capture path.
- **A popover needs two clamps, not one.** The body is clamped to the board's
  width *and* the tail is clamped within the body. A cell in column 0 pushes the
  body against the edge and the tail then has to travel inside it to keep
  pointing. One clamp without the other is a bubble that points at the wrong
  mushroom, which is worse than not pointing at all. `hintPlacement.js` is pure
  and both clamps are tested over every cell of every size.
- **"Make the wave longer" is not "make the wave slower".** Doubling
  `WAVE_DURATION_MS` alone doubles every individual hop, and a mushroom that
  takes most of a second to go up and down is a wobble, not a hop. What should
  stretch is the *travel across the board*: `SPREAD` up, `BUMP` down, in step
  with the duration. Measured: travel went 300 ms → 917 ms while the hop stayed
  ~480 ms and 17 px. Two tests pin the distinction so the next "longer" cannot be
  implemented as "slower".
- **`querySelectorAll` is pre-order, so `.find()` on `textContent` returns the
  *outermost* match.** Every ancestor of a string "contains" it, so a search for
  the popover's text returned a div near the document root and walking up from
  there found nothing. Take the **last** match. This cost a round of false
  failures in a browser check that was actually passing.

- **`Animated.loop({iterations: n})` resets to the value's *construction* value,
  not to the animation's start.** `resetBeforeIteration` calls `resetAnimation()`,
  which snaps back to `_startingValue`. If your value is constructed at its
  **resting** pose — which every animation in this codebase does, so nothing is
  ever stranded — then `loop` resets it to the rest and animates from rest to
  rest. **No error, no warning, ~75 frames of nothing.** The hint ring hit this
  and simply never appeared. Write repeats out as an `Animated.sequence` with a
  zero-duration timing for the reset (it stops with the sequence; `setValue` does
  not). Plan §12.9.
- **`Easing.out` on a short attention animation is too fast to watch.** An
  ease-out spends nearly all its progress in the first frames: the hint ring
  reached its cell inside 150 ms, so the motion was over before an eye could
  follow it — which was the entire point of the motion. `inOut` is what makes
  travel legible. Measure the frame count above the threshold you care about;
  a screenshot cannot tell you this.
- **A hint's teaching lives in its *message*, not in making the player search.**
  The nudge used to outline the whole row/column/region and say "only one cell
  can hold a mushroom" — words saying *one*, board showing *seven*. It now names
  the cell and still says why. **It is one line of reducer away from being a
  reveal at a quarter of the price**, so there is a test asserting a nudge does
  not place a mushroom. Do not delete it.
- **`DAILY_FLOOR_COINS` is `COIN_COSTS.HINT`, deliberately derived.** The floor's
  whole claim is that the game cannot become unwinnable, and a floor that clears
  the rule-out price but not the hint price does not keep it — a stranded player
  needs to be told something, not to have tedium saved. **Any reprice of hints
  moves the floor with it.** A conscious decision to decouple them is fine; a
  stale constant is not.
- **The earn rates are now the loudest open question.** Prices went to 1 / 5 / 20
  (operator, plan §12.9) and `WIN_BASE` was left at 3–8, so a reveal is two or
  three boards' work and a new wallet cannot afford one. That may be the point.
  It is a play question — §8 #14.

- **Nothing sits between the counter row and the board any more, and the rule
  that produced so many workarounds is gone with it** (plan §12.8). The hint
  banner is a floating overlay and the win banner is a dialog; neither takes
  layout space, so **`hint` and `solved` no longer move the board.**
  `FungikuBoard`'s re-measure effect stays as *insurance* rather than as the fix.
  The constraints it spawned are dead too: **the win dialog may change height**,
  which is why the payout now stacks its reasons instead of replacing them. The
  counter row's width rule (§14.3) is unaffected and still load-bearing — that
  one is about the ScrollView centring its children, not about height.
- **The hint is an overlay and the win is a dialog, and swapping either is a
  mistake.** A hint points at cells the player must *see and tap while it is
  showing*, so it uses `pointerEvents="box-none"` and lets every touch that
  misses the card fall through to the board. A modal there would black out the
  thing the hint is talking about. The win may take the screen because the puzzle
  is over.
- **Three win timings are chained by derivation, not by agreement.**
  `WIN_DIALOG_DELAY_MS` comes from the wave's duration, `AWARD_START_MS` from the
  dialog's, and `useCoinAward` imports the last rather than keeping its own start
  delay. Retuning the wave moves all three. **The failure mode is silent** — a
  dialog that opens early just covers a ripple nobody notices is missing.
- **Measuring the board's position during the win lift reads a ~1px shift, and it
  is not a bug.** The lift is a 1.03 scale on the card that rests at exactly 1.
  Any future check of "did the board move" has to sample outside the 720 ms the
  lift owns, or it will chase the celebration.
- **`Symbol` is keyed on a cell *value*, and Fungiku's cells hold marks.** That
  mismatch is why the board had drifted into naming the `mushroom` icon itself,
  and it is why the ✕ is still drawn by `FungikuBoard` rather than through the
  seam: no symbol set has an entry for a mark, and inventing one would put a
  non-symbol in the value table. Step 12 fixed the mushroom by exporting
  `MUSHROOM_VALUE` and asking for *that* symbol. **If real art ever includes an
  ✕, that is the moment to add a mark table beside the value table** — the fix is
  a second lookup, not a fake value.
- **The win wave is one `Animated.Value` for the whole board, and it is not the
  per-cell rule breaking.** The rule below is about a value that gets
  *re-pointed*; the wave is one value **every cell reads at once**, each through
  its own fixed window, so nothing is ever re-pointed. That is what lets it run on
  the native driver while the sprout — which *is* `setValue`d — stays on the JS
  driver. They are on separate values and, necessarily, **separate
  `Animated.View`s**: once any value in a style has moved to native, a JS-driven
  animation on that same props node throws, so the mushroom is two nested views
  (wave outside, sprout inside) and **that nesting is load-bearing**.
- **`interpolate`'s `easing` is silently dropped by the native driver.**
  `__getNativeConfig` forwards only the ranges and the extrapolation, so an eased
  interpolation animates natively as a straight line — correct in a browser
  (react-native-web ignores `useNativeDriver` and eases in JS), a mechanical
  zigzag on device, and warned about only in a dev build. The win wave's arc is
  therefore **extra keyframes in `celebration.js`**, not a curve. Same family as
  every other native-only bug this epic has hit: the browser cannot see it.
- **`games/fungiku/celebration.js` is pure on purpose.** Jest here is plain node
  with no React Native, so the only way an animation's math gets tested is if it
  lives outside the component. Anything else fiddly enough to get wrong should go
  the same way.
- **Both ends of the wave's progress are the resting pose.** `solved` is a
  condition, not an event, so the celebration has to be cancellable by jumping to
  the nearer end — undo across the win line, redo back, and a relaunch onto a
  finished board all hit it. Checked in the browser: nothing is left mid-hop on
  any of the three.
- **The board is tiles now, not a grid — and `FungikuGridLines.js` is deleted.**
  The operator asked for Meowdoku's look (2026-07-29): rounded tiles with a gap
  between them, no grid lines, no region strokes, no frame. The file is
  recoverable at `389eb46` if the look is ever reversed; plan §12.5 keeps the
  reasoning that produced it. **The one rule that carried over: the gap lives
  *inside* the cell box.** The cell pitch and the board's box are unchanged, so
  `cellFromPoint` knows nothing about it and a finger landing in a gap still
  belongs to the nearest cell. Anything that changes the pitch has to change the
  touch geometry with it — that is the most expensive part of this board to get
  right, and it was left alone on purpose.
- **The gutter is lighter than everything, by construction.** The gaps show the
  *board's own background*, not the page. Letting the page show through was the
  first version and it failed in dark themes: the dark palette's palest fill is a
  dark tint, so those tiles had no edge and floated. A gutter that is always
  lighter gives every tile an edge whatever the theme or fill — the same
  reasoning as the contrast-picked glyph ink, applied between tiles instead of
  inside one. It is a background colour and a corner radius on the board View,
  which change **no layout**; a wrapper or padding would have moved the touch
  origin.
- **The region-boundary stroke is gone, and that is a real loss.** It was the
  second channel for colourblind players and it had already been removed once and
  put back at the operator's call (plan §12.5). Colour is now the only thing
  saying where a region ends. This was the operator's design call, not a
  simplification — but §8 #16 carries the question, and `corners` in
  `utils/symbolSets.js` is still available as a third channel.
- **The board is almost never the width it was offered, and the card is not the
  board.** Two separate remainders both read on device as *"the border is cut off
  on the sides"*: a cell is a whole number of pixels, so 324 at 7×7 is a 322pt
  board (and the counter row was matched to 324); and the only thing outside an
  edge tile was its own half-gap, about a pixel at 10×10, so the outer columns
  looked shaved. **`boardExtent(available, size)` in `geometry.js` works out both**
  and returns `pad` / `cell` / `board` / `outer`. `board` and `outer` are
  different numbers — the board is the tiles' bounding box and the touch geometry,
  the card is what the player reads as the edge, and **the counter row lines up
  with the card**. Plan §12.6.
- **Fungiku's board fills the width; Sudoku's does not.**
  `useBoardSize({ fill: true })` takes what the screen offers (capped);
  `useBoardSize()` still returns Sudoku's fixed 324. The fixed number was leaving
  ~35pt of dead margin on each side of a 393pt phone — the board looked
  compressed next to a header that ran edge to edge, and at 10×10 it cost 7pt of
  cell. **Sudoku is deliberately left on the old rule**: its screen is laid out
  around 324. `FILL_WIDTH` is exported from `FungikuBoard` as a stable object so
  the board and the screen ask the identical question — they line up with each
  other, and they cannot line up with different answers.
- **Everything in Fungiku's column is board-width, and nothing may exceed it.**
  Counter row, hint banner, win banner, the priced buttons, the puzzle/difficulty
  row. The column sits in a ScrollView that centres its children, so anything
  wider widens the content container and pushes every sibling sideways — that is
  the Step 10 bug that left the last column untappable.
- **The win lift pops and comes back; it does not rest scaled.** It used to
  animate to 1 and stay, which left a *solved* board permanently 4% wider than
  its column — it stuck out past the counter row, and once the board filled the
  screen it had nowhere to grow into. The operator's report was *"I think it's
  just when you finish a game"*, and it was: the celebration was a resize.
  **A resting scale of exactly 1 also keeps the board's drawn box equal to its
  measured box**, which is what taps resolve against — and a finished board can
  still be undone. If you ever add another celebration here, it may borrow the
  footprint, not keep it.
- **The card is a parent, never padding on the board.** The board's box is the
  touch geometry and may not carry padding or a border; a parent that does is fine
  because `measureInWindow` reads the board's own position and already accounts
  for it. If you ever need to inset the board, inset its parent.

- **One currency, and the reason is a sentence that could not be written.** The
  first cut of Step 11 had two token kinds, and the win banner read
  **"+2 hints · +1 rule-out — no hints"** — *you earned two hints because you used
  no hints.* That is not a wording bug: **a currency named for what it buys
  collides with every message about spending it.** Coins are named for what they
  are. Prices are rule-out 1, hint 2, reveal 4 — §11.2's ladder, which two
  currencies could never express. `normalizeWallet` converts an old two-balance
  wallet at the price list. **Do not reintroduce a second kind** to make some
  future assist "feel different"; price it in coins.
- **The payout is watched, not reported.** `rewardForWin` returns a `total` *and
  the steps that make it up*, and `useCoinAward` walks them: the balance counts up
  one reason at a time while the banner names each. `useCoinAward` owns only
  `pending` — how much of the win is still hidden — and the screen draws
  `coins - pending`, so a coin spent mid-celebration moves the number correctly
  and there is no display copy to fall out of step with the wallet.
- **The wallet is not in the board's save, and that is the design.**
  `@FungikuWallet` is its own AsyncStorage key with no `_v` and no entry in
  `saveMigration.js`; `FUNGIKU_STORAGE_VERSION` is still **3** because Step 11
  added no field to the board save. `state.hintsUsed` is still per-puzzle and
  still persisted with the board — **both exist on purpose**, because earning is
  computed from the per-puzzle one. If a change here ever seems to want
  `MIGRATIONS[3]`, it has been put in the wrong module.
- **A spend is a check and a decrement that must not be separated.**
  `useFungikuWallet` keeps a `walletRef` as the authority and `setWallet` only to
  reach the screen: the provider asks "can this be paid?" and dispatches the
  action it paid for in the same synchronous turn, so reading the balance out of
  React state would read the value from the render already on screen and let two
  taps in one frame both spend the last coin.
- **`solved` is a condition, not an event, and the payout depends on knowing the
  difference.** It is derived from `marks`, so it is newly true after the winning
  tap, after a redo across the win line, and again on the next launch when a
  finished board is restored. `payOutWin` records *which* board it paid
  (`size:seed`) instead of setting a flag someone would have to remember to
  clear — there is nothing to reset, and no transition that can miss it. The
  browser check proves all three paths pay once.
- **The payout effect is gated on both hydrations.** Paying before the wallet has
  loaded would grant out of a default wallet with an empty paid record, and the
  load that followed would overwrite it — a payout the player watched arrive and
  never received.
- **Rule-outs are not counted per puzzle, deliberately.** The "finished it
  unaided" bonus is measured with `hintsUsed` alone. Counting rule-outs would mean
  adding a field to the per-puzzle save (and a migration), to police something
  that is already priced at the moment it is used — being paid a bonus for not
  spending a coin you had to buy would be charging twice. If a later step wants
  it, that is the trade to reopen.
- **Two things sit above the board and neither may change size.** The coin balance
  went into the **counter row**, which is always mounted and two fixed lines — the
  same slot the hearts and "Generating…" already use. The payout's reasons go into
  the **win banner**, whose `solved` is already one of `FungikuBoard`'s re-measure
  deps, and each reason *replaces* the "6×6 · seed 2" line rather than stacking
  below it. A banner that grew as reasons arrived would move the board mid-
  animation, and `solved` would not fire again to re-measure it. Checked at 320px
  with a 5×5 board: no horizontal overflow, board still centred.
- **A price you cannot pay is drawn differently from "nothing to do here".** The
  price and the border go red; the board's own reasons for a dead button still
  dim. A greyed-out button reads as "not now", and not affording it means "not
  until you earn more" — a different instruction, so it cannot be the same pixel.
  The **balance is not repeated on the buttons**: it is one number in the counter
  row, and the buttons say what they cost.
- **A solved board plus a wallet with no paid record will pay again — correctly.**
  This looked like a conversion bug in the browser checks (an old wallet
  converting to 16 instead of 8) and was the fixture: the test set
  `paidPuzzle: null` while the app was sitting on a finished board, so entering it
  paid that win a second time. `paidPuzzle` is the *only* thing standing between a
  solved board and an unlimited payout. Do not clear it to "reset" anything.
- **`SHOW_DEVELOPER_CONTROLS` now also hides the gift button.** It is the
  purchase seam with the till left out (§14.4) and the only way to top the wallet
  up without solving boards, which is what makes the economy testable by hand.

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
| 10 | Lives & mistakes — tap ✕ / double-tap 🍄 replacing the cycle, wrong mushroom flagged immediately as a red ✕ costing one of three lives and announced on three channels, zero lives leaves the losing board up behind a dialog until the player restarts it, undo never refunds, "Show mistakes" deleted, v2→v3 migration, conflict rendering **removed** | merged to `epic/fungiku` (#79), operator-tested on device |
| 11 | Earned assists — **coins**, one currency, in a wallet under **its own key** (`@FungikuWallet`, no save-version bump); hints and rule-out priced off it (1 / 2 / 4, §11.2's ladder); the "nothing is forced" answer left free; a win **narrated** — the balance counts up one reason at a time — and paid **exactly once per board** across undo/redo/reload; a daily floor so the game cannot become unwinnable; an unaffordable price drawn differently from a disabled button; gift/purchase seam behind `SHOW_DEVELOPER_CONTROLS`; the board redrawn as separated tiles | merged to `epic/fungiku` (#80, `5836b87`) — **device pass not recorded; fold it into Step 13's play-through** |
| 12 | Art swap — **answered with motion, not artwork** (§12.7). The operator kept the glyph, so the step made the seam true (the board asks `Symbol` for `MUSHROOM_VALUE` instead of naming an icon), grew the placement pop into a **sprout** — the mushroom rises into the cell tilted and squashed and stretches upright, four interpolations of the one spring — and added a **win wave**: every mushroom hops in an anti-diagonal ripple, one shared native-driven value, windows in a pure `celebration.js`. **Device pass passed the animations and rejected the banners** (§12.8): both used to push the board down, so the win became a **dialog** and the hint a **floating overlay**, and nothing sits above the board any more. **Third round** (§12.9): the nudge points at **the one forced cell** instead of outlining its whole group, a ring **converges onto that cell** so the eye is taken there, and the operator's prices land — rule-out 1, **hint 5, reveal 20**, with `DAILY_FLOOR_COINS` derived from the hint price so the floor still buys help. **Fourth round** (§12.10): the hint text becomes a **popover on its cell** — placed by a pure `hintPlacement.js`, drawn inside the board's card so it points without measuring — and the win wave **travels three times as far** (300 ms → 917 ms across the board) with each hop unchanged **Fifth round** (§12.11): the win dialog **centred**, its entrance un-sprung, the party-popper replaced by a real **confetti burst**, and the payout's five-beat narration collapsed to **one reveal** — the reasons still named, but all at once **Sixth round** (§12.12): the celebration keys on a **win event** (`winSeq`) rather than on the `solved` condition, so it no longer replays on every remount, and the confetti value is wound back so every win bursts | **awaiting a device pass on the whole win sequence, the popover and the new prices** |

## Steps still to come

| # | Step | Plan |
|---|------|------|
| 13 | **Close the epic** — full play-through, the app name, the developer controls, then `epic/fungiku` → `main`. No new features. | §7 |

**Replanned 2026-07-26.** The old Step 9 was a training ladder with per-level
star thresholds; the operator asked instead for the difficulty menu the
platform's other game already has, so that basic mechanics work the same way
across games. Plan §13 keeps the ladder research for the day it is wanted on top
of difficulty.
