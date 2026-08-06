import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ScreenHeader';
import useAppTheme from '../../hooks/useAppTheme';
import useBoardSize from '../../hooks/useBoardSize';
import CubeView from './CubeView';
import CubeAlgInputModal from './CubeAlgInputModal';
import CubeFavoritesModal from './CubeFavoritesModal';
import CubeMovePad from './CubeMovePad';
import CubeMoveTrack from './CubeMoveTrack';
import CubeNameModal from './CubeNameModal';
import CubePadLegend from './CubePadLegend';
import CubePhaseModal from './CubePhaseModal';
import CubePhaseStrip from './CubePhaseStrip';
import CubeScrubber from './CubeScrubber';
import CubeSolvesModal from './CubeSolvesModal';
import { ALG_FONT } from './algText';
import { applyMoves, cubeFromAlg, solvedCube } from './cubeState';
import { DEFAULT_PITCH, DEFAULT_YAW, wrapAngle } from './geometry';
import { announcePosition } from './player';
import {
  describeOrientation,
  describeOrientationSentence,
  orientationAt,
  viewAfterHold,
} from './orientation';
import { randomScramble } from './scramble';
import {
  PROMOTE_MS,
  appendAlg,
  applyPadPress,
  describeSolve,
  dropLastToken,
  promoteLastToken,
} from './solve';
import {
  createSolve,
  duplicateSolve,
  endPhase,
  findSolve,
  isPhaseBoundary,
  openPhaseStart,
  phaseSpans,
  removePhase,
  removeSolve,
  renameSolve,
  solvesFor,
  updateSolve,
  withMoves,
} from './solveList';
import { moveCount, normalizeAlg, parseAlg } from './moves';
import { addFavorite, isFavorite, removeFavorite } from './favorites';
import { loadCubeState, saveCubeState } from './storage';
import useScramblePlayer from './useScramblePlayer';
import { mix } from '../../utils/color';

/** The accent this game is identified by on the hub card, reused for the primary
 *  action here so the screen looks like the card it was opened from. */
export const CUBE_ACCENT = '#c62828';

/** Past this the cube stops growing. Reachability, not layout — the stage's own
 *  measurement is what keeps it inside the screen. Sized to sit just under
 *  Fungiku's board cap so the two games' play areas look like one app. */
const MAX_CUBE = 440;

/** Share of the window height the cube may take. */
const CUBE_HEIGHT_SHARE = 0.42;

/**
 * How tall a phone has to be before the pad's colour legend is drawn (plan §8.8).
 *
 * **This is §8.6's budget rule, made executable.** The cube is sized first and
 * every other row has to justify itself against it — and the legend is the one
 * row the design itself nominates as the first to go: four tints that need a
 * permanent key may be four tints too many, and the pad's grouping is *also*
 * carried by position, so the colour is a second encoding of something the
 * columns already say.
 *
 * Above this height the cube is limited by the width of the phone rather than by
 * the page, so the legend costs it **nothing** and it is drawn. Below it, the 29
 * points come straight out of the cube, and they are not worth it — at 320×568
 * they are the difference between a 94-point cube and a 123-point one.
 *
 * Keyed on the **window**, deliberately, and not on the measured stage: a row
 * whose presence depended on a measurement it changes is a layout that
 * oscillates.
 */
const LEGEND_MIN_HEIGHT = 780;

/** The markers of a solve that is not open. A shared constant rather than a
 *  fresh `[]`, so the memos below it are not rebuilt on every render of the
 *  scramble. */
const NO_PHASES = [];

/**
 * Cube Scramble — get a scramble, save it, and turn the cube to inspect it
 * (docs/cube-plan.md §2).
 *
 * ### The screen does not scroll, on purpose
 *
 * The cube claims every pan gesture inside its square (see `CubeView`). A
 * `ScrollView` wrapping it would put the two in competition for each drag, which
 * is the exact race this repo already lost once on Fungiku's board
 * (docs/fungiku-plan.md §2). So the page is a fixed column that never scrolls —
 * the cube is sized from the space its stage actually measures — and the lists
 * and fields in this feature live in modals.
 *
 * ### Two modes, one transport
 *
 * **Reading a scramble** and **writing a solve** are the same screen with a
 * different algorithm under it (plan §8.2, Step 3). The alg card, the cube, the
 * scrubber and every button on it are shared; what changes is which string
 * `useScramblePlayer` is playing and which cube move 1 starts from — the solved
 * one for a scramble, the scrambled one for a solve, which is the cube you would
 * be holding.
 *
 * That is deliberately *not* two screens. A solve is a list of moves like any
 * other, and a second transport for it would be the same walk written twice and
 * would drift the first time one of them learned something.
 *
 * ### The workspace survives (Step 4, plan §7.1)
 *
 * The solve used to be a scratchpad — one of them, in memory, gone the moment
 * the system evicted the app. Real use answered that: *"if I background the app
 * and come back… my solve I was working on is gone."* A notebook that loses the
 * page is not a notebook.
 *
 * So **nothing authored lives in this component's state any more.** The solves
 * are a persisted list, the open one is a persisted id, and solve mode itself is
 * a persisted flag; the hold and the moves are *fields of a solve* rather than
 * of the screen. What is still local, and deliberately so, is the view angle,
 * the scrub position, the speed and the half-finished key gesture — where the
 * operator is standing rather than what they wrote.
 *
 * Restoring is therefore a second path into exactly the state tapping **Solve**
 * reaches, and the two have to agree: which of the three middle buttons shows
 * (`Set start` / `Re-orient` / `Start view`) is derived from the hold and the
 * move count, never set, so there is nothing for the two paths to disagree
 * about.
 */
