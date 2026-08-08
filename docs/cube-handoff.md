# Cube Scramble — the epic is closed

**This epic shipped as V1 on 2026-08-08 and there is no next step.** The delivery
table in `docs/cube-plan.md` §8 is empty: Steps 1–10 shipped, 10a shipped, and
the last row — enter a cube by hand — was **dropped** rather than deferred
(§8.12). The editor is tabled and the solver is outsourced (§8.9).

**If you are a session picking up cube work, this file is still your entry
point** — but it is a record now rather than a brief. Read it, then read
`docs/cube-review.md`, which is the architecture verdict and the honest list of
what was deliberately left undone.

## There is no "next step" — so what would a session do?

Whatever the operator asks for. What exists, in rough order of how ready it is:

1. **The open questions below.** Nine of them, all needing a decision or a
   drilling session rather than an implementation plan. **Number 14 is the live
   one** and it is the cheapest big win left on the solve screen.
2. **Three findings from the review**, written down with recommendations and
   deliberately not built: clearing a solve is spelled twice, the List/Compare
   toggle spells its rule in JSX, and `utils/gameProgress.js` inverts the
   dependency. Only the third is big enough to be a step, and it is platform
   tidy rather than cube work.
3. **The seams no test can see.** Step 10a's lesson, and the one thing the review
   did not think to ask. `renderTurn` is the first of them pulled into the pure
   core; the object literals hooks hand to components are the rest of the list.
4. **"Noted in passing"** below — nine steps of things people spotted and
   deliberately did not fix.

**Do not start any of these because they are written down here.** Everything in
this epic that turned out to be worth building came from the operator using the
tool and finding it wanting; §8.12 is the decision that says so out loud.

## Standing context (still true for anything that touches the cube)

- **Repo:** `mjohnson139/expo-sudoku`. App code is in **`SudokuApp/`**
  (Expo · React Native · JavaScript).
- **The review:** `docs/cube-review.md` (Step 10, 2026-08-07) — the verdict on
  the whole epic, what it deliberately did *not* fix, and the merge decision.
  Read it before proposing an architectural change; three findings are written
  down in it with recommendations, and two conclusions in it are decisions
  (`readCubeSave` stays in `favorites.js`; `MAX_SOLVES` is not changed).
- **Source of truth:** `docs/cube-plan.md`. Read it end to end before writing
  code — model (§3), notation (§4), renderer (§5), scrambles (§6), storage (§7),
  the step table (§8), open questions (§9), and the edge cases that already bit
  someone (§10).
- **Tracker:** GitHub issue **#82**. Tick your step's checkboxes as you go.
- **Process:** `.github/dev-process.md` — one delivery step per branch, commit
  after each step, **prompt the operator to test after each step.** That last
  clause is the one that mattered most here: nearly every correction this epic
  made came from the operator using it on a phone between steps.

### Branching — **the epic branch is done**

The cube was built on an epic branch so `main` never carried a half-built tool:

```
main ─── epic/cube ─── feature/cube-<step>   (PRs targeted epic/cube)
```

**`epic/cube` merged to `main` on 2026-08-08**, carrying Steps 1–10 and 10a, with
Step 10's review (`docs/cube-review.md`) as the sign-off. That branch has done its
job. **Later cube work branches from `main` like anything else** — there is no
epic to target any more, and re-opening one for a follow-up would be inventing
ceremony for a change that no longer needs it.

(Historical, so a stale doc does not mislead: the branch was briefly cut from
`epic/fungiku`, because the hub only existed there. Fungiku's Step 13 merged that
epic to `main` on 2026-08-01 and this was rebased the same day. **No Fungiku
dependency remains.**)

### Golden rules — **these outlive the epic**

They are what kept the cube reviewable across ten steps, and they apply to any
change to it from here.

- **The cube's code lives under `games/cube/`.** Sudoku and Fungiku keep working
  exactly as they do. Outside that directory Step 1 touched three things — a
  registry entry, `describeCubeProgress` in `utils/gameProgress.js`, and adding
  `react-native-svg` — Step 2 touched only `utils/buildNotes.js`, because plan
  §12 says to, Step 4 touched those same two (the hub badge counts solves now),
  Step 6 touched only the build notes, **Step 8 added `expo-haptics`** to
  `package.json` and nothing else, and Step 9 touched only the build notes.
  **Step 10 — the architecture review — touched only the build notes too**, which
  is the outcome §8.11 wanted: it looked hardest at the shared seam and
  recommended the one change it found there rather than making it. A
  step that needs to touch anything else should say why in its PR. **Step 7 is the only one that has had to touch shared
  code**, and it is the pattern for the next time: the header it needed to shrink
  is `components/ScreenHeader.js`, shared with Fungiku, so it added a `dense`
  prop and an `actions` prop **whose absence is exactly today's header** — no
  existing caller changed a pixel, and Fungiku was opened to prove it.
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
  the list, the save shape, the phases, the sanitizing and — since Step 9 — the
  comparison across solves. Layout arithmetic counts as pure too: `trackLayout.js`
  and `compareLayout.js` are both there because a number that decides what is
  visible should be pinned rather than eyeballed at one width.
