# Cube MCP — Feature Plan

An exploration, not a product. Give a Rubik's cube a **remote MCP interface**, so
that an LLM — Claude, ChatGPT, anything that speaks MCP — can turn it, scramble
it, read its state and try to solve it, while a browser somewhere animates every
move it makes. You open a page, you copy a URL, you paste that URL into a chat
app as a custom connector, and the cube on your screen starts moving because
something on the other side of the internet decided it should.

## For the implementer (start here)

- **This document is the source of truth** for scope and approach, and **§3 is
  deliberately provisional** — see the note there. Step 1 is a spike, and the
  spike is expected to rewrite the rest of this plan.
- **Start here if you are a new session:** **`docs/cube-mcp-handoff.md`** always
  describes *the next step only*, so a session can start from a one-line prompt.
  Rewriting it is part of every step's definition of done.
- **The cube already exists and is not being rebuilt.**
  `mjohnson139/expo-sudoku`'s `SudokuApp/games/cube/` holds a complete, tested
  cube: the model, the notation parser, the 3D projection, the scrambler. Read
  §2's reuse table before writing a single line of cube logic.
- **Tracker:** GitHub issue **#135**.
- **Process:** `.github/dev-process.md` — one delivery step per branch, commit
  after each step, open the PR as soon as the step is pushed, and prompt the
  operator to test. **The testing loop is different for this epic** and §2 says
  how: there is no Expo Go build here, because there is no app change. What the
  operator tests is a URL.

### Branching

```
main ─── epic/cube-mcp ─── feature/cube-mcp-<step>   (PRs target epic/cube-mcp)
```

`epic/cube-mcp` is cut from `main` at `ec703e2`. **The plan and the handoff live
in this repo whatever happens**, because this is where the cube is. Whether the
*server code* lives here is Step 1's to decide (§2).

**This epic ships nothing to the phone app**, so the per-release build-notes rule
(V1 plan §12) does not apply and `app.json`'s version does not move. If a step
ever does change `SudokuApp/`, that step has stopped being this epic and needs
saying out loud.

## 1. What this is, and what makes it cheap

Three epics have built a cube whose **entire model is pure JavaScript with no
React in it**, because the test runner is `testEnvironment: "node"` and the
project's standing rule is that anything which could be *wrong* lives in a module
the runner can reach. That rule was made for testability. It happens to mean the
cube can be lifted out of the app wholesale.

| What | Where | Node-pure? |
|---|---|---|
| The cube model, facelets, `faceletString` | `games/cube/cubeState.js` | **yes** |
| Notation: parse, scan, normalize, count | `games/cube/moves.js` | **yes** |
| Scramble generation | `games/cube/scramble.js` | **yes** |
| 3D projection → polygons (`buildScene`) | `games/cube/geometry.js` | **yes** (imports only `utils/color`) |
| Holds, orientation, `describeOrientation` | `games/cube/orientation.js` | **yes** |
| Notation editing, folds, cancels | `games/cube/solve.js` | **yes** |
| The renderer component | `games/cube/CubeView.js` | no — React + `react-native-svg` |
| The transport / animation hook | `games/cube/useScramblePlayer.js` | no — React |

**`buildScene` is the seam, and it is the whole reuse story.** `CubeView.js` is
about a hundred lines that take `buildScene`'s output and emit `<Polygon>`
elements; a browser viewer takes the same output and emits `<polygon>`. The
projection, the face colours, the z-ordering and the partial-turn sweep are all
on the pure side of that line. **A web cube is `buildScene` plus an `<svg>`, not
a port.**

`faceletString` (`cubeState.js:187`) is the 54-character Kociemba ordering, and
it exists because V1 wanted the shape an external solver would want. It is
exactly what an LLM needs in order to reason about the cube at all.

### What is genuinely new, and it is one thing

**A server that stays up on the public internet.** Every epic so far has been a
client: an Expo app, AsyncStorage, EAS Update, a static gh-pages export. This one
needs an HTTPS endpoint that Anthropic's servers can reach, a place to keep a
session's state, secrets, a bill, and an answer for what happens when it breaks
at midnight. **Every risk in this epic is downstream of that sentence.**

