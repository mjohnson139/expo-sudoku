# Cube Scramble — architecture review and merge decision

**Step 10, 2026-08-07.** The brief is `docs/cube-plan.md` §8.11: stand back from
nine steps of feature work, against one bar — *would a staff engineer sign this
off* — and end in a decision rather than a diff.

This document **is** the deliverable. The code changes that came out of it are
four, all small, and they are listed under [What was
changed](#what-was-changed); everything else the review found is written down
here as a finding with a recommendation and was deliberately not built.

---

## The verdict

**Merge `epic/cube` into `main`: yes. Unconditionally.**

Nothing found in this review blocks it.

This document was first written with **one condition** on it — that the cube be
drilled on a physical handset before the merge, because every check this epic
runs is a browser at three widths and Step 7 shipped a header that passed all of
them and was broken on a phone. **The operator answered it the same day
(2026-08-07): they have been testing on device the whole way through the epic.**

That is worth recording rather than just deleting, because it re-reads the whole
evidence trail: the corrections that arrived mid-step and looked like polish were
device findings all along — *"I'm getting a lot of prime moves when I want a
regular turn"* (the 300ms threshold), *"it's hard to see the prime symbols when
your finger is on the button"* (the armed `′`), *"the second one doesn't seem
animated"* (`promotedTurn`), *"let's remove the red segments"* (the tick track).
**None of those could have come from a browser.** The device pass was not
missing; it was continuous, and it was the source of the epic's best corrections.
The gap was in the *record*, not in the testing.

What the review is signing off:

- **The pure core is real and it is the reason this epic is reviewable at all.**
  Twelve of the 29 modules in `games/cube/` import nothing from React Native —
  3,072 lines carrying **427 of the app's 889 tests**, one suite per module, no
  suite testing anything else's job. `moves`, `cubeState`, `geometry`,
  `orientation`, `player`, `solve`, `solveList`, `scramble`, `trackLayout`,
  `compareLayout`, `padPalette` and `favorites` are where the thinking is, and
  the components above them draw it.
- **The data-is-the-source-of-truth habit is genuine**, not just claimed.
  `PAD_LAYOUT` → derived `PAD_KEYS`, `PHASE_METHODS`, `GROUPS`/`LEGEND` in
  `padPalette.js`, `BASE_MOVES`/`WIDE_MOVES` in `moves.js`. Two exceptions were
  found and both are noted below; both were one-line-class problems, not
  structural ones.
- **The one-rule-one-function rule holds where it matters most.** `clampPhases`
  has exactly two callers and they are the live edit and the file read, which is
  the pairing Step 6's scar is about. `withMoves` funnels every edit to a solve's
  moves. `extendsAlg` and `promotedTurn` each have one definition and one caller.
  `phaseSpans` is the only thing that counts a phase, and `comparePhases` calls it
  rather than counting again.
- **Nothing here is more general than its use.** No plugin framework, no game
  SDK, no base class, no abstract `Game`. `games/registry.js` is a list of seven-
  field objects and the hub maps over it. **This review proposes none of those
  either** — three games is not evidence for any of them.

---

## The bar, in order

### 1. Is the data the source of truth, or is it in the code?

Mostly the data. The epic's own exemplar is honest: `PAD_LAYOUT` owns which key
sits where and `PAD_KEYS` is `PAD_LAYOUT.filter(cell => cell.key).map(...)`, so
adding a key is one edit. `padPalette.js` holds the design's five groups as hexes
and derives every themed variant from them. `PHASE_METHODS` holds the Roux and
CFOP vocabularies as data and `CubePhaseModal` renders whatever is in it.

**Two places kept a second copy of a list**, and both are the same failure shape
— a table that cannot be *derived* from the first one, and so was quietly allowed
to drift out of step with it:

- `SPOKEN_KEY` in `solve.js` is the pad's fourteen keys a second time, as sounds.
  It genuinely cannot be derived from `PAD_LAYOUT` (a layout does not know how a
  key is pronounced) **and its domain is wider besides** — a solve typed into the
  text field can contain `Rw` or `u`, which the pad has no key for. So the right
  answer is not to merge the tables but to pin them against each other. **Fixed**,
  as a test.
- `CubePadLegend`'s `accessibilityLabel` restated `LEGEND`'s four groups as a
  hand-written string. A fifth tint would have been drawn and not announced.
  **Fixed**, by putting the spoken form in `LEGEND` beside the printed one.

The one *structural* hit on this bar is `CubeSolvesModal`'s List/Compare toggle,
where an inline two-element array carries the keys but the label and hint are
three separate `mode.key === 'compare'` ternaries in the JSX below it. It is six
lines and two modes. **Written down, not fixed** — see finding 5.

### 2. One rule, one function

Checked every rule with more than one caller:

| Rule | Where it lives | Callers | Verdict |
|---|---|---|---|
| What a press means | `applyPadPress` (`solve.js`) | `tapKey` only | ✅ one home |
| What shifts a phase marker | `clampPhases` (`solveList.js`) | `withMoves` (live), `sanitizePhases` (file) | ✅ the pairing Step 6 exists for |
| Extension vs. replacement | `extendsAlg` (`player.js`) | `useScramblePlayer` | ✅ |
| The third case, a promotion | `promotedTurn` (`player.js`) | `useScramblePlayer` | ✅ |
| What counts a phase | `phaseSpans` (`solveList.js`) | strip, modal, `comparePhases` | ✅ nothing else counts |
| Half-finished gestures | `resetGesture` (`CubeScreen`) | nine transitions | ✅ and the comment says why |
| Normalizing an algorithm | `normalizeAlg` (`moves.js`) | favorites, solves, storage | ✅ re-exported, not re-implemented |

Two near-misses, both written down rather than fixed:

- **Clearing a solve is spelled `{ alg: '', phases: [] }` in two places** —
  `clearSolve` and `clearSolveById` in `CubeScreen.js`. The second delegates to
  the first when the solve is the open one and writes the literal itself when it
  is not. It is the same rule twice, in the file whose golden rule this is. See
  finding 4.
- **`describeSolve` (`solve.js`) and `describeSolveSize` (`solveList.js`)** both
  turn a move count into English, differing only in what zero says ("No moves
  yet" vs "empty"). That difference is real — one is a status bar, one is a row
  in a picker — so this is a duplication that is *arguably* correct. See finding
  6.

### 3. Is anything more general than its one use?

**No, and this is the strongest part of the epic.** The temptation this bar
exists to catch — a `Game` base class, a `usePuzzleScreen`, a shared
`GameStorage` — has been resisted for three games running. `games/registry.js` is
a plain array. `App.js` routes on `id` with no branching per game. `ScreenHeader`
grew a `dense` prop and an `actions` prop **whose absence is exactly the old
behaviour**, which is the correct way to extend a shared component and is worth
naming as the pattern.

The only thing in the cube that is more general than its use is `turnAngle` /
`partialTurn` taking an optional signed sweep for a single caller — and that is
already documented as such, with the invariant a second caller would have to
meet. Leave it.

---

## Plugging into the greater game platform

The cube imports **six** things from outside `games/cube/`:

`hooks/useAppTheme` · `hooks/useBoardSize` · `components/ScreenHeader` ·
`utils/gameProgress` · `utils/debounce` · `utils/color`

Fungiku imports the same six plus `usePersistentReducer`, `useBoardOrigin`,
`components/Symbol` and `utils/symbolSets`. **That overlap is the platform**, and
the review's answer is that it is honest and it is nearly the whole contract.

- **No game-specific special cases leaked out.** Grepped for `id === 'cube'` and
  for `games/cube` across the app: the only references outside `games/cube/` are
  the registry entry, `gameProgress.js`'s import, and one comment in
  `ScreenHeader.js`. The registry's promise holds at the UI layer — **the hub and
  the router have never learned that the cube exists.**
- **What the cube does *not* touch is evidence too**, and the review confirms it
  rather than proposing otherwise: no `contexts/`, no wallet, no coins. Fungiku's
  economy is ten files, none of them shared. Two games that have nothing to do
  with each other are correctly coupled by nothing. **A cross-game economy is not
  recommended and was not designed.**

### The headline candidate: `utils/gameProgress.js` inverts the dependency

Confirmed, and it is real: a shared util imports three games' internals
(`games/fungiku/engine`, `games/fungiku/difficulty`, `games/cube/scramble`), and
`games/cube/storage.js` imports `describeCubeProgress` back out of it. So the
path is `games/cube/storage → utils/gameProgress → games/cube/scramble`, and
"adding a game is an entry in the registry" is **not quite true** — it is an
entry, plus an edit to a util every other game depends on.

**§8.11 says to check the cost before recommending it. Here is the cost, and it
is not the cost the fix's sketch assumes.**

The reason all three `describe*Progress` functions live in a shared util is
stated at the top of the file and it is correct: **jest runs with
`testEnvironment: "node"` and no React Native mocks**, so any module a test
imports must be transitively free of React Native. The obvious home for each
function — next to the game's own storage — is precisely the home that breaks
this, because `games/cube/storage.js` and `games/fungiku/storage.js` both import
`AsyncStorage`. Move `describeCubeProgress` into `storage.js` and 34 assertions
in `utils/__tests__/gameProgress.test.js` stop being runnable.

So the fix is not "move three functions". It is:

1. Three new pure modules — `games/cube/progress.js`, `games/fungiku/progress.js`
   and a home for Sudoku's, which currently has none under `games/`.
2. Splitting `utils/__tests__/gameProgress.test.js` (209 lines, 34 assertions)
   three ways.
3. Leaving `gameProgress.js` holding `formatElapsed` and `titleCase` — at which
   point it is `utils/format.js` and should be renamed.

**Which way it came out: recommend it, but not here and not as a review's
"concrete and small".** It is six files and three test suites for an
architectural tidy with no user-visible effect, which is exactly the kind of
change §8.11 tells this step not to make. It preserves the node-test trade
completely — that was the real question and the answer is yes — so it is a safe
follow-up whenever someone is next in those files. **It is not a merge blocker:
the inversion is ugly on a diagram and costs nothing at runtime, and the
registry's promise is broken only for the person adding the fourth game.**

### Two ways to persist one thing — and one of them was missing a piece

Fungiku uses `hooks/usePersistentReducer`; the cube rolls its own debounced
writer over `AsyncStorage` in `games/cube/storage.js`. §8.11 asks the review to
say which is right, "because right now the answer is nobody decided".

**The answer is that the cube is correct to roll its own, and the platform does
not have a persistence primitive — `usePersistentReducer` is a reducer hook that
happens to persist.** It is built around `useReducer` and a restore *action*; the
cube has no reducer and eight independent pieces of `useState`, and wrapping them
in a reducer to reach a persistence helper would be inverting the tail and the
dog. The save shapes differ in kind too, as §8.11 anticipated: Fungiku writes
puzzle identity and rebuilds the rest deterministically, the cube writes one blob
read by shape with no version branch.

**But rolling your own means writing all of it, and one part was missing.** That
is finding 1, below, and it is the only defect this review found.

---

## Findings

### 1. The cube never flushed its pending write when the app backgrounded — **fixed**

**Severity: real, and it is the one the epic would have minded most.**

`saveCubeState` is debounced 400ms. `CubeScreen` flushed it on **unmount** — which
covers leaving for the hub — and nothing else. **Backgrounding the app does not
unmount anything**, so the last edit sat in the debounce, and a phone that then
evicted the process never wrote it. What that costs is up to 400ms of *authored*
work: the move just entered, the name just typed, the marker just dropped.

This is the exact failure Step 4 was built to answer — *"if I background the app
and come back… my solve I was working on is gone"* — reintroduced in a narrower
window. And the cube was **the only persisted surface in the app without the
guard**: `usePersistentReducer` has had an `AppState` listener since the hub
existed, `useFungikuWallet` has its own, and `utils/debounce`'s own docstring
names the two moments `flush()` is for as *"a screen unmounts **or the app
backgrounds**"*. The cube did one half.

Fixed with the same eleven lines `usePersistentReducer` uses. **Proven rather
than asserted**, by driving the real web export both ways — see
[Evidence](#evidence).

### 2. `SPOKEN_KEY` was a second copy of the pad's keys with nothing pinning it — **fixed (as a test)**

Add a key to `PAD_LAYOUT` and it appears on the pad, is parsed, is written, and
**reads out to a screen reader as a bare letter**, because `describeToken` falls
back to the character. `M` would be said as "M" rather than "M slice".

The interesting part is *why it survived nine steps*: `solve.test.js` already
walked every pad key through `describeToken` — and asserted `toBeTruthy()`. **The
fallback is truthy.** The test that looked like it covered this could not fail.
Now pinned properly: every `PAD_KEYS` entry must have a non-empty `SPOKEN_KEY`
entry.

### 3. Two pieces of dead code — **fixed**

- `FACE_NAMES` in `cubeState.js` — six entries, exported, **never imported by
  anything**, and its comment says it is "for the face legend", which was never
  built. Worse than merely dead: it is a *second* mapping of face → colour name,
  next to the live `COLOR_NAMES` in `orientation.js` that the hold readout uses.
  Two answers to "what colour is D", one of them unreachable.
- `styles.iconOnly` in `CubeScreen.js` — a leftover from the action row Step 7
  deleted.

Both removed. No behaviour change; the sweep that found them turned up nothing
else (one unused export across 29 modules is a good number).

### 4. Clearing a solve is one rule in two places — **written down**

`clearSolve()` and `clearSolveById(id)` in `CubeScreen.js` both spell the cleared
state as the literal `{ alg: '', phases: [] }`. The split itself is right and its
comment explains it well — clearing a solve that is *not* on the cube must not
touch the transport. It is only the shape that is duplicated.

**Recommendation:** a `clearedMoves()` (or a `CLEARED` constant) exported from
`solveList.js`, next to `withMoves`, used by both. Three lines and two edits.

**Not fixed here**, and the reason is worth stating: this is the review's own
temptation. It is small, it is correct, and it buys nothing today — the two
literals cannot drift into a *bug*, only into an inconsistency. It belongs in the
next step that opens `CubeScreen.js` for another reason.

### 5. The List/Compare toggle spells its rule in JSX — **written down**

`CubeSolvesModal.js` builds the toggle from a two-element array and then asks
`mode.key === 'compare'` three more times in the JSX for the label, the hint and
the handler. Putting `label`, `hint` and `compare: true|false` in the array
objects would make the array the whole rule.

Six lines, two modes, no plausible third. **Recommendation: do it if a third mode
ever appears, not before.**

### 6. `describeSolve` and `describeSolveSize` are near-duplicates — **written down, and probably correct as-is**

Both render a move count; they differ only at zero ("No moves yet" vs "empty").
`solve.js` is one page and `solveList.js` is the book, and the two strings serve
a status bar and a picker row respectively — so this is arguably one rule with
two presentations rather than two implementations of one rule. **Recommendation:
leave it.** Noted only so the next person who spots it does not have to re-derive
the argument.

### 7. `readCubeSave` still lives in `favorites.js` — **decided: leave it, and the reason has changed**

§8.11 gives this step standing to decide whether a `cubeSave.js` is worth the
churn. **It is not**, and the argument is stronger than "it is where every caller
looks": `readCubeSave` is four lines that call `sanitizeFavorites` (local),
`sanitizeSolves` and `sanitizeWorkspace` (both from `solveList.js`). A
`cubeSave.js` would be a file whose entire content is a four-line function
delegating to two other files. **The file is misnamed, not misplaced.** If it
ever grates, rename `favorites.js` — do not split it.

### 8. `MAX_SOLVES` is 100, culled by creation date — **decided: not a finding**

§8.11 says decide rather than change. `savedAt` is creation time and is never
bumped, so editing a very old solve does not protect it — but the cap is per
*file*, not per scramble, and 100 solves is unreachable in practice. Step 9 made
old solves worth keeping, which is the thing that would make this real. **It is
not real yet.** Revisit if the cap ever comes down; do not change it in a review.

### 9. Documentation drift — **fixed in the handoff**

Three numbers in `docs/` had fallen behind the code. `docs/cube-plan.md` §8.11
says "24 modules in `games/cube/`" and "Step 9 added a 26th"; the actual count is
**29**. The handoff says the suite is "875 today"; it was **888** at the epic tip
and is **889** now. Corrected where the handoff repeats them. Left alone in the
plan, which is a record of what each step said at the time.

---

## What was changed

Four changes, all of them small, one of them a defect fix:

| File | Change |
|---|---|
| `games/cube/CubeScreen.js` | Flush the pending save on `AppState` background/inactive (finding 1). Remove the dead `iconOnly` style (finding 3). |
| `games/cube/solve.js` | Export `SPOKEN_KEY` so the pad's two key lists can be pinned against each other (finding 2). |
| `games/cube/__tests__/solve.test.js` | The pin: every pad key has a spoken form (finding 2). |
| `games/cube/padPalette.js`, `games/cube/CubePadLegend.js` | `LEGEND` carries the spoken word beside the printed one; the legend's `accessibilityLabel` is derived from it rather than restating it (bar 1). |
| `games/cube/cubeState.js` | Remove the dead, duplicative `FACE_NAMES` (finding 3). |
| `utils/buildNotes.js` | `3.1.0`'s date moved to the merge date. |

**No logic in the pure core was touched, and nothing was moved out of it into a
component.**

---

## The merge decision

### Does it stand up on a device?

**Yes — confirmed by the operator (2026-08-07), who has been testing on device
throughout the epic.**

This review initially recorded it as unproven, because the *written* evidence in
`docs/` is entirely headless: browsers at three widths, screenshots read back,
overflow flags. That was a gap in the record and not in the testing, and the
distinction matters for anyone reading this later. Three things are invisible to
any headless check by construction, and all three were in fact judged by hand:

- **`expo-haptics` fires exactly once**, at the hold threshold, guarded by
  `Platform.OS !== 'web'`. Every automated check ever run on this epic ran with
  it switched off.
- **The hold gesture's whole confirmation is drawn under the thumb causing it**,
  which is exactly what produced the armed `′` key as a second route. *The
  browser has no thumb.*
- **The turn animation's feel**, which `docs/fungiku-plan.md` §2 warns about and
  which no assertion about the ends of a move can see.

**The lesson for the next epic is a process one, not a code one:** when a device
finding arrives as a one-line correction — *"I'm getting a lot of prime moves"* —
write down that it came from a device. Nine steps of headless evidence and a
trail of hand-found corrections read, to a reviewer, like a feature that had
never been held. It had been held the whole time.

### Storage compatibility — proven, not asserted

§8.11 says prove it. The proof was run by extracting the **actual Step 1/3-era
`favorites.js`, `moves.js` and `scramble.js` from commit `af0e12c`**, having that
code write a save file, and opening it with today's reader — and then the reverse.

- **Forward (the real case — a user upgrades).** A `{_v: 1, scramble, favorites}`
  file written by the Step 3 code, read by today's `readCubeSave`: the scramble
  and all three favorites come back identical, `solves` is `[]`, `workspace` is
  the empty workspace. **Nothing lost.** ✅
- **Backward (a downgrade).** A Step 10 file read by the Step 3 code: the
  scramble and the favorites come back identical and the solves are simply not
  seen — no crash, no corruption. ✅ **But if that old build then writes, the
  solves are gone** (1 → 0 in the run), because its writer emits only two keys.

  **This is not a merge blocker and the reason is specific: the cube has never
  shipped to `main`.** There is no build in the wild that can read `@CubeScramble`
  and write it back without `solves`. The only way to reach this is to open an
  older EAS Update branch of the epic itself, in Expo Go, on a device that already
  has solves — which is an operator's own workflow, not a user's. **Worth knowing
  before rolling an update back; not worth a migration.**
- **Round trip.** An annotated solve — hold, twelve moves, a phase marker —
  through today's writer and reader comes back deep-equal, with `r U r'` still
  spelled the way it was typed rather than canonicalised to `Rw U Rw'` (plan §4).
  The one thing that does not survive bit-identically is the view angle, which
  `sanitizeView` wraps: **3.3e-16 radians of float drift per round trip**, which is
  noise and is the price of `wrapAngle` refusing to store a yaw of `1e9`.

### The three runs

| | Result |
|---|---|
| `npm test` | **889 passed, 25 suites** (888 before this step; +1 new test) |
| `npx expo-doctor` | **18/18 — no network failures in this environment** |
| `npx expo export --platform all` | **web + iOS + Android all bundled** |

### Build notes and `app.json`

Per §12 these are per release, not per step. `app.json`'s `expo.version` is
`3.1.0` and matches the newest key in `utils/buildNotes.js`. ✅

**Read back as a whole, the `3.1.0` entry does read like one feature** rather than
nine steps stapled together: it opens by saying what the tool is, then walks
scramble → inspect → hold → write → annotate → compare → keep, which is the order
someone actually uses it in. No restructuring needed. The only stale field was the
**date**, which still said `2026-08-01` — Step 1's day, not the release's. Moved to
the merge date.

Nothing was added for Step 10: its one user-visible change is that a solve
written in the half-second before you background the app is now kept, and the
entry already promises *"Solves are kept: background the app, come back, and your
solve is where you left it."* **That line is simply more true than it was.**

---

## Evidence

Beyond the three standard runs:

- **`background.mjs`** — the fix, driven against the real web export at 375×667.
  It taps `Solve`, sets a hold, writes one move, and backgrounds the app **60ms
  later**, well inside the 400ms debounce, then reads `localStorage` directly.
  react-native-web maps `AppState` to `visibilitychange`, so everything
  downstream of the visibility signal is the app's own unmodified path:
  AppState → the screen's listener → `flush()` → AsyncStorage → `localStorage`.
  **With the fix: `Solve 1: "R"`. With the listener disabled and the bundle
  re-exported: `Solve 1: ""`.** The counterfactual is what makes it a proof and
  not a passing test.

  *(Headless Chromium keeps a backgrounded tab `visible` — there is no window
  manager to hide it — so `document.visibilityState` is driven directly. That is
  the one stubbed input; on a device the OS supplies it.)*
- **The operator's own device testing**, continuous across the epic and the
  source of Step 8's two same-day corrections, Step 7a, and the 300ms hold
  threshold. It is the evidence this document was missing rather than the
  evidence the epic was missing.
- **`walk.mjs`** — a regression walk at 320×568, 375×667 and 393×852: into the
  cube, into solve mode, set the hold, three moves through the pad, open the
  solves list, back out. **No horizontal overflow, no vertical overflow, no
  console errors at any size**, and the legend's newly-derived label reads
  `Key colours: faces, slices, wide turns, rotations` at 393×852 — character-for-
  character what the hand-written string said — and is correctly absent below
  `LEGEND_MIN_HEIGHT` at the two shorter sizes.
- **The storage proof** above, run against code extracted from `af0e12c`.

---

## What this review deliberately did not do

- **It did not build a plugin framework, a game SDK or a base class.** §8.11 rules
  them out and the review agrees: three games is not enough evidence, and
  inventing one here would fail its own review.
- **It did not re-propose the two rows that left the table on 2026-08-06.** The
  text editor is tabled and the optimizer is outsourced (plan §8.9). Both
  decisions look right from here — in particular, the argument that improving a
  block changes the cube every later move is applied to, so marker arithmetic
  would carefully preserve annotations that had stopped being true, is a better
  argument than "it is a lot of work".
- **It did not move logic out of the pure core.** §8.11 says any such finding is
  a finding to reject, and none arose.
- **It did not fix everything it found.** Three findings are written down with
  recommendations and left for whoever is next in those files.