- **The save file's shape is settled and should not be reopened.** Plan §7.2 has
  it in full. Every field in it is now written and read by something; Step 6 was
  the last one to fill an empty slot, and **`workspace.view` was the last one
  added** (2026-08-06, at the operator's request — the angle the cube is turned
  to is kept now, and plan §7.1 has the amended rule). It needed no version bump:
  a file without it reads as "nothing remembered", which is the truth.
- **One rule, one function.** Every edit to a solve's moves goes through
  `withMoves`, which is also what keeps the markers honest — and the clamping it
  does is literally the same `clampPhases` that `sanitizeSolves` runs on the way
  out of the file. Two implementations of one rule is how "it survived the reload
  but not the undo" gets shipped.
- **Stay in scope.** Note what you spot for a later step rather than fixing it
  now, and say so in your PR.

### Every step must be visible in Expo Go

Hard requirement, same as Fungiku's. A step whose only evidence is a passing test
suite is not done. **Step 10 was the single exception and it was written into the
plan as one** (§8.11), because a review ships a verdict; it did not get to invent
the exemption for itself.

**Step 10a is why the rule exists.** Nine steps of green tests and 18/18 from
doctor, and the pad's promotion had been animating backwards on `L`, `D` and `B`
the whole time. A thumb found it in one session.

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

## What V1 is

Scramble · inspect · hold · write · annotate · compare · keep.

Get a 20-move scramble on a 3D cube you can turn with a finger. Play it, step it,
tap any move and the cube turns its way there. Tap **Solve** and inspect — turn
the cube to how you want to hold it, with a live readout naming the hold in
colours — then **Set start**, and write the solve on a six-by-three pad laid out
as a spatial cross. Hold a key for a prime or arm the `′`; tap the same key twice
for a half turn. Flag the end of your first block and name it, and read
`First block · 8` back. Write several attempts at one scramble and put them side
by side, one column per phase, and see whether the number is coming down.

Nothing you write is lost. **911 tests**, `expo-doctor` 18/18, all three
platforms bundling, and every step of it drilled on a real handset.

**The question the epic was for** — *am I getting better at this scramble?* — is
the question the tool answers.

---

## Open questions for the operator (carry these forward)

These are plan §9, restated so a session does not have to go looking. **None of
them blocked shipping V1** — they are what is left *after* it, and every one of
them wants a decision or a drilling session rather than an implementation plan.
Step 10 was the step with standing to write the ones that
were really findings down — it did, in `docs/cube-review.md`. What is left here
is what it says on the tin: questions only the operator can answer, most of them
by drilling rather than by deciding.

**Number 13 is answered and shipped** (Step 9, 2026-08-06). **Number 14 is the
live one and Step 8 sharpened it into a number**: the pad and scrubber cost the
cube 71 points at 320 and 375, −49 once the tick track came out, and whether that
is the right trade is a question only the operator can answer by drilling on it.
**Number 12 gained a second candidate on 2026-08-06** — see below. Number 8 is
answered *and shipped*, including the part that wanted use: the hold threshold
was drilled on and moved from 180ms to 300ms.

**These questions are the whole of what is left**, and nothing else that was
planned. Three rows left the table rather than moving down it — the editor
tabled, the solver outsourced (§8.9), and manual entry dropped (§8.12) — so the
backlog is genuinely shorter than it was rather than rearranged. All three are
**decisions** and not deferrals: plan §8.9 and §8.12 have the reasoning, and
**proposing any of them again is re-opening something the operator already
settled.**

1. Scramble length — 20 moves. Leave it?
2. Other puzzles — 2×2, 4×4, pyraminx, skewb?
3. A timer — in this epic, or a separate feature?
4. Colour scheme — a setting, or is the standard one enough?
5. ~~Where a solve comes from.~~ **Answered, and it replanned the epic**
   (operator, 2026-08-01): solves are **written by the operator**, not computed.
   See plan §8.1. **Fully closed on 2026-08-06** — the part that *is* wanted
   eventually, optimize a phase I already wrote, is **outsourced to an API** and
   is not this repo's code (plan §8.9).
6. Drag direction — currently "push the surface under your finger".
6a. ~~**Whether the view angle is kept.**~~ **Answered by use** (operator,
    2026-08-06): *"once the user moves the cube we want to remember the camera
    position so it doesn't reset when they background the app and come back."*
    It is in `workspace.view` now. The rule it changed is plan §7.1's, and the
    distinction that replaced it is worth keeping: not *authored text vs. not*
    but **did you choose this, and would you choose it again** — an angle yes, a
    half-played scrub position no. `DEFAULT_YAW`/`DEFAULT_PITCH` are the
    *opening* view now, not the view every visit begins at.
7. ~~Turn speed.~~ **Answered** (operator, 2026-08-01): a speed control, and it
   is in — a chip cycling 1× → 2× → 0.5×, scaling the beat between moves as well
   as the turns, and applying to single steps as much as to playback. **Step 4
   settled that it stays transient**, along with the scrub position — and **the
   view angle left that group on 2026-08-06** (see 6a). Plan §7.1's amended rule
   is that what you chose on purpose is kept, and a speed you set once and forgot
   is arguably the first kind too. Say so if that turns out to be wrong in use —
   the file has room, and the angle is the precedent.
