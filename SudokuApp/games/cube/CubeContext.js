import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import {
  createAlgorithm,
  editAlgorithm,
  findAlgorithm,
  removeAlgorithm,
} from './algorithms';
import { cubeFromAlg, solvedCube } from './cubeState';
import { DEFAULT_PITCH, DEFAULT_YAW, wrapAngle } from './geometry';
import { normalizeAlg } from './moves';
import { METHODS } from './methods';
import { addMethodStage, duplicateMethod, editMethod, methodCatalogue, removeMethod, renameStageReferences } from './userMethods';
import { randomScramble } from './scramble';
import {
  createSolve,
  duplicateSolve,
  editSolve,
  findSolve,
  removeSolve,
  renameSolve,
  solvesFor,
} from './solveList';
import { addFavorite, isFavorite, removeFavorite } from './favorites';
import { loadCubeState, saveCubeState } from './storage';

/**
 * Everything the cube persists, owned above both of its screens
 * (docs/cube-flow-plan.md §3.2).
 *
 * ### Why this exists
 *
 * Until Step 2 the scramble and the solve were one screen with a `solving` flag
 * on it, so "the state both modes share" and "the state of the component" were
 * the same thing and there was nothing to arrange. A push has two components,
 * and **a screen under a push stays mounted** — the trap Step 1 hit with the
 * hub's Continue badges (plan §5). Anything either screen worked out once at
 * mount would be stale the moment the other one changed it.
 *
 * So the scramble, the favorites, the solves, which solve is open and the view
 * angle live here, above the nested stack, and **there is exactly one writer**:
 * the debounced save effect below. A screen that calls `saveCubeState` itself is
 * the bug this shape exists to prevent.
 *
 * ### `editOpen` is the only edit funnel
 *
 * Every edit to the open solve — a key, an undo, a clear, a typed algorithm, the
 * hold, a marker — goes through `editOpen`, so there is one place where "what the
 * operator wrote" becomes "what is in the file". V1 put every edit through it
 * deliberately (docs/cube-plan.md §7.1) and this epic does not get to add a
 * second door. Anything touching the *moves* goes through `withMoves` on top of
 * it, at the call site, because a marker is an index into the list being edited.
 *
 * ### The route replaced the flag
 *
 * `solving` is gone from state and from the save file. What is persisted is
 * `openId` — as `workspace.solveId`, and **only while the solve route is
 * mounted**, which is what makes the file able to restore a pushed screen
 * (`solveOpen` below). `openId` itself keeps V1's meaning the rest of the time:
 * *the page you are on for this scramble* — which, since Step 3 put the solves
 * on the scramble screen as cards, is what decides which card wears the accent
 * and sits at the top of the list.
 */
const CubeContext = createContext(undefined);

/**
 * The cube's own two routes.
 *
 * They live beside the state rather than in `CubeScreen.js` because both screens
 * navigate and `CubeScreen.js` imports both of them — a constant in the
 * navigator would be an import cycle for the sake of a string.
 */
export const HOME_ROUTE = 'scramble';
export const SOLVE_ROUTE = 'solve';

/**
 * The library's two routes (docs/cube-methods-plan.md §3.1).
 *
 * Routes on the cube's own stack rather than modals, and that is the epic's
 * golden rule made concrete: every screen it adds is a route here, so nothing
 * outside `games/cube/` is edited and Android's back and the iOS edge swipe come
 * for free at both levels.
 *
 * `LIBRARY_ROUTE` is pushed over the scramble and `ENTRY_ROUTE` over that, so
 * backing out of an entry lands on the library and backing out of the library
 * lands on the scramble. **Both stay mounted under a push** (plan §5), which is
 * exactly why the collection they draw lives here rather than in either of them.
 */
export const LIBRARY_ROUTE = 'algorithms';
export const ENTRY_ROUTE = 'algorithm';
export const WORKBENCH_ROUTE = 'workbench';
export const METHODS_ROUTE = 'methods';