## 2. Decisions taken before the first line

| Question | Decision | Why |
|---|---|---|
| Scope | **A standalone cube per session.** Nothing touches the app's solves, favourites or algorithm library | Operator's call, 2026-08-24. It also *is* the security model — see the auth row, and §4. |
| Host | **Vercel**, where the operator's other deployment already is; **Railway is the sanctioned fallback** | Vercel Functions serve Streamable HTTP MCP (`mcp-handler` / `xmcp` on Fluid compute) and Vercel publishes a guide for exactly this. If serverless coordination (below) turns out to cost more than it saves, Railway's one-process model deletes the problem and the spike may say so. |
| The live channel to the browser | **Polling in the spike; SSE after it** | On Vercel, **no two function instances share memory** — the LLM's tool call and the browser's connection are different invocations, so they need Redis (Upstash) between them. Polling a sequence number needs none of that, and it keeps the riskiest step focused on the risk. WebSockets are supported (public beta) but are not the first thing to reach for. |
| Session identity and auth | **A capability URL** — 128 bits of entropy in the URL **path**, no login, no OAuth | Claude.ai accepts a plain HTTPS URL for a custom connector with no auth at all, so this works. It is also the operator's own instinct, and it is defensible **only** because of the scope row: a cube session holds nothing personal. Read §5 before weakening either half. |
| Whether an OAuth access token could go in the URL instead | **No** | The MCP authorization spec is explicit: *"Access tokens **MUST NOT** be included in the URI query string."* A capability URL is a different construct — a secret path segment, not an OAuth token — and it is not what that sentence forbids. It carries the same practical leak risks all the same (§5). |
| What the LLM sees of the cube | **`faceletString` plus the algorithm so far** | Both already exist and both are exact. Do not invent a prose description of the cube for the model to misread. |
| Where the server code lives | **Step 1 decides** | Operator's call, 2026-08-24. The two candidates and what would settle it are in §3.1. |
| How the operator tests a step | **A URL, not a build** | There is no Expo Go preview here. A step is testable when the operator can open a page and paste a connector URL into a chat app. Say in every PR what the URL is. |

### Why the model and the animation must be allowed to disagree

The one design question that decides the shape of everything: **MCP is
request/response, and an animation takes time.** The LLM will fire
`turn("R U R' U'")` and then immediately ask for the state. If a tool call
blocks until the cube has finished moving, every call costs seconds and the
model's context fills with waiting. If it returns instantly, the viewer is
behind, and a state read disagrees with what is on the screen.

**The existing architecture already answers this**, and the answer is in
`storage.js`'s own words: *"Only the algorithm text is stored, never the cube.
The cube is a pure function of the algorithm."*

So: **the server stores the algorithm and nothing else.** A tool call appends to
it and returns immediately, with the new state computed from the string. The
viewer holds the same string and animates its way through whatever it has not
drawn yet, at its own pace, catching up by skipping if it falls far behind. The
model is always truth; the animation is a *view of history*. `get_state` never
lies and never waits.

## 3. Delivery steps

**§3.1 is real. Everything after it is provisional and is expected to change.**

This is an exploration, and the honest thing to say about a roadmap written
before the first spike is that it is a guess. Step 1 exists to answer questions
that cannot be answered by thinking about them, and **rewriting §3.2 onward in
the light of what it finds is part of Step 1's definition of done.** A plan that
pretended to know Step 5 before knowing whether Claude will connect at all would
be a plan that gets quietly ignored.

| # | Step | Delivers |
|---|---|---|
| 1 | **The spike** | Can an LLM turn a cube in a browser? A decision and a written finding |
| 2 | The session and its link | *provisional* — real sessions, capability URLs, expiry, the copy-the-link page |
| 3 | The tool surface | *provisional* — `get_state`, `turn`, `scramble`, `reset`, and how they are described to a model |
| 4 | The viewer | *provisional* — `buildScene` into an `<svg>`, properly, with the transport's pacing |
| 5 | The live channel | *provisional* — polling becomes SSE |
| 6 | The solving experiment | *provisional* — can it actually do it, and what does it need |
| 7 | Closeout | regression, merge, the handoff becomes a record |