8. ~~**How a move gets entered.**~~ **Answered by a design round** (2026-08-04)
    **and shipped in Step 8** (2026-08-05). Press and hold for prime, second tap
    on the same key for a half turn. This was the epic's longest-running
    question, open since Step 3 shipped the armed `'`/`2` modifier, and the three
    alternatives it listed are all decided in the design bundle's rejected
    column. Plan §9.8 has the reasoning, including the one that killed the
    per-key prime strip: at six columns it leaves 35.6pt for the letter, under a
    thumb's contact patch, and a mis-hit there turns the cube **the wrong way**
    rather than doing nothing.

    **The threshold half is now answered too** (operator, 2026-08-06): 180ms was
    too short under a real thumb — *"I'm getting a lot of prime moves when I want
    a regular turn"* — and `HOLD_MS` is **300**, the far end of the design's
    120–320 range. The asymmetry decided it: a tap misread as a prime turns the
    cube the wrong way and costs an undo, while a prime that waits another 120ms
    costs only the wait. The fallback if the hold still tests badly is written
    down and is a standalone `'` key, which would cost the pad a rethink rather
    than a slot, because the cross has no spare cell — but with a second route to
    a prime already shipped (the armed `′`), the hold no longer has to carry the
    gesture alone.
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
    the operator said they were trying to improve. **Step 9 gives it a second
    one, and a reason to care**: the comparison table's rows are the names, so
    `Solve 1 / Solve 2 / Solve 3` is now a column of labels that says nothing
    about what was different between them.
13. ~~**Whether the counts are worth comparing across solves.**~~ **Answered,
    became Step 9, and shipped the same day** (2026-08-06). It was filed with
    Step 6 as "the obvious next thing to want" and parked because nothing had
    asked for it — and then **tabling the editor asked for it.** It landed in the
    solves list behind a Compare toggle, for zero points of cube. Plan §8.10 has
    the brief and what building it settled. **What it opens rather than closes**
    is whether a comparison is worth more than one scramble's worth of attempts —
    §8.10 rules comparing *across* scrambles out on the grounds that the numbers
    are not comparable, and that is still right, but "am I getting better at first
    blocks generally" is a different question the tool now nearly asks.
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

    **Step 8 made it urgent and gave it a number.** The designed pad and scrubber
    cost the cube **71 points** at 320×568 and 375×667 (194 → 123, 293 → 222) and
    nothing at 393×852, where it is width-bound. The legend is already suppressed
    below `LEGEND_MIN_HEIGHT` or it would have been 100. Everything left is the
    design's own: a 44pt key row is the one thing this screen will not buy space
    from, and the scrubber card's 81 points are a 12pt tick track inside 29
    points of card. So **the next 40 points have to come from hiding rather than
    cutting**, which is exactly what this question asks about — and it is now the
    cheapest big win left on this screen.

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
  only evidence that counts for how it *feels*. **Step 10 raised this as the one
  condition on merging the epic and the operator closed it the same day** — they
  have been testing on device throughout (2026-08-07). What is worth keeping is
  the habit it exposed: **write down when a finding came from a device**, because
  the docs recorded nine steps of browser evidence and left the hand-testing
  invisible. See `docs/cube-review.md`.
- ~~**`useScramblePlayer` assumes a solved starting cube.**~~ **Done in Step 3**:
  `buildPlayback(alg, { from })` and `useScramblePlayer(alg, from)`.
- **The text field appends; it cannot edit.** **Tabled on 2026-08-06 — plan §8.9
  is the reasoning and it is a decision, not a backlog entry.** The short version:
  the brief was covering two jobs, *fix a typo* and *improve a block*, and only
  the first is a text edit. Improving a block changes the cube every later move
  is applied to, so the marker arithmetic that was the hard half of the step
  would have carefully preserved annotations that had stopped being true. The
  second job is the optimizer's and the optimizer is an API. **If it comes back
  it comes back small** — `CubeAlgInputModal` opened with the solve in it,
  `clampPhases` for the markers, no diff arithmetic — and the affordance
  candidates are still listed in plan §8.7, which is kept intact.
- **There is no way to enter a cube by hand, and that is a decision** (§8.12,
  2026-08-08). Pasting an algorithm is genuinely small and everything it needs
  exists — `CubeAlgInputModal`, `algError`, and `showScramble` as the one funnel
  that changes the scramble. **Setting the colours facelet by facelet is not**:
  it needs a validator for "is this a cube that can exist" (permutation parity,
  corner orientation, edge flip), which is the solver-adjacent shape this epic
  has twice declined to own. The row was dropped because **nothing ever asked for
  it** — nine steps of drilling and "I have a cube on the table" never came up.
  If it returns, it returns as the paste field alone.
