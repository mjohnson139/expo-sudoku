# Cube Scramble — next-step handoff

**If you are a session picking up cube work: this file is your entry point. Read
it first, then do the step described under "Next step" below.**

It always describes **exactly one step — the next one**. It is rewritten at the
end of every step so the following session can start from a one-line prompt.

## The one-line prompt that starts a session

```
Work in mjohnson139/expo-sudoku. Continue the Cube Scramble epic: check out
epic/cube, read docs/cube-handoff.md and do the next step it describes.
```

Nothing else needs to be pasted.

## Before you finish: rewrite this file

**This is part of every step's definition of done.** Before you open your PR,
replace the "Next step" section with a brief for the step *after* yours, at the
same level of detail — scope, the files to read, the behaviors that are easy to
get wrong, what must be visible in Expo Go, and how to verify. Carry the open
questions forward.

---

## Standing context (true for every step)

- **Repo:** `mjohnson139/expo-sudoku`. App code is in **`SudokuApp/`**
  (Expo · React Native · JavaScript).
- **Source of truth:** `docs/cube-plan.md`. Read it end to end before writing
  code — model (§3), notation (§4), renderer (§5), scrambles (§6), storage (§7),
  the step table (§8), open questions (§9), and the edge cases that already bit
  someone (§10).
- **Tracker:** GitHub issue **#82**. Tick your step's checkboxes as you go.
- **Process:** `.github/dev-process.md` — one delivery step per branch, commit
  after each step, **prompt the operator to test after each step.**

### Branching

The cube lands on an epic branch, never straight to `main`:

```
main ─── epic/cube ─── feature/cube-<step>   (PRs target epic/cube)
```

Branch from **`epic/cube`**, and open your PR **against `epic/cube`**. The epic
merges to `main` once the cube is worth shipping, so `main` never carries a
half-built tool.

`epic/cube` carries Steps 1 through 6, and **Step 7 is in PR #92** as of
2026-08-04 — check whether it has merged before you branch, because everything
after it is built on the layout it changed. It is cut from `main`
and tracks it. (It was briefly cut from
`epic/fungiku`, because the hub only existed there; Fungiku's Step 13 merged that
epic to `main` on 2026-08-01 and this was rebased the same day. **No Fungiku
dependency remains** — if you find a doc that says otherwise, it is stale.)

Pushing `epic/cube` publishes an EAS Update branch of the same name, so the epic
is always openable in Expo Go (project → Branches) even with no step PR open.

### Golden rules

- **The cube's code lives under `games/cube/`.** Sudoku and Fungiku keep working
  exactly as they do. Outside that directory Step 1 touched three things — a
  registry entry, `describeCubeProgress` in `utils/gameProgress.js`, and adding
  `react-native-svg` — Step 2 touched only `utils/buildNotes.js`, because plan
  §12 says to, Step 4 touched those same two (the hub badge counts solves now),
  and Step 6 touched only the build notes. A step that needs to touch anything
  else should say why in its PR. **Step 7 is the only one that has had to**, and
  it is the pattern for the next time: the header it needed to shrink is
  `components/ScreenHeader.js`, shared with Fungiku, so it added a `dense` prop
  and an `actions` prop **whose absence is exactly today's header** — no existing
  caller changed a pixel, and Fungiku was opened to prove it.
- **The model owns the rules.** Import `solvedCube` / `applyMove` / `applyMoves`
  / `cubeFromAlg` / `facelets` / `isSolved` from `games/cube/cubeState.js`, and
  `parseAlg` / `parseMove` / `scanAlg` / `tokenize` / `algError` / `moveCount`
  from `games/cube/moves.js`. If you find yourself writing a facelet permutation
  table anywhere, that is a bug. Playing an algorithm back is
  `games/cube/player.js` and `useScramblePlayer` — a solve is a list of moves
  like any other, and Step 3 drove the solve through the same transport rather
  than writing a second one. Keep it that way.
- **Never redisplay a canonical token.** `parseMove` normalizes `r` to `Rw`,
  which is right for the model and wrong for the operator (plan §4). Anything
  shown on screen comes from `tokenize`/`player.tokens`, never from
  `move.token`.
- **Anything pure goes in a module the node test runner can import.** No React
  Native imports in the parts worth testing — that is why `readCubeSave` lives in
  `favorites.js` and not in `storage.js`, and why the whole solves list lives in
  `solveList.js`. **`solve.js` is one page and `solveList.js` is the book**: the
  first is the text of a single solve and every way of editing it, the second is
  the list, the save shape, the phases and the sanitizing.
- **The save file's shape is settled and should not be reopened.** Plan §7.2 has
  it in full. Every field in it is now written and read by something; Step 6 was
  the last one to fill an empty slot.
- **One rule, one function.** Every edit to a solve's moves goes through
  `withMoves`, which is also what keeps the markers honest — and the clamping it
  does is literally the same `clampPhases` that `sanitizeSolves` runs on the way
  out of the file. Two implementations of one rule is how "it survived the reload
  but not the undo" gets shipped.
- **Stay in scope.** Note what you spot for a later step rather than fixing it
  now, and say so in your PR.

### Every step must be visible in Expo Go

Hard requirement, same as Fungiku's. A step whose only evidence is a passing test
suite is not done.

### Verify before handoff (from `SudokuApp/`)

```bash
npm test                          # Jest — keep it green and extend it
npx expo-doctor                   # expect 18/18
npx expo export --platform all    # web + iOS + Android must all bundle
```

`expo-doctor`'s "Expo config schema" and "React Native Directory" checks both
fetch over the network, and both fail with a DNS error in a sandbox that has
none. 16/18 with exactly those two failing is not a regression — say which two,
rather than reporting the number on its own. (Step 3's environment *did* have
network and got 18/18, so do not treat 16 as the expected number either; report
what you got and which checks failed.)