### 3.1 Step 1 — the spike

**Throwaway code, and the deliverable is a decision.** Nothing built here is
promised a future. The step is done when the questions below have written
answers in the plan, not when the code is good.

**Build the smallest thing that could possibly demonstrate the idea:**

- One session, with a hardcoded id. No session creation, no expiry, no security.
- State is the algorithm string and a sequence number, in whatever store is
  fastest to reach for — a module-level variable is fine on Railway; on Vercel
  use Upstash or accept that it resets, because **this step does not need to
  survive a cold start.**
- **One MCP tool: `turn(moves)`.** It appends to the algorithm and returns the
  new `faceletString`. That is all.
- A viewer page that polls `GET /s/<id>/state?since=<seq>` two or three times a
  second and animates whatever came back, via `buildScene`.
- Serve both halves from the same origin so there is no CORS question to lose an
  afternoon to.

**The questions it exists to answer**, each of which needs a sentence in this
plan when the step closes:

1. **Does Claude.ai accept the URL and call the tool?** The whole epic is
   downstream of yes.
2. **Does ChatGPT?** If not, say so plainly and let the operator decide whether
   that changes the epic's worth.
3. **Does it feel like anything?** An LLM firing four turns in a burst and a
   cube animating them at human speed — is that the demo it sounds like, or is
   the lag between "Claude said it" and "the cube did it" fatal?
4. **Vercel or Railway?** Specifically: how much did the no-shared-memory
   constraint actually cost. If the answer is "nothing, polling was fine", Vercel
   wins on the operator already being there.
5. **Where does the code live?** Either **a sibling repo** (`cube-mcp`, keeping
   `expo-sudoku` client-only with no server, no secrets and no uptime story — the
   golden rule that survived three epics) or **a package in this repo**
   (`/cube-mcp` beside `/SudokuApp`, importing `../SudokuApp/games/cube/*.js`
   directly, with one source of truth for the move engine and no sync problem).
   **The deciding evidence is how the import went.** If reaching into
   `SudokuApp/games/cube/` from a server build was clean, that is a real argument
   for one repo; if it needed a bundler fight, that is a real argument for two.
6. **How does the pure cube code travel?** It is ESM with `import`, written for
   Metro. Does it run under a Node/serverless bundler as-is, or does something
   need to change? **If anything in `SudokuApp/games/cube/` has to change to make
   this work, that is a finding worth the whole step** — those files are three
   epics of settled behaviour and this epic does not get to disturb them casually.

**Tests:** none required. This is a spike and pretending otherwise wastes the
step. The cube's own suite already covers everything being reused.

**What the operator tests:** paste the URL into Claude as a custom connector, ask
it to turn the cube, watch the browser.

### 3.2–3.7 — provisional

Written down so the shape is visible, and expected to be wrong in the details.

- **Step 2 — the session and its link.** `POST` a new session; a capability URL
  with 128 bits of entropy in the path; a TTL, because a session that lives
  forever is a URL that leaks forever; a landing page that shows the cube and the
  MCP URL with a copy button and a revoke button. Rate limiting.
- **Step 3 — the tool surface.** `get_state`, `turn`, `scramble`, `reset`,
  `look_at`. **The hard part is the descriptions, not the code** — an MCP tool
  description is a prompt, and "turn the cube" versus "apply moves in standard
  cube notation, e.g. `R U R' U2`" is the difference between a model that works
  and a model that guesses. Budget real time for writing them and test them
  against an actual model.
- **Step 4 — the viewer, properly.** `buildScene` into SVG, the transport's
  pacing, the catch-up-by-skipping rule from §2, and the cube's existing look.
- **Step 5 — the live channel.** Polling becomes SSE, with the Redis fan-out if
  the host needs one. Reconnection matters: a Vercel connection closes at the
  function's max duration and the browser has to resubscribe.
- **Step 6 — the solving experiment.** The one step that might return a
  disappointing answer, and it should be allowed to. See §4.
- **Step 7 — closeout.**