- **There is no solver in this repo and there is not going to be one.**
  Outsourced to an API on 2026-08-06 (plan §8.9). This is here because a search
  is the single most tempting thing to helpfully start writing, and because the
  epic's argument for the cubie model over cubing.js was precisely not shipping
  pruning tables. **Nothing is being built for it** — no client, no protocol, no
  placeholder. Random-state scrambles went with it (plan §6): the generator stays
  random-move and the fallback plumbing does not get written before there is
  something to fall back from. When it is real, the shape is *annotate an
  existing solve* — a phase already has a start, an end and a cube state at its
  start, so "optimize this phase" is a request the data model can already
  describe.
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
- ~~**`readCubeSave` lives in `favorites.js` and now reads four things.**~~
  **Decided in Step 10: leave it** (`docs/cube-review.md`, finding 7). The
  argument got stronger rather than weaker — `readCubeSave` is four lines
  delegating to `solveList.js`, so a `cubeSave.js` would be a file whose entire
  content is a call to two other files. **The file is misnamed, not misplaced.**
  If it ever grates, rename `favorites.js`; do not split it.
- **A solve is culled by age, not by use.** `MAX_SOLVES` is 100 across the whole
  file, newest-created first, oldest dropped — and `savedAt` is creation time
  and is never bumped, so editing a very old solve does not protect it. At 100
  that is unreachable in practice; it would stop being unreachable if the cap
  ever came down. **Step 9 is the first thing that makes an old solve worth
  keeping** — the attempt you are measuring against is by definition the older
  one — so if the cap ever feels real, this is why. It was not changed.
  **Step 10 looked at it and left it** (`docs/cube-review.md`, finding 8): the
  cap is across the whole file, 100 is unreachable in practice, and a review is
  not where a number like that should move. Revisit only if the cap comes down.
- **The pad only ever writes a straight `'`**, so a solve cannot be entered with
  a curly apostrophe from it — but one *pasted* into the text field is kept as
  typed, and will read back as `R’` next to the pad's `R'`. Honest (plan §4 says
  keep what was entered) and slightly inconsistent; if it grates, normalize the
  apostrophe in `appendAlg`, not in the parser.
- **The scrubber row is full, and Step 8 measured exactly how full.** Five
  buttons, the counter and the speed come to **276 points** inside a card that
  has **282** at 320 — and that is *after* the gap came down from the design's 10
  to 6. There is no room for a sixth control and no room to put the design's
  spacing back. It no longer wraps: the ends are `flexShrink: 0` on purpose,
  because letting them shrink is what produced `39 / …`.
- ~~**And so is the page.**~~ **Step 7 fixed the page and the rule behind it.**
  Steps 3–6 each recorded the squeeze honestly — 138 points at 320×568, the phase
  strip costing 24 more, the pad's bottom row having no seventh slot — and each
  responded by shrinking *itself*. The accounting was right and the conclusion was
  backwards: **the cube was the only element with no floor**, so it absorbed every
  row anyone added, all the way down to four points. Plan §8.6 inverts it and the
  cube is now width-bound in five of the nine measured cases. **Keep the
  point-counting habit** — say what a new row costs the cube, in the PR. It is
  what made this legible in the end.
- ~~**The pad still has no seventh slot.**~~ **Step 8 rebuilt the pad** and the
  constraint went with it: `'` and `2` are no longer keys, `E` and `S` are, and
  the grid is a 6 × 3 spatial cross. Clear came off entirely. **The cross's one
  empty cell did not survive the day** — the design wanted it empty and the
  operator wanted a prime key, and use won; it is column 3 row 1, directly above
  `R`. So the pad is full again and there is no spare cell at all. What has not
  changed: **every key on it is a thumb target**, and at 320 that is 43 × 44pt,
  which is the one thing this screen will not buy space from. `PAD_LAYOUT` in
  `solve.js` owns which key goes where, and `padPalette.js` owns what colour.
- **The design bundle is read with the `DesignSync` MCP**, project
  `2acc14f2-7f7e-434f-a29d-e0fe29fa876a`, and it needs a design authorization
  (`/design-login`). `design_handoff_cube_move_pad/README.md` is the document
  worth reading in full; `support.js` is the design-doc runtime and has nothing
  in it to port. **Step 8 built everything in it that this epic had planned**, so
  a later step needs it only to check a measurement — the glyph `d` attributes
  now live in `games/cube/CubeGlyph.js` and the tint table in `padPalette.js`.
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
- ~~**The tick track.**~~ **Built in Step 8 and removed the same day** at the
  operator's request. Kept here as a warning rather than a to-do: at 42 moves a
  tick is six points wide, so it drew a row of identical dashes and restated a
  number `42 / 42` was already saying — for 22 points of cube. If anything like
  it is ever proposed again, the question to ask first is *what does this say
  that the counter and the phase chips do not.*
- **`expo-haptics` is in `package.json` and fires exactly once**, at the hold
  threshold, guarded by `Platform.OS !== 'web'`. Every headless check this epic
  runs therefore runs with it off, and it is the one part of the pad that only a
  device can judge.
- **`PROMOTE_MS` is 1200 and the design did not specify it.** The bundle models a
  `lastKeyAt` and says "within the repeat window" without putting a number on it.
  1200ms is a deliberate choice — longer than a double tap, shorter than looking
  away — and it is a backstop rather than the rule, because what actually guards
  a promotion is `promoteLastToken` refusing on a last token that is not the key.
- **The `far` tag on `B` is the only key that carries one**, because the back
  face is the one a cube net cannot show in place. If a later step adds a key
  that needs a corner mark, `PAD_LAYOUT` already takes a `tag`.
