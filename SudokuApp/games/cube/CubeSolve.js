import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ScreenHeader';
import useAppTheme from '../../hooks/useAppTheme';
import CubeView from './CubeView';
import CubeAlgInputModal from './CubeAlgInputModal';
import CubeMovePad from './CubeMovePad';
import CubeMoveTrack from './CubeMoveTrack';
import CubeNameModal from './CubeNameModal';
import CubePadLegend from './CubePadLegend';
import CubePhaseModal from './CubePhaseModal';
import CubePhaseStrip from './CubePhaseStrip';
import CubeScrubber from './CubeScrubber';
import CubeSolvesModal from './CubeSolvesModal';
import CubeTuningPanel from './CubeTuningPanel';
import { ALG_FONT } from './algText';
import { applyMoves } from './cubeState';
import { announcePosition } from './player';
import {
  describeOrientation,
  describeOrientationSentence,
  orientationAt,
  viewAfterHold,
} from './orientation';
import {
  PROMOTE_MS,
  appendAlg,
  appendToken,
  applyPadPress,
  condenseRepeat,
  dropLastToken,
  promoteLastToken,
} from './solve';
import {
  endPhase,
  findSolve,
  isPhaseBoundary,
  openPhaseStart,
  phaseSpans,
  removePhase,
  withMoves,
} from './solveList';
import { moveCount, parseAlg } from './moves';
import useScramblePlayer from './useScramblePlayer';
import useCubeStage from './useCubeStage';
import { CUBE_ACCENT, headerAction, styles } from './cubeChrome';
import { useCube, useReportsSolveRoute } from './CubeContext';
import { mix } from '../../utils/color';

/** The markers of a solve that is not there. A shared constant rather than a
 *  fresh `[]`, so the memos reading it are not rebuilt on every render. */
const NO_PHASES = [];

/**
 * How tall a phone has to be before the pad's colour legend is drawn
 * (docs/cube-plan.md §8.8).
 *
 * **This is §8.6's budget rule, made executable.** The cube is sized first and
 * every other row has to justify itself against it — and the legend is the one
 * row the design itself nominates as the first to go: four tints that need a
 * permanent key may be four tints too many, and the pad's grouping is *also*
 * carried by position.
 *
 * Above this height the cube is limited by the width of the phone rather than by
 * the page, so the legend costs it **nothing** and it is drawn. Below it, the 29
 * points come straight out of the cube — at 320×568 they are the difference
 * between a 94-point cube and a 123-point one.
 *
 * Keyed on the **window**, deliberately, and not on the measured stage: a row
 * whose presence depended on a measurement it changes is a layout that
 * oscillates.
 */
const LEGEND_MIN_HEIGHT = 780;

/**
 * Writing a solve — the pushed screen (docs/cube-flow-plan.md §3.2).
 *
 * ### A push, not a flag
 *
 * This was `solving === true` until Step 2: one screen, two modes, related by a
 * persisted boolean. It is a route now, which is the epic's whole thesis — the
 * back chevron and the edge swipe are a pattern nobody has to learn, and the
 * scramble the solve belongs to is *underneath* it rather than behind a flag.
 *
 * The transport is still `useScramblePlayer`, the same hook the scramble screen
 * plays with; what differs is which string it is playing and which cube move 1
 * starts from — the scrambled one, turned the way the operator chose to hold it,
 * which is the cube you would have in your hands.
 *
 * ### Two phases: find the hold, then write the solve
 *
 * `inspecting` is the first, and it survives Step 2 unchanged as this screen's
 * opening state (`orientation === null`). Inspecting is panning, so it gets the
 * whole page — no pad, no transport, and a cube roughly twice the size. The hold
 * is **panned to, not typed** (docs/cube-plan.md §8.3), and `orientation`'s
 * three states — `null`, `''`, notation — stay three.
 *
 * ### Nothing authored lives here
 *
 * The hold and the moves are fields of a solve in `CubeContext`, and every edit
 * goes through its `editOpen`. What is local, and deliberately so, is the scrub
 * position, the half-finished key gesture and which modal is open — where the
 * operator is standing rather than what they wrote (docs/cube-plan.md §7.1).
 */
