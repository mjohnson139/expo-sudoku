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

## Next step: **Step 3 — game shell + hub navigation**

Branch: **`feature/fungiku-hub`** off `epic/fungiku`.
Plan: **§6 ("Menu, navigation, and the hub")** plus the §7 table row for step 3.

### Why this step exists

**Fungiku currently feels like an afterthought — because structurally it is
one.** The app opens straight into Sudoku, and Fungiku is reached from a button
inside Sudoku's own game menu. That says "Sudoku is the app, Fungiku is a
guest." This step makes them **peers behind a hub**, before more game logic gets
built into the wrong shape.

### Read first

- `SudokuApp/App.js` — renders `GameScreen` directly today; becomes the router.
- `SudokuApp/screens/GameScreen.js`, `components/GameHeader.js`,
  `components/modals/GameMenuModal.js` — Sudoku's entry, header, and the menu
  currently hosting the Fungiku preview button.
- `SudokuApp/games/fungiku/FungikuPreview.js` — moves onto Fungiku's own screen.
- `SudokuApp/contexts/GameContext.js` — Sudoku's timer/menu/persistence
  behavior, which must not regress.

### Scope — ONLY this

1. **Screen router in `App.js`** — route is `'hub'` or a game id. **Do not add a
   navigation library.** Two or three games don't justify `react-navigation`'s
   native setup, and this matches the sibling **color-loop** app, whose hub lives
   in `App.tsx` with each game under `games/<name>/`.
2. **Game registry — `games/registry.js`** — one entry per game:
   `{ id, title, tagline, icon, accent, Screen }`. The hub renders its cards from
   the registry, so a third game is a registry entry, not a UI edit.
3. **Hub screen — `screens/HubScreen.js`** — app title, a card per game,
   theme-aware, with a **Continue** affordance when a game has saved progress.
4. **Back-to-hub** — a home affordance in each game's header.
5. **`games/fungiku/FungikuScreen.js`** — Fungiku's own screen, initially hosting
   the preview content. **Remove the Fungiku button from `GameMenuModal`.**
6. **Sudoku's files stay where they are.** The registry points at the existing
   `GameScreen`. Relocating Sudoku under `games/sudoku/` is deliberately
   deferred — do not do it here.

### Behaviors that are easy to get wrong (plan §6)

- **Pause Sudoku's timer when leaving for the hub.** Today it only pauses on the
  menu and on backgrounding, so navigating away would leave the clock running
  with nobody playing. This is the top thing to get right in this step.
- **Entering Sudoku from the hub must still reach difficulty selection** — its
  menu auto-opens when no game is in progress.
- **Navigating to the hub is not quitting** — in-progress state must survive.
- **Per-game storage keys stay separate** so the games never clobber each other.

### Out of scope for this step

- **No Fungiku game logic.** No reducer, no marks, no tap-to-place — that is
  Step 4. The Fungiku screen just hosts the existing read-only preview.
- **No palette fixing.** At 8 regions sky blue/blue read similarly as pastel
  fills (orange/yellow too). Logged against **Step 5's palette tuning pass**.
- **No Sudoku gameplay changes.** Timer-pause-on-navigate and a header home
  button are the only expected Sudoku-side edits.

### App title — pick a placeholder, don't block

The app ships as "Sudoku" but will now host two games as peers, so the hub needs
a title. This is an **open branding question the operator hasn't answered**
(§8 #2). Pick a sensible placeholder, keep it as a **single constant that's
trivial to change**, and say in your PR exactly where to change it.

### Visible in Expo Go when this lands

The app opens on a **hub showing Sudoku and Fungiku side by side as peers**; you
can tap into either game and get back. Verify in a browser: hub → Sudoku → back
→ Fungiku → back, no page errors, and **the Sudoku timer paused after navigating
away**. Screenshot the hub.

---

## Open questions for the operator (carry these forward)

1. ~~**Mode name**~~ — decided: **"Fungiku"** (internal id `fungiku`).
2. **App name** — it ships as "Sudoku" but is about to host two games as peers.
   Keep "Sudoku" (undersells Fungiku), a neutral puzzle-collection brand, or lead
   with the family name? The app name, icon and store listing follow from it.
   *Unanswered — use a placeholder.*
3. **Hub vs. resume on launch** — always open on the hub with a *Continue* badge
   (recommended: both games stay discoverable), or jump straight back into a game
   in progress? *Unanswered — build the hub-first behavior.*
4. **Ladder shape** — v1 targets 5×5 → 8×8. Where should it top out, and is size
   a free choice or unlocked by progression? *(Step 6 concern.)*
5. **Assist defaults** — should auto-X be on by default for younger players?
   *(Step 6 concern.)*

## Steps already done

| # | Step | Where |
|---|------|-------|
| 0 | Upgrade Expo SDK 53 → 54 | merged to `main` (#66) |
| 1 | Rendering seam — `Symbol.js` + `symbolSets.js` | merged to `main` (#67) |
| — | ~~Symbol-set toggle on the Sudoku board~~ | closed unmerged (#68) — superseded by the replan |
| 2 | Replan + engine + preview + hub design | merged to `epic/fungiku` (#69, `fecb271`) |
