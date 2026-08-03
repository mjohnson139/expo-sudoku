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

`epic/cube` carries Steps 1, 2, 3, 4, 5 and 6 as of 2026-08-02. It is cut from `main`
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
  else should say why in its PR.
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

## Next step: **Step 7 — edit a solve you have already written**

> **This step was moved to the front of the queue, and plan §8's table says so
> and why.** It used to be "enter a cube by hand"; that is Step 8 now. If the
> operator would rather have the cube entry next, take that row instead — this is
> a re-ordering, not new scope, and either brief is a step's worth of work.

**The text field appends; it cannot edit.** A typo in the middle of a solve is
fixed by undoing back to it and retyping everything after. That was fine when the
solve was a scratchpad (Step 3), stopped being fine the moment solves were kept
(Step 4 — which recorded it and deliberately did not fix it), and Step 6 has now
put **markers** on top of the same text. It is the oldest live gap in the
feature and every step adds weight to it.

### Scope — ONLY this

1. **Replace the solve's text, rather than appending to it.**
   `CubeAlgInputModal` already validates a whole algorithm with the real parser
   and says which token it choked on; the honest shape is that modal opened with
   the solve **already in it**, replacing on Add. Appending stays — it is what
   the field is for mid-write — so this is a second way in rather than a changed
   one. "Edit" belongs on the solve card or the solve bar, next to what it edits.
2. **Keep the markers on the moves they were put on.** A phase is an index
   (plan §8.5), and a wholesale text replacement moves every index after the
   edit. `clampPhases` keeps them *legal*; it does not keep them *right* — insert
   a move at position 3 and `First block · 8` should become `· 9`, not stay at 8
   pointing one move short. **This is the hard half of the step and it is where
   the thinking goes.** A diff between the old and new token lists is enough to
   shift each marker by how much the text before it grew or shrank; a marker
   inside a stretch that was rewritten wholesale has no honest answer and
   probably wants dropping rather than guessing.
3. **Do not let an edit replay the solve.** `useScramblePlayer` tells "grew" from
   "replaced" with `extendsAlg` asked at where the cube is (plan §5). An edit in
   the middle is genuinely a *replacement* and should land on the end without
   animating — which is what already happens, but only if the starting cube's
   identity is right. Check it; a cold-start-style replay is the bug this epic
   has shipped twice.

### Read first

- `docs/cube-plan.md` §8's table (the re-order and its reasons), §4 (**the text
  the operator entered is the text that is kept** — an edit must not respell
  `r` as `Rw`), §5's growth rule, §8.5, §10
- `games/cube/solve.js` — `appendAlg`, `dropLastToken`, `solveError`. A
  `replaceAlg` belongs here, next to them, and pure.
- `games/cube/solveList.js` — `withMoves` is the funnel every move edit goes
  through and `clampPhases` is what it calls. **A marker-shifting function
  belongs here**, next to the rest of the shape rules and the tests that hold
  them.
- `games/cube/CubeAlgInputModal.js` — the field, its validation and its Add
- `games/cube/CubeScreen.js` — `editOpen`, `addTyped`, and the card
- `games/cube/useScramblePlayer.js` / `player.js` — `extendsAlg`, and why the
  starting cube is an identity

### Behaviors that are easy to get wrong

- **A replacement that happens to be an extension is still an extension.**
  Opening the field, adding one move at the end and hitting Add must animate that
  move, not jump. `extendsAlg` already answers this correctly; the trap is
  bypassing it with a "this was an edit" flag.
- **Never redisplay a canonical token.** Seeding the field is the obvious place
  to leak `Rw` where the operator wrote `r`. Seed from the stored text.
- **The screen is full and Step 6 spent the last free slot.** The pad's bottom
  row is now six controls (`'` · `2` · undo · clear · type · flag) and the rows
  above it are six wide, so there is **no seventh**. The phase strip costs the
  cube 24 points when a solve has markers — 138 → 114 at 320×568. Anything this
  step adds has to replace something or live in a modal. The solve card itself is
  a plausible home for an edit affordance, since it is already a tap target for
  every token.
- **An empty replacement is a clear.** Decide whether that is allowed from the
  field, and make it match what the clear key does to the markers (which is drop
  them all — see `clearSolve`).

### Out of scope for this step

Entering a cube by colour, a solver, random-state scrambles, colour neutrality,
a timer, re-orienting under written moves. Note what you spot; do not start it.

### Visible in Expo Go when this lands

Write a solve, notice that move 4 should have been `R'`, open the edit field with
the whole solve in it, fix that one character, Add — and watch the cube land on
the corrected solve with `First block · 8` still counting the first eight moves.

### How to verify

- `npm test` — the marker shifting is pure and belongs in `solveList.test.js`
  next to `withMoves` and `clampPhases`. Pin what an insert, a delete and a
  wholesale rewrite each do to a marker.
- `npx expo-doctor` and `npx expo export --platform all`.
- Drive the web export headlessly at 320×568, 375×667 and 420×860, and **look at
  the screenshots**. Step 6's two drivers are the pattern (they live in the
  session's scratchpad, like every step's, so write your own from the
  description): `phases.js` writes a solve, marks two groups, plays one, and
  undoes back across a boundary; `tidy.js` walks the free-text name, the bin,
  duplicate and clear. Both key off `aria-label`, which is how this app names its
  controls.
  Two things Step 6 learned about driving it: **the pad relabels every key while
  a modifier is armed**, so the second tap of `R'` aims at `R prime`; and
  **a reload is a cold start but not an unmount**, so the 400ms debounced save
  never flushes — wait it out before reloading or you will test the state before
  your last edit. A reload lands on the **hub**, so getting back to the cube is
  one more tap.

---

## Open questions for the operator (carry these forward)

These are plan §9, restated so a session does not have to go looking. None block
Step 7.

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
8. **How a move gets entered** — live, and now shipped in one form. Step 3's pad
   arms `'` and `2` before the key. Roux is prime-heavy, so that is two taps for
   a very common move; what makes it bearable is that **the pad relabels every
   key** while a modifier is armed, so the second tap is aimed at a key that
   already reads `R'`. The two alternatives — modify the move you just made, or
   cycle `R → R2 → R'` on repeated taps — are written up in the Step 3 entry
   under "Steps already done". This wants the operator's first real drilling
   session, not an opinion.
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
    should wait for the operator to say they want it.

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
- ~~**The text field appends; it cannot edit.**~~ **It is the next step** — see
  the brief above. Step 6 added markers on top of the same text, which is what
  finally moved it up the queue.
- **Solve mode has no "Favorites" button**, because the row it lived on is now
  the move pad. Getting to the list means tapping Scramble first. Nobody has
  complained because nobody has used it yet.
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
- **And so is the page, and so is the pad.** Step 3 spent the rest of the page:
  at 320×568 solve mode leaves the cube 138 points, which is why the two view
  buttons are icon-only and the scramble drops to one line. Step 6 spent the last
  free *key*: the pad's bottom row was five controls where the rows above are
  six, and the flag took the sixth. **There is no seventh** — another key means
  another row, and a row comes out of the cube. Step 6 also costs the cube 24
  more points (138 → 114) whenever a solve has markers on it, which is the price
  of the phase strip and is only paid by an annotated solve.
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
