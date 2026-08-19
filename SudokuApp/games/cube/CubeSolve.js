import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ScreenHeader';
import useAppTheme from '../../hooks/useAppTheme';
import CubeView from './CubeView';
import CubeAlgInputModal from './CubeAlgInputModal';
import CubeCompareModal from './CubeCompareModal';
import CubeMovePad from './CubeMovePad';
import CubeMoveTrack from './CubeMoveTrack';
import CubePadLegend from './CubePadLegend';
import CubePhaseRail from './CubePhaseRail';
import CubePhaseStrip from './CubePhaseStrip';
import CubeScrubber from './CubeScrubber';
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
  cancelInverse,
  cancelTail,
  condenseRepeat,
  consolidateTail,
  dropLastToken,
  promoteLastToken,
} from './solve';
import {
  endPhase,
  phaseSpans,
  withMoves,
} from './solveList';
import { railStates } from './phaseRail';
import { moveCount, parseAlg } from './moves';
import useAppBackground from './useAppBackground';
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
    undoOpen,
    redoOpen,
    canUndo,
    canRedo,
    turnTo,
    rememberView,
    showOtherSide,
    startView,
  } = useCube();

  const [showCompare, setShowCompare] = useState(false);
  const [showTyping, setShowTyping] = useState(false);

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

  // A half-finished gesture does not survive the app leaving. The promotion
  // expires on its own after `PROMOTE_MS`, but an armed `′` has no clock — and
  // coming back tomorrow to a pad that silently primes your next move is the
  // sort of thing you would blame on the pad. This used to be free, because
  // `App.js` remounted the whole game on resume; Step 3a stopped it doing that
  // (see `useScramblePlayer`'s `rewind`) so the rule is written here instead.
  useAppBackground(resetGesture);

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
  const { afterSettle, handoff, pause, playTo, retract, seek } = player;

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

  /**
   * A drag that was interrupted by leaving the app never gets its release.
   *
   * `PanResponder` is not guaranteed a terminate when the app goes to the
   * background, so a finger that was half-way through a turn would come back to
   * a layer frozen part-way round with nothing left to finish or spring it. The
   * transport's own `rewind` (Step 3a) is the same rule applied to the same
   * event — this is the half of it that lives outside the transport, because a
   * gesture's turn is drawn in front of the player's.
   *
   * Separate from `resetGesture` above rather than folded into it: that one
   * drops half-finished **pad** presses and is wired into the pad's own paths,
   * and it is declared before this state exists. Same event, two different
   * half-finished things.
   *
   * Not committed, dropped: §7.1's line is that *authored* work survives leaving
   * and where you were standing does not, and a turn that never reached its
   * detent was never authored.
   */
  useAppBackground(useCallback(() => setGestureTurn(null), []));

  /**
   * A drag that has reached its detent — always an **append**, drawn once.
   *
   * Every commit hands `t` to the transport and appends the finger's move raw,
   * so the quarter the finger turned is the quarter the transport finishes —
   * identical token, identical polygon keys, no remount. What *kind* of move it
   * was is then a **storage** question, settled later and apart from the drawing
   * (§8.10, the seam this whole area turns on):
   *
   * - **A fold**, if this move repeats the one before it: once at rest, `F F`
   *   becomes `F2` (`consolidateTail`).
   * - **A cancel**, if this move undoes the one before it: once at rest, the
   *   redundant `L L'` pair is dropped (`cancelTail`). Appending the inverse and
   *   letting it play forward *is* undoing the move — `L'` forward is `L`
   *   backward — so a cancel needs no backward animation and no second token to
   *   draw, only the pair-drop afterward.
   *
   * Both later steps run on `afterSettle`, on a settled cube where the rewrite is
   * the same permutation and redraws as nothing. Everything goes through
   * `editOpen` + `withMoves`, so a gesture move is undoable, phase-clamped,
   * persisted and comparable like any other.
   *
   * Dropping the gesture's own frame waits a frame: the transport's first frame
   * lands at exactly the `t` this one is frozen at, so releasing the finger swaps
   * two identical pictures rather than jumping.
   */
  const commitTurn = useCallback(
    (move, t) => {
      // **A move that undoes the one just written is a fumble, not notation.**
      // Turning a layer and immediately turning it back is figuring a piece out,
      // so it comes off the solve rather than being kept as `L L'` (operator,
      // 2026-08-18). It is drawn and stored the same two-concerns way the fold is
      // (see below), because the naive way flashes: the finger has drawn the
      // inverse (`L'`), and running the *original* `L` backwards through
      // `retract` draws a different token — a different destination, a different
      // polygon key — so the layer remounts when the gesture hands over. Instead
      // the inverse is **appended and animated forward like any move** (the
      // finger drew `L'`, `L'` forward *is* `L` undone, so it looks identical and
      // keys identically, no remount), and once the cube is at rest the
      // cancelling pair is dropped as a data-only step — `L L'` is the identity,
      // so removing both redraws as nothing (§8.10).
      if (cancelInverse(solve, move.token) !== null) {
        handoff(t);
        editOpen((current) => withMoves(current, appendToken(current.alg, move.token)), { history: 'skip' });
        afterSettle(() =>
          editOpen((current) => {
            const cancelled = cancelTail(current.alg);
            return cancelled !== null ? withMoves(current, cancelled) : {};
          }, { history: 'replace' })
        );
        requestAnimationFrame(() => setGestureTurn(null));
        return;
      }

      // Otherwise the drag earned a move. Tell the transport how far round it
      // already is, then append it — through `editOpen` and `withMoves`, the two
      // doors every other edit goes through, so a gesture move is undoable,
      // phase-clamped, persisted and comparable like any other. The handoff is
      // what stops the transport animating it from zero and snapping the layer
      // back under the finger.
      handoff(t);
      // **The quarter is appended raw and animates cleanly; the fold into a half
      // turn is a separate, later step.** Folding `F F` → `F2` at commit would
      // *promote* the move — quarter (`amount: 1`) rewritten as a half
      // (`amount: 2`) — and the renderer keys its polygons by where a move sends
      // them, so promoting a move that is still animating remounts the layer and
      // flashes (§8.10). So the token goes in raw, the transport draws the one
      // quarter the finger turned, and if that quarter completes a pair,
      // `afterSettle` runs the fold once the cube is at rest — where `F F` → `F2`
      // is the same permutation and redraws as nothing. Drawing and storage,
      // kept apart, which is the whole of it.
      const willFold = condenseRepeat(solve, move.token) !== null;
      editOpen((current) => withMoves(current, appendToken(current.alg, move.token)), { history: 'skip' });
      if (willFold) {
        afterSettle(() =>
          editOpen((current) => {
            const folded = consolidateTail(current.alg);
            return folded !== null ? withMoves(current, folded) : {};
          }, { history: 'replace' })
        );
      } else {
        afterSettle(() => editOpen({}, { history: 'push' }));
      }
      requestAnimationFrame(() => setGestureTurn(null));
    },
    [solve, handoff, retract, afterSettle, editOpen]
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
  const undoAction = useCallback(() => {
    resetGesture();
    undoOpen((current, next, restore) => {
      const removesTrailingMove = dropLastToken(current.alg) === next.alg;
      if (removesTrailingMove && player.index === moveCount(current.alg)) retract(restore);
      else {
        pause();
        restore();
      }
    });
  }, [undoOpen, retract, pause, player.index, resetGesture]);

  // A restored solve has authored moves but deliberately no session history.
  // Once Undo reaches that boundary, Backspace remains available so old work is
  // still editable; the deletion itself enters history and can be undone.
  const backspaceMove = useCallback(() => {
    resetGesture();
    retract(() => editOpen((current) => withMoves(current, dropLastToken(current.alg))));
  }, [retract, editOpen, resetGesture]);

  const redoAction = useCallback(() => {
    resetGesture();
    pause();
    redoOpen();
  }, [redoOpen, pause, resetGesture]);

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
   * Lock the open method stage at the end of what has been written. The rail is
   * deliberately independent of the scrub position: standing earlier in the
   * solve must not put a marker in the wrong place.
   */
  const endPhaseHere = useCallback(
    (label) => {
      pause();
      resetGesture();
      editOpen((current) => ({
        phases: endPhase(
          current.phases,
          moveCount(current.alg),
          label,
          moveCount(current.alg)
        ),
      }));
    },
    [pause, resetGesture, editOpen]
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
  const rail = useMemo(
    () => railStates(shown.method, phases, solve),
    [shown.method, phases, solve]
  );

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

  // The page was deleted; the pop is already dispatched and there was never a
  // frame to draw. (`shown` covers the ordinary case, where the screen outlives
  // its solve by an animation.)
  if (!shown) {
    return <View style={[styles.container, { backgroundColor: theme.colors.background }]} />;
  }

  /**
   * Which method this solve is, on the header row (docs/cube-flow-plan.md §3.4).
   *
   * **A word, not a bordered pill**, and it rides in `actions` rather than beside
   * the title because `ScreenHeader` has no slot beside the title and this epic
   * is not spending a third sanctioned edit outside `games/cube/` on one.
   *
   * **The trade is measured, in a browser, at all three widths:** the tag is
   * **34 points** of the right-hand column, and `rightSectionDense` has
   * `flexShrink: 0`, so those points come off the title column — 141 → 107 at
   * 320, 196 → 162 at 375, 214 → 180 at 393. At 375 and up a 13-character solve
   * name still fits whole; at 320 it loses about two characters, and the
   * scramble subtitle, already ellipsized there, loses a little more.
   *
   * **It costs the cube nothing**, which is the number §8.6 actually asks for:
   * no row, and the header's height is set by the buttons either side of it.
   *
   * Nothing for a Freeform or a legacy solve — see `CubeSolveList`, which makes
   * the same omission for the same reason. And this is a **Step 4 stopgap by
   * design**: from Step 5 the rail *is* the method, spelled out in stages, and
   * this word can go (plan §6, question 11).
   */
  /**
   * The header's controls: view, Compare, and the algorithm keyboard.
   *
   * **The notebook button became Compare in Step 3.** It used to open
   * `CubeSolvesModal`, which was the list of solves *and* the comparison behind
   * a toggle; the list is the scramble screen's now, one back gesture away and
   * with a card per solve, so what is left of the modal is the table — and the
   * table is worth keeping right here, because "is this attempt better than the
   * last one" is a question you ask *while writing this attempt*.
   *
   * Only once there are two attempts to compare. With one, the table is a row of
   * numbers with nothing beside it — the rule the modal's own toggle already
   * applied to itself — and a control that does nothing is worse than one that
   * is not there.
   *
   * Rename, duplicate, clear and delete left with the list. They are a long-press
   * on a card now (`CubeSolveMenu`), which is where the solves are.
   *
   * The keyboard moved here in Step 6 so Backspace could remain a permanent pad
   * key beside Undo and Redo. It costs 39 horizontal points only; no row and no
   * cube height. At the 320-point floor the solve title may ellipsize, while its
   * full text remains the screen-reader label.
   */
  const headerActions = (
    <>
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

      {mySolves.length > 1 &&
        headerAction({
          name: 'table-large',
          label: `Compare the ${mySolves.length} attempts`,
          hint: 'Shows each solve’s phase counts side by side',
          onPress: () => setShowCompare(true),
          color: titleColor,
          border,
        })}

      {headerAction({
        name: 'keyboard-outline',
        label: 'Type an algorithm',
        hint: 'Opens a field for typing or pasting a whole sequence',
        onPress: () => setShowTyping(true),
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

      {/* Directly under the moves it is describing. A method rail is permanent;
          Freeform and legacy chips appear only when their old markers exist.
          Above the cube rather than below the pad because it is about the
          *moves*, and the eye should not have to cross the cube to get from
          `First block · 8` to the eight moves it counted. */}
      {!inspecting && rail.length > 0 && (
        <CubePhaseRail
          states={rail}
          accent={CUBE_ACCENT}
          theme={theme}
          onLock={endPhaseHere}
        />
      )}
      {!inspecting && rail.length === 0 && spans.length > 0 && (
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
              ? 'Drag a sticker to turn that layer, drag from a corner of the front face to turn it, or drag with two fingers to turn the whole cube'
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
            canUndo={canUndo}
            canBackspace={solveCount > 0}
            canRedo={canRedo}
            promoteKey={promoteKey}
            primed={primed}
            accent={CUBE_ACCENT}
            theme={theme}
            onKey={tapKey}
            onPrime={tapPrime}
            onUndo={undoAction}
            onBackspace={backspaceMove}
            onRedo={redoAction}
          />
          {windowHeight >= LEGEND_MIN_HEIGHT && (
            <CubePadLegend theme={theme} accent={CUBE_ACCENT} />
          )}
        </>
      )}

      <CubeCompareModal
        visible={showCompare}
        theme={theme}
        accent={CUBE_ACCENT}
        solves={mySolves}
        currentId={openSolve ? openSolve.id : null}
        onClose={() => setShowCompare(false)}
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