export const CubeProvider = ({ children, fallback = null }) => {
  const [userMethods, setUserMethods] = useState([]);
  const methods = useMemo(() => methodCatalogue(userMethods, METHODS), [userMethods]);
  // Hydration gate. Until the saved scramble is read there is nothing honest to
  // draw: generating one immediately would flash a scramble the player never
  // asked for and then replace it with theirs. It also gates the *writer* —
  // saving before the read lands would overwrite the player's solves with the
  // empty list this provider starts at.
  const [hydrated, setHydrated] = useState(false);
  const [scramble, setScramble] = useState('');
  const [favorites, setFavorites] = useState([]);

  // Every solve the operator has written, against every scramble — persisted,
  // and the reason V1's Step 4 existed. The hold and the moves are fields of one
  // of these rather than state of a screen (docs/cube-plan.md §7.1).
  const [solves, setSolves] = useState([]);
  // Which solve is on the cube, by id.
  const [openId, setOpenId] = useState(null);

  /**
   * The algorithm library (docs/cube-methods-plan.md §3.1) — persisted, and
   * shared by two routes that are both pushed over the scramble.
   *
   * It lives up here for the same reason `solves` does, and the reason is
   * sharper for this one: **a screen under a push stays mounted** (plan §5), so
   * the library list would be stale the moment an entry two routes away was
   * edited if either screen held its own copy. Both read this one.
   *
   * It is deliberately *not* scoped to anything. There is one library, it has
   * nothing to do with which scramble is on the cube, and Step 3 will write into
   * it from the solve screen.
   */
  const [algorithms, setAlgorithms] = useState([]);

  /**
   * Is the solve route mounted?
   *
   * This is the half of the old `solving` flag that is genuinely state: the
   * navigator owns *where you are*, and the file has to be able to say so, or a
   * resume would drop you on the scramble with your solve one tap away and no
   * sign of it. Reported by the two screens' `focus` listeners rather than kept
   * in step by hand — the pushed screen is focused, the one under it is not, and
   * that is true for the chevron, the hardware back and the edge swipe alike.
   *
   * Deliberately **not** "openId is set": `openId` outlives the push, which is
   * what keeps the card you were last on accented after you have backed out of
   * it.
   */
  const [solveOpen, setSolveOpen] = useState(false);

  /**
   * Did the save say a solve was open?
   *
   * Read by `CubeHome` to put the pushed screen back on the stack after a cold
   * start — and *only* a cold start since Step 3a, because the cube no longer
   * remounts on resume (`keepsStateOnResume`, `games/registry.js`). **Cleared
   * the moment it has been acted on**.
   * That is not tidiness: a restore is one event in this provider's lifetime, and
   * a flag that stayed true would fire again on any later remount of the screen
   * reading it — which, when the restore is itself a navigation, is a loop.
   */
  const [restoredOpen, setRestoredOpen] = useState(false);
  const clearRestoredOpen = useCallback(() => setRestoredOpen(false), []);

  // The view angle is **kept** (operator, 2026-08-06) and deliberately not reset
  // by a new scramble: turning the cube to where you want it is a thing you did
  // on purpose, and neither getting a new scramble nor coming back tomorrow
  // means you wanted it moved. `DEFAULT_YAW`/`DEFAULT_PITCH` are the *opening*
  // view — the first visit, and where `Reset view` and `Start view` go back to —
  // rather than the view every visit begins at (docs/cube-plan.md §7.1).
  const [yaw, setYaw] = useState(DEFAULT_YAW);
  const [pitch, setPitch] = useState(DEFAULT_PITCH);

  /**
   * The angle **Set start** left the cube at, and which solve it was set for.
   *
   * Transient, like the angle itself — what is *authored* is the hold, and the
   * hold is stored. This only has to survive until the operator pans away and
   * taps `Start view`, so that the button goes back to the view they chose
   * rather than to a default they never asked for.
   *
   * Tagged with the solve's id rather than reset by every callback that could
   * invalidate it: switching pages, loading a favorite and starting a new solve
   * would each have to remember to clear it, and the one that forgot would send
   * `Start view` to another solve's angle.
   *
   * It lives up here rather than on the solve screen because that screen now
   * unmounts on every back — and the angle you picked should still be there when
   * you come back to the page you picked it on.
   */
  const [chosenView, setChosenView] = useState(null);

  useEffect(() => {
    let cancelled = false;

    loadCubeState(methods).then((saved) => {
      if (cancelled) return;
      setFavorites(saved.favorites);
      setSolves(saved.solves);
      setAlgorithms(saved.algorithms);
      setUserMethods(saved.methods);
      // First ever visit: there should be a cube to look at, not an empty screen
      // with a button on it.
      const alg = saved.scramble || randomScramble();
      setScramble(alg);

      // `sanitizeWorkspace` has already checked that the saved solve exists and
      // belongs to the scramble being restored, so a non-null id here is always
      // a page that can be opened. Null means the operator was on the scramble —
      // and then the page for it is the most recent one written against it,
      // which is what `showScramble` would have chosen.
      const wasOpen = saved.workspace.solveId;
      const mine = solvesFor(saved.solves, alg);
      setOpenId(wasOpen || (mine.length > 0 ? mine[0].id : null));
      setRestoredOpen(wasOpen !== null);

      // Only when there is one: a first visit has no remembered angle, and the
      // default the state already holds is the opening view.
      if (saved.workspace.view) {
        setYaw(saved.workspace.view.yaw);
        setPitch(saved.workspace.view.pitch);
      }
      setHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist after hydration only.
  //
  // `yaw` and `pitch` change on every frame of a drag, and that is what the
  // debounce in `saveCubeState` is for: the timer restarts while the finger is
  // moving and one write lands 400ms after it stops. A drag is the *only* thing
  // on these screens that changes state continuously, so it is also the only
  // thing that would have made an undebounced writer obvious.
  useEffect(() => {
    if (!hydrated) return;
    saveCubeState({
      scramble,
      favorites,
      solves,
      algorithms,
      methods: userMethods,
      workspace: { solveId: solveOpen ? openId : null, view: { yaw, pitch } },
    });
  }, [hydrated, scramble, favorites, solves, algorithms, userMethods, solveOpen, openId, yaw, pitch]);

  // Leaving for the hub unmounts this provider, and a debounced write that has
  // not fired yet is a write that never happens. **It belongs to the provider's
  // lifetime, not a screen's**: on a screen that now unmounts on every back it
  // would fire far more often than intended, and dropped altogether it would
  // cost the last 400ms of authored work on every background.
  useEffect(() => () => saveCubeState.flush(), []);

  /**
   * Backgrounding the app is the *other* way a pending write is lost, and it is
   * the one that matters here (V1 Step 10's review).
   *
   * Nothing unmounts when the system sends the app to the background — the
   * effect above does not run — so the 400ms debounce is simply left holding the
   * last edit, and a phone that then evicts the process never writes it. What
   * that costs is up to 400ms of *authored* work: the move just entered, the
   * name just typed, the marker just dropped.
   *
   * `inactive` counts as well as `background`: iOS passes through it on the way
   * out, and on a quick swipe up it is as far as the app gets.
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') saveCubeState.flush();
    });
    return () => subscription.remove();
  }, []);

  // The cube a solve starts on: the scramble fully applied, which is the cube
  // the operator would be holding. Memoized because it is also the *identity*
  // `useScramblePlayer` uses to tell "the algorithm grew" from "the algorithm
  // was replaced" — a new object every render would read as a new scramble every
  // keystroke. Unreadable text can only come from a save file written by another
  // build; a solved cube beats a crash (docs/cube-plan.md §7).
  const scrambledCube = useMemo(() => {
    try {
      return cubeFromAlg(scramble);
    } catch (error) {
      return solvedCube();
    }
  }, [scramble]);

  // A solve names the scramble it belongs to by that scramble's algorithm text,
  // the way a favorite names itself (docs/cube-plan.md §7) — so this is the key
  // both lists agree on, and it is why a solve does not need its scramble to be
  // favourited.
  const scrambleKey = useMemo(() => normalizeAlg(scramble), [scramble]);
  const mySolves = useMemo(() => solvesFor(solves, scrambleKey), [solves, scrambleKey]);

  /**
   * The solve on the cube, or null.
   *
   * Cross-checked against the scramble rather than trusted, because `openId`
   * outlives the scramble it was chosen under: a favorite loaded from the list
   * changes the scramble, and a pointer to somebody else's page is worse than no
   * pointer at all.
   */
  const openSolve = useMemo(() => {
    const found = findSolve(solves, openId);
    return found && found.scramble === scrambleKey ? found : null;
  }, [solves, openId, scrambleKey]);

  const saved = isFavorite(favorites, scramble);

  /**
   * Put a different scramble on the cube, and point at whatever was last written
   * against it.
   *
   * This used to be an effect on `scramble` that cleared the solve. It cannot be
   * one, and that is the trap worth naming: this provider mounts with an empty
   * scramble and fills it from storage, so an effect keyed on `scramble` fires
   * once during **hydration** — and would wipe the workspace it had just
   * restored. Changing the scramble is something two buttons do, so it is
   * written where those buttons are and hydration never trips it.
   */
  const showScramble = useCallback(
    (alg) => {
      setScramble(alg);
      // The most recent solve for the scramble arriving, which is the page you
      // were last on for it. Nothing there is not a problem: Solve starts one.
      const mine = solvesFor(solves, alg);
      setOpenId(mine.length > 0 ? mine[0].id : null);
    },
    [solves]
  );

  const newScramble = useCallback(() => {
    showScramble(randomScramble());
  }, [showScramble]);

  const toggleSaved = useCallback(() => {
    setFavorites((current) =>
      isFavorite(current, scramble)
        ? removeFavorite(current, scramble)
        : addFavorite(current, scramble)
    );
  }, [scramble]);

  const removeSaved = useCallback((alg) => {
    setFavorites((current) => removeFavorite(current, alg));
  }, []);

  /**
   * Change the open solve, keeping it in the list.
   *
   * `patch` is the fields to change or a function of the solve, and an id that
   * no longer names anything is a no-op rather than a crash.
   *
   * **`editSolve` rather than `updateSolve` since Step 4**, which is where the
   * stamp goes: this is the app's only edit funnel, so `editedAt` is written in
   * exactly one place instead of at every call site that happens to remember.
   * The clock is read here rather than passed in for the same reason the save is
   * debounced here — this is the layer that knows what "now" means, and
   * `solveList.js` stays a pure module with an injectable one.
   */
  const editOpen = useCallback(
    (patch) => {
      setSolves((current) => editSolve(current, openId, patch));
    },
    [openId]
  );

  /**
   * Start a fresh page against the scramble on the cube, and open it.
   *
   * `method` is a method id from `methods.js` or **null** for Freeform, and it
   * is asked for before this is called (`CubeNewSolveSheet`) rather than set
   * afterwards — Step 5's rail is built from it, so it has to be true from the
   * first move. Defaulting to null keeps every other caller honest: a solve
   * created without an opinion is a Freeform one, which is what a solve created
   * before this step was.
   *
   * Returns the solve, or null when there is no scramble to write one against.
   */
  const startNewSolve = useCallback(
    ({ method = null } = {}) => {
      const { solves: grown, solve: made } = createSolve(solves, scrambleKey, { method }, methods);
      if (!made) return null;
      setSolves(grown);
      setOpenId(made.id);
      return made;
    },
    [solves, scrambleKey, methods]
  );

  /**
   * Put a particular solve on the cube.
   *
   * **`resumeSolve` retired here in Step 3** — it was "open the page you were
   * last on, and start one if there is nothing to resume", which is what the
   * bottom row's Solve button needed and the card list makes unnecessary. Every
   * route onto the solve screen now names a page, because the operator is
   * pointing at one.
   */
  const showSolve = useCallback((id) => {
    setOpenId(id);
  }, []);

  // Copy a solve and open the copy — "same first block, try the second block
  // differently", which starts by keeping what you already had.
  const copySolve = useCallback(
    (id) => {
      const { solves: grown, solve: made } = duplicateSolve(solves, id);
      if (!made) return null;
      setSolves(grown);
      setOpenId(made.id);
      return made;
    },
    [solves]
  );

  /**
   * Forget a solve.
   *
   * Deleting the one on the cube has to leave the screen somewhere, and the
   * honest somewhere is the next most recent page for this scramble — or, if
   * that was the last one, back at the scramble. **Returns the id left open**,
   * or null, so the caller can leave the solve route when there is no longer a
   * page under it; leaving `openId` pointing at a deleted solve would empty the
   * screen without saying why.
   */
  const deleteSolve = useCallback(
    (id) => {
      const grown = removeSolve(solves, id);
      setSolves(grown);
      if (id !== openId) return openId;

      const remaining = solvesFor(grown, scrambleKey);
      const next = remaining.length > 0 ? remaining[0].id : null;
      setOpenId(next);
      return next;
    },
    [solves, openId, scrambleKey]
  );

  const renameSolveById = useCallback((id, name) => {
    setSolves((current) => renameSolve(current, id, name));
  }, []);

  /**
   * Clear a solve's moves, by id.
   *
   * The one edit that does *not* go through `withMoves`: clearing is "remove
   * every move", and a marker at 0 would survive the clamp and leave a label
   * hanging off a solve with nothing in it. V1 noted the double spelling of this
   * as a known wart; Step 6 makes it undoable and is the step that gets to fix
   * it. Pausing the transport when it is the open solve is the caller's job —
   * only the screen holding the transport knows there is one.
   *
   * `editSolve` and not `updateSolve`, though this one is reached by id rather
   * than through `editOpen`: emptying a page is unmistakably writing to it, and
   * a card that still said "3 days ago" after you had just cleared it would be
   * describing a solve that no longer exists.
   */
  const clearSolveById = useCallback((id) => {
    setSolves((current) => editSolve(current, id, { alg: '', phases: [], algorithmRuns: [] }));
  }, []);

  // ——— The algorithm library (docs/cube-methods-plan.md §3.1) ———————————

  /**
   * Write a new entry, and hand it back.
   *
   * Returns the entry rather than just growing the list, for the reason
   * `startNewSolve` does: the caller has to open what it just made, and looking
   * it back up by name would be the one lookup that can be wrong. **Null when
   * the moves do not parse or the library is full** — `createAlgorithm` refuses
   * rather than evicting, and the screen has to be able to say so.
   *
   * The functional `setAlgorithms` is not decoration: the entry screen creates
   * from inside a modal callback, and reading `algorithms` out of a closure that
   * was built a render ago is how a library loses an entry.
   */
  const addAlgorithm = useCallback((fields) => {
    let made = null;
    setAlgorithms((current) => {
      const { algorithms: grown, algorithm } = createAlgorithm(current, fields, methods);
      made = algorithm;
      return grown;
    });
    return made;
  }, [methods]);

  /**
   * **The library's one edit funnel** (plan §5), and the mirror of `editOpen`.
   *
   * Every change to an entry goes through here — the name as it is typed, the
   * moves, a tapped assignment chip, the notes — so `editedAt` is stamped in one
   * place instead of at every call site that happens to remember, and so the
   * screen cannot write a field that has not been through the sanitizers in
   * `algorithms.js`.
   *
   * The clock is read here rather than passed in, for the reason `editOpen`
   * reads it here: this is the layer that knows what "now" means, and
   * `algorithms.js` stays a pure module with an injectable one.
   */
  const editAlgorithmById = useCallback((id, patch) => {
    setAlgorithms((current) => editAlgorithm(current, id, patch, { catalogue: methods }));
  }, [methods]);

  /** Forget an entry. Unlike a solve there is nothing to move on to: the library
   *  is one list with no notion of which entry is open, so the screen that
   *  deleted it simply leaves. */
  const deleteAlgorithm = useCallback((id) => {
    setAlgorithms((current) => removeAlgorithm(current, id));
  }, []);

  /** An entry by id, or null — read through the context rather than from a copy,
   *  because the entry screen stays mounted under nothing and the library stays
   *  mounted under it. */
  const algorithmById = useCallback((id) => findAlgorithm(algorithms, id), [algorithms]);

  const duplicateMethodById = useCallback((id) => {
    const source = methods.find((method) => method.id === id);
    let made = null;
    setUserMethods((current) => {
      const result = duplicateMethod(current, source);
      made = result.method;
      return result.methods;
    });
    return made;
  }, [methods]);

  const editMethodById = useCallback((id, patch) => setUserMethods((current) => editMethod(current, id, patch)), []);
  const addMethodStageById = useCallback((id, name) => setUserMethods((current) => addMethodStage(current, id, name)), []);
  const renameMethodStage = useCallback((id, from, to) => {
    const changed = renameStageReferences({ methods: userMethods, solves, algorithms }, id, from, to);
    setUserMethods(changed.methods); setSolves(changed.solves); setAlgorithms(changed.algorithms);
  }, [userMethods, solves, algorithms]);
  const deleteMethodById = useCallback((id) => {
    const result = removeMethod(userMethods, id, solves);
    if (!result.reason) setUserMethods(result.methods);
    return result.reason;
  }, [userMethods, solves]);

  // ——— The view (docs/cube-plan.md §7.1) ————————————————————————————————

  const turnTo = useCallback((nextYaw, nextPitch) => {
    setYaw(nextYaw);
    setPitch(nextPitch);
  }, []);

  const resetView = useCallback(() => {
    setYaw(DEFAULT_YAW);
    setPitch(DEFAULT_PITCH);
  }, []);

  // Half a turn from wherever the player is, so the three faces they cannot see
  // are one tap away rather than a long drag.
  const showOtherSide = useCallback(() => {
    setYaw((current) => wrapAngle(current + Math.PI));
    setPitch((current) => wrapAngle(-current));
  }, []);

  /** Remember the angle a hold was picked from, for `startView`. */
  const rememberView = useCallback(
    (view) => {
      setYaw(view.yaw);
      setPitch(view.pitch);
      setChosenView({ id: openId, ...view });
    },
    [openId]
  );

  /**
   * Back to the angle the hold was picked from.
   *
   * Falling back to the default is the honest answer when there is nothing
   * remembered — after a cold start the hold comes back from the file and the
   * angle deliberately does not.
   */
  const startView = useCallback(() => {
    const chosen = chosenView && chosenView.id === openId ? chosenView : null;
    setYaw(chosen ? chosen.yaw : DEFAULT_YAW);
    setPitch(chosen ? chosen.pitch : DEFAULT_PITCH);
  }, [chosenView, openId]);

  const value = useMemo(
    () => ({
      methods,
      scramble,
      scrambleKey,
      scrambledCube,
      saved,
      favorites,
      solves,
      mySolves,
      algorithms,
      openId,
      openSolve,
      restoredOpen,
      clearRestoredOpen,
      yaw,
      pitch,
      showScramble,
      newScramble,
      toggleSaved,
      removeSaved,
      editOpen,
      startNewSolve,
      showSolve,
      copySolve,
      deleteSolve,
      renameSolveById,
      clearSolveById,
      addAlgorithm,
      editAlgorithmById,
      deleteAlgorithm,
      algorithmById,
      userMethods,
      duplicateMethodById,
      editMethodById,
      addMethodStageById,
      renameMethodStage,
      deleteMethodById,
      setSolveOpen,
      turnTo,
      resetView,
      showOtherSide,
      rememberView,
      startView,
    }),
    [
      methods,
      scramble,
      scrambleKey,
      scrambledCube,
      saved,
      favorites,
      solves,
      mySolves,
      algorithms,
      openId,
      openSolve,
      restoredOpen,
      clearRestoredOpen,
      yaw,
      pitch,
      showScramble,
      newScramble,
      toggleSaved,
      removeSaved,
      editOpen,
      startNewSolve,
      showSolve,
      copySolve,
      deleteSolve,
      renameSolveById,
      clearSolveById,
      addAlgorithm,
      editAlgorithmById,
      deleteAlgorithm,
      algorithmById,
      userMethods,
      duplicateMethodById,
      editMethodById,
      addMethodStageById,
      renameMethodStage,
      deleteMethodById,
      turnTo,
      resetView,
      showOtherSide,
      rememberView,
      startView,
    ]
  );

  // The screens are not mounted until the save has landed, which is what lets
  // `CubeHome` decide from `restoredOpen` — once, as it mounts — whether the
  // solve belongs back on the stack.
  return (
    <CubeContext.Provider value={value}>{hydrated ? children : fallback}</CubeContext.Provider>
  );
};

export const useCube = () => {
  const context = useContext(CubeContext);
  if (context === undefined) {
    throw new Error('useCube must be used within a CubeProvider');
  }
  return context;
};

export const useMethods = () => useCube().methods;

/**
 * Tell the provider which of the two screens is on top.
 *
 * Both screens call it, and the listener is `focus` rather than a mount or an
 * unmount on purpose: leaving the cube for the hub unmounts the whole stack
 * without focusing anything, and the file should still say a solve was open so
 * that coming back opens it.
 */
export const useReportsSolveRoute = (navigation, open) => {
  const { setSolveOpen } = useCube();

  useEffect(() => {
    // A screen can also arrive already focused — the restored solve is pushed
    // before it has ever had a listener on it.
    if (navigation.isFocused()) setSolveOpen(open);
    return navigation.addListener('focus', () => setSolveOpen(open));
  }, [navigation, setSolveOpen, open]);
};

export default CubeContext;