## 4. What this epic does not do

- **It does not promise that an LLM can solve a Rubik's cube.** It is worth
  saying loudly, at the start, because it is the thing most likely to be quietly
  assumed: models are poor at long-horizon spatial state tracking, and a
  54-character facelet string is exactly the kind of representation they lose
  track of. **The epic's deliverable is the interface**, and the interface is
  demonstrably valuable whether the model solves the cube in twenty moves, two
  hundred, or never. Step 6 is an experiment with a real chance of a negative
  result, and a negative result written down is a good outcome.
- **It does not touch the app's data.** No solves, no favourites, no algorithm
  library, no `@CubeScramble`. This is not a preference — it is what makes a
  no-login capability URL a defensible choice at all (§2), so it cannot be
  relaxed without re-opening the auth decision.
- **It does not change `SudokuApp/`.** The cube's modules are consumed, not
  edited. If the server cannot use them as they are, that is Step 1 finding
  number 6 and it goes to the operator rather than into a quiet patch.
- **It does not build accounts, billing or multi-user anything.** One person,
  their cube, a link they chose to share.
- **It does not implement OAuth.** §2 explains what it does instead and §5
  explains what that costs.

## 5. Things that are easy to get wrong

- **A capability URL is a bearer credential.** Anyone who has the link controls
  that cube — and links leak in ways passwords do not: server logs, browser
  history, `Referer` headers, screen-shares, a screenshot in a chat. The
  mitigations are all cheap and all mandatory: **128 bits of entropy**, a TTL, no
  enumerable ids, rate limiting, a revoke button, and **nothing behind the URL
  that matters.** That last one is doing most of the work, which is why §4 makes
  it a rule rather than a preference.
- **The URL will end up in an LLM's context, and that context is not yours.**
  Pasting a connector URL into a chat app means the URL is stored by that
  provider, may appear in a transcript, and may be shown to whoever the operator
  shares that conversation with. Design as if the URL is semi-public, because it
  is.
- **The model and the animation are allowed to disagree, and the model wins.**
  §2's rule. A tool call must never block on an animation, and `get_state` must
  never return what is currently on screen — it returns the truth. The moment
  those two are conflated, every fast sequence of turns produces a cube that is
  lying to somebody.
- **Vercel functions share no memory.** Two invocations are two machines. Any
  design where "the MCP handler tells the viewer" without a store between them
  works locally, works in a preview, and fails in production the first time two
  requests land on different instances — which is the worst possible failure
  schedule.
- **A long-lived connection is not long-lived.** SSE and WebSocket connections on
  Vercel close at the function's max duration (roughly 300–800 seconds). The
  browser must reconnect and resubscribe, and **the sequence number is what makes
  that safe** — resume from `since`, do not replay from zero.
- **`geometry.js` and friends are three epics of settled behaviour.** They are
  being consumed, not maintained, by this epic. Changing one to suit a server is
  how a bug reaches a phone from a direction nobody was watching.
- **There is no lint and no typecheck in the app repo**, and a server has failure
  modes the app never had — a crash is a 500 for everyone, not a red screen for
  one person. Whatever host is chosen, know how to see its logs before the first
  deploy, not after the first outage.
- **Do not let the spike become the product.** Step 1's code is explicitly
  disposable. The failure mode of a good spike is that it works well enough that
  nobody rewrites it, and then session handling and security get bolted onto
  something that was built with a hardcoded id.

## 6. Open questions for the operator

1. **Does this want to be public?** Everything above assumes one person and their
   own link. A page anyone can visit to get a cube is a different product with a
   different bill and a different abuse surface.
2. **Should the LLM be able to see the cube, rather than read it?** A rendered
   image returned from a tool call is possible and would test something quite
   different about what models can do. It is also a lot more machinery.
3. **Does the app ever get a door into this?** Scope says no for now, and §4
   makes that load-bearing for the auth model. If it ever becomes yes, the auth
   decision reopens first.
4. **What happens when the session is idle for an hour?** A TTL is decided in
   Step 2, and the right number depends on whether the operator wants to come
   back to a cube tomorrow or start fresh every time.