const CubeSolve = ({ navigation }) => {
  const { theme } = useAppTheme();
  const {
    scramble,
    scrambledCube,
    openId,
    openSolve,
    mySolves,
    yaw,
    pitch,
    editOpen,
    startNewSolve,
    showSolve,
    copySolve,
    deleteSolve,
    renameSolveById,
    clearSolveById,
    turnTo,
    rememberView,
    showOtherSide,
    startView,
  } = useCube();

  const [showSolves, setShowSolves] = useState(false);
  // The solve being renamed, or null. The two modals are opened one at a time
  // rather than stacked — a Modal presented on top of a Modal is reliable on
  // web and finicky on iOS, and there is nothing to gain by finding out which.
  const [renamingId, setRenamingId] = useState(null);
  const [showTyping, setShowTyping] = useState(false);
  const [showPhases, setShowPhases] = useState(false);

  /**
   * The key a second tap would promote to a half turn, or null
   * (docs/cube-plan.md §8.8).
   *
   * State rather than a ref, and one piece of it rather than a `lastKey` plus a
   * `lastKeyAt`, because **the pad draws it**: the key wears a `2` in the corner
   * while it is promotable, so "what will the next tap do" is on the screen
   * rather than in the operator's head.
   *
   * Not persisted: it is a half-finished gesture, not a written move — and it
   * dies with this screen, which is the right lifetime for it now that leaving
   * the solve unmounts one.
   */
  const [promoteKey, setPromoteKey] = useState(null);
  const promoteTimer = useRef(null);

  /**
   * The `′` key is armed, so the next move key writes a prime.
   *
   * The second route to a prime, added after the operator used the first one on
   * a phone: the hold's feedback is drawn on the key being held, which is the
   * key under the thumb. This one's feedback is everywhere else — the `′` fills
   * accent and every move key relabels itself.
   */
  const [primed, setPrimed] = useState(false);

  const { measureStage, cubeSize, room, windowHeight } = useCubeStage();

  useReportsSolveRoute(navigation, true);

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
   * transition that invalidates one invalidates the other — a different solve,
   * an undo, a clear, opening the flag.
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

  /**
   * The solve this screen is drawing — including for the frames it outlives it.
   *
   * Deleting the open page is allowed to leave nothing open, and this screen
   * then goes back; but a native stack keeps a popped screen mounted while it
   * slides out, so rendering `null` at that point would blank the page on its
   * way off the screen. Holding the last one it had is a frame of the truth
   * rather than a second copy of it — nothing is written through this.
   */
  const lastSolve = useRef(null);
  if (openSolve) lastSolve.current = openSolve;
  const shown = openSolve || lastSolve.current;

  // Nothing left to write into: the page was deleted out from under the screen.
  useEffect(() => {
    if (!openSolve) navigation.goBack();
  }, [openSolve, navigation]);

  // The hold and the moves, read off the open solve.
  const orientation = shown ? shown.orientation : null;
  const solve = shown ? shown.alg : '';
  const phases = shown ? shown.phases : NO_PHASES;

  // The scramble, turned the way the operator chose to hold it — the cube move 1
  // of the solve starts on. A rotation moves the *model*, so after `z2` the move
  // `R` turns the face that is now on the right, which is exactly what a Roux
  // solve written after inspection means (docs/cube-plan.md §8.2).
  const orientedCube = useMemo(() => {
    if (!orientation) return scrambledCube;
    try {
      return applyMoves(scrambledCube, parseAlg(orientation));
    } catch (error) {
      return scrambledCube;
    }
  }, [scrambledCube, orientation]);

  /**
   * The cube move 1 starts on — and, just as importantly, **the identity that
   * tells a new algorithm from a growing one** (see `useScramblePlayer`).
   *
   * `openId` is a dependency even though the cube does not always depend on it.
   * Two solves against one scramble can share a hold, so `orientedCube` need not
   * change when you switch between them — and if the identity did not change,
   * the transport would read the second solve as the first one having grown and
   * **animate its way from one into the other**. Switching pages is a reset,
   * always, so the identity changes with the page.
   */
  const startingCube = useMemo(() => orientedCube, [orientedCube, openId]);

  const player = useScramblePlayer(solve, startingCube);
  const { handoff, pause, playTo, retract, seek } = player;

  const onOrbit = useCallback(
    (nextYaw, nextPitch) => {
      pause();
      turnTo(nextYaw, nextPitch);
    },
    [pause, turnTo]
  );

  // ——— Writing a move by turning the layer (docs/cube-touch-exploration.md) ——

  /**
   * The layer a finger is part-way through turning.
   *
   * It sits *in front of* the transport's own turn while a drag is live, because
   * for those few hundred milliseconds the finger is the clock. There is never
   * one of each: engaging pauses playback, exactly as a tap on the pad does.
   */
  const [gestureTurn, setGestureTurn] = useState(null);

  /** The spike's dials. Not a setting — see `CubeTuningPanel`. */
  const [showTuning, setShowTuning] = useState(false);

  /**
   * A drag that earned its move.
   *
   * The order matters and is the whole of the handoff: **tell the transport how
   * far round the move already is, then append it.** The append is what makes it
   * a move — through `editOpen` and `withMoves`, the same two doors every other
   * edit goes through, so a gesture-entered move is undoable, phase-clamped,
   * persisted and comparable like any other. The handoff is what stops the
   * transport animating it from zero, which would snap the layer back under the
   * finger that had just turned it.
   *
   * Dropping the gesture's own frame waits a frame: the transport's first frame
   * is at exactly the `t` this one is frozen at, so handing over on the next tick
   * swaps two identical pictures.
   */
  const commitTurn = useCallback(
    (move, t, turns) => {
      handoff(t, turns);
      editOpen((current) =>
        withMoves(
          current,
          // Turning the same layer the same way twice is one half turn, not two
          // quarters — the gesture's version of the pad's second tap.
          condenseRepeat(current.alg, move.token) ?? appendToken(current.alg, move.token)
        )
      );
      requestAnimationFrame(() => setGestureTurn(null));
    },
    [handoff, editOpen]
  );

  /**
   * What the cube does with a finger on it, or `null` for orbit-only.
   *
   * Two phases say no. **Inspecting** is panning to *find the hold* — the cube
   * is not a cube you are writing on yet, and a layer turning during it would
   * change the very thing being chosen (`CubeSolve` §"Two phases"). **Web** gets
   * mouse events with no second finger, so there would be no way left to orbit
   * that is not a button; the exploration doc §5.4 calls degrading to today's
   * behaviour there a legitimate answer, and this is it.
   */
  const turning = useMemo(
    () =>
      orientation === null || Platform.OS === 'web'
        ? null
        : { onTurn: setGestureTurn, onCommit: commitTurn, onPause: pause },
    [orientation, commitTurn, pause]
  );

  /**
   * Take the angle the cube is being looked at from and make it the hold.
   *
   * The conversion is `orientationAt`, and the reason it has to be a conversion
   * at all is that panning moves the camera while a hold moves the model: after
   * this, `R` turns the face that is now on the right.
   *
   * What was picked is a *hold* — which colour is up, which is in front — not a
   * camera position, and there are 24 of those against every angle a finger can
   * stop at. `viewAfterHold` works out where the camera has to stand to keep
   * showing what it is showing, now that the hold has been turned into the model
   * underneath it.
   */
  const setStartingOrientation = useCallback(() => {
    pause();
    editOpen({ orientation: orientationAt(yaw, pitch) });
    rememberView(viewAfterHold(yaw, pitch));
  }, [pause, editOpen, rememberView, yaw, pitch]);

  // Back to inspection. Only offered while the solve is empty: re-orienting
  // under moves that are already written would silently change what every one
  // of them does to the cube (operator, 2026-08-02).
  const reorient = useCallback(() => {
    pause();
    editOpen({ orientation: null });
  }, [pause, editOpen]);

  // ——— The picker (docs/cube-plan.md §7.1) ———————————————————————————————

  /** Put a different solve on this screen. Still a page swap rather than a
   *  push: the stack is the scramble and the page on it, not one screen per
   *  page you have ever opened. */
  const openSolveById = useCallback(
    (id) => {
      pause();
      resetGesture();
      showSolve(id);
      setShowSolves(false);
    },
    [pause, resetGesture, showSolve]
  );

  const openNewSolve = useCallback(() => {
    pause();
    resetGesture();
    startNewSolve();
    setShowSolves(false);
  }, [pause, resetGesture, startNewSolve]);

  // Copy a solve and open the copy — "same first block, try the second block
  // differently", which starts by keeping what you already had.
  const duplicate = useCallback(
    (id) => {
      pause();
      resetGesture();
      copySolve(id);
      setShowSolves(false);
    },
    [pause, resetGesture, copySolve]
  );

  const removeSolveById = useCallback(
    (id) => {
      pause();
      // The effect above takes the screen back when this empties the page; doing
      // it here as well would pop twice on the same tap.
      deleteSolve(id);
    },
    [pause, deleteSolve]
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
      renameSolveById(renamingId, name);
      endRename();
    },
    [renamingId, endRename, renameSolveById]
  );

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
      // plain single turn can be promoted, a prime or a half turn cannot.
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
  // The drop goes through `withMoves`, as every edit to the moves does: a phase
  // is an index into the list being edited, and undo is the edit that can leave
  // one pointing past the end of it (docs/cube-plan.md §8.5).
  //
  // **Disarming the promotion here is the belt to `promoteLastToken`'s braces.**
  // The move the promotion would rewrite is the move this is deleting, and undo
  // takes 260ms to land it.
  const undoMove = useCallback(() => {
    resetGesture();
    retract(() => editOpen((current) => withMoves(current, dropLastToken(current.alg))));
  }, [retract, editOpen, resetGesture]);

  /**
   * Clear a page's moves.
   *
   * Clearing the page that is *on the cube* has to stop the transport and disarm
   * the pad — that is what keeps a turn in flight from landing on an empty solve
   * — and clearing any other page must not touch either of them.
   */
  const clearSolve = useCallback(
    (id) => {
      if (id === openId) {
        pause();
        resetGesture();
      }
      clearSolveById(id);
    },
    [openId, pause, resetGesture, clearSolveById]
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
   * "Here" is **where the cube is**, not the end of the solve. While writing they
   * are the same place — every entered move animates to the end — and when they
   * are not, scrubbing back to where the first block finished and marking it
   * there is the obvious thing to want.
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
   * The other half of annotating (docs/cube-plan.md §8.5), and two calls rather
   * than a second transport: jump to where the group starts, then walk to where
   * it ends. The jump is deliberate — "play just the second block" is not a
   * request to watch the first one go past first.
   */
  const playPhase = useCallback(
    (span) => {
      seek(span.at);
      if (span.end > span.at) playTo(span.end);
    },
    [seek, playTo]
  );

  const titleColor = theme.colors.title;
  const border = theme.colors.numberPad.border;
  const pendingColor = mix(titleColor, theme.colors.background, 0.55);

  const solveCount = moveCount(solve);

  // The move groups (docs/cube-plan.md §8.5). Markers are stored; **the spans
  // and their counts are derived every render**, because "first block in 8" has
  // to be a subtraction over the boundaries rather than a number kept alongside
  // them — a stored count is a second thing to keep honest on every edit.
  const spans = useMemo(() => phaseSpans(phases, solveCount), [phases, solveCount]);

  // The group of moves that ends where the cube is, and therefore whether there
  // is anything to name at all. `renaming` is the case where a boundary is
  // already sitting here: the last "end the phase" put it there, so a name can
  // only mean the group behind it.
  const openStart = openPhaseStart(phases, player.index);
  const openMoves = Math.max(0, player.index - openStart);
  const renamingPhase = isPhaseBoundary(phases, player.index);

  // The boundaries, for the dividers in the move track. A set, because the track
  // asks this once per token.
  const marks = useMemo(() => new Set(phases.map((phase) => phase.at)), [phases]);

  // The first of this screen's two phases: **find the hold**, then **write the
  // solve**. `orientation` has three states and the `null` one is this
  // (docs/cube-flow-plan.md §5) — nothing here may collapse them to two.
  const inspecting = orientation === null;

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

  // The page was deleted; the pop is already dispatched and there was never a
  // frame to draw. (`shown` covers the ordinary case, where the screen outlives
  // its solve by an animation.)
  if (!shown) {
    return <View style={[styles.container, { backgroundColor: theme.colors.background }]} />;
  }

  /**
   * The header's controls, which on this screen are the *view* plus the way into
   * the picker.
   *
   * The notebook is what the `solveBar` used to be. That line said which page,
   * which hold and how many moves and opened the list; the title and the
   * subtitle say the first and the last of those now, so what is left of it is
   * the way in — and a button on a row that was already paid for costs the cube
   * nothing, where the bar cost it about 30 points.
   *
   * It is offered while inspecting too, and that is not symmetry for its own
   * sake: inspecting a brand-new solve you have changed your mind about would
   * otherwise be a corner with no way to delete the page you are standing on.
   */
  const headerActions = (
    <>
      {/* Spike only, and it goes when the spike does: the gesture's numbers are
          guesses that can only be settled with a cube in a hand, so the hand
          gets the dials (docs/cube-touch-exploration.md §3.3d). */}
      {turning &&
        headerAction({
          name: 'tune-variant',
          label: 'Gesture tuning',
          hint: 'Adjusts how turning the cube by finger feels. Not saved.',
          onPress: () => setShowTuning(true),
          color: titleColor,
          border,
        })}

      {/* Whichever of the two the hold allows, and the rule is V1's Step 5's,
          unchanged: re-orienting is free while the solve is empty and locked
          once it is not, because re-orienting under moves already written would
          silently change what every one of them does. */}
      {!inspecting &&
        (solveCount === 0
          ? headerAction({
              name: 'axis-arrow',
              label: 'Pick the starting orientation again',
              hint: 'Goes back to turning the cube to how you want to hold it',
              onPress: reorient,
              color: titleColor,
              border,
            })
          : headerAction({
              name: 'restore',
              label: 'Back to the starting view',
              hint: `Looks at the cube from ${holdText} again`,
              onPress: startView,
              color: titleColor,
              border,
            }))}

      {headerAction({
        name: 'rotate-3d-variant',
        label: 'Turn the cube around',
        hint: 'Shows the three faces that are currently hidden',
        onPress: showOtherSide,
        color: titleColor,
        border,
      })}

      {headerAction({
        name: 'notebook-outline',
        label: `Solves for this scramble, ${mySolves.length} written`,
        hint: 'Opens the solves written for this scramble',
        onPress: () => setShowSolves(true),
        color: titleColor,
        border,
      })}
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* The back chevron replaces the home button, and the subtitle replaces the
          `solveBar`: which page you are on, and which cube you are on, in the row
          that was already there. **The subtitle is unconditional** —
          `ScreenHeader` warns that one which comes and goes changes the header's
          height, and everything under it is sized from what is left. */}
      <ScreenHeader
        title={shown.name}
        subtitle={scramble}
        subtitleFont={ALG_FONT}
        theme={theme}
        onHomePress={navigation.goBack}
        homeIcon="chevron-left"
        homeLabel="Back to the scramble"
        homeHint="Leaves the solve and shows the scramble again; the solve is kept"
        dense
        actions={headerActions}
      />

      {/* **Inspection does not get a track.** There are no moves yet, and the
          prompt it used to hold is said better by the live hold readout under
          the cube — which is the answer the phase is actually looking for. */}
      {!inspecting && (
        <CubeMoveTrack
          tokens={player.tokens}
          index={player.index}
          marks={marks}
          placeholder="Tap a key to begin"
          accent={CUBE_ACCENT}
          theme={theme}
          pendingColor={pendingColor}
          noun="solve"
          label={`Solve: ${solve || 'nothing yet'}`}
          room={room}
          onSeek={playTo}
        />
      )}

      {/* Directly under the moves it is describing, and only once there is
          something to describe — a solve with no markers costs the cube nothing.
          Above the cube rather than below the pad because it is about the
          *moves*, and the eye should not have to cross the cube to get from
          `First block · 8` to the eight moves it counted. */}
      {!inspecting && spans.length > 0 && (
        <CubePhaseStrip
          spans={spans}
          index={player.index}
          accent={CUBE_ACCENT}
          theme={theme}
          onPlay={playPhase}
        />
      )}

      <View style={styles.stage} onLayout={measureStage}>
        <CubeView
          cube={player.cube}
          // The finger in front of the clock: while a layer is being dragged it
          // *is* what the cube is doing, and playback has already been paused.
          turn={gestureTurn || player.turn}
          size={cubeSize}
          yaw={yaw}
          pitch={pitch}
          onOrbit={onOrbit}
          turning={turning}
          accessibilityLabel={`Cube — ${announcePosition(player.index, player.count, 'solve')}`}
          accessibilityHint={
            turning
              ? 'Drag a sticker to turn that layer, or drag with two fingers to turn the whole cube'
              : undefined
          }
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
          noun="solve"
          startLabel="Back to the starting cube"
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
              rather than above the cube — inspecting reads bottom-up, cube then
              hold then set. */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.toolButton, { borderColor: border }]}
              onPress={navigation.goBack}
              accessibilityRole="button"
              accessibilityLabel="Back to the scramble"
              accessibilityHint="Leaves the solve and shows the scramble again; the solve is kept"
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
      ) : (
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
          {windowHeight >= LEGEND_MIN_HEIGHT && (
            <CubePadLegend theme={theme} accent={CUBE_ACCENT} />
          )}
        </>
      )}

      <CubeTuningPanel
        visible={showTuning}
        theme={theme}
        accent={CUBE_ACCENT}
        onClose={() => setShowTuning(false)}
      />

      <CubeSolvesModal
        visible={showSolves}
        theme={theme}
        accent={CUBE_ACCENT}
        solves={mySolves}
        currentId={openSolve ? openSolve.id : null}
        describeHold={describeHold}
        onOpen={openSolveById}
        onNew={openNewSolve}
        onDuplicate={duplicate}
        onRename={beginRename}
        onRemove={removeSolveById}
        onClear={clearSolve}
        onClose={() => setShowSolves(false)}
      />

      <CubeNameModal
        visible={renamingId !== null}
        theme={theme}
        accent={CUBE_ACCENT}
        title="Name this solve"
        name={(findSolve(mySolves, renamingId) || {}).name || ''}
        onSubmit={submitRename}
        onClose={endRename}
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

export default CubeSolve;