const CubeScreen = ({ onExitToHub }) => {
  const { theme } = useAppTheme();
  const { height } = useWindowDimensions();
  const widthAllowance = useBoardSize({ fill: true });

  // Hydration gate. Until the saved scramble is read there is nothing honest to
  // draw: generating one immediately would flash a scramble the player never
  // asked for and then replace it with theirs.
  const [hydrated, setHydrated] = useState(false);
  const [scramble, setScramble] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);

  // Every solve the operator has written, against every scramble — persisted,
  // and the reason this step exists. The hold and the moves are fields of one of
  // these rather than state of this screen (plan §7.1).
  const [solves, setSolves] = useState([]);
  // Which solve is open, by id. Persisted, so coming back opens the page you
  // left rather than a blank one.
  const [openId, setOpenId] = useState(null);
  // Writing a solve rather than reading the scramble. Persisted too: the mode is
  // part of where you were.
  const [solving, setSolving] = useState(false);

  const [showSolves, setShowSolves] = useState(false);
  // The solve being renamed, or null. The two modals are opened one at a time
  // rather than stacked — a Modal presented on top of a Modal is reliable on
  // web and finicky on iOS, and there is nothing to gain by finding out which.
  const [renamingId, setRenamingId] = useState(null);
  /**
   * The key a second tap would promote to a half turn, or null (plan §8.8).
   *
   * State rather than a ref, and one piece of it rather than a `lastKey` plus a
   * `lastKeyAt`, because **the pad draws it**: the key wears a `2` in the corner
   * while it is promotable, so "what will the next tap do" is on the screen
   * rather than in the operator's head. One value means the tag and the
   * behaviour cannot disagree — which they would the moment a window expired
   * without anything re-rendering.
   *
   * Not persisted: it is a half-finished gesture, not a written move.
   */
  const [promoteKey, setPromoteKey] = useState(null);
  const promoteTimer = useRef(null);

  /**
   * The `′` key is armed, so the next move key writes a prime.
   *
   * The second route to a prime, added after the operator used the first one on
   * a phone: the hold's feedback is drawn on the key being held, which is the
   * key under the thumb. This one's feedback is everywhere else — the `′` fills
   * accent and every move key relabels itself. Transient, like the promotion:
   * a half-finished gesture, not a written move.
   */
  const [primed, setPrimed] = useState(false);

  /** Point the promotion at a key, or take it off one, and start the clock. */
  const armPromotion = useCallback((key) => {
    if (promoteTimer.current) clearTimeout(promoteTimer.current);
    promoteTimer.current = null;
    setPromoteKey(key);
    if (key) {
      promoteTimer.current = setTimeout(() => setPromoteKey(null), PROMOTE_MS);
    }
  }, []);

  /**
   * Drop every half-finished gesture.
   *
   * **One function, because they are one idea:** an armed prime and a pending
   * promotion are both "a press that has started and not finished", and every
   * transition that invalidates one invalidates the other — a new scramble, a
   * different solve, an undo, a clear, opening the flag. Two calls at nine call
   * sites is eight chances to add the tenth site and only remember one of them.
   */
  const resetGesture = useCallback(() => {
    armPromotion(null);
    setPrimed(false);
  }, [armPromotion]);

  /** Arm the `′`, or disarm the one already armed — the only way out of a
   *  mis-tapped prime that does not cost a move. */
  const tapPrime = useCallback(() => {
    setPrimed((current) => !current);
  }, []);

  useEffect(
    () => () => {
      if (promoteTimer.current) clearTimeout(promoteTimer.current);
    },
    []
  );
  const [showTyping, setShowTyping] = useState(false);
  const [showPhases, setShowPhases] = useState(false);

  // The box the cube gets, measured rather than estimated. A cube sized from a
  // share of the *window* looked right on a 6" phone and pushed its own caption
  // through the buttons on a 4" one, because the space left over depends on how
  // many lines the header and the scramble took — which only layout knows.
  const [stage, setStage] = useState(null);
  const measureStage = useCallback(({ nativeEvent }) => {
    const { width, height: boxHeight } = nativeEvent.layout;
    setStage((current) =>
      current && current.width === width && current.height === boxHeight
        ? current
        : { width, height: boxHeight }
    );
  }, []);

  // The view angle is **kept** (operator, 2026-08-06) and deliberately not reset
  // by a new scramble: turning the cube to where you want it is a thing you did
  // on purpose, and neither getting a new scramble nor coming back tomorrow
  // means you wanted it moved. `DEFAULT_YAW`/`DEFAULT_PITCH` are the *opening*
  // view — the first visit, and where `Reset view` and `Start view` go back to —
  // rather than the view every visit begins at. Plan §7.1.
  const [yaw, setYaw] = useState(DEFAULT_YAW);
  const [pitch, setPitch] = useState(DEFAULT_PITCH);

  /**
   * The angle **Set start** left the cube at, and which solve it was set for.
   *
   * Transient, like the angle itself (plan §7.1) — what is *authored* is the
   * hold, and the hold is stored. This only has to survive until the operator
   * pans away and taps `Start view`, so that the button goes back to the view
   * they chose rather than to a default they never asked for.
   *
   * Tagged with the solve's id rather than reset by every callback that could
   * invalidate it: switching pages, loading a favorite and starting a new solve
   * would each have to remember to clear it, and the one that forgot would send
   * `Start view` to another solve's angle.
   */
  const [chosenView, setChosenView] = useState(null);

  useEffect(() => {
    let cancelled = false;

    loadCubeState().then((saved) => {
      if (cancelled) return;
      setFavorites(saved.favorites);
      setSolves(saved.solves);
      // `readCubeSave` has already checked that the open solve exists and
      // belongs to the scramble being restored, so these two land together or
      // not at all — the screen never has to hold a pointer to nothing.
      setOpenId(saved.workspace.solveId);
      setSolving(saved.workspace.solving);
      // Only when there is one: a first visit has no remembered angle, and the
      // default the state already holds is the opening view.
      if (saved.workspace.view) {
        setYaw(saved.workspace.view.yaw);
        setPitch(saved.workspace.view.pitch);
      }
      // First ever visit: there should be a cube to look at, not an empty screen
      // with a button on it.
      setScramble(saved.scramble || randomScramble());
      setHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist after hydration only — writing before the read lands would overwrite
  // the player's solves with the empty list this screen starts at.
  //
  // `yaw` and `pitch` change on every frame of a drag, and that is what the
  // debounce in `saveCubeState` is for: the timer restarts while the finger is
  // moving and one write lands 400ms after it stops. A drag is the *only* thing
  // on this screen that changes state continuously, so it is also the only thing
  // that would have made an undebounced writer obvious.
  useEffect(() => {
    if (!hydrated) return;
    saveCubeState({
      scramble,
      favorites,
      solves,
      workspace: { solving, solveId: openId, view: { yaw, pitch } },
    });
  }, [hydrated, scramble, favorites, solves, solving, openId, yaw, pitch]);

  // Leaving for the hub unmounts the screen, and a debounced write that has not
  // fired yet is a write that never happens.
  useEffect(() => () => saveCubeState.flush(), []);

  // The cube a solve starts on: the scramble fully applied, which is the cube
  // the operator would be holding. Memoized because it is also the *identity*
  // `useScramblePlayer` uses to tell "the algorithm grew" from "the algorithm was
  // replaced" — a new object every render would read as a new scramble every
  // keystroke. Unreadable text can only come from a save file written by another
  // build; a solved cube beats a crash (plan §7).
  const scrambledCube = useMemo(() => {
    try {
      return cubeFromAlg(scramble);
    } catch (error) {
      return solvedCube();
    }
  }, [scramble]);

  // A solve names the scramble it belongs to by that scramble's algorithm text,
  // the way a favorite names itself (plan §7) — so this is the key both lists
  // agree on, and it is why a solve does not need its scramble to be favourited.
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

  // The mode, and the guarantee that goes with it: solve mode always has a solve
  // under it. Everything below asks this rather than `solving`, so a workspace
  // that half-restored — a flag without its page — falls back to the scramble
  // instead of onto a pad with nowhere to write.
  const writing = solving && openSolve !== null;

  // The hold and the moves, read off the open solve. They were screen state
  // until Step 4; they are fields of a page now.
  const orientation = openSolve ? openSolve.orientation : null;
  const solve = openSolve ? openSolve.alg : '';

  // The scramble, turned the way the operator chose to hold it — the cube move 1
  // of the solve starts on. A rotation moves the *model*, so after `z2` the
  // move `R` turns the face that is now on the right, which is exactly what a
  // Roux solve written after inspection means (plan §8.2).
  //
  // Memoized on both, because this object's identity is what
  // `useScramblePlayer` reads as "a different algorithm entirely": re-orienting
  // has to reset the transport, and it does so by changing this.
  const orientedCube = useMemo(() => {
    if (!orientation) return scrambledCube;
    try {
      return applyMoves(scrambledCube, parseAlg(orientation));
    } catch (error) {
      return scrambledCube;
    }
  }, [scrambledCube, orientation]);

  // Where in the algorithm the cube is, and the turn it is part-way through.
  // Deliberately *not* persisted (plan §7): the saved file holds algorithm text
  // only, and a position that outlived a relaunch would drop the player into the
  // middle of a scramble they thought they had whole. A new scramble, or one
  // loaded from favorites, opens fully applied.
  /**
   * The cube move 1 starts on — and, just as importantly, **the identity that
   * tells a new algorithm from a growing one** (see `useScramblePlayer`).
   *
   * `scramble` is a dependency even though a solved cube does not depend on it,
   * and that is the whole point. Without it, scramble mode passed the same
   * starting cube forever, and the *empty* scramble this screen mounts with
   * vacuously "extended" into the real one arriving from storage — position 0 of
   * nothing is position 0 of everything. The transport read that as growth and
   * dutifully **played the whole scramble** on every cold start, which is what a
   * backgrounded app does when the system evicts it.
   *
   * `openId` is a dependency for the same reason and one level down. Two solves
   * against one scramble can share a hold, so `orientedCube` need not change
   * when you switch between them — and if the identity did not change, the
   * transport would read the second solve as the first one having grown and
   * **animate its way from one into the other**. Switching pages is a reset,
   * always, so the identity changes with the page.
   */
  const startingCube = useMemo(
    () => (writing ? orientedCube : solvedCube()),
    [writing, orientedCube, scramble, openId]
  );

  const player = useScramblePlayer(writing ? solve : scramble, startingCube);
  const { pause, playTo, retract, seek } = player;

  const saved = isFavorite(favorites, scramble);

  // Dragging mid-playback would be the cube and the finger fighting over the
  // same cube, so the finger wins: a drag stops playback and lands the turn it
  // interrupted. A tap does not — it is how you look without losing your place.
  const onOrbit = useCallback(
    (nextYaw, nextPitch) => {
      pause();
      setYaw(nextYaw);
      setPitch(nextPitch);
    },
    [pause]
  );

  /**
   * Put a different scramble on the cube, and open whatever was last written
   * against it.
   *
   * This used to be an effect on `scramble` that cleared the solve. It cannot be
   * one any more, and that is the trap worth naming: the screen mounts with an
   * empty scramble and fills it from storage, so an effect keyed on `scramble`
   * fires once during **hydration** — and would wipe the workspace it had just
   * restored. Changing the scramble is something two buttons do, so it is
   * written where those buttons are and hydration never trips it.
   */
  const showScramble = useCallback(
    (alg) => {
      pause();
      resetGesture();
      setScramble(alg);
      // The most recent solve for the scramble arriving, which is the page you
      // were last on for it. Nothing there is not a problem: Solve starts one.
      const mine = solvesFor(solves, alg);
      setOpenId(mine.length > 0 ? mine[0].id : null);
      setSolving(false);
    },
    [pause, solves, resetGesture]
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

  const loadFavorite = useCallback(
    (alg) => {
      showScramble(alg);
      setShowFavorites(false);
    },
    [showScramble]
  );

  const removeSaved = useCallback((alg) => {
    setFavorites((current) => removeFavorite(current, alg));
  }, []);

  /**
   * Change the open solve, keeping it in the list.
   *
   * Every edit on this screen — a key, an undo, a clear, a typed algorithm, the
   * hold — goes through here, so there is one place where "what the operator
   * wrote" becomes "what is in the file". `patch` is the fields to change or a
   * function of the solve, and an id that no longer names anything is a no-op
   * rather than a crash.
   */
  const editOpen = useCallback(
    (patch) => {
      setSolves((current) => updateSolve(current, openId, patch));
    },
    [openId]
  );

  /** Start a fresh page against the scramble on the cube, and open it. */
  const beginSolve = useCallback(() => {
    const { solves: grown, solve: made } = createSolve(solves, scrambleKey);
    if (!made) return null;
    setSolves(grown);
    setOpenId(made.id);
    return made;
  }, [solves, scrambleKey]);

  // Tapping Solve resumes the page you were on, and only starts a new one when
  // there is nothing to resume. That is what makes the button the same button
  // it was before solves were kept.
  const startSolving = useCallback(() => {
    pause();
    resetGesture();
    if (!openSolve) beginSolve();
    setSolving(true);
  }, [pause, openSolve, beginSolve, resetGesture]);

  const stopSolving = useCallback(() => {
    pause();
    resetGesture();
    setSolving(false);
  }, [pause, resetGesture]);

  /**
   * Take the angle the cube is being looked at from and make it the hold.
   *
   * The conversion is `orientationAt`, and the reason it has to be a conversion
   * at all is that panning moves the camera while a hold moves the model: after
   * this, `R` turns the face that is now on the right.
   *
   * The view then goes back to the default angle, and **that is a visible jump,
   * on purpose**. What was picked is a *hold* — which colour is up, which is in
   * front — not a camera position, and there are 24 of those against every angle
   * a finger can stop at. Inspecting from directly overhead is a perfectly good
   * way to decide "blue up, white front"; it is a bad way to look at a cube you
   * are about to solve. So the hold is kept and the angle is discarded, and what
   * lands is the standard three-quarter view of the hold that was chosen — the
   * same view `Start view` returns to for the rest of the solve.
   */
  const setStartingOrientation = useCallback(() => {
    pause();
    editOpen({ orientation: orientationAt(yaw, pitch) });
    // Where the camera has to stand to keep showing what it is showing, now
    // that the hold has been turned into the model underneath it. Usually that
    // is exactly the angle the operator was already at, and the picture does not
    // move at all; see `viewAfterHold` for when it cannot be, and why the part
    // it gives up is the part worth giving up.
    const view = viewAfterHold(yaw, pitch);
    setYaw(view.yaw);
    setPitch(view.pitch);
    setChosenView({ id: openId, ...view });
  }, [pause, editOpen, yaw, pitch, openId]);

  // Back to inspection. Only offered while the solve is empty: re-orienting
  // under moves that are already written would silently change what every one
  // of them does to the cube (operator, 2026-08-02).
  const reorient = useCallback(() => {
    pause();
    editOpen({ orientation: null });
  }, [pause, editOpen]);

  // ——— The picker (docs/cube-plan.md §7.1) ———————————————————————————————

  /** Put a solve on the cube. Always lands in solve mode, because that is the
   *  only reason to pick one. */
  const openSolveById = useCallback(
    (id) => {
      pause();
      resetGesture();
      setOpenId(id);
      setSolving(true);
      setShowSolves(false);
    },
    [pause, resetGesture]
  );

  const startNewSolve = useCallback(() => {
    pause();
    resetGesture();
    const made = beginSolve();
    if (made) setSolving(true);
    setShowSolves(false);
  }, [pause, beginSolve, resetGesture]);

  // Copy a solve and open the copy — "same first block, try the second block
  // differently", which starts by keeping what you already had.
  const copySolve = useCallback(
    (id) => {
      pause();
      resetGesture();
      const { solves: grown, solve: made } = duplicateSolve(solves, id);
      if (!made) return;
      setSolves(grown);
      setOpenId(made.id);
      setSolving(true);
      setShowSolves(false);
    },
    [pause, solves, resetGesture]
  );

  /**
   * Forget a solve.
   *
   * Deleting the one on the cube has to leave the screen somewhere, and the
   * honest somewhere is the next most recent page for this scramble — or, if
   * that was the last one, back at the scramble. Leaving `openId` pointing at a
   * deleted solve would drop solve mode without saying why.
   */
  const deleteSolve = useCallback(
    (id) => {
      pause();
      const grown = removeSolve(solves, id);
      setSolves(grown);
      if (id !== openId) return;

      const remaining = solvesFor(grown, scrambleKey);
      setOpenId(remaining.length > 0 ? remaining[0].id : null);
      if (remaining.length === 0) setSolving(false);
    },
    [pause, solves, openId, scrambleKey]
  );

  const beginRename = useCallback((id) => {
    setShowSolves(false);
    setRenamingId(id);
  }, []);

  const endRename = useCallback(() => {
    setRenamingId(null);
    setShowSolves(true);
  }, []);

  const submitRename = useCallback(
    (name) => {
      setSolves((current) => renameSolve(current, renamingId, name));
      endRename();
    },
    [renamingId, endRename]
  );

  /**
   * The shortcut back to the hold you picked — and, since 2026-08-03, back to
   * the *angle* you picked it from.
   *
   * Step 5 could make this the plain reset, because setting a hold sent the
   * camera to the default and so "the view I chose" and "the default view" were
   * the same thing. They are not any more: Set start leaves the camera where it
   * was, so this has to go back there rather than to the opening angle.
   *
   * Falling back to the default is the honest answer when there is nothing
   * remembered — after a cold start, the hold comes back from the file and the
   * angle deliberately does not.
   */
  const startView = useCallback(() => {
    const chosen = chosenView && chosenView.id === openId ? chosenView : null;
    setYaw(chosen ? chosen.yaw : DEFAULT_YAW);
    setPitch(chosen ? chosen.pitch : DEFAULT_PITCH);
  }, [chosenView, openId]);

  /**
   * A press on a move key — tap, hold, or the second tap that promotes.
   *
   * The rule itself is `applyPadPress`, in `solve.js`, where the test runner can
   * reach it. What lives here is the *memory*: whether this key is the one a
   * second tap would promote, and what the press leaves promotable afterwards.
   *
   * `pause` first, always: it lands whatever the cube was doing, and it is what
   * settles an undo whose move has not been dropped yet (see the hook's
   * `flushRetract`). A key pressed inside the 260ms an undo takes would
   * otherwise be appended to a solve that still had the undone move in it.
   */
  const tapKey = useCallback(
    (key, { held = false } = {}) => {
      pause();
      // An armed `′` beats a pending promotion — see `applyPadPress`. Asking it
      // here as well would be the rule written twice, so this only records
      // *whether* the prime was armed and lets that function decide.
      const repeat = !primed && promoteKey === key;
      editOpen((current) =>
        withMoves(current, applyPadPress(current.alg, key, { held, repeat, primed }))
      );
      // What the *next* tap may do is decided by what this one just wrote: a
      // plain single turn can be promoted, a prime or a half turn cannot. Asked
      // of the solve as it stood, which is the same question `applyPadPress`
      // asked of it a line ago.
      const promoted = repeat && promoteLastToken(solve, key) !== null;
      armPromotion(promoted || held || primed ? null : key);
      // The arming is spent — one move, then back to plain. Holding it would
      // mean a `′` tapped once silently priming a move three taps later.
      setPrimed(false);
    },
    [promoteKey, primed, solve, pause, editOpen, armPromotion]
  );

  // Backwards *first*, then drop it. Removing the move and letting the transport
  // reset would put the cube where it belongs without ever showing it get there,
  // which is the same bug as a move appearing without turning — just pointing
  // the other way.
  //
  // The drop goes through `withMoves`, as every edit to the moves now does:
  // a phase is an index into the list being edited, and undo is the edit that
  // can leave one pointing past the end of it (plan §8.5).
  //
  // **Disarming the promotion here is the belt to `promoteLastToken`'s braces.**
  // The move the promotion would rewrite is the move this is deleting, and undo
  // takes 260ms to land it — so a press inside that window is the exact race
  // Step 3 shipped twice, pointed at a rewrite rather than an append. Two
  // independent things now have to fail for it to bite: this line, and the
  // check that the token is still where the promotion thinks it is.
  const undoMove = useCallback(() => {
    resetGesture();
    retract(() => editOpen((current) => withMoves(current, dropLastToken(current.alg))));
  }, [retract, editOpen, resetGesture]);

  // The one edit that does *not* go through `withMoves`: clearing is "remove
  // every move", and a marker at 0 would survive the clamp and leave a label
  // hanging off a solve with nothing in it.
  const clearSolve = useCallback(() => {
    pause();
    resetGesture();
    editOpen({ alg: '', phases: [] });
  }, [pause, editOpen, resetGesture]);

  /**
   * The same thing, for whichever solve the list was pointing at.
   *
   * Clear moved off the pad in Step 8 and into the solves list, so it now
   * arrives with an id rather than meaning "the open one" — and clearing a page
   * that is *not* on the cube must not touch the transport, which is why this is
   * not `clearSolve` with an argument. When it is the open one, it is: the pause
   * and the disarm are what stop a turn in flight landing on an empty solve.
   */
  const clearSolveById = useCallback(
    (id) => {
      if (id === openId) {
        clearSolve();
        return;
      }
      setSolves((current) => updateSolve(current, id, { alg: '', phases: [] }));
    },
    [openId, clearSolve]
  );

  const addTyped = useCallback(
    (text) => {
      pause();
      editOpen((current) => {
        try {
          return withMoves(current, appendAlg(current.alg, text));
        } catch (error) {
          // The field validates with the same parser before it offers Add, so
          // this is unreachable — and if it ever is reached, keeping the solve
          // is better than replacing it with a half-parsed one.
          return {};
        }
      });
      setShowTyping(false);
    },
    [pause, editOpen]
  );

  // ——— Phases (docs/cube-plan.md §8.5) —————————————————————————————————————

  /**
   * Open the flag.
   *
   * `pause` first, and it matters more here than anywhere else on this screen:
   * **the position is the argument.** A marker is written at where the cube is,
   * so a turn still in flight is a boundary about to land one move away from
   * where the operator is looking.
   */
  const openPhases = useCallback(() => {
    pause();
    resetGesture();
    setShowPhases(true);
  }, [pause, resetGesture]);

  /**
   * Close the group of moves the operator has just written, and name it.
   *
   * "Here" is **where the cube is**, not the end of the solve. While writing
   * they are the same place — every entered move animates to the end — and when
   * they are not, scrubbing back to where the first block finished and marking
   * it there is the obvious thing to want, rather than a second range-selecting
   * interaction that plan §8.5 rules out.
   */
  const endPhaseHere = useCallback(
    (label) => {
      editOpen((current) => ({
        phases: endPhase(current.phases, player.index, label, moveCount(current.alg)),
      }));
      setShowPhases(false);
    },
    [editOpen, player.index]
  );

  // Stays open: a mis-tapped name is usually one of several things being tidied
  // up, and the list is where the tidying happens.
  const dropPhase = useCallback(
    (at) => {
      editOpen((current) => ({ phases: removePhase(current.phases, at) }));
    },
    [editOpen]
  );

  /**
   * Play one group of moves.
   *
   * The other half of annotating (plan §8.5), and two calls rather than a second
   * transport: jump to where the group starts, then walk to where it ends. The
   * jump is deliberate — "play just the second block" is not a request to watch
   * the first one go past first.
   */
  const playPhase = useCallback(
    (span) => {
      seek(span.at);
      if (span.end > span.at) playTo(span.end);
    },
    [seek, playTo]
  );

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

  const titleColor = theme.colors.title;
  const surface = theme.colors.numberPad.background;
  const border = theme.colors.numberPad.border;

  // Moves not played yet are muted rather than hidden, so the scramble stays a
  // scramble you can read ahead in. Mixed toward the background so it works on
  // both themes without a second palette.
  const pendingColor = mix(titleColor, theme.colors.background, 0.55);

  // What the transport is playing, for every label that has to name it.
  const noun = writing ? 'solve' : 'scramble';
  const solveCount = moveCount(solve);

  // The move groups (plan §8.5). Markers are stored; **the spans and their
  // counts are derived every render**, because "first block in 8" has to be a
  // subtraction over the boundaries rather than a number kept alongside them —
  // a stored count is a second thing to keep honest on every edit.
  const phases = openSolve ? openSolve.phases : NO_PHASES;
  const spans = useMemo(() => phaseSpans(phases, solveCount), [phases, solveCount]);

  // The group of moves that ends where the cube is, and therefore whether there
  // is anything to name at all. Derived from the same list the flag edits, so
  // the pad and the modal cannot disagree about it.
  //
  // `renaming` is the case where a boundary is already sitting here: the last
  // "end the phase" put it there, so there is nothing new to close and a name
  // can only mean the group behind it. Saying which of the two it is beats
  // leaving the operator to work it out from where the transport is parked.
  const openStart = openPhaseStart(phases, player.index);
  const openMoves = Math.max(0, player.index - openStart);
  const renamingPhase = isPhaseBoundary(phases, player.index);

  // The boundaries, for the dividers in the move track. A set, because the track
  // asks this once per token.
  //
  // **Only while writing.** The markers belong to the solve, and the track shows
  // the *scramble* in the other mode — where a divider from somebody's Roux
  // first block would be drawn across a scramble that has no phases and cannot
  // have any. (The card this replaced had the same bug and nobody caught it,
  // because you have to open a scramble that already has an annotated solve
  // behind it to see one.)
  const marks = useMemo(
    () => new Set(writing ? phases.map((phase) => phase.at) : []),
    [writing, phases]
  );

  // Solve mode has two phases, which is how the operator described it: **find
  // the hold**, then **write the solve**. Inspecting is panning, so it gets the
  // whole page — no pad, no transport, and a cube roughly twice the size. The
  // pad only appears once there is something for it to write into.
  const inspecting = writing && orientation === null;

  // Live while inspecting — this updates under the finger as the cube is
  // dragged, and it is the thing that makes picking a hold trustworthy. Reading
  // colours off a 120-point cube is guesswork; reading "yellow up · blue left"
  // is not.
  const facingCube = inspecting
    ? applyMoves(scrambledCube, parseAlg(orientationAt(yaw, pitch)))
    : orientedCube;
  const holdText = describeOrientation(facingCube);

  // A stored hold, said in colours, for the picker's rows. An orientation is
  // notation like any other and a row is never worth a crash, so text that no
  // longer parses reads as the reference hold rather than taking the list down.
  const describeHold = useCallback(
    (held) => {
      if (held === null || held === undefined) return 'no hold yet';
      try {
        return describeOrientation(applyMoves(scrambledCube, parseAlg(held)));
      } catch (error) {
        return describeOrientation(scrambledCube);
      }
    },
    [scrambledCube]
  );

  // Before the first layout there is nothing to measure, so fall back to the
  // window-share estimate — close enough that the cube does not visibly resize
  // on the frame the real number arrives.
  const cubeSize = Math.floor(
    stage
      ? Math.max(0, Math.min(widthAllowance, MAX_CUBE, stage.width, stage.height))
      : Math.min(widthAllowance, MAX_CUBE, height * CUBE_HEIGHT_SHARE)
  );

  /**
   * The controls that ride on the header (plan §8.6, Step 7).
   *
   * These are the *view*: where the camera is pointing, and — in solve mode —
   * the way back out to the scramble. They were a row of their own, twice: an
   * action row above the cube and a second row of buttons below it, together
   * about 100 points on a screen whose subject is a square. A header row was
   * already being paid for, and it had a whole empty column on the right of it.
   *
   * Icon-only, and that is the trade this step makes: a label is a word you
   * read once and an icon is a target you hit every time. What a label says
   * that an icon cannot is a *count* — so `count` is a parameter, and Favorites
   * keeps its number.
   */
  const headerAction = (name, label, hint, onPress, count) => (
    <TouchableOpacity
      key={label}
      style={[styles.headerAction, { borderColor: border }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
    >
      <MaterialCommunityIcons name={name} size={18} color={titleColor} />
      {count > 0 && (
        <Text style={[styles.headerActionCount, { color: titleColor }]}>{count}</Text>
      )}
    </TouchableOpacity>
  );

  const headerActions = writing ? (
    <>
      {!inspecting &&
        headerAction(
          'arrow-left',
          'Back to the scramble',
          'Stops writing and shows the scramble again; the solve is kept',
          stopSolving
        )}

      {/* Whichever of the two the hold allows, and the rule is Step 5's,
          unchanged: re-orienting is free while the solve is empty and locked
          once it is not, because re-orienting under moves already written would
          silently change what every one of them does (operator, 2026-08-02). */}
      {!inspecting &&
        (solveCount === 0
          ? headerAction(
              'axis-arrow',
              'Pick the starting orientation again',
              'Goes back to turning the cube to how you want to hold it',
              reorient
            )
          : headerAction(
              'restore',
              'Back to the starting view',
              `Looks at the cube from ${holdText} again`,
              startView
            ))}

      {headerAction(
        'rotate-3d-variant',
        'Turn the cube around',
        'Shows the three faces that are currently hidden',
        showOtherSide
      )}
    </>
  ) : (
    <>
      {headerAction('restore', 'Reset the view', 'Looks at the cube from the front again', resetView)}
      {headerAction(
        'rotate-3d-variant',
        'Turn the cube around',
        'Shows the three faces that are currently hidden',
        showOtherSide
      )}
      {/* Not a view control, and here anyway: the row below fits three labelled
          buttons at 320 points and not four, and this is the one of the four
          whose label was a noun rather than a verb. It keeps its count. */}
      {headerAction(
        'star-box-outline',
        `Favorites, ${favorites.length} saved`,
        'Opens the list of scrambles you have kept',
        () => setShowFavorites(true),
        favorites.length
      )}
    </>
  );

  if (!hydrated) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScreenHeader title="Cube Scramble" theme={theme} onHomePress={onExitToHub} dense />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={titleColor} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Dense, and carrying the view controls (plan §8.6, Step 7). The default
          header wrapped "Cube Scramble" onto two lines and cost 75 points to say
          something the operator knew before they tapped the tile; the controls
          that ride on it used to be a row of their own, and a row on this screen
          is the cube's height. */}
      <ScreenHeader
        title="Cube Scramble"
        theme={theme}
        onHomePress={onExitToHub}
        dense
        actions={headerActions}
      />

      {/* The moves — and the scrubber's track. Tapping a token turns the cube to
          that point, one move at a time and in whichever direction it lies,
          which is a shorter route to "what does move 14 do" than fourteen taps
          on the step button and still shows the moves rather than cutting to the
          answer.

          The tokens come from the same scan as the moves (`player.tokens`), so a
          token and the move it turns to cannot drift apart — and a solve entered
          as `r U r'` reads back as `r U r'` rather than being quietly corrected
          to the model's canonical `Rw U Rw'` (plan §4).

          **Inspection does not get one.** There are no moves yet, and the prompt
          it used to hold is said better by the live hold readout under the cube —
          which is the answer the phase is actually looking for. */}
      {!inspecting && (
        <CubeMoveTrack
          tokens={player.tokens}
          index={player.index}
          marks={marks}
          placeholder={writing ? 'Tap a key to begin' : scramble}
          accent={CUBE_ACCENT}
          theme={theme}
          pendingColor={pendingColor}
          noun={noun}
          label={writing ? `Solve: ${solve || 'nothing yet'}` : `Scramble: ${scramble}`}
          // How far the drawer may be pulled down: the room the stage is
          // holding. It opens *over* the cube and never resizes it — the
          // measurement it is given is a limit, not a claim.
          room={stage ? stage.height : 0}
          onSeek={playTo}
        />
      )}

      {/* Directly under the moves it is describing, and only once there is
          something to describe — a solve with no markers costs the cube
          nothing. Above the cube rather than below the pad because it is about
          the *moves*, and the eye should not have to cross the cube to get from
          `First block · 8` to the eight moves it counted. */}
      {writing && !inspecting && spans.length > 0 && (
        <CubePhaseStrip
          spans={spans}
          index={player.index}
          accent={CUBE_ACCENT}
          theme={theme}
          onPlay={playPhase}
        />
      )}

      {/* The action row is gone, and that is Step 7's third cut (plan §8.6).
          Its three controls were `Scramble` — navigation, which now sits beside
          the home button — and two view controls, which now sit with the view.
          Its own comment used to explain that one of the three had to be
          icon-only because labelling it wrapped the row, "and the 40 points that
          costs come out of the cube". The row itself was 48. */}

      {/* Takes the leftover height, and *is* the cube's allowance: it sits in
          the middle of whatever the phone has left rather than hanging under the
          scramble with the bottom third of a tall screen empty, and it can never
          be bigger than the space it was given. */}
      <View style={styles.stage} onLayout={measureStage}>
        <CubeView
          cube={player.cube}
          turn={player.turn}
          size={cubeSize}
          yaw={yaw}
          pitch={pitch}
          onOrbit={onOrbit}
          accessibilityLabel={`Cube — ${announcePosition(player.index, player.count, noun)}`}
        />
      </View>

      {/* Inspection has nothing to transport and nothing to write, so it gets
          neither — which is most of the page back, and the cube roughly doubles.
          Panning is the whole interaction of this phase, and a big cube is what
          panning wants. */}
      {!inspecting && (
        <CubeScrubber
          index={player.index}
          count={player.count}
          playing={player.playing}
          rate={player.rate}
          accent={CUBE_ACCENT}
          theme={theme}
          noun={noun}
          startLabel={writing ? 'Back to the starting cube' : 'Back to the solved cube'}
          onPlayPause={player.togglePlay}
          onStepBack={player.stepBack}
          onStepForward={player.stepForward}
          onSeek={seek}
          onCycleSpeed={player.cycleSpeed}
        />
      )}

      {inspecting ? (
        <>
          <Text
            style={[styles.hold, { color: CUBE_ACCENT }]}
            accessibilityLiveRegion="polite"
            accessibilityLabel={`Holding ${holdText}`}
          >
            {describeOrientationSentence(facingCube)}
          </Text>

          {/* The one row this screen still has, and the one it should: `Set
              start` is the *point* of this phase and an accented, labelled
              button is what says so. It sits under the readout it is confirming
              rather than above the cube, which is where it used to be —
              inspecting reads bottom-up now, cube then hold then set. */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.toolButton, { borderColor: border }]}
              onPress={stopSolving}
              accessibilityRole="button"
              accessibilityLabel="Back to the scramble"
              accessibilityHint="Stops writing and shows the scramble again; the solve is kept"
            >
              <MaterialCommunityIcons name="arrow-left" size={18} color={titleColor} />
              <Text style={[styles.toolButtonText, { color: titleColor }]}>Scramble</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: CUBE_ACCENT }]}
              onPress={setStartingOrientation}
              accessibilityRole="button"
              accessibilityLabel={`Set the start as ${holdText}`}
              accessibilityHint="Holds the cube this way round; every move you write is relative to it"
            >
              <MaterialCommunityIcons name="check" size={18} color="#ffffff" />
              <Text style={styles.primaryButtonText}>Set start</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : writing ? (
        <>
          <CubeMovePad
            canUndo={solveCount > 0}
            // Live once there is anything to say about — moves to name, or
            // markers to take back off. Only a solve with neither has nothing
            // for the flag to do.
            canPhase={solveCount > 0 || phases.length > 0}
            promoteKey={promoteKey}
            primed={primed}
            accent={CUBE_ACCENT}
            theme={theme}
            onKey={tapKey}
            onPrime={tapPrime}
            onUndo={undoMove}
            onType={() => setShowTyping(true)}
            onPhase={openPhases}
          />
          {height >= LEGEND_MIN_HEIGHT && <CubePadLegend theme={theme} accent={CUBE_ACCENT} />}
        </>
      ) : (
        // One row where there were two and a caption (plan §8.6). What went:
        // `Reset view` and `Other side` are view controls and moved up to the
        // header with the rest of the view; the hint line went altogether. It
        // read "Drag the cube · tap a move to turn to it", which earns its 24
        // points on the first visit and never again — and this screen has been
        // charging the cube for it on every visit since Step 1.
        //
        // What is left is the three things this mode is *for*, still labelled,
        // because a verb with no noun on it is a guess.
        <View style={styles.bottomRow}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: CUBE_ACCENT }]}
            onPress={startSolving}
            accessibilityRole="button"
            accessibilityLabel="Write a solve"
            accessibilityHint="Opens the move pad, with the cube starting from this scramble"
          >
            <MaterialCommunityIcons name="pencil-outline" size={18} color="#ffffff" />
            <Text style={styles.primaryButtonText}>
              Solve{solveCount > 0 ? ` (${solveCount})` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolButton, { borderColor: border }]}
            onPress={newScramble}
            accessibilityRole="button"
            accessibilityLabel="New scramble"
            accessibilityHint="Generates a new random scramble and applies it to the cube"
          >
            <MaterialCommunityIcons name="dice-multiple" size={18} color={titleColor} />
            <Text style={[styles.toolButtonText, { color: titleColor }]}>New</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toolButton,
              { borderColor: saved ? CUBE_ACCENT : border },
              saved && { backgroundColor: surface },
            ]}
            onPress={toggleSaved}
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Remove from saved scrambles' : 'Save this scramble'}
            accessibilityState={{ selected: saved }}
          >
            <MaterialCommunityIcons
              name={saved ? 'star' : 'star-outline'}
              size={18}
              color={saved ? CUBE_ACCENT : titleColor}
            />
            <Text style={[styles.toolButtonText, { color: saved ? CUBE_ACCENT : titleColor }]}>
              {saved ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>

        </View>
      )}

      {/* The bottom line of solve mode, in both its phases — and **the way into
          the picker**, which is why it is a button rather than the caption it
          used to be.

          It has to be this and not a row of its own: this one line says which
          page, which hold and how many moves, and opens the list, for the 21
          points a caption was costing anyway.

          **It also carries the scramble now** (Step 7). That used to be a muted
          line of its own above the solve — 20 points to answer "which cube am I
          on", a question that comes up rarely and has a whole mode devoted to it
          one tap away. Here it is last in the line and the line truncates from
          the right, so it is the first thing to go when the screen is narrow,
          which is the correct order of importance. The full text is on the
          accessibility label either way.

          Both phases get it, and that is not symmetry for its own sake:
          inspecting a brand-new solve you have changed your mind about would
          otherwise be a corner with no way out — the page is empty, so it is not
          worth keeping, and the only control that could delete it is in the list
          you could not reach. */}
      {writing && (
        <TouchableOpacity
          style={[styles.solveBar, { borderColor: border }]}
          onPress={() => setShowSolves(true)}
          accessibilityRole="button"
          accessibilityLabel={`${openSolve.name}, ${describeSolve(solve)}${
            inspecting ? '' : `, started from ${holdText}`
          }, solving the scramble ${scramble}`}
          accessibilityHint="Opens the solves written for this scramble"
        >
          <MaterialCommunityIcons
            name="notebook-outline"
            size={13}
            color={titleColor}
            style={styles.solveBarIcon}
          />
          <Text
            style={[styles.solveBarText, { color: titleColor }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {openSolve.name} · {inspecting ? '' : `${holdText} · `}
            {describeSolve(solve)}
            <Text style={styles.solveBarScramble}> · {scramble}</Text>
          </Text>
          <MaterialCommunityIcons name="chevron-up" size={14} color={titleColor} />
        </TouchableOpacity>
      )}

      <CubeSolvesModal
        visible={showSolves}
        theme={theme}
        accent={CUBE_ACCENT}
        solves={mySolves}
        currentId={openSolve ? openSolve.id : null}
        describeHold={describeHold}
        onOpen={openSolveById}
        onNew={startNewSolve}
        onDuplicate={copySolve}
        onRename={beginRename}
        onRemove={deleteSolve}
        onClear={clearSolveById}
        onClose={() => setShowSolves(false)}
      />

      <CubeNameModal
        visible={renamingId !== null}
        theme={theme}
        accent={CUBE_ACCENT}
        title="Name this solve"
        name={(findSolve(solves, renamingId) || {}).name || ''}
        onSubmit={submitRename}
        onClose={endRename}
      />

      <CubeFavoritesModal
        visible={showFavorites}
        theme={theme}
        accent={CUBE_ACCENT}
        favorites={favorites}
        currentAlg={scramble}
        onLoad={loadFavorite}
        onRemove={removeSaved}
        onClose={() => setShowFavorites(false)}
      />

      <CubePhaseModal
        visible={showPhases}
        theme={theme}
        accent={CUBE_ACCENT}
        at={player.index}
        openCount={openMoves}
        renaming={renamingPhase}
        spans={spans}
        onEnd={endPhaseHere}
        onRemove={dropPhase}
        onClose={() => setShowPhases(false)}
      />

      <CubeAlgInputModal
        visible={showTyping}
        theme={theme}
        accent={CUBE_ACCENT}
        onAdd={addTyped}
        onClose={() => setShowTyping(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    ...(Platform.OS === 'web'
      ? {
          paddingTop: 20,
          paddingBottom: 20,
          maxWidth: 600,
          marginHorizontal: 'auto',
          width: '100%',
        }
      : {}),
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 6,
    marginBottom: 4,
  },
  // A view control on the header row. Square-ish and icon-only, but still 30
  // points of border around an 18-point glyph with the row's own height behind
  // it — this step does not buy its space back from the size of a target.
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 7,
    marginLeft: 5,
  },
  headerActionCount: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 3,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginHorizontal: 4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    marginTop: 2,
  },
  toolButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
  iconOnly: {
    paddingHorizontal: 10,
  },
  // Takes the leftover — but the leftover is no longer an afterthought, which is
  // the whole of Step 7 (plan §8.6). Every row above and below this one now has
  // to justify its height against what it costs the cube.
  stage: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  // The pad already ate the vertical the bottom row used to have, so the line
  // under it is tight to it rather than floating. It is a button now — the way
  // into the solves list — so it takes a border and its icons, and still costs
  // the cube nothing, because it is the line that was already there.
  solveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    maxWidth: '100%',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginTop: 4,
    marginBottom: 2,
  },
  solveBarIcon: {
    marginRight: 5,
  },
  solveBarText: {
    flexShrink: 1,
    fontSize: 11,
    opacity: 0.75,
    marginRight: 4,
  },
  // Dimmer than the rest of the line, because it is context rather than
  // identity: this is the cube you are solving, not the page you are on.
  solveBarScramble: {
    fontFamily: ALG_FONT,
    opacity: 0.7,
  },
  // The live readout while inspecting. Bigger and accented than the other
  // captions on this page because during that phase it is the *answer* — the
  // one thing you are trying to get right — not a note about the screen.
  hold: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6,
    textAlign: 'center',
  },
});

export default CubeScreen;