- **The armed `′` and the hold are two routes to one token, and they disagree on
  one rule on purpose.** An armed prime beats a pending promotion; a hold does
  not. Arming is a statement, a hold is a duration. If a later step adds a third
  route, decide which of those two it is before writing it.
- **`resetGesture` is the one place half-finished gestures are dropped**, and
  every transition that invalidates one invalidates the other. A new path that
  changes the moves and forgets to call it leaves a `2` or a `′` pointing at
  something that is gone.
- **A `2` in a solve still plays back as one 180° sweep**, not two quarter turns,
  and that is deliberate: a half turn is one motion of the hand. Only the
  *promotion* is split, because there the cube is genuinely already half-way
  through. If a drill mode ever wants every `R2` shown as two turns, that is a
  playback decision and belongs in `stepToward`, not in the promotion.
- **`turnAngle` and `partialTurn` take an optional signed sweep**, and exactly
  one caller passes it. If a second one appears, check it against the same
  invariant: the frame it starts on must be the frame the cube is already
  showing.
- ~~**An accessory menu for the modifiers.**~~ **Built on a branch, driven, and
  turned down by the operator** (2026-08-05): hold a key, an iOS-style accent
  picker opens reading `R  R′  R2`, slide and release. It replaced all three
  routes with one gesture and gave the cross its gap back — and *"I like it the
  other way"*. Plan §8.8 has what it would have cost, including the part that
  decided it: a prime became hold **plus a slide**, where it is now just a hold.
  Do not re-propose it as an obvious win; it was tried.
- ~~**The phase counts are per solve and nothing compares them.**~~ **Built in
  Step 9**, in the solves list behind a Compare toggle. What it left behind:
  **an unannotated solve is invisible in the comparison except as a name in a
  note**, which is the honest answer and is not the only possible one; and **a
  solve annotated with a different method to its neighbours shows a row of
  dashes in the visible columns** and its own columns are off to the right,
  which reads worse than it is until you swipe. Both are rare and both are
  noted rather than fixed.
- **Half turns animate clockwise.** `shortWay(2)` is 2, not −2; both land in the
  same place and nothing prefers one. If a solve tutorial ever wants `R2` to go
  the way a particular fingertrick goes, that is the line to change. **A
  *promotion* is the exception and must not use it** — see Step 10a: the cube is
  already a quarter of the way round, so the sweep is signed and the renderer has
  to be told.
- **Anything a hook hands to a component is a seam a test cannot reach**, and
  Step 10a is what that costs. `renderTurn` exists because one object spread
  inside `useScramblePlayer` silently dropped a field for nine steps while every
  unit test passed. If a component starts receiving something assembled inline in
  a hook, that assembly belongs in a pure function.

---

## Steps already done

### **Step 10a — the promotion turned the wrong way** ✅ *(2026-08-07)*

A device finding, from the operator using the pad the day the review merged:
*"double tapping for moves like L and D, the animation seems to reverse the
direction."*

It was exactly that, and the diagnosis is worth keeping because **every piece of
the mechanism was already correct**. `promotedTurn` computed the signed sweep,
`animate` carried it, `turnAngle` and `partialTurn` honoured it, `buildScene`
accepted it — and `useScramblePlayer` **dropped it one spread short of the
renderer**:

```js
const turning = live ? { ...moves[live.at], t: live.t } : null;   // no `turns`
```

Without it `buildScene` falls back to `shortWay(amount)`, which for a half turn
is always `+2`. **`L`, `D` and `B` look down the negative end of their axis**, so
they carry `amount: 3` and turn anticlockwise: their promotions jumped from +90°
to −90° on the frame the second tap landed, then travelled the wrong way round to
−180°. `R`, `U` and `F` sweep `+2` anyway and were perfect — which is exactly why
the report named L and D.

**Why nine steps of tests never saw it.** Step 8 pinned the signed sweep hard, at
`turnAngle` and `partialTurn`, including a test literally called *"would snap
without the signed sweep, which is the bug it fixes"* — and all of it passed
throughout, because **the arithmetic was never wrong.** The bug was in a line
inside a hook, which the node runner cannot reach. So the fix is two things:

- **`renderTurn` in `player.js`** — the assembly of the renderer's turn, lifted
  out of the hook into a pure function and pinned there. The rule this
  establishes is in the golden rules now: *anything a hook hands to a component
  is a seam a test cannot reach.*
- **A `buildScene` test that asserts the picture rather than the angle**: a `D`
  that has finished its quarter and a `D2` picked up at `t = 0.5` must draw the
  same 27 stickers in the same 27 places. With the sweep, all six faces are
  27/27. Without it, `R`/`U`/`F` are still 27/27 and **`L`/`D`/`B` are 21/27** —
  the six stickers that changed sides, which is the reversal a thumb sees.

**One measurement trap, recorded because it cost most of the time.** A headless
driver comparing polygon *positions* across the promotion calls the bug smooth,
and it is not a bug in the driver: **a layer turned 180° lands on the same nine
screen positions it started on** — the cubies swap places among themselves. What
changes is *which colour sits where*, and sticker shading follows the face
normal, so colour is not a stable key mid-turn either. That is why the guard is
two pure tests at the two seams rather than a pixel check.

