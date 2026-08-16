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
  exactly as they do. **The epic's one sanctioned exception was Step 1** —
  `App.js` and `package.json`, for the navigator — and it is now spent. A step
  that needs to touch anything outside `games/cube/` should say why in its PR.
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

## What landed in Step 1 (read this before Step 2)

The app is on `@react-navigation/native` + `native-stack` (v7) with
`react-native-screens`. `App.js` is now `SafeAreaProvider` → the existing
`SafeAreaView` that carries the simulator-tap interception →
`NavigationContainer` → `Stack.Navigator` with `headerShown: false`. The hub is
the root route (`HUB_ROUTE`) and each `games/registry.js` entry is a route
pushed on top of it. **Nothing inside `games/` changed.**

Three things Step 2 inherits and should not rediscover:

- **`onExitToHub` is `navigation.popToTop()`**, adapted in `App.js` at the call
  site. Popping unmounts the game screen, which is what keeps the old router's
  "a game screen dies when you leave it" guarantee — verified in a browser: after
  returning to the hub, the game's DOM is gone.
- **The `appKey` remount on `AppState → 'active'` survives** as a `key` built
  from the game id and `appKey`, set on the screen element inside the route's
  children function. It remounts *the open game*, not the navigator, so resuming
  does not disturb the stack.
- **The hub is remounted on the way back**, by `HubRoute` in `App.js`.
  `HubScreen` reads each game's Continue badge on mount and nothing else
  refreshes it; the old router made that sufficient by unmounting the hub behind
  an open game, and a stack keeps it mounted underneath. The remount is keyed
  off a **blur→focus round trip**, not focus alone — the initial route is focused
  as it mounts.

---

## Next step — Step 2: split `CubeScreen`, push the solve

`docs/cube-flow-plan.md` §3.2 is the brief. `CubeScreen.js` is **1525 lines** and
every step after this one adds to it. Split it now, while the split is still
mechanical rather than a rewrite — and turn the `solving` flag into a route,
which is the epic's whole thesis made real.

### Scope

- **`games/cube/CubeContext.js` is new and owns everything persisted** —
  `scramble`, `favorites`, `solves`, `openId`, the hydration gate
  (`CubeScreen.js:283-310`), the debounced save effect (`:320-332`) and the
  `AppState` flush (`:355-359`). One provider above a **nested stack** of
  `CubeHome` and `CubeSolve`, so both screens read one list and there is exactly
  one writer.
- **`editOpen` (`:528`) moves into the context intact and stays the only edit
  funnel.** V1 put every edit through it deliberately; this epic does not get to
  add a second door.
- **The route replaces the flag.** `solving` (`:173`) retires from state *and*
  from the save file's `workspace` (`:326`). `openId` stays persisted.
  `writing = solving && openSolve !== null` (`:400`) becomes "the solve route is
  mounted and has a solve".
- **`inspecting = writing && orientation === null` (`:920`) survives unchanged**
  as the solve screen's first state. The hold is panned to, not typed (V1 §8.3),
  and `orientation`'s three states — `null`, `''`, notation — must stay three.
- **Header split.** Home keeps the home button and the view actions. Solve gets
  the back chevron, `title="Solve 3"` and `subtitle` = the scramble, mono and
  truncated — which is what retires the `solveBar` (`:1301-1328`, styles at
  `:1486-1512`). `ScreenHeader.js:18-20` warns that a *conditional* subtitle
  changes header height, so **the solve header always carries it**.
- `startSolving` (`:547`) / `stopSolving` (`:554`) collapse into a navigate and a
  `goBack`. `openSolveById` (`:602`), `startNewSolve` (`:613`) and `copySolve`
  (`:623`) keep their bodies and end in a navigate.

### The files to read first

- `games/cube/CubeScreen.js` — all of it, once, before moving anything.
- `games/cube/storage.js` — `readCubeSave` reads every version **by shape**, so
  dropping `workspace.solving` needs no `_v` bump; check `sanitizeWorkspace`
  tolerates its absence rather than assuming it does.
- `App.js` — how the cube route is mounted, and the `appKey` remount above it.
- `components/ScreenHeader.js` — the subtitle height warning at `:18-20`, and
  the whole-style-variant rule at `:112-126`.

### Easy to get wrong

1. **The `appKey` remount resets the nested stack.** On resume, `App.js`
   remounts the whole cube screen — so a nested navigator inside it starts back
   at `CubeHome`, losing a pushed solve. This is exactly what persisted `openId`
   is for: **restore the pushed route from `openId` after hydration**, and check
   it on a real background/resume rather than reasoning about it.
2. **Two writers is the failure mode.** The provider owns the state and the
   debounced write; a screen that calls `saveCubeState` itself is the bug.
   `editOpen` in, `withMoves` for anything touching moves.
3. **`saveCubeState.flush()` on unmount (`:332`) has to move up with the state.**
   If it stays on a screen that now unmounts on every `goBack`, it fires far more
   often than intended; if it is dropped, the last 400ms of authored work dies
   with a background. It belongs to the provider's lifetime.
4. **The hydration gate guards the writer.** Writing before the read lands
   overwrites the player's solves with an empty list. Whatever shape the provider
   takes, `hydrated` still gates the save effect.
5. **`removePhase` does not clamp or re-sort** (`solveList.js:377`). Not this
   step's problem, but do not make it one.
6. **A style *variant* must be a whole style.** `[base, variant]` flattens to
   something Yoga and `react-native-web` disagree about, and this repo shipped a
   phone-only bug because of it.

### What must be visible in Expo Go

The cube's V1 behaviour, unchanged, with the mode flip replaced by a push: tap a
solve and the solve screen slides in with a back chevron and the scramble under
its title; back returns to the scramble screen. Nothing else on the screen moves
yet — the card list is Step 3.

### How to verify

- `npm test` from `SudokuApp/` — green. No new tests: the risk is entirely in
  wiring, and the pure modules are untouched. That is the argument for doing this
  as its own step.
- Every V1 behaviour still reachable: write a solve, back out, return to it,
  **background and resume mid-solve**, delete the open solve, change the scramble
  with a solve open, load a favorite with solves against it.
- Android hardware back and the iOS edge swipe leave the solve screen — and from
  the scramble screen they leave the cube for the hub.
- The web preview still routes.
- **A device pass**, and write down which findings came from the device.

### Then rewrite this file for Step 3

Step 3 puts the solves on the scramble screen: the card list, New scramble and
Save move into the header, and `games/cube/recency.js` arrives pure and tested.
`docs/cube-flow-plan.md` §3.3 is the brief.

---

## Open questions being carried forward

From `docs/cube-flow-plan.md` §6 — none of these block Step 2, and all of them
want a drilling session rather than an opinion:

1. Does the rail want a "no method" option for a scratch attempt?
2. Where does the Compare table belong now — a home header button, or a card?
3. Is long-press the right home for rename / duplicate / delete?
4. Should the rail lock a phase automatically when the cube reaches the stage's
   goal state?
5. Does the phase-split tick track come back once the rail exists?
6. How many variations per phase is too many?

V1's own open questions (`docs/cube-handoff.md`) are unaffected and still stand.
