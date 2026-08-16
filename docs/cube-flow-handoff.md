# Cube Flow — next-step handoff

**If you are a session picking up Cube Flow work: this file is your entry point.
Read it first, then do the step described under "Next step" below.**

It always describes **exactly one step — the next one**. It is rewritten at the
end of every step so the following session can start from a one-line prompt.

## The one-line prompt that starts a session

```
Work in mjohnson139/expo-sudoku. Continue the Cube Flow epic: check out
epic/cube-flow, read docs/cube-flow-handoff.md and do the next step it describes.
```

Nothing else needs to be pasted.

## Before you finish: rewrite this file

**This is part of every step's definition of done.** Before you open your PR,
replace the "Next step" section with a brief for the step *after* yours, at the
same level of detail — scope, the files to read, the behaviours that are easy to
get wrong, what must be visible in Expo Go, and how to verify. Carry the open
questions forward.

---

## Standing context (true for every step)

- **Repo:** `mjohnson139/expo-sudoku`. App code is in **`SudokuApp/`**
  (Expo · React Native · JavaScript).
- **Source of truth:** `docs/cube-flow-plan.md`. Read it end to end before
  writing code — what the epic changes and why (§1), the decisions already taken
  (§2), the step table (§3), what is out of scope (§4), the things that are easy
  to get wrong (§5), open questions (§6).
- **Read `docs/cube-plan.md` too.** It is a closed epic's plan, but it is the
  reasoning behind every line this epic edits. §7.1 (what survives a
  background), §8.5 (markers, not ranges) and §8.6 (the cube is sized first and
  every other row is on a budget) are **still in force** and are not overturned
  here.
- **The design:** `Cube Flow.dc.html` in the Claude Design project
  `2acc14f2-7f7e-434f-a29d-e0fe29fa876a`, settled 2026-08-16. That project's
  `design-decisions.md` has the settled summary in prose.
- **Tracker:** GitHub issue **#107**. Tick your step's checkboxes as you go.
- **Process:** `.github/dev-process.md` — one delivery step per branch, commit
  after each step, **prompt the operator to test after each step.**

### Branching

```
main ─── epic/cube-flow ─── feature/cube-flow-<step>   (PRs target epic/cube-flow)
```

Branch from **`epic/cube-flow`** and open your PR **against** it. The epic merges
to `main` once the flow is worth shipping, so `main` never carries a half-rebuilt
screen.

`epic/cube-flow` is cut from `main` at `a691be2`, the commit that closed the V1
cube epic. Pushing it publishes an EAS Update branch of the same name, so the
epic is always openable in Expo Go (project → Branches) even with no step PR
open.

### Golden rules

- **The cube's code lives under `games/cube/`.** Sudoku and Fungiku keep working
  exactly as they do. **This epic has exactly one sanctioned exception and it is
  Step 1**: `App.js` and `package.json`, for the navigator. A step that needs to
  touch anything else outside `games/cube/` should say why in its PR.
- **`editOpen` is the only edit funnel** for the open solve, and `withMoves` is
  the only sanctioned moves-edit patch. Two writers is how the file and the
  screen learn to disagree.
- **Say what a new row costs the cube, in points, in the PR.** V1 §8.6's rule.
  It is what made the layout legible in the end, and this epic is adding rows.
- **Pure modules carry the logic.** The test runner is `testEnvironment: "node"`
  with no jsdom and no renderer, so nothing that could be *wrong* belongs inside a
  component. `trackLayout.js` and `compareLayout.js` are the pattern: arithmetic
  in its own file, with its own suite.
- **There is no lint and no typecheck.** `npm test` and the operator are the
  whole net.
- **The device is the only evidence that counts for feel.** Both animation bugs
  this repo has shipped were invisible in a browser, and one layout bug was only
  visible on a phone. **Write down when a finding came from a device.**

---

## Next step — Step 1: put the app on a real stack

**Adopt `react-navigation` (native-stack), and change nothing else.** The app
must look and behave exactly as it does today. This step exists to separate a
native dependency change from every design change that follows, so that a
regression has one suspect.

This is an **operator decision already taken** (2026-08-16) against the
hand-rolled alternative. `App.js:6-18` says "Deliberately not a navigation
library… Revisit if the app ever grows genuinely deep navigation." This is that
moment: Step 2 pushes a solve screen onto a stack.