911 tests (22 new). `npx expo-doctor` 18/18, `npx expo export --platform all`,
and a driver confirming every face still promotes and animates with no console
errors.

### **Step 10 — the architecture review, and the merge decision** ✅ *(2026-08-07)*

Shipped: **a verdict, in `docs/cube-review.md`, and a yes on merging `epic/cube`
into `main`** — with one condition, which is a drilling session on a real
handset, because half of "would a staff engineer sign this off" is evidence and
this epic has never had that kind. 889 tests, 18/18 from doctor, all three
platforms bundling.

**Nine findings; four fixed, three written down with recommendations, two closed
as decisions.** The step was allowed to change only what was concrete and small
and it stayed inside that: **the only file it touched outside `games/cube/` was
`utils/buildNotes.js`.** It looked hardest at the shared seam and *recommended*
the change it found there rather than making it, which is the outcome §8.11
wanted.

**One real defect, and it is the one this epic would have minded most.**
`saveCubeState` is debounced 400ms and `CubeScreen` flushed it on **unmount** and
nothing else — but **backgrounding an app unmounts nothing**, so the last edit sat
in the debounce and a phone that then evicted the process never wrote it. Up to
400ms of *authored* work: the move just entered, the name just typed, the marker
just dropped. That is Step 4's own complaint — *"if I background the app and come
back… my solve I was working on is gone"* — in a narrower window, and **the cube
was the only persisted surface in the app without the guard**: `usePersistentReducer`
has had one since the hub existed, `useFungikuWallet` has its own, and
`utils/debounce`'s docstring names the two moments `flush()` is for as "a screen
unmounts **or the app backgrounds**". The cube did one half.

**Proven with a counterfactual rather than a passing test.** `background.mjs`
writes a move and backgrounds the app 60ms later, then reads `localStorage`: with
the fix, `Solve 1: "R"`; with the listener disabled and the bundle re-exported,
`Solve 1: ""`. Two other findings were dead code (`FACE_NAMES`, which was also a
second face→colour table next to the live one in `orientation.js`, and a leftover
style), and one was a screen-reader gap — **and the reason that one survived nine
steps is worth keeping**: `solve.test.js` already walked every pad key through
`describeToken` and asserted `toBeTruthy()`, and **the fallback is truthy**. The
test that looked like it covered it could not fail.

Three things it decided rather than changed, so they do not get re-litigated:

- **`readCubeSave` stays in `favorites.js`.** A `cubeSave.js` would be a file
  whose entire content is a four-line function delegating to two other files.
- **`MAX_SOLVES` stays at 100.** A review is not where a cap moves.
- **`utils/gameProgress.js` inverting the dependency is real and the fix is
  recommended — but not as a review's "concrete and small".** §8.11 said to check
  the cost first, and the cost is not what the sketch assumes: the functions live
  in a shared util because **jest runs with `testEnvironment: "node"`**, and the
  obvious home for each — next to its game's storage — is exactly the one that
  imports `AsyncStorage` and breaks 34 assertions. Done properly it is three new
  pure modules, a three-way test split and a rename, for no user-visible effect.
  **The node-test trade survives it, which was the actual question.**

**Storage compatibility was proven, not asserted**, by extracting the real Step
1/3-era modules from `af0e12c`, having that code write a save, and opening it
with today's reader. Forward: scramble and every favorite come back identical,
`solves` empty. Backward: a Step 10 file read by Step 3 code is fine — **but if
that old build writes, the solves are gone.** Not a blocker, and the reason is
specific: **the cube has never shipped to `main`**, so no build in the wild can
do it. Reachable only by rolling an EAS Update branch of the epic back on a
device that already has solves. Worth knowing; not worth a migration.

Also fixed: the `3.1.0` build-notes entry still carried Step 1's date. Read back
as a whole it **does** read like one feature — scramble → inspect → hold → write
→ annotate → compare → keep, which is the order it is used in — so nothing was
restructured, and nothing was added for Step 10 either: its one user-visible
change is that the entry's existing promise about backgrounding is now more true.

Verified with `npm test` (889, one new), `npx expo-doctor` (18/18), `npx expo
export --platform all`, `background.mjs` both ways, and `walk.mjs` at 320×568,
375×667 and 393×852 — no overflow, no console errors, and the legend's newly
derived label reading character-for-character what the hand-written one said.

**The merge's one condition was answered the same day and the answer was that it
had never been open** (operator, 2026-08-07): *"I've been testing on device the
whole way."* The review had recorded the device pass as unproven because every
piece of written evidence in `docs/` is headless — and that was a gap in the
record, not in the testing. It re-reads the whole epic: the 300ms threshold, the
armed `′`, the unanimated second quarter and the tick track's removal are all
device findings, and none of them could have come from a browser. **The process
lesson for the next epic is to say so when a correction comes from a hand** —
nine steps of headless evidence and a trail of hand-found corrections read, to a
reviewer, like a feature that had never been held.

### **Step 9 — compare your attempts** ✅ *(2026-08-06)*

