# Cube MCP — next-step handoff

**If you are a session picking up Cube MCP work: this file is your entry point.
Read it first, then do the step described under "Next step" below.**

It always describes **exactly one step — the next one**, and is rewritten at the
end of every step so the following session can start from a one-line prompt.

## The one-line prompt that starts a session

```
Work in mjohnson139/expo-sudoku. Continue the Cube MCP epic: check out
epic/cube-mcp, read docs/cube-mcp-handoff.md and do the next step it describes.
```

## Before you finish: rewrite this file

**Part of every step's definition of done.** Replace the "Next step" section with
a brief for the step after yours — scope, files to read, what is easy to get
wrong, what the operator can open, and how to verify. **For Step 1 this is
larger than usual**: the spike is expected to rewrite `docs/cube-mcp-plan.md`
§3.2 onward as well, in the light of what it found.

---

## Standing context (true for every step)

- **Source of truth:** `docs/cube-mcp-plan.md`. Read it end to end first — what
  this is and what makes it cheap (§1), the decisions already taken (§2), the
  steps (§3, **provisional after §3.1**), what it does not do (§4), the traps
  (§5), open questions (§6).
- **The cube already exists.** `SudokuApp/games/cube/` is a complete, tested
  cube whose model, notation parser, scrambler and 3D projection are all pure
  JavaScript with no React in them. **Plan §1 has the reuse table. Read it before
  writing any cube logic** — nothing about the cube needs to be invented here.
- **Tracker:** GitHub issue **#135**.
- **Process:** `.github/dev-process.md`, with one difference that matters: **this
  epic has no Expo Go build.** It ships nothing to the phone. What the operator
  tests is a URL, so every PR must say what URL to open and what to paste where.
- **This epic does not change `SudokuApp/`** and does not move `app.json`'s
  version. If a step needs to, that is a finding for the operator, not a patch.

### Branching

```
main ─── epic/cube-mcp ─── feature/cube-mcp-<step>   (PRs target epic/cube-mcp)
```

Branch from `epic/cube-mcp`, PR against it. Cut from `main` at `ec703e2`.

**The plan and the handoff live in this repo whatever happens.** Whether the
*server code* does is Step 1's decision (plan §3.1, question 5).

### Golden rules

- **The cube's modules are consumed, not maintained, by this epic.** Three epics
  of settled behaviour live in `games/cube/`. If the server cannot use them as
  they are, say so rather than editing them.
- **The model wins over the animation.** A tool call never blocks on a turn
  finishing, and `get_state` returns the truth rather than what is on screen.
  Plan §2 has the reasoning; it is the epic's load-bearing design rule.
- **Nothing personal goes behind a capability URL.** The no-login link is only
  defensible because a cube session holds nothing worth stealing. That is a rule,
  not a preference (plan §4).
- **Pure modules carry the logic**, as everywhere else in this repo — the app's
  test runner is `testEnvironment: "node"` and that is exactly why the cube is
  liftable at all.

---

## Next step — Step 1: the spike

Plan **§3.1**. **Throwaway code, and the deliverable is a decision.** This step
is done when six questions have written answers in the plan — not when the code
is good. Resist making it good.

### Scope

Build the smallest thing that could possibly demonstrate the idea:

- **One session, hardcoded id.** No creation flow, no expiry, no security.
- **State is the algorithm string and a sequence number**, in whatever store is
  fastest. A module-level variable is fine on Railway. On Vercel use Upstash, or
  accept that it resets — **this step does not need to survive a cold start.**
- **One MCP tool: `turn(moves)`** — appends to the algorithm, returns the new
  `faceletString`. Nothing else. Use `mcp-handler` or `xmcp` on Vercel; the plain
  MCP TypeScript SDK on Railway.
- **A viewer page** that polls `GET /s/<id>/state?since=<seq>` two or three times
  a second and animates what comes back through `buildScene`.
- **Same origin for both halves**, so there is no CORS afternoon.

### The six questions to answer in writing

1. Does Claude.ai accept the URL as a custom connector and call the tool?
2. Does ChatGPT?
3. Does it *feel* like anything — is the lag between the model saying it and the
   cube doing it fatal, or is it the demo it sounds like?
4. Vercel or Railway? Specifically: what did the no-shared-memory constraint
   actually cost?
5. Where should the code live — sibling repo or a package here? **The deciding
   evidence is how the import went.**
6. Does the pure cube code run under a Node/serverless bundler as written? **If
   anything in `games/cube/` has to change, that is a finding worth the whole
   step.**

### Files to read first

- `SudokuApp/games/cube/cubeState.js` — the model. `facelets` (`:160`),
  `faceletString` (`:187`, Kociemba ordering), `cubeFromAlg` (`:120`),
  `applyMoves` (`:112`).
- `SudokuApp/games/cube/moves.js` — `parseAlg`, `tryScanAlg`, `algError`,
  `normalizeAlg`, `moveCount`. **Validate with these**; do not write a parser.
- `SudokuApp/games/cube/geometry.js` — `buildScene`, and the header comment
  explaining why the file has no React in it. **This is the seam.**
- `SudokuApp/games/cube/CubeView.js` — a hundred lines turning `buildScene`'s
  output into `<Polygon>`s. Your viewer is the same thing emitting `<polygon>`.
- `SudokuApp/games/cube/scramble.js` — if the spike wants a scrambled start.
- Plan §2's *"Why the model and the animation must be allowed to disagree"*, which
  is the rule the viewer's polling loop implements.

### Easy to get wrong

1. **Don't build session management.** A hardcoded id is the point. The failure
   mode of a good spike is that it works well enough that nobody rewrites it, and
   then security gets bolted onto something built with a constant in it.
2. **Don't block the tool call on the animation.** Even in a spike — it is the
   design rule the whole epic rests on, and getting it wrong here teaches the
   wrong shape to every step after.
3. **Don't edit `games/cube/`.** If something does not import cleanly, write down
   what and why. That is finding 6 and it is worth more than a workaround.
4. **Two Vercel invocations are two machines.** Any design where the MCP handler
   speaks directly to the viewer works locally and fails in production on the
   first cold start. Polling exists to dodge this entirely — if you find yourself
   reaching for shared memory, stop.
5. **Serve the viewer and the MCP endpoint from one origin.** CORS is not what
   this step is for.
6. **The connector needs a public URL.** Anthropic's servers must reach it —
   `localhost` and a tunnel may behave differently from a real deployment, so
   prove it on a deployed URL before answering question 1.

### What the operator can open

A page with a cube on it, and an MCP URL to copy. They paste it into Claude as a
custom connector, ask it to turn the cube, and watch. **Say in the PR exactly
what URL to open and where to paste it** — there is no QR code and no Expo Go
build for this epic.

### How to verify

- The cube's own suite (`npm test` from `SudokuApp/`) still passes, untouched —
  which is the check that `games/cube/` was not edited.
- The demo above, driven by a real model, on a deployed URL. **A curl against the
  endpoint proves the server works and answers none of the six questions.**

### Then rewrite this file — and the plan

Brief Step 2, and **rewrite plan §3.2 onward** in the light of the answers. The
provisional roadmap there is a guess; replace it with what the spike learned.

## Open questions being carried forward

From `docs/cube-mcp-plan.md` §6:

1. **Does this want to be public?** Everything assumes one person and their link.
2. **Should the LLM see the cube rather than read it?** A rendered image from a
   tool call tests something quite different.
3. **Does the app ever get a door into this?** No for now — and plan §4 makes
   that load-bearing for the auth model, so this reopens the auth decision first.
4. **What TTL does an idle session get?** Decided in Step 2.
