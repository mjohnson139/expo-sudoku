import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import ScreenHeader from '../../components/ScreenHeader';
import useAppTheme from '../../hooks/useAppTheme';
import CubeView from './CubeView';
import CubeCompareModal from './CubeCompareModal';
import CubeFavoritesModal from './CubeFavoritesModal';
import CubeMoveTrack from './CubeMoveTrack';
import CubeNameModal from './CubeNameModal';
import CubeNewSolveSheet from './CubeNewSolveSheet';
import CubeScrubber from './CubeScrubber';
import CubeSolveList from './CubeSolveList';
import CubeSolveMenu from './CubeSolveMenu';
import { solvedCube } from './cubeState';
import { announcePosition } from './player';
import { findSolve } from './solveList';
import useScramblePlayer from './useScramblePlayer';
import useCubeStage from './useCubeStage';
import { CUBE_ACCENT, CubeLoading, headerAction, styles } from './cubeChrome';
import {
  HOME_ROUTE,
  LIBRARY_ROUTE,
  SOLVE_ROUTE,
  useCube,
  useReportsSolveRoute,
} from './CubeContext';
import { mix } from '../../utils/color';

/**
 * A scramble has no markers and cannot have any.
 *
 * A shared empty set rather than a fresh one per render, and a constant rather
 * than the open solve's phases on purpose: the card this replaced drew *the open
 * solve's* dividers across the scramble, and you have to open a scramble that
 * already has an annotated solve behind it to see that.
 */
const NO_MARKS = new Set();

/**
 * The scramble — the cube's home screen (docs/cube-flow-plan.md §3.2).
 *
 * ### What this screen is now
 *
 * Until Step 2 this was one half of a screen with a `solving` flag on it. It is
 * the root of the cube's own stack now, and writing a solve is a **push**: a
 * standard back button and a standard edge swipe, replacing a mode flip nobody
 * could see. What the two screens share is the state above them
 * (`CubeContext`), the stage arithmetic (`useCubeStage`) and the chrome
 * (`cubeChrome`) — not a flag.
 *
 * ### Step 3 gave the bottom of it to the solves
 *
 * The row that used to sit here — **Solve · New · Save** — is gone. `Solve` was
 * "resume whichever page you were last on", which is a guess the list no longer
 * has to make; `New` and `Save` are icons on the header; and what the row paid
 * for is `CubeSolveList`, which is the one-scramble-many-solves structure this
 * epic exists to put on the screen that owns it (docs/cube-flow-plan.md §3.3).
 *
 * ### The page does not scroll, on purpose — the *list* does
 *
 * The cube claims every pan gesture inside its square (see `CubeView`). A
 * `ScrollView` wrapping the page would put the two in competition for each drag,
 * which is the exact race this repo already lost once on Fungiku's board
 * (docs/fungiku-plan.md §2). So the page stays a fixed column: the cube is sized
 * from the space its stage measures, and the scroll lives *inside* the list,
 * under the cube and nowhere near it.
 */