Shipped: **the solves list can answer "am I getting better at this scramble?"**
A **Compare** toggle turns the per-scramble list into a table — one row per
attempt, one column per phase — and `First block  8 · 7 · 6` reads straight down
the column. The fewest moves in each column is marked. **888** tests across the
app, 40 of them new. *(This entry and the one below said 875 until Step 10
measured the suite at Step 9's own merge commit and got 888.)*

**It cost the cube nothing**, which is most of the argument for where it went.
The 42-move annotated budget is identical to Step 8's:

| Solve mode, 42 moves, annotated | Step 8 | Step 9 |
|---|---|---|
| 320×568 | 145 | **145** |
| 375×667 | 244 | **244** |
| 393×852 | 373 | **373** (width-bound) |

The whole of the thinking is `comparePhases` in `solveList.js`, next to
`phaseSpans` — **the arrangement is a join on a label** and nothing here counts
anything. Five decisions worth not relitigating, all in plan §8.10:

- **Rows read oldest first**, which is backwards from the picker and right here:
  improvement happens forwards.
- **Unnamed spans are not columns.** `In progress` is not something two solves
  have in common, and the zero-length boundary at the end of a solve — the one
  the strip skips and the modal lists — never appears. So a row's columns can
  total less than its moves, and the row carries its own total rather than
  pretending they add up.
- **A phase only one solve has marked has no best**; marking it would dress up a
  sample of one. Ties are all marked.
- **A label used twice in one solve is summed and says `2 groups`.**
- **The column order is merged from the orders the solves themselves use.** Roux
  beside CFOP produces eight columns and no equivalence is invented.

Two things it learned, neither of which a passing test would have said:

- **Four Roux columns do not fit 320 points at any round number.** The first cut
  used a constant 54 and put `LSE` past the right edge — no overflow flag, no
  console error, just the last phase of every solve hidden behind a swipe nobody
  knew to make. The width is measured now (`compareLayout.js`, pure and tested
  for the same reason `trackLayout.js` is), and where the columns genuinely
  cannot fit the legend says how many phases there are.
- **The accent is a fill everywhere else on this screen and a number here.** That
  is a different contrast problem and `#c62828` loses it: **1.63 on `twilight`**,
  2.25 on `dark`. Both look fine in a screenshot, which is exactly how the four
  key tints got in during Step 8. `accentInk` lifts it toward white on a dark
  surface and `padPalette.test.js` pins it on all eight themes.

Verified with `npm test` (888 — see above), `npx expo-doctor` (18/18), `npx expo
export --platform all`, and four headless drivers at 320×568, 375×667 and 393×852 with
the screenshots read: `budget.mjs` seeds the 42-move annotated solve and prints
every row of solve mode with its height, proving the numbers above; `compare.mjs`
opens the list from the bar under the pad, switches to Compare, reads every cell
back by `aria-label` and returns to the list; `edges.mjs` covers a lone solve
(no toggle offered), two unannotated solves, one annotated beside one not, and a
phase named twice; `themes.mjs` drives it on `dark` and `twilight`, which is
where the contrast bug was found. **Not yet seen on a device.**

### **Step 8 — the designed solve screen** ✅ *(2026-08-05)*

Shipped: **prime is a hold and a half turn is a second tap**, and the pad is a
spatial cross. Tap `R` and you get `R`; hold it past 180ms — with a hairline
filling across the key's foot from 0ms, then an accent fill, a ring, a `′` and a
haptic — and you get `R'`; tap it again and the `R` you just wrote becomes `R2`.
The armed `'` and `2` keys are gone, and `E` and `S` took their cells. The
scrubber is a card with a **phase-split tick track**, and its five transport
glyphs are redrawn as one family. 812 tests across the app, 56 of them new.

This closes **open question 8**, the epic's longest-running, open since Step 3.

**Two things use changed, the same day it shipped.** The operator drilled on it
and sent back two corrections, both of the kind only a hand finds:

- ~~**The tick track.**~~ **Removed** — *"let's remove the red segments above the
  scrub controls."* At 42 moves each tick is six points wide, so the picture of
  the solve is a row of identical dashes, and the position it encodes is said
  exactly by `42 / 42` an inch below. It cost **22 points of cube to restate a
  number.** The phase chips keep the part that was earning its keep.
  `tickTrack.js` and its tests went with it.
- **Prime became two gestures** — *"it's hard to see the prime symbols when your
  finger is on the button and holding."* The hold's whole confirmation is drawn
  on the key being held, i.e. **under the thumb causing it**, and that is the one
  thing three viewport widths in a browser cannot show you: the browser has no
  thumb. So the armed `′` came back in the cell the design left empty, as a
  *second route*. While it is armed every move key relabels to `R'`, `U'`, `M'` —
  Step 3's one good idea about modifiers — and the `′` key is the only thing that
  fills accent. Filling all fourteen was tried first and erases both the four
  tints and the flag's status as the sole accent key.
- **Then the `′` key was made to light for the hold too**, not only for its own
  tap. Same fix, second application, and it generalises into a rule worth
  keeping: **the pad must always say "a prime is coming" somewhere the hand is
  not.** Everything a hold says about itself is drawn on the key being held.

**The two routes differ on one rule, deliberately:** an armed prime beats a
pending promotion (arming is a *statement*), a hold does not (a hold is a
*duration*, and a finger resting a moment too long on the second tap should do
the harmless thing — `R2'` is `R2`).

**And the promotion never animated its second quarter** — *"the second one
doesn't seem animated"* — which turned out to be structural. Plan §5 says an
algorithm change is a growth or a replacement; a promotion is **neither**, because
it rewrites the token the cube is standing on, so `extendsAlg` correctly called it
a replacement and the transport reset. Sampling the renderer showed **one
distinct frame** against seventeen for an ordinary tap. `promotedTurn` is the
third case and the cube now carries on round the rest of the sweep.

**The sweep is signed, and that is the part to keep.** `shortWay(2)` is `+2`
whichever way you came, but `D` turns anticlockwise — so continuing a `D2`
naively puts the layer 180° from where the cube is and it snaps across before
turning. `turnAngle`/`partialTurn` take an optional signed quarter count for this
one caller. **None of it shows from the ends**, so it is pinned as exact
arithmetic in `geometry.test.js`, with a test that the unsigned version lands a
unit away.

Five things it learned:

- **A design's "10pt side margins" are measured from the screen edge, and the
  page already provides them.** Setting them on the card as well double-counted
  and pushed the transport one point off the right edge at 320. The
  horizontal-overflow check has now caught a real bug in two consecutive steps.
- **The transport row does not fit 320 at the design's spacing** — it was drawn
  at 375. The first fix let the two end labels shrink and the position readout
  came out as `39 / …`, which is the one thing on that row that has to be read.
  **Air first, then labels, never the targets.**
- **On a dark theme the four tints cannot live in the backgrounds.** Tinted far
  enough for a dark key they land **ΔE 0.9–2.6 apart**, against the 6.12 the
  design has on white — the exact mistake the Fungiku regions made. The grouping
  moved to the border and the label (ΔE 6.3–6.9). And mixing the label toward the
  *theme's* text colour breaks on `twilight`, whose title is a mid-lightness
  purple: contrast 3.1 on its own key. Lift toward white.
- **The promotion is guarded by the text, not the timer.** It *rewrites* the last
  token where an append only adds one, so a stale one would resurrect a move an
  undo had just deleted — the Step 3 race pointed at something worse.
  `promoteLastToken` refuses on anything but a last token that is exactly the
  key, so the race is closed by construction rather than by the disarm that also
  happens.
- **The legend is the row that gives.** §8.8 predicted it and it was right: with
  it, the 320 case was a **94-point** cube, which would have undone a third of
  Step 7. It is now drawn only where the cube is already limited by the width of
  the phone (`LEGEND_MIN_HEIGHT`) — §8.6's budget rule made executable, keyed on
  the **window** and not on the measured stage, because a row whose presence
  depends on a measurement it changes is a layout that oscillates.

**What it cost the cube**, on a 42-move annotated solve:

| Solve mode, 42 moves, annotated | Step 7 | as designed | as shipped |
|---|---|---|---|
| 320×568 | 194 | 123 | **145** |
| 375×667 | 293 | 222 | **244** |
| 393×852 | 373 | 373 | **373** (width-bound) |

**−49**, once the tick track came out and gave 22 back. The chrome that remains is
the pad at 126 → 152 and the scrubber card at 42 → 59, both of which are the
design. Whether −49 is the right trade is still the operator's call — see open
question 14 — but it is a different question from the −71 the first cut asked.

Also worth not rediscovering: **Clear left the pad** ("nothing that edits the
solve wears a move colour") and went to the solves list next to Delete, because
the header is three icons at 320 and full. It leaves the list open afterwards,
which is what Delete already did. **The method chip was not built** — §8.8 rules
the Roux↔CFOP switch a feature this epic has not planned, and a chip that only
labels a method nothing else knows about would be inventing state.

Verified with `npm test` (812), `npx expo-doctor` (18/18), `npx expo export
--platform all`, and five headless drivers at 320×568, 375×667 and 393×852 with
the screenshots read: `budget.mjs` seeds a 42-move annotated solve into
`localStorage` and prints every row of the page with its height, the cube's size
and both overflow flags; `hold.mjs` drives the gesture **as a timed gesture** —
`mouse.down()`, wait, `mouse.up()` — across tap, hold, tap-again, the third tap,
a hold on the promoting tap, backspace, and sliding off a key both held and
tapped; `race.mjs` presses a key *inside* an undo's 260ms and proves nothing is
resurrected, and that the promotion still works and still lapses; `walk.mjs`
clicks the transport, a token, the phase chip, the text field, the flag and Clear
by `aria-label` and checks the scramble gets one undivided tick group;
`states.mjs` photographs the pad mid-hold at 95ms and past the threshold; and
`prime.mjs` walks the armed route — arm, relabel, spend, cancel, beat a
promotion, and confirm an undo disarms it.

**The haptic is the one thing none of that can see.** It is a `Platform.OS !==
'web'` call, so every check above ran with it switched off. Look at it on a
device — and Step 7's entry below is why that sentence is here.

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
saying **"yellow up · blue left"** as you drag (it said *front* until
2026-08-06 — see plan §8.3 for why the left colour is the one Roux names). Tap **Set start** and that hold
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