### Scope

- `npx expo install @react-navigation/native @react-navigation/native-stack
  react-native-screens`
- Rewrite `App.js` as `SafeAreaProvider` → `NavigationContainer` →
  `createNativeStackNavigator`, `headerShown: false` (every screen already draws
  its own `ScreenHeader`). Routes: `Hub`, plus one per `games/registry.js` entry.
- **Nothing inside `games/` changes.** `HubScreen`'s `onSelectGame` and each
  game's `onExitToHub` keep their prop names; adapt at the call site only.

### The files to read first

- `App.js` — the whole current router is lines 19–121, and the doc comment at
  6–18 explains what the current design is buying.
- `games/registry.js` — `HUB_ROUTE`, `getGame`, and the three entries.
- `screens/HubScreen.js` — takes `onSelectGame` and nothing else.

### Easy to get wrong

1. **Unmount on leave is load-bearing.** `App.js:6-18` relies on it to stop
   timers and to force re-hydration from storage — a game screen's state is
   *supposed* to die when you leave. A native-stack **pop** unmounts the popped
   screen, so `popToTop()` for the home button is equivalent. A `navigate` to an
   already-mounted route is **not**. Verify by leaving a game mid-timer and
   returning.
2. **Remount on resume.** The `appKey` bump on `AppState → 'active'`
   (`App.js:25-32`) exists to restore the UI after a background. It must survive
   the rewrite as a `key` somewhere.
3. **Simulator tap interception.** `handleTouchStart` / `global.touchHandler`,
   the `DeviceEventEmitter.emit('simulatorTap', …)` native path and the web
   `CustomEvent('simulatorTap')` path currently wrap the entire tree. Keep them
   wrapping the container.
4. **A style variant must be a whole style.** Not new here, but
   `react-native-web` and Yoga disagree about flattened `[base, variant]` arrays
   and this repo has shipped a phone-only bug because of it.

### What must be visible in Expo Go

Nothing new. That is the test: **the app is indistinguishable from `main`**,
except that Android hardware back and the iOS edge swipe now leave a game.

`react-native-screens` **is included in Expo Go** (checked against the Expo SDK
docs, `inExpoGo: true`), and `react-native-safe-area-context` and
`react-native-gesture-handler` are already dependencies — so the EAS Update / PR
preview loop keeps working and no custom dev build is needed.

### How to verify

- `npm test` from `SudokuApp/` — green, unchanged. No new tests: this is
  component wiring and the runner cannot render components.
- All three games open from the hub and return to it.
- **Android hardware back** returns to the hub from each game.
- **iOS edge-swipe** returns to the hub from each game.
- Background and resume inside each game — progress restores as before.
- **The gh-pages web preview still routes.** `react-native-screens` no-ops under
  `react-native-web`, but this is the part of the decision that is assumption
  rather than knowledge, so check it rather than reasoning about it.
- A **device pass**, not just a browser.

### After it merges — do not skip this

**Rebuild the `preview` and `production` EAS channels.** An EAS Update cannot
ship native code, and `app.json` pins `runtimeVersion.policy: "sdkVersion"`, so
an existing binary will **silently keep serving the old bundle** rather than
failing loudly. This is the one operational cost of adopting a navigator and it
is easy to forget precisely because nothing appears to break.

### Then rewrite this file for Step 2

Step 2 splits `CubeScreen.js` (1525 lines) into `CubeHomeScreen` and
`CubeSolveScreen` over a `CubeContext` that owns the persisted state, and turns
the `solving` flag into a route. `docs/cube-flow-plan.md` §3.2 is the brief.

---

## Open questions being carried forward

From `docs/cube-flow-plan.md` §6 — none of these block Step 1, and all of them
want a drilling session rather than an opinion:

1. Does the rail want a "no method" option for a scratch attempt?
2. Where does the Compare table belong now — a home header button, or a card?
3. Is long-press the right home for rename / duplicate / delete?
4. Should the rail lock a phase automatically when the cube reaches the stage's
   goal state?
5. Does the phase-split tick track come back once the rail exists?
6. How many variations per phase is too many?

V1's own open questions (`docs/cube-handoff.md`) are unaffected and still stand.