const CubeHome = ({ navigation, onExitToHub }) => {
  const { theme } = useAppTheme();
  const {
    methods,
    scramble,
    saved,
    favorites,
    mySolves,
    openId,
    restoredOpen,
    clearRestoredOpen,
    yaw,
    pitch,
    newScramble,
    toggleSaved,
    showScramble,
    removeSaved,
    showSolve,
    startNewSolve,
    copySolve,
    deleteSolve,
    renameSolveById,
    clearSolveById,
    turnTo,
    showOtherSide,
  } = useCube();

  const [showFavorites, setShowFavorites] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  // Step 4's sheet: `+ New solve` opens this rather than creating a solve, and
  // `Start solve` is what creates and pushes.
  const [showNewSolve, setShowNewSolve] = useState(false);
  // The solve a long-press opened the menu for, and the one being renamed —
  // separately, because the two modals are opened one at a time rather than
  // stacked (a Modal over a Modal is reliable on web and finicky on iOS).
  const [managingId, setManagingId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const { measureStage, cubeSize, room, windowHeight } = useCubeStage();

  // This screen is the one under the push, so it is the one that says "no solve
  // is open" — every route out of the solve screen goes through the moment this
  // one is focused again.
  useReportsSolveRoute(navigation, false);

  /**
   * Put the pushed solve back on the stack.
   *
   * **This is a cold start only, and Step 3a is why that matters.** Until then
   * `App.js` also remounted the whole cube screen on `AppState → 'active'`, so
   * this ran on every resume — and a native stack *animates* a route it is
   * handed, so the operator came back to their open solve and then watched it
   * slide in over itself (found on a device; invisible in a browser, where
   * `react-native-screens` no-ops). The cube opts out of that remount now
   * (`keepsStateOnResume` in `games/registry.js`), so a resume changes nothing
   * and there is nothing to animate.
   *
   * What is left is the case this was always for: the process was killed and the
   * app is starting fresh. `workspace.solveId` is what remembers, and
   * `CubeProvider` holds both screens back until the save has landed, so
   * `restoredOpen` is already the truth by the time this screen exists.
   *
   * A `reset` rather than a `push` because a restore is not a navigation the
   * operator performed. **A cold start may still show the transition** — that is
   * one slide while the app is launching rather than one on every resume, and
   * suppressing it means racing the animation with a prop change, which is a
   * worse trade than living with it.
   *
   * ### It has to wait a commit, and that is not a hack
   *
   * **A screen's mount effect runs before its navigator's** — children first, on
   * the way up. A navigator commits its own initial state in one of those
   * effects, so a reset dispatched from here on the first commit is computed,
   * accepted, and then overwritten by the initial state a moment later: the
   * route appears in `getState()` and the screen never mounts. That failure is
   * silent, and it cost this step an afternoon. Waiting for a second commit is
   * what makes the navigator's state the one being reset rather than the one
   * about to be replaced — and `restoring` keeps the scramble off the screen for
   * the frame in between, so a resume goes spinner → solve rather than
   * spinner → scramble → solve.
   *
   * ### And it keeps this screen's own route key
   *
   * A route in a reset payload without a key is a *new* route: the router mints
   * one, and this screen — which is in the payload — is torn down and mounted
   * again. It then reads the same flag, resets again, and the app restores
   * itself forever at about one frame per second. Two things stop it: the key
   * below, so the reset moves the stack rather than rebuilding it, and clearing
   * the flag, so a remount for any *other* reason cannot re-fire a restore
   * either.
   */
  const [settled, setSettled] = useState(false);
  const [restoring, setRestoring] = useState(restoredOpen);
  useEffect(() => setSettled(true), []);
  useEffect(() => {
    if (!settled || !restoring) return;
    const here = navigation.getState().routes[0];
    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [{ key: here.key, name: HOME_ROUTE }, { name: SOLVE_ROUTE }],
      })
    );
    setRestoring(false);
    clearRestoredOpen();
  }, [settled, restoring, navigation, clearRestoredOpen]);

  // A scramble is played from the solved cube. Memoized on the scramble because
  // this object's identity is what `useScramblePlayer` reads as "a different
  // algorithm entirely" rather than "the algorithm grew" — and the *empty*
  // scramble this screen can mount with vacuously "extends" into the real one,
  // so without it a cold start would play the whole scramble at you.
  const startingCube = useMemo(() => solvedCube(), [scramble]);
  const player = useScramblePlayer(scramble, startingCube);
  const { pause, playTo, seek } = player;

  // Dragging mid-playback would be the cube and the finger fighting over the
  // same cube, so the finger wins: a drag stops playback and lands the turn it
  // interrupted. A tap does not — it is how you look without losing your place.
  const onOrbit = useCallback(
    (nextYaw, nextPitch) => {
      pause();
      turnTo(nextYaw, nextPitch);
    },
    [pause, turnTo]
  );

  /**
   * Open a solve — the two calls, and the only way onto the solve screen.
   *
   * `showSolve` then `navigate`, in that order, because the pushed screen reads
   * the open page off the context as it mounts. There is no "resume the page you
   * were last on" any more: the list says which pages there are and the operator
   * points at one, which is the guess this step exists to stop making.
   */
  const openSolveScreen = useCallback(
    (id) => {
      pause();
      showSolve(id);
      navigation.navigate(SOLVE_ROUTE);
    },
    [pause, showSolve, navigation]
  );

  /**
   * A fresh page against this scramble — in two halves since Step 4, with the
   * method sheet between them.
   *
   * The card used to create and push on one tap. It asks first now, because
   * Step 5 builds the phase rail out of `solve.method` and a rail that appeared
   * over markers written before the method was chosen would be a rail describing
   * a solve that was not written that way (docs/cube-flow-plan.md §3.4).
   *
   * The pause stays with the *opening* of the sheet rather than with the push:
   * the scramble should stop playing the moment the operator's attention leaves
   * it, and a sheet they close again is not a reason to start it up.
   */
  const openNewSolve = useCallback(() => {
    pause();
    setShowNewSolve(true);
  }, [pause]);

  /** `Start solve` — create with the method that was picked, and push.
   *  `startNewSolve` returns null when there is no scramble to write one
   *  against, and then there is nothing to push to. */
  const startSolveWith = useCallback(
    (method) => {
      setShowNewSolve(false);
      if (!startNewSolve({ method })) return;
      navigation.navigate(SOLVE_ROUTE);
    },
    [startNewSolve, navigation]
  );

  // ——— The long-press menu (plan §3.3) ——————————————————————————————————

  const closeMenu = useCallback(() => setManagingId(null), []);

  /**
   * Copy a solve and stay here.
   *
   * `copySolve` opens the copy, so it arrives accented at the top of the list —
   * which is the feedback that says the duplicate happened. Pushing straight
   * into it would be a reasonable guess too, and it is the wrong one: duplicate
   * is most often the first of several tidying actions, and each of them would
   * cost a trip back.
   */
  const duplicate = useCallback(
    (id) => {
      copySolve(id);
      closeMenu();
    },
    [copySolve, closeMenu]
  );

  /**
   * Empty a page, keeping it.
   *
   * Nothing to pause: the solve screen is not on the stack while this one is
   * focused, and this screen's transport is playing the *scramble*, which a
   * solve's moves have nothing to do with.
   */
  const clearSolve = useCallback(
    (id) => {
      clearSolveById(id);
      closeMenu();
    },
    [clearSolveById, closeMenu]
  );

  /** Forget a page. `deleteSolve` moves `openId` on to the next one for this
   *  scramble, or to nothing — the list simply draws what is left. */
  const removeSolveById = useCallback(
    (id) => {
      deleteSolve(id);
      closeMenu();
    },
    [deleteSolve, closeMenu]
  );

  const beginRename = useCallback((id) => {
    setManagingId(null);
    setRenamingId(id);
  }, []);

  const endRename = useCallback(() => setRenamingId(null), []);

  const submitRename = useCallback(
    (name) => {
      renameSolveById(renamingId, name);
      endRename();
    },
    [renamingId, endRename, renameSolveById]
  );

  const startScramble = useCallback(
    (alg) => {
      pause();
      showScramble(alg);
    },
    [pause, showScramble]
  );

  const loadFavorite = useCallback(
    (alg) => {
      startScramble(alg);
      setShowFavorites(false);
    },
    [startScramble]
  );

  const onNewScramble = useCallback(() => {
    pause();
    newScramble();
  }, [pause, newScramble]);

  /**
   * The algorithm library, from the action row under the list
   * (docs/cube-methods-plan.md §2 and §3.1).
   *
   * The pause is the same rule the new-solve sheet follows: the scramble should
   * stop playing the moment the operator's attention leaves it. This one is a
   * push rather than a sheet, so the screen is gone entirely — a cube turning
   * behind a route nobody is looking at is a frame loop for nothing.
   */
  const openLibrary = useCallback(() => {
    pause();
    navigation.navigate(LIBRARY_ROUTE);
  }, [pause, navigation]);

  const titleColor = theme.colors.title;
  const border = theme.colors.numberPad.border;

  // Moves not played yet are muted rather than hidden, so the scramble stays a
  // scramble you can read ahead in. Mixed toward the background so it works on
  // both themes without a second palette.
  const pendingColor = mix(titleColor, theme.colors.background, 0.55);

  const managing = findSolve(mySolves, managingId);

  /**
   * The header's controls — and **four is the number, measured** (§8.6).
   *
   * Step 3 moved New scramble and Save up here off the row that became the
   * list, which is what the plan asks for, and the row does not fit six. At 320
   * points the header has 300: the home button takes 38, the right-hand end
   * takes 4 of padding, and each control is 34 points of button with 5 of margin
   * in front of it. Four of them leave 94 for the title, which is `Scramble` at
   * 17pt bold with air to spare; five leave 55, and the title starts
   * ellipsizing — `ScreenHeader`'s dense right-hand column does not shrink, so
   * what gives is always the word on the left.
   *
   * So one control had to go, and **`Reset the view` is the one that went.** On
   * the solve screen that button means *back to the hold you chose*, which is a
   * place the operator picked; here there is no hold, so it only ever meant
   * "back to a default nobody asked for" — and `Turn the cube around` plus a
   * drag reaches every angle it reached. It is the only V1 affordance this step
   * removes, and it is the one worth asking the operator about.
   *
   * Compare is **not** here, though plan §3.3 proposed it: it is the sixth
   * control and there is no room for a fifth. It sits with the list instead
   * (see `CubeSolveList`), which is open question 2's own alternative.
   */
  const headerActions = (
    <>
      {headerAction({
        name: 'dice-multiple',
        label: 'New scramble',
        hint: 'Generates a new random scramble and applies it to the cube',
        onPress: onNewScramble,
        color: titleColor,
        border,
      })}
      {/* Two states, as the labelled button had: the star fills and turns accent
          when this scramble is one of the kept ones. */}
      {headerAction({
        name: saved ? 'star' : 'star-outline',
        label: saved ? 'Remove from saved scrambles' : 'Save this scramble',
        hint: saved
          ? 'Takes this scramble out of your saved list'
          : 'Keeps this scramble in your saved list',
        onPress: toggleSaved,
        color: saved ? CUBE_ACCENT : titleColor,
        border: saved ? CUBE_ACCENT : border,
      })}
      {headerAction({
        name: 'star-box-outline',
        label: `Favorites, ${favorites.length} saved`,
        hint: 'Opens the list of scrambles you have kept',
        onPress: () => setShowFavorites(true),
        count: favorites.length,
        color: titleColor,
        border,
      })}
      {headerAction({
        name: 'rotate-3d-variant',
        label: 'Turn the cube around',
        hint: 'Shows the three faces that are currently hidden',
        onPress: showOtherSide,
        color: titleColor,
        border,
      })}
    </>
  );

  // Still putting the pushed solve back: the scramble is not what the operator
  // is about to be looking at, so it does not get a frame of its own.
  if (restoring) return <CubeLoading onExitToHub={onExitToHub} />;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Dense, and carrying four controls now. The title is `Scramble` rather
          than `Cube Scramble` because at 320 points the four do not leave room
          for thirteen characters — and because the two screens of this stack now
          read as a pair: `Scramble`, and the solve's own name. The game is named
          on the tile the operator tapped one gesture ago. */}
      <ScreenHeader
        title="Scramble"
        theme={theme}
        onHomePress={onExitToHub}
        dense
        actions={headerActions}
      />

      {/* The moves — and the scrubber's track. Tapping a token turns the cube to
          that point, one move at a time and in whichever direction it lies. The
          tokens come from the same scan as the moves (`player.tokens`), so a
          token and the move it turns to cannot drift apart. */}
      <CubeMoveTrack
        tokens={player.tokens}
        index={player.index}
        marks={NO_MARKS}
        placeholder={scramble}
        accent={CUBE_ACCENT}
        theme={theme}
        pendingColor={pendingColor}
        noun="scramble"
        label={`Scramble: ${scramble}`}
        room={room}
        onSeek={playTo}
      />

      {/* Takes the leftover height, and *is* the cube's allowance: it sits in
          the middle of whatever the phone has left rather than hanging under the
          scramble with the bottom third of a tall screen empty. */}
      <View style={styles.stage} onLayout={measureStage}>
        <CubeView
          cube={player.cube}
          turn={player.turn}
          size={cubeSize}
          yaw={yaw}
          pitch={pitch}
          onOrbit={onOrbit}
          accessibilityLabel={`Cube — ${announcePosition(
            player.index,
            player.count,
            'scramble'
          )}`}
        />
      </View>

      <CubeScrubber
        index={player.index}
        count={player.count}
        playing={player.playing}
        rate={player.rate}
        accent={CUBE_ACCENT}
        theme={theme}
        noun="scramble"
        startLabel="Back to the solved cube"
        onPlayPause={player.togglePlay}
        onStepBack={player.stepBack}
        onStepForward={player.stepForward}
        onSeek={seek}
        onCycleSpeed={player.cycleSpeed}
      />

      {/* What the Solve · New · Save row paid for. `now` is read on every render
          rather than memoized: it is what turns `savedAt` into "yesterday", and
          a clock frozen at mount would still say "just now" an hour later. */}
      <CubeSolveList
        solves={mySolves}
        openId={openId}
        now={Date.now()}
        windowHeight={windowHeight}
        theme={theme}
        accent={CUBE_ACCENT}
        onOpen={openSolveScreen}
        onNew={openNewSolve}
        onManage={setManagingId}
        onCompare={() => setShowCompare(true)}
        onLibrary={openLibrary}
      />

      {/* The fifth modal on this screen, and the fifth opened one at a time on
          purpose — a Modal over a Modal is reliable on web and finicky on iOS.
          Nothing else on this screen can be open while the sheet is: it is
          reached from the action row under the list, not from a card. */}
      <CubeNewSolveSheet
        visible={showNewSolve}
        theme={theme}
        accent={CUBE_ACCENT}
        methods={methods}
        mySolves={mySolves}
        onStart={startSolveWith}
        onClose={() => setShowNewSolve(false)}
      />

      <CubeSolveMenu
        visible={managingId !== null}
        theme={theme}
        accent={CUBE_ACCENT}
        solve={managing}
        onRename={beginRename}
        onDuplicate={duplicate}
        onClear={clearSolve}
        onDelete={removeSolveById}
        onClose={closeMenu}
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

      <CubeCompareModal
        visible={showCompare}
        theme={theme}
        accent={CUBE_ACCENT}
        solves={mySolves}
        currentId={openId}
        onClose={() => setShowCompare(false)}
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
    </View>
  );
};

export default CubeHome;
