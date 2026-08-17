import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ScreenHeader';
import useAppTheme from '../../hooks/useAppTheme';
import CubeView from './CubeView';
import CubeFavoritesModal from './CubeFavoritesModal';
import CubeMoveTrack from './CubeMoveTrack';
import CubeScrubber from './CubeScrubber';
import { solvedCube } from './cubeState';
import { moveCount } from './moves';
import { announcePosition } from './player';
import useScramblePlayer from './useScramblePlayer';
import useCubeStage from './useCubeStage';
import { CUBE_ACCENT, CubeLoading, headerAction, styles } from './cubeChrome';
import { HOME_ROUTE, SOLVE_ROUTE, useCube, useReportsSolveRoute } from './CubeContext';
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
 * ### It does not scroll, on purpose
 *
 * The cube claims every pan gesture inside its square (see `CubeView`). A
 * `ScrollView` wrapping it would put the two in competition for each drag, which
 * is the exact race this repo already lost once on Fungiku's board
 * (docs/fungiku-plan.md §2). So the page is a fixed column that never scrolls —
 * the cube is sized from the space its stage actually measures — and the lists
 * in this feature live in modals until Step 3 gives them the bottom of the
 * screen.
 */
const CubeHome = ({ navigation, onExitToHub }) => {
  const { theme } = useAppTheme();
  const {
    scramble,
    saved,
    favorites,
    openSolve,
    restoredOpen,
    clearRestoredOpen,
    yaw,
    pitch,
    newScramble,
    toggleSaved,
    showScramble,
    removeSaved,
    resumeSolve,
    turnTo,
    resetView,
    showOtherSide,
  } = useCube();

  const [showFavorites, setShowFavorites] = useState(false);
  const { measureStage, cubeSize, room } = useCubeStage();

  // This screen is the one under the push, so it is the one that says "no solve
  // is open" — every route out of the solve screen goes through the moment this
  // one is focused again.
  useReportsSolveRoute(navigation, false);

  /**
   * Put the pushed solve back on the stack.
   *
   * **The `appKey` remount is what makes this necessary** (`App.js`): on resume
   * the whole cube screen is remounted, so a nested navigator inside it starts
   * back here and a solve that was open would be lost. That is exactly what the
   * persisted `solveId` is for, and `CubeProvider` holds both screens back until
   * the save has landed, so `restoredOpen` is already the truth by the time this
   * screen exists.
   *
   * A `reset` rather than a `push` because a restore is not a navigation the
   * operator performed: there is nothing to animate, and a slide-in on every
   * resume would announce a transition that did not happen.
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

  /** Open the page you were on, and only start one when there is nothing to
   *  resume — which is what makes this the same button it was before solves were
   *  kept. The push is what solve mode used to be. */
  const openSolveScreen = useCallback(() => {
    pause();
    if (!resumeSolve()) return;
    navigation.navigate(SOLVE_ROUTE);
  }, [pause, resumeSolve, navigation]);

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

  const titleColor = theme.colors.title;
  const surface = theme.colors.numberPad.background;
  const border = theme.colors.numberPad.border;

  // Moves not played yet are muted rather than hidden, so the scramble stays a
  // scramble you can read ahead in. Mixed toward the background so it works on
  // both themes without a second palette.
  const pendingColor = mix(titleColor, theme.colors.background, 0.55);
  const solveCount = moveCount(openSolve ? openSolve.alg : '');

  /**
   * The controls that ride on the header (docs/cube-plan.md §8.6, V1 Step 7).
   *
   * These are the *view*: where the camera is pointing. They were a row of their
   * own, twice — about 100 points on a screen whose subject is a square — and a
   * header row was already being paid for with a whole empty column on the right
   * of it.
   */
  const headerActions = (
    <>
      {headerAction({
        name: 'restore',
        label: 'Reset the view',
        hint: 'Looks at the cube from the front again',
        onPress: resetView,
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
      {/* Not a view control, and here anyway: the row below fits three labelled
          buttons at 320 points and not four, and this is the one of the four
          whose label was a noun rather than a verb. It keeps its count. */}
      {headerAction({
        name: 'star-box-outline',
        label: `Favorites, ${favorites.length} saved`,
        hint: 'Opens the list of scrambles you have kept',
        onPress: () => setShowFavorites(true),
        count: favorites.length,
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
      {/* Dense, and carrying the view controls. The default header wrapped "Cube
          Scramble" onto two lines and cost 75 points to say something the
          operator knew before they tapped the tile. */}
      <ScreenHeader
        title="Cube Scramble"
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

      {/* The three things this screen is *for*, still labelled, because a verb
          with no noun on it is a guess. Step 3 takes this row for the list of
          solves and moves New and Save onto the header. */}
      <View style={styles.bottomRow}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: CUBE_ACCENT }]}
          onPress={openSolveScreen}
          accessibilityRole="button"
          accessibilityLabel="Write a solve"
          accessibilityHint="Opens the solve, with the cube starting from this scramble"
        >
          <MaterialCommunityIcons name="pencil-outline" size={18} color="#ffffff" />
          <Text style={styles.primaryButtonText}>
            Solve{solveCount > 0 ? ` (${solveCount})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolButton, { borderColor: border }]}
          onPress={onNewScramble}
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