**The repo does not ship `node_modules`.** Run `npm install` in `SudokuApp/`
first — `npm test` fails with `jest: not found` otherwise, and `npx jest` picks
up an unrelated jest that cannot read this project's babel config.

For anything visual, the web export can be driven headlessly — serve the export
directory and drive it with the pre-installed Chromium (the binary is at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`). Step 1 used that to check
three viewport sizes for overflow before handing over; it caught a real layout
bug that a single screenshot did not. **Step 2 found one a headless check could
not:** the turn animation was geometrically wrong in the middle of every move,
and no assertion about the ends could see it — the screenshot did. Look at what
you built, at every stage of the motion, not only at rest.

---

## Next step: **Step 8 — the designed solve screen**

> ### Before you branch: check that `epic/cube` has Step 7
>
> Step 7 (the layout work) landed on `epic/cube` via **PR #92**. This step is
> built on top of it and will conflict badly with the pre-Step-7 screen — the pad,
> the scrubber and the header all moved. Run `git log --oneline -3 origin/epic/cube`
> and look for *"Cube Scramble Step 7: give the page back to the cube"*. If it is
> not there, **stop and say so** rather than branching: either #92 needs merging
> first, or you want to branch from `feature/cube-layout` instead and say why in
> your PR.
>
> Then, as always: branch from **`epic/cube`**, PR **against `epic/cube`**.

A settled design bundle for the solve screen, made in Claude Design. **Plan §8.8
is the brief** — read it before anything else, because it is where the design's
decisions are reconciled against this epic's, and four of them need reconciling.

### Where the design lives, and how to read it

Project **`2acc14f2-7f7e-434f-a29d-e0fe29fa876a`** — the whole project is
readable, and the `DesignSync` MCP reads it with `get_file`. That needs a design
authorization (`/design-login`); if the tool is not available, say so rather than
guessing at the spec from §8.8's summary.

```
Cube Solve Screen.dc.html                          ← the spec
design_handoff_cube_move_pad/README.md             ← READ THIS FIRST
design-decisions.md                                ← platform decisions, "Cube move pad"
Cube Solve Screen - prime options.dc.html          ← the rejected options
support.js                                         ← the design-doc runtime; nothing to port
```

`README.md` in the handoff folder is the real document: every measurement,
colour, timing and interaction, written as a handoff. The `.dc.html` is what it
describes, and its `renderVals()` has the exact grid, tints and glyph paths.

**The mock is a browser prototype, not code to copy.** It shares nothing with the
app; its cube is a flat CSS isometric fake standing in for the real renderer.
Rebuild it in React Native against the app's theme and `StyleSheet`s, in the
shape `CubeMovePad.js` / `CubeScrubber.js` / `CubePhaseStrip.js` already have.

### Scope — ONLY this

1. **Prime becomes a press-and-hold.** Tap fires on **touch-up** and appends
   `R`; hold past **180ms** appends `R'`. A 3pt hairline fills across the key's
   foot from 0ms; at the threshold the key fills accent, a 2pt ring appears, a
   `'` shows top-right, and a light haptic fires. Sliding off the key cancels.
   The armed `'` modifier key goes.
2. **A second tap on the same key promotes the token already written** to a half
   turn — one `R2`, never `R R`. A third tap starts a fresh `R`. `2` comes off
   the pad with `'`.
3. **The pad becomes the spatial cross**, 6 × 3 at 44pt rows and 5pt gaps, with
   `E` and `S` joining the slices and **column 3 row 1 genuinely empty**. Four
   tints: neutral faces, cool slices, green wides, sand rotations; tools
   outlined; the flag the only accent fill. A legend names the four groups.
4. **The scrubber gains a phase-split tick track** — one tick per move, grouped
   by phase with the group `flex`ed to its move count, the current move the only
   full-height tick — and the five transport glyphs are redrawn as one family at
   stroke 1.9 in a 24pt box, play the only filled glyph and only circle.

### Read first

- **`docs/cube-plan.md` §8.8** — the brief, and the four places the design and
  this plan disagree. Then §8.6 (the budget rule you are spending against), §8.5
  (what a phase is), §9.8 (the question this answers), §10.
- The design bundle's `README.md`, then the `.dc.html`'s `renderVals()`.
- `games/cube/CubeMovePad.js` — the pad being replaced, and `solve.js`'s
  `PAD_KEYS` / `MODIFIERS` / `nextModifier` / `padToken`, which are the armed
  modifier's model and mostly go with it.
- `games/cube/CubeScrubber.js`, `CubePhaseStrip.js` — what the tick track sits
  next to, and the strip's argument for why a bounded scroller is allowed.
- `games/cube/CubeMoveTrack.js` — **the token styling lands here**, not in a new
  card. `trackLayout.js` owns its geometry.
- `games/cube/solveList.js` — `phaseSpans` already produces exactly the
  `{ at, label, count }` the tick track needs to group by.

### Behaviors that are easy to get wrong

- **Fire on touch-up, not touch-down.** Firing on down makes every prime a
  double entry. This is the single most important line in the interaction table.
- **The fill starts at 0ms.** Without it, hold-for-prime is a hidden gesture and
  strictly worse than the two taps it replaces. §9.8's note on why the armed pad
  relabelled itself is the same argument.
- **`R2'` is `R2`.** A hold on the promoting tap is a plain promotion, not an
  error.
- **Backspace removes a token whole** — `R2` goes to nothing in one press, not to
  `R`. Long-press repeats at 120ms.
- **Undo is still two things that cannot happen at once** (plan §5). `retract`
  owes the caller a removal and every exit from the backwards turn pays it. The
  promotion rule now writes to the *last token* as well, so make sure a promotion
  landing inside a retract's 260ms cannot resurrect a move that was deleted —
  that is the same race Step 3 shipped twice.
- **Say what it costs the cube, in points.** The new chrome is about +95pt
  against Step 7's budget (§8.6): scrubber card 42 → 86, pad 126 → 142, legend
  +34. At 375×667 that takes the cube 293 → roughly 200. That may be the right
  trade — but it is a trade, it goes in the PR with the before/after table, and
  if one row has to give, §8.8 argues it is the legend.
- **Do not bring back the growing solve card.** The design draws every token
  wrapped in an auto-height card; that is the card Step 7 removed, and at 42
  moves it had left the cube four points. Keep the fixed track and its drawer,
  take the design's token styling.
- **Themes.** The design is light-mode hexes. Map onto `theme.colors` where a
  token exists; where one does not, add it to the cube's own palette rather than
  hardcoding `#ffffff` into a screen with a dark theme.
- **The keyboard key is not the design's keyboard key.** Today it opens the text
  field for a whole algorithm. The design calls it a toggle that collapses the
  pad. Do not lose the text field.

### Out of scope for this step

**The CFOP switch.** The method chip may ship as a *label* for the method in use;
the bundle's "rewrites the pad's slice/wide complement and the phase grouping" is
a feature this epic has not planned. Also out: editing a solve (Step 9 — though
the design has now decided *where* its `Edit` affordance goes, on the solve
card's caption row), entering a cube by colour, a solver, colour neutrality, a
timer, a chrome-free mode (open question 14). Note what you spot; do not start it.

### Visible in Expo Go when this lands

Write a Roux solve on the new pad without ever arming a modifier: tap `R`, hold
`U` until it fills and get `U'`, tap `M` twice and get one `M2`. The tick track
under the cube shows the three blocks with the current move standing full height
in its own.

### How to verify

- `npm test` — the promotion rule and the hold threshold are pure and belong in
  `solve.js`'s tests next to `appendToken`. Pin: tap-tap is one `R2` and not two
  tokens; a third tap is a fresh `R`; a hold on a promoting tap is still `R2`;
  backspace takes `R2` to nothing in one.
- `npx expo-doctor` and `npx expo export --platform all`.
- **Drive it and look at the screenshots**, at 320×568, 375×667 and 393×852.
  Step 7's three drivers are in that session's scratchpad and are described in
  its entry below — `budget.js` is the one to re-run first, because it prints the
  row-by-row height table this step has to justify. Seed the save file into
  `localStorage` under `@CubeScramble` (plan §7.2 has the shape); it is far
  faster than tapping a 42-move solve in.
- **A hold is a timed gesture, so drive it as one**: `mouse.down()`, wait past
  180ms, `mouse.up()` for the prime, and a second run under the threshold for the
  plain turn. Assert on the token the solve ends up with, not on the key's style.
- **Then look at it on a device.** Step 7 shipped a header that passed every
  browser check at three widths and was broken on a phone, because web and Yoga
  disagreed about a flattened style — see that entry. A hold gesture with a
  haptic is even less like itself in a browser.

---

## Open questions for the operator (carry these forward)

These are plan §9, restated so a session does not have to go looking. None block
Step 8 — 8 is *answered by* it. Number 14 is the live one: Step 7 shipped, and
whether it went far enough is a question only the operator can answer, and Step 8
spends about 95 points of what Step 7 won back.

1. Scramble length — 20 moves. Leave it?
2. Other puzzles — 2×2, 4×4, pyraminx, skewb?
3. A timer — in this epic, or a separate feature?
4. Colour scheme — a setting, or is the standard one enough?
5. ~~Where a solve comes from.~~ **Answered, and it replanned the epic**
   (operator, 2026-08-01): solves are **written by the operator**, not computed.
   See plan §8.1.
6. Drag direction — currently "push the surface under your finger".
7. ~~Turn speed.~~ **Answered** (operator, 2026-08-01): a speed control, and it
   is in — a chip cycling 1× → 2× → 0.5×, scaling the beat between moves as well
   as the turns, and applying to single steps as much as to playback. **Step 4
   settled that it stays transient**, along with the view angle and the scrub
   position: plan §7.1's rule is that everything authored is kept and everything
   about how you are currently looking at it is not, and a speed is the second
   kind. Say so if that turns out to be wrong in use — the file has room.
8. ~~**How a move gets entered.**~~ **Answered by a design round** (2026-08-04)
    and it is **Step 8** — the brief above. Press and hold for prime, second tap
    on the same key for a half turn. This was the epic's longest-running
    question, open since Step 3 shipped the armed `'`/`2` modifier, and the three
    alternatives it listed are all decided in the design bundle's rejected
    column. Plan §9.8 has the reasoning, including the one that killed the
    per-key prime strip: at six columns it leaves 35.6pt for the letter, under a
    thumb's contact patch, and a mis-hit there turns the cube **the wrong way**
    rather than doing nothing.
9. **Colour neutrality** — raised and deferred by the operator on 2026-08-01
   ("we're not gonna get into that right now"). Solves assume you pick a top and
   a left colour and hold it that way. **It now has a concrete cost attached**:
   eight of the 24 holds are unreachable until the camera gains a roll axis
   (plan §8.3), and those eight are exactly the ones a colour-neutral solver
   would want.
10. ~~**Whether a solve is worth keeping.**~~ **Answered by use** (operator,
    2026-08-02): yes, and losing one to a backgrounded app is the thing that
    made it obvious. Plan §7.1 has the rule this settled — everything authored
    is kept, everything about how you are currently looking at it is not.
11. ~~**How move groups get annotated**~~ — **specified by the operator and
    shipped in Step 6** (2026-08-02): *"these moves solve first block, this set
    solves second block."* Plan §8.5 has the four decisions and what building
    them taught. What is genuinely still open is smaller and wants use rather
    than an opinion: **are Roux and CFOP the right eight names**, and is the flag
    on the pad where a thumb expects it mid-solve?
12. **What a solve is worth naming** — new, and only the operator can answer it.
    Step 4 defaults a solve to `Solve 1`, `Solve 2` counting within the
    scramble, and offers a rename. Whether the useful default is instead the
    hold (`yellow up`), the date, or the first block's move count is a question
    that wants one real drilling session, not an opinion. **Step 6 gives it a
    concrete candidate**: `First block · 8` is now known, and it is the number
    the operator said they were trying to improve.
13. **Whether the counts are worth comparing across solves** — new with Step 6,
    and the obvious next thing to want. The screen shows one solve's phases at a
    time; "my first block over five attempts at this scramble" is a different
    view and not one anything asks for yet. It is a step, not a tweak, so it
    should wait for the operator to say they want it. **Step 7 changes what it
    would cost**: a comparison is another row, and rows are now on a budget.
14. **Did Step 7 go far enough, and does the cube want a mode with no chrome at
    all?** Raised by the operator on 2026-08-03 (*"how much space all the chrome
    is taking"*) and half-answered by shipping: the cube went from a third of the
    page to a bit over half in solve mode, and is now limited by the width of the
    phone in scramble mode and inspection. What is left is the pad, the transport
    and the moves, all of which are needed *while writing*. But **inspection is
    already the proof that dropping the lot works** — Step 5 gives the cube most
    of the page by taking the pad and the transport away, and the operator liked
    it. A tap on the cube that hides everything but the cube would extend that to
    reading a solve back. Step 7 deliberately did not build it: cutting chrome
    beats adding a way to hide it. **This one wants a drilling session on the new
    layout, not an opinion.**

### Noted in passing, for a later step

- **Build notes are kept per release, not per step** (plan §12). Fungiku's Step 13
  wrote `3.0.0`; the cube epic is `3.1.0`. **Extend that entry** as later steps
  land rather than adding a version for each, and keep `app.json`'s
  `expo.version` matching the newest key.
- `CubeView` takes a `colors` prop already, so a colour-scheme setting is a
  screen-level change, not a renderer one.
- **The animation has only been seen on web.** `docs/fungiku-plan.md` §2 is the
  standing warning: both animation bugs this repo has shipped were invisible in
  the browser. This one uses no native driver and no `setValue`, which is the
  class of problem avoided rather than dodged, but a device pass is still the
  only evidence that counts for how it *feels*.
- ~~**`useScramblePlayer` assumes a solved starting cube.**~~ **Done in Step 3**:
  `buildPlayback(alg, { from })` and `useScramblePlayer(alg, from)`.
- **The text field appends; it cannot edit.** **Step 9** now — plan §8.7 keeps
  the brief. It has been pushed twice, and both times it gained something: Step 7
  gave it a page to sit on, and Step 8's design bundle **decided where its
  affordance goes** — an `Edit` link on the solve card's caption row. The
  remaining work is the marker arithmetic, which is where the difficulty always
  was.
- **Solve mode still has no "Favorites" button.** It is on the header in scramble
  mode now, where the other three slots in solve mode are already spoken for, so
  getting to the list from a solve is still Scramble first. Nobody has complained
  because nobody has used it yet.
- **The solves list is only reachable from solve mode.** The way in is the bar
  under the pad, so from the scramble it is two taps: Solve, then the bar. Solve
  resumes the page you were last on rather than making a new one, so that is
  always a real page and never a surprise — but there is no count of solves
  visible in scramble mode at all, and "how many attempts have I written at
  this?" is a question the hub badge now answers and the screen does not.
- **`readCubeSave` lives in `favorites.js` and now reads four things**, only one
  of which is favorites. It was left there because it is where every caller
  already looks and moving it is churn across `storage.js` and the tests, but
  the file is misnamed for what it holds. A step with reason to touch both could
  reasonably split a `cubeSave.js` out of it.
- **A solve is culled by age, not by use.** `MAX_SOLVES` is 100 across the whole
  file, newest-created first, oldest dropped — and `savedAt` is creation time
  and is never bumped, so editing a very old solve does not protect it. At 100
  that is unreachable in practice; it would stop being unreachable if the cap
  ever came down.
- **`'` and `2` are the only modifiers on the pad**, so a solve cannot be entered
  with a curly apostrophe from the pad — but one *pasted* into the text field is
  kept as typed, and will read back as `R’` next to the pad's `R'`. Honest
  (plan §4 says keep what was entered) and slightly inconsistent; if it grates,
  normalize the apostrophe in `appendAlg`, not in the parser.
- **The scrubber row is full.** Five buttons, `n / 20` and the speed chip come to
  about 284 points, and the narrowest phone this app supports has 300. It wraps
  rather than overflows, but a sixth control wants a rethink rather than another
  chip.
- ~~**And so is the page.**~~ **Step 7 fixed the page and the rule behind it.**
  Steps 3–6 each recorded the squeeze honestly — 138 points at 320×568, the phase
  strip costing 24 more, the pad's bottom row having no seventh slot — and each
  responded by shrinking *itself*. The accounting was right and the conclusion was
  backwards: **the cube was the only element with no floor**, so it absorbed every
  row anyone added, all the way down to four points. Plan §8.6 inverts it and the
  cube is now width-bound in five of the nine measured cases. **Keep the
  point-counting habit** — say what a new row costs the cube, in the PR. It is
  what made this legible in the end.
- ~~**The pad still has no seventh slot.**~~ **Step 8 rebuilds the pad**, and the
  constraint that produced this note goes with it: `'` and `2` stop being keys
  (prime is a hold, a half turn is a second tap), `E` and `S` become keys, and the
  grid becomes a 6 × 3 spatial cross with one deliberately empty cell. Clear comes
  off the pad entirely. Plan §8.8. What does not change: **every key on it is a
  thumb target**, 55.6 × 44pt, and that is still the one thing this screen will
  not buy space from.
- **The design bundle is read with the `DesignSync` MCP**, project
  `2acc14f2-7f7e-434f-a29d-e0fe29fa876a`, and it needs a design authorization
  (`/design-login`). `design_handoff_cube_move_pad/README.md` is the document
  worth reading in full; `support.js` is the design-doc runtime and has nothing
  in it to port.
- **The header's right-hand end is three icons at 320 points, and that is full.**
  Solve mode uses all three (back · start view/re-orient · turn around); scramble
  mode uses three as well (reset view · turn around · favorites). A fourth wants a
  rethink, not a squeeze.
- **The drawer is a tap or a drag, and the drag is deliberately forgiving** —
  24 points either way, and anything shorter counts as a tap, because a
  16-point grab bar is a big ask of a thumb that only wants to toggle something.
- **A phase divider directly above the move track's window still paints a
  hairline of red on the top edge.** The glyph is clipped to its line and sized
  down; roughly two points of it survive on web. Cosmetic, and only when a marker
  happens to sit on the row just out of view.
- **A marker at exactly the end of a solve is invisible in the strip and visible
  in the modal.** It is the boundary the last "end the phase" opened, it has no
  moves in it yet, and the strip skips a zero-length unnamed span rather than
  showing `In progress · 0`. The modal lists it, with a bin, because it is a real
  boundary and removing it is sometimes what you want. If that ever reads as
  clutter, the strip is the one that is right.
- **The phase counts are per solve and nothing compares them.** Open question 13.
- **Half turns animate clockwise.** `shortWay(2)` is 2, not −2; both land in the
  same place and nothing prefers one. If a solve tutorial ever wants `R2` to go
  the way a particular fingertrick goes, that is the line to change.

---

## Steps already done

### **Step 7 — give the page back to the cube** ✅ *(2026-08-03)*

Shipped: **the cube is the biggest thing on the screen again.** The header is one
line and carries the view controls, the moves are a fixed two-line track that
scrolls itself to wherever the cube is, the action row is gone, and scramble mode
lost a row and a caption. Solve mode on a 42-move annotated solve at 320×568:
**the cube goes from 4 points to 210.**

Four is not a typo, and finding it is the part worth keeping. The docs recorded
114, measured on a shorter solve — but the move card was the row that *grew with
the solve*, so a drill long enough to be worth annotating was the drill that
crushed the cube to nothing. **The tool failed hardest exactly where it was being
used hardest**, and no test, no overflow check and no doctor run had ever said a
word, because a wasteful page is not a failing one.

| Solve mode, 42 moves, annotated | before | after |
|---|---|---|
| 320×568 | **4** | **194** |
| 375×667 | 125 | 293 |
| 393×852 | 318 | 373 (width-bound) |

Scramble mode 166 → 300 at 320×568; inspection 247 → 300, width-bound at every
size. The rule the step establishes is plan §8.6's: **the cube is sized first and
every other row is on a budget justified against it** — it had been the only
element on the page with no floor, which is why six steps of careful,
well-documented self-restraint still added up to a four-point cube.

The moves are also a **drawer**: a grab bar under them opens the panel out over
the cube to show the whole solve, and shuts it again. It was the operator's own
call on the two-line track — *"a drawer with a handle, or a way to view the whole
thing"* — and it opens *over* the stage rather than pushing it, so the cube never
resizes. It costs the closed page the handle's 16 points, which is why the
numbers above are 16 short of the first cut's.

Five things it learned:

- **`flex: 0` is not "size to your content" on the web.** The dense header's end
  columns used it; react-native-web read it as `flex-basis: 0%` with shrink still
  on, so both ends collapsed to their padding and their buttons hung off the
  right edge of the screen. Spell `flexGrow` / `flexShrink` / `flexBasis` out.
  The horizontal-overflow check the drivers have run since Step 1 had never once
  fired before and caught this.
- **A style variant must be a whole style, not an override layered on the base
  one — and this one only broke on the phone.** `[styles.leftSection, dense &&
  styles.leftSectionDense]` flattens to an object carrying both the base
  `flex: 1` and the variant's `flexGrow`/`flexShrink`/`flexBasis`, and **web and
  Yoga disagree about which wins**. Three viewport widths in a browser all
  passed; on a real iPhone the home button was a sliver and the view controls
  were off the right edge, and the operator hit it in the first screenshot they
  took. Pass `dense ? a : b` and there is nothing to disagree about. **`expo
  export --platform all` proves it bundles, not that it lays out** — only a
  device does that.
- **A fixed-height track needs every child to be exactly one line tall.** The
  phase divider is a bar glyph and fills its em where a letter does not, so its
  row came out a couple of points taller than `LINE` — and the auto-scroll is
  computed from `LINE`, so every scroll parked slightly off and left a sliver of
  the previous row along the top edge.
- **Neither of those is visible in anything but a screenshot.** 745 tests green
  and 18/18 from doctor throughout both bugs.
- **Step 6 had been drawing a solve's phase markers across the scramble** — a red
  divider in the middle of something that has no phases and cannot have any. It
  survived because you have to open a scramble with an annotated solve behind it
  to see one, which a seeded save file does by construction. Fixed in passing.

Also worth not rediscovering: **seed `localStorage` rather than tapping a solve
in.** The save shape is plan §7.2 and async-storage on web is plain
`localStorage` under `@CubeScramble`. Getting to a 42-move annotated solve by
hand takes minutes, and it is the case that matters — the worst case was found by
being able to reach it cheaply.

Verified with `npm test` (752 across the app, 7 of them new on the track's
geometry), `npx expo-doctor` (18/18), `npx expo export --platform all`, and three
headless drivers at 320×568, 375×667 and 393×852 with the screenshots read:
`budget.js` seeds the worst case straight into `localStorage` and prints every
row of the page with its height, the cube's size and both overflow flags, before
and after; `walk.js` clicks 39 checks' worth of controls by `aria-label` — the
header's view controls, a token in the track, the transport, inspection and Set
start, the pad, an armed modifier, undo, the flag and the phase strip, and back
out to the scramble — then opens Fungiku to prove the shared header is
untouched; `drawer.js` opens and shuts the drawer and asserts **the cube is the
same size before, during and after**, which is the one thing the drawer must
never touch.

**And then a real phone found what none of that could** — the style-variant bug
above. The browser is where this step's evidence lives, and it is not where the
step's worst bug was. Look at it on a device.

### **Step 7a — the hold stops moving the cube** ✅ *(2026-08-03)*

A follow-on to Step 7, from the operator using it: *"when setting the
orientation, when locking it in, can we remember the exact position of the cube.
It currently repositions."*

Step 5 sent the camera back to the opening angle on **Set start**, on the
grounds that there are 24 holds and infinitely many angles to look at one from,
and inspecting from directly overhead is a bad way to look at a cube you are
about to solve. Sound, and it threw away the good part with the bad: **the angle
you turned the cube to is information** — it is the view you decided you wanted
to solve from, arrived at by hand.

`orientation.viewAfterHold(yaw, pitch)` keeps the picture. Baking the hold is a
rotation `R` on the model, so a camera `C` becomes `C · R⁻¹` to show the same
picture of `R(M)`. The camera is yaw-then-pitch with no roll so that is not
always reachable — **but more than half of every angle a finger can reach comes
back pixel-exact, the camera is never left further from the picture than the old
jump left it, and every ordinary inspection angle tried is exact**, including
turning the cube right over for the yellow-up Roux hold, which is the one the old
behaviour moved furthest. What is lost when it cannot be exact is the *roll* —
the component that would leave the cube at a tilt, which is the one part worth
discarding. Plan §8.3 has the whole argument.

**`Start view` changed with it.** It used to be the plain reset, because the view
you chose and the default view were the same thing. Now it returns to the angle
Set start left the cube at, held in screen state and tagged with the solve it
belongs to — so switching pages cannot send it to another solve's angle — and
falling back to the default after a cold start, because the angle is still not in
the save file (plan §7.1 is unchanged: the hold is authored, the angle is not).

Two things worth not rediscovering:

- **The hold matrix is read off the pair, not parsed back out of the notation.**
  A rotation is fixed by where three orthogonal axes go, so "up's normal goes to
  +y, front's to +z" *is* the rotation, and the third row is `up × front`.
- **`Start view` is not offered while the solve is empty** — the header shows
  Re-orient there instead, which is the right control while the hold can still
  be changed. A driver has to write a move before it can test the button.

Verified with `npm test` (756, 4 of them new: exact at the opening view, exact at
eight real inspection angles, and a sweep proving the new camera is never further
from the picture than the old jump), plus a `hold.js` driver that drags the cube
to four real angles, reads **every polygon the renderer emitted** before and
after Set start, and measures how far the picture moved: three of four are 0.0pt,
the fourth is 35.8pt against a snap that used to be most of a face.

### **Step 6 — annotate the move groups** ✅ *(2026-08-02)*

Shipped: **a solve has structure, and the structure has counts.** Finish your
first block, tap the flag on the pad, tap **First block**, and carry on — the
group is closed and named, the next one opens where you are, and a strip under
the solve reads `First block · 8` `Second block · 12` back at you. Tap one and
the cube jumps to where it starts and plays just that group. Roux and CFOP name
their own phases a tap each; free text is the escape hatch. 743 tests across the
app, 24 of them new.

The shape is plan §8.5's, unchanged: **markers, not ranges**. A phase is
`{ at, label }` — the move index a group starts at — and the spans and their
counts fall out by subtraction. Nothing stores a count, and nothing stores an
end.

Three things this step learned:

- **Closing a group writes two markers.** The name goes onto the boundary the
  group started at; a fresh unnamed boundary opens where it ended. The second
  looks like bookkeeping and is load-bearing: without it the named span runs to
  the end of the solve and `First block · 8` quietly becomes `First block · 12`
  as the second block is written.
- **"What an edit does to a marker" has to be exactly one function.** A marker is
  an index into a list still being written, and undo removes the move it points
  at. `clampPhases` is the answer, and `withMoves` — the funnel every edit to a
  solve's moves now goes through — calls the same one `sanitizeSolves` calls on
  the way out of the file. Two implementations of one rule is a marker that
  survives a reload but not an undo. Dropping is the honest answer rather than
  clamping, and the name stays on the group, which reopens and counts up again.
- **A one-tap control needs a way to take the tap back, and the cheapest one is
  the same control.** Naming a group whose boundary already exists can only mean
  the group behind it, so a second tap on the flag *renames*. The first
  implementation refused instead — nothing new to close — and **a headless
  driver found the dead end within a minute of the bin being added**: remove a
  marker and the group it left behind could never be named again without writing
  another move. The modal now says which of the two it is about to do rather than
  leaving the operator to infer it from where the transport is parked.

Also worth not rediscovering: **the pad's bottom row was the last free slot on
this screen.** It was five controls where the rows above are six, so the flag
cost the page no height at all; there is no seventh. The phase strip does cost
24 points (the cube goes 138 → 114 at 320×568), and only when a solve has
markers on it.

Verified with `npm test` (743 across the app), `npx expo-doctor` (18/18), `npx
expo export --platform all`, and two headless drivers run at 320×568, 375×667
and 420×860 with the screenshots read: `phases.js` writes eight moves, marks
First block, writes four more and marks Second block, checks the first block's
count does *not* grow while the second is written, plays one group and asserts it
jumps to the start and stops at the end, then undoes back across a boundary and
through it, and reloads the page — a cold start — to prove the markers come
back and nothing replays; `tidy.js` walks the disabled flag on an empty solve, a
free-text name, the rename-by-naming-again, the bin, duplicate carrying its
phases, and clear taking them away. No overflow and no console errors at any
size.

### **Step 4 — the workspace survives** ✅ *(2026-08-02)*

Shipped: **nothing the operator writes is lost, and there can be more than one
of it.** Solves are persisted against the scramble they were written for, with
names, new / duplicate / rename / delete, and a picker to switch between them.
Background the app, come back, and you land on the same solve, the same hold and
the same mode — with nothing replayed at you. 719 tests across the app, 50 of
them new.

The save file's shape is settled in one place and written down in **plan §7.2**:
`{ _v: 2, scramble, favorites, solves, workspace }`, with `phases` sitting empty
in every solve because Step 6 is going to want it and reshaping the file twice
is two migrations. Neither direction of version skew needs one: a Step 5 file has
no `solves` key and reads as no solves, which is the truth.

Four things this step learned:

- **An effect keyed on `scramble` fires during hydration, and hydration is not a
  change of mind.** The screen mounts with an *empty* scramble and fills it from
  storage, so the Step 3 effect that cleared the solve whenever the scramble
  changed would have wiped the workspace it had just restored. Clearing moved
  into the two callbacks that actually change the scramble, where hydration
  cannot reach it. This is the same shape as the cold-start replay bug Step 5
  fixed (plan §5): **the empty first render is a state, and anything keyed on
  "it changed" sees it.**
- **The starting cube's identity has to change when the *page* does**, not only
  when the scramble does. Two solves against one scramble can share a hold, so
  `orientedCube` need not change when you switch between them — and if the
  identity had not changed, the transport would have read the second solve as
  the first one having grown and animated its way from one into the other.
  `openId` is a dependency of `startingCube` for exactly that reason.
- **Solve mode needs a solve under it, and "the flag restored but the page did
  not" is a state to design away rather than to handle.** The screen derives
  `writing = solving && openSolve !== null`, `readCubeSave` refuses to restore
  solve mode with nothing open, and the workspace's `solveId` is cross-checked
  against the scramble on screen — so a solve that outlived its scramble is
  dropped rather than opened against the wrong cube.
- **A picker cannot be another row, and the caption already was one.** Solve
  mode at 320×568 leaves the cube about 120 points, so the line under the pad
  that already said the hold and the move count became a *button* that says the
  solve's name too and opens the list. It costs the cube nothing. It is in the
  inspection phase as well, and that is not symmetry for its own sake: a
  brand-new solve you have changed your mind about would otherwise be a corner
  with no way out, because the only control that could delete it was in the list
  you could not reach.

Also worth not rediscovering: **a solve has a generated id and a favorite does
not**, and that is the rule being applied rather than broken. Two saves of the
same scramble are the same favorite, which is what a player means; two solves
with the same moves are two solves, which is the entire point of Duplicate. The
id is minted by counting (`s1`, `s2`, one past the highest in the file) so the
file and the tests stay deterministic.

Verified with `npm test` (719 across the app), `npx expo-doctor` (18/18), `npx
expo export --platform all`, and two headless drivers run at 320×568, 375×667
and 420×860 with the screenshots read: `resume.js` writes a solve, names it,
duplicates it, diverges the copy, switches back and forth, then **reloads the
page — which is a cold start** — and asserts it lands on the same solve in the
same mode with the same hold, sampling the position label over four seconds to
prove nothing animates; `lifecycle.js` walks new-at-inspection, deleting the
open solve, a new scramble getting its own empty picker, loading a favorite and
finding its solves waiting, and restoring into scramble mode with a solve still
open. No overflow and no console errors at any size. Frames were sampled across
a key tap and an undo to confirm moves still turn rather than appear.

### **Step 5 — the starting orientation** ✅ *(shipped out of order, 2026-08-02)*

*Merged to `epic/cube` with Step 3 on 2026-08-02 (#87, #88).*

Shipped: solve mode is now **two phases**, and the cube turns all the way over. Tap Solve and you are *inspecting* —
no pad, no transport, a cube roughly twice the size, and a live readout under it
saying **"yellow up · blue front"** as you drag. Tap **Set start** and that hold
is baked into the model as a rotation prefix, so every move you then write is
relative to it. `Start view` is the shortcut back to it; `Re-orient` goes back to
inspecting, and is only offered while the solve is empty.

Why it jumped the queue: the operator used Step 3 and found entering `x`/`y`/`z`
by hand to be the wrong instrument — *"we can pan the cube around and look at it
and that's a lot easier than using the keyboard."* Picking a hold by typing `z2`
is asking someone to compute the answer to the question they are using the cube
to answer. **`x`/`y`/`z` stay on the pad**, because a solve occasionally needs a
rotation mid-way (operator, 2026-08-02).

Three things this step learned, all now in plan §8.3:

- **The camera and the model are not interchangeable.** Panning moves the
  camera; a hold moves the model. Leaving the camera somewhere and calling it the
  orientation looks right and is wrong the instant a move is entered.
- **The angle is thrown away and only the hold is kept.** 24 holds, infinitely
  many angles — so setting one is a deliberate jump back to the standard
  three-quarter view. **The invariant is not "the picture is unchanged"**, which
  is what this step first assumed and a driver disproved; it is "the hold you
  were promised is the hold you get".
- **Front must be picked among the faces perpendicular to up.** Two independent
  argmaxes return the *same face* for both when you look down a body diagonal —
  yaw 45°, pitch 45°, one drag from the opening view — and that pair is not an
  orientation. A unit test pins it.
- **A constraint added to prevent a feeling can silently remove a capability.**
  Pitch had been clamped short of ±90° since Step 1 so a drag could never roll
  the cube past its pole and invert. Correct about the symptom — and it made
  **yellow-up unpickable**, because D is only the highest face on screen when
  `cos(pitch) < 0`. That is the traditional Roux hold and the first thing the
  operator tried. Nothing failed; there was just a hold you could not name. The
  clamp is gone and the inversion is handled instead
  (`geometry.isUpsideDown`). **Sixteen of the 24 holds are reachable** — every
  one with white or yellow up — and the missing eight need a camera roll axis,
  which belongs with colour neutrality if that ever lands (plan §8.3).

One more bug, found by the operator and fixed before the merge: **a cold start
played the whole scramble** before settling on it. The screen mounts with an
empty scramble and fills it from storage, and position 0 of nothing vacuously
extends into position 0 of anything — so the transport called it growth and
walked all twenty moves. The starting cube is an identity as well as a cube, and
scramble mode was passing a constant one. Backgrounding the app is how an
operator meets this, because the system evicts it and the next open is cold.

Also recorded and **declined**: swipe-to-turn (plan §8.4), dropped as too
complicated. The groundwork finding is kept in case it returns.

Verified with `npm test` (669 across the app, 32 of them new across orientation
and geometry — including a sweep of every yaw/pitch a finger can reach, a
reachability census of the 24 holds, and a proof that the near surface really
does reverse its screen direction past the pole), `npx expo-doctor` (18/18),
`npx expo export --platform all`, and headless runs at 320×568 and 375×667
driving both phases — pan, watch the readout follow, set, confirm the promised
hold is the one delivered, enter a move, pan away, `Start view` back, clear,
re-orient — plus a driver that turns the cube right over, lands on yellow-up,
and walks all four of its fronts. Step 3's three drivers were re-run against it
unchanged in intent, and all still pass.

### **Step 3 — solve mode** ✅

Shipped: a **Solve** button that switches the screen from reading a scramble to
writing one down, with the cube starting from the scramble fully applied; a
twelve-key Roux pad (`U D L R F B` · `M` · `r` · `l` · `x y z`) with `'` and `2`
armed before the key, plus undo, clear and a text field for whole algorithms;
every entered move animates, and the transport scrubs a solve exactly as it
scrubs a scramble. 179 cube tests, 637 across the app.

The solve is a scratchpad, as planned — one solve, in memory, cleared by a new
scramble. Step 4 is where the save file's shape gets decided.

Three things this step learned:

- **The pad relabels itself while a modifier is armed.** Every key reads `U'`,
  `R'`, `M'` … so the second of the two taps is aimed at a key that already says
  the move it will make. That is what makes armed modifiers bearable enough to
  ship and let a real drilling session pick between the alternatives (plan §9.8).
- **"The algorithm changed" is two different events**, and Step 2's transport
  treated them as one. Loading a favorite must reset to the end; appending a
  move must *turn* it. `extendsAlg(before, after, from)` tells them apart, and
  asking it at **where the cube actually is** rather than at the end of the old
  algorithm is what makes undo-then-type animate instead of jump. Plan §5 has it.
- **Undo is two things that cannot happen at once**, and the gap between them is
  where the bugs were. `retract` owes the caller a removal and every exit from
  the backwards turn pays it. Without that, a second undo inside 260ms kept a
  move that had been deleted, and a key tapped in the same window stranded the
  removal entirely. **Neither was visible in any test this step wrote** — both
  came out of driving the export and reading the solve back.

Verified with `npm test` (637 across the app), `npx expo-doctor` (18/18; this
environment had network, unlike Step 2's), `npx expo export --platform all`
(web + iOS + Android), and headless runs of the web export at 320×568, 375×667
and 420×860: no vertical or horizontal overflow, no console errors, and the whole
of solve mode driven — enter a move, arm a modifier, undo, clear, type an
algorithm and watch it run, scrub it, rotate with `y`, round-trip to the scramble
and back, and a new scramble clearing the solve. Frames were sampled across each
turn to confirm the moves actually animate rather than appearing already made,
including in the undo race.

### **Step 2 — play the scramble** ✅

Shipped: `buildScene` takes an optional in-progress `turn` and draws the cube
part-way through a move; a transport under the cube (start · back · play/pause ·
forward · end, with `n / 20` and a speed chip); every token in the scramble is a
tap target that **turns the cube its way there**, forwards or backwards; a drag
stops playback. 125 cube tests.

Playing the scramble, playing it backwards and turning to a tapped move are one
loop told where to stop (`playTo`), so direction falls out of which side of the
goal the cube is on and an interruption — including one that reverses — works
the same way for all three. The two skip buttons are the only thing that still
jumps: "back to the solved cube" is a way *out* of where you are, and turning
twenty moves to get there would be the opposite of what the button says.

Three things this step learned, all of them now in plan §5 and §10:

- **A turning cube has an inside.** Only outward stickers exist, so a layer
  half-way round showed the app's background through the gap. `buildScene` now
  draws the seams a move cuts — plastic only, `0 < t < 1` only — and walks all 27
  lattice positions so the core plugs the hole a slice opens.
- **`faceBasis` only spans an axis-aligned normal.** Building a square from a
  half-turned normal gives an unrotated square at a rotated centre, and the tiles
  come off the cube in the middle of every move while both ends stay perfect.
  Squares are built on the lattice and their corners carried. **This got past
  `t = 0` and `t = 1` tests and was caught in a screenshot** — the tests that
  hold it now are the continuity ones.
- **Both ends are exact by construction**, so `t = 0` and `t = 1` frames are
  identical, key for key, to the still cube either side of the move.

Verified with `npm test` (576 across the app), `npx expo export --platform all`
(web + iOS + Android), and a headless run of the web export at 320×568, 375×667
and 420×860: no vertical or horizontal overflow, no console errors, and the whole
transport driven — step, play, pause mid-turn, drag-to-cancel, tap-a-token,
save, new scramble, load a favorite back. `npx expo-doctor` reported 16/18, both
failures being the two checks that need network access this environment does not
have (config schema fetch, React Native Directory).

### **Step 1 — scramble, inspect, favorite** ✅

Shipped: the `cube` hub tile; `games/cube/` with the cubie model, notation
parser, random-move scrambler, SVG 3D renderer with drag-to-orbit, favorites and
persistence; 84 tests. Verified with `npm test` (539 across the app),
`expo-doctor` 18/18, `expo export --platform all`, and a headless run of the web
export through the whole flow — scramble, drag, save, new scramble, save, open
the list, load one back, return to the hub and see the Continue badge — at three
viewport sizes, with no console errors.

Decisions worth not relitigating: SVG rather than WebGL or a WebView (plan §5),
cubies rather than facelets (§3), random-move rather than random-state scrambles
(§6), and the whole set of notation up front rather than one letter at a time
(§4).
