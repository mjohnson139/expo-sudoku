import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import CubeScrubber from './CubeScrubber';
import { ALG_FONT } from './algText';
import { applyMoves, cubeFromAlg, solvedCube } from './cubeState';
import { DEFAULT_PITCH, DEFAULT_YAW, wrapAngle } from './geometry';
import { announcePosition } from './player';
import {
  describeOrientation,
  describeOrientationSentence,
  orientationAt,
} from './orientation';
import { randomScramble } from './scramble';
import {
  appendAlg,
  appendToken,
  describeSolve,
  describeToken,
  dropLastToken,
  nextModifier,
  padToken,
} from './solve';
import { moveCount, parseAlg } from './moves';
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
 * **The solve is a scratchpad** this step: one solve, held in memory, gone when
 * you leave (plan §7 — the save file holds algorithm text, and what else it
 * holds is Step 4's decision to make properly rather than in passing).
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

  // Writing a solve rather than reading the scramble.
  const [solving, setSolving] = useState(false);
  // How the cube is being held, as a prefix of whole-cube rotations (plan §8.2).
  // `null` means it has not been picked yet, which is the inspection phase —
  // the state this screen is in between tapping Solve and starting to write.
  const [orientation, setOrientation] = useState(null);
  // The solve itself, as the operator wrote it — `r U r'` stays `r U r'`
  // (plan §4). Not persisted this step, on purpose.
  const [solve, setSolve] = useState('');
  // The modifier waiting for a key: `''`, `'` or `2`.
  const [modifier, setModifier] = useState('');
  const [showTyping, setShowTyping] = useState(false);

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

  // The view angle is deliberately *not* persisted and deliberately *not* reset
  // by a new scramble: it is where the player is standing, and neither getting a
  // new scramble nor coming back tomorrow means they wanted to move.
  const [yaw, setYaw] = useState(DEFAULT_YAW);
  const [pitch, setPitch] = useState(DEFAULT_PITCH);

  useEffect(() => {
    let cancelled = false;

    loadCubeState().then((saved) => {
      if (cancelled) return;
      setFavorites(saved.favorites);
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
  // the player's favorites with the empty list this screen starts at.
  useEffect(() => {
    if (!hydrated) return;
    saveCubeState({ scramble, favorites });
  }, [hydrated, scramble, favorites]);

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
   */
  const startingCube = useMemo(
    () => (solving ? orientedCube : solvedCube()),
    [solving, orientedCube, scramble]
  );

  const player = useScramblePlayer(solving ? solve : scramble, startingCube);
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

  const newScramble = useCallback(() => {
    setScramble(randomScramble());
  }, []);

  const toggleSaved = useCallback(() => {
    setFavorites((current) =>
      isFavorite(current, scramble)
        ? removeFavorite(current, scramble)
        : addFavorite(current, scramble)
    );
  }, [scramble]);

  const loadFavorite = useCallback((alg) => {
    setScramble(alg);
    setShowFavorites(false);
  }, []);

  const removeSaved = useCallback((alg) => {
    setFavorites((current) => removeFavorite(current, alg));
  }, []);

  // A new scramble is a new cube to solve, so whatever was written against the
  // old one no longer describes anything. Cleared rather than carried over,
  // which is also what keeps "the solve starts from the scramble" true.
  useEffect(() => {
    setSolve('');
    setModifier('');
    setOrientation(null);
  }, [scramble]);

  const startSolving = useCallback(() => {
    pause();
    setModifier('');
    setSolving(true);
  }, [pause]);

  const stopSolving = useCallback(() => {
    pause();
    setModifier('');
    setSolving(false);
  }, [pause]);

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
    setOrientation(orientationAt(yaw, pitch));
    setYaw(DEFAULT_YAW);
    setPitch(DEFAULT_PITCH);
  }, [pause, yaw, pitch]);

  // Back to inspection. Only offered while the solve is empty: re-orienting
  // under moves that are already written would silently change what every one
  // of them does to the cube (operator, 2026-08-02).
  const reorient = useCallback(() => {
    pause();
    setOrientation(null);
  }, [pause]);

  // The shortcut back to the hold you picked. Because the orientation is baked
  // into the model rather than left in the camera, "the view I chose" and "the
  // default view" are the same thing — so this is the reset that already
  // existed, under the name it now deserves.
  const startView = useCallback(() => {
    setYaw(DEFAULT_YAW);
    setPitch(DEFAULT_PITCH);
  }, []);

  // A key is the armed modifier plus the letter, and the arming is spent — one
  // move, then back to plain. Holding it would mean a `'` left armed silently
  // priming a move three taps later.
  //
  // `pause` first, always: it lands whatever the cube was doing, and it is what
  // settles an undo whose move has not been dropped yet (see the hook's
  // `flushRetract`). A key tapped inside the 260ms an undo takes would otherwise
  // be appended to a solve that still had the undone move in it.
  const tapKey = useCallback(
    (key) => {
      pause();
      setSolve((current) => appendToken(current, padToken(key, modifier)));
      setModifier('');
    },
    [modifier, pause]
  );

  const tapModifier = useCallback((mark) => {
    setModifier((current) => nextModifier(current, mark));
  }, []);

  // Backwards *first*, then drop it. Removing the move and letting the transport
  // reset would put the cube where it belongs without ever showing it get there,
  // which is the same bug as a move appearing without turning — just pointing
  // the other way.
  const undoMove = useCallback(() => {
    setModifier('');
    retract(() => setSolve((current) => dropLastToken(current)));
  }, [retract]);

  const clearSolve = useCallback(() => {
    pause();
    setModifier('');
    setSolve('');
  }, [pause]);

  const addTyped = useCallback((text) => {
    pause();
    setSolve((current) => {
      try {
        return appendAlg(current, text);
      } catch (error) {
        // The field validates with the same parser before it offers Add, so this
        // is unreachable — and if it ever is reached, keeping the solve is
        // better than replacing it with a half-parsed one.
        return current;
      }
    });
    setShowTyping(false);
  }, [pause]);

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
  const noun = solving ? 'solve' : 'scramble';
  const solveCount = moveCount(solve);

  // Solve mode has two phases, which is how the operator described it: **find
  // the hold**, then **write the solve**. Inspecting is panning, so it gets the
  // whole page — no pad, no transport, and a cube roughly twice the size. The
  // pad only appears once there is something for it to write into.
  const inspecting = solving && orientation === null;

  // Live while inspecting — this updates under the finger as the cube is
  // dragged, and it is the thing that makes picking a hold trustworthy. Reading
  // colours off a 120-point cube is guesswork; reading "yellow up · blue front"
  // is not.
  const facingCube = inspecting
    ? applyMoves(scrambledCube, parseAlg(orientationAt(yaw, pitch)))
    : orientedCube;
  const holdText = describeOrientation(facingCube);

  // Before the first layout there is nothing to measure, so fall back to the
  // window-share estimate — close enough that the cube does not visibly resize
  // on the frame the real number arrives.
  const cubeSize = Math.floor(
    stage
      ? Math.max(0, Math.min(widthAllowance, MAX_CUBE, stage.width, stage.height))
      : Math.min(widthAllowance, MAX_CUBE, height * CUBE_HEIGHT_SHARE)
  );

  if (!hydrated) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScreenHeader title="Cube Scramble" theme={theme} onHomePress={onExitToHub} />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={titleColor} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title="Cube Scramble" theme={theme} onHomePress={onExitToHub} />

      {/* While a solve is being written the scramble is context rather than the
          subject, so it drops to one muted line — it is still the thing being
          solved and it is still worth being able to read, but the card below it
          now belongs to the solve. */}
      {solving && (
        <Text
          style={[styles.scrambleLine, { color: pendingColor }]}
          numberOfLines={1}
          ellipsizeMode="tail"
          accessibilityLabel={`Solving the scramble ${scramble}`}
        >
          {scramble}
        </Text>
      )}

      {/* The algorithm is also the scrubber's track: tapping a token turns the
          cube to that point, one move at a time and in whichever direction it
          lies — which is a shorter route to "what does move 14 do" than
          fourteen taps on the step button, and still shows the moves rather
          than cutting to the answer.

          The tokens come from the same scan as the moves (`player.tokens`), so
          a token and the move it turns to cannot drift apart — and a solve
          entered as `r U r'` reads back as `r U r'` rather than being quietly
          corrected to the model's canonical `Rw U Rw'` (plan §4). */}
      <View style={[styles.scrambleCard, { backgroundColor: surface, borderColor: border }]}>
        <Text
          style={[styles.scrambleText, { color: pendingColor }]}
          accessibilityLabel={
            inspecting
              ? 'Turn the cube to how you want to hold it, then set it as the start'
              : solving
                ? `Solve: ${solve || 'nothing yet'}`
                : `Scramble: ${scramble}`
          }
          selectable
        >
          {player.count === 0
            ? solving
              ? inspecting
                ? 'Turn the cube to how you want to hold it'
                : 'Tap a key to begin'
              : scramble
            : player.tokens.map((token, i) => (
                <Text
                  key={`${token}-${i}`}
                  onPress={() => playTo(i + 1)}
                  suppressHighlighting
                  accessibilityRole="button"
                  accessibilityLabel={`Move ${i + 1}, ${describeToken(token)}`}
                  accessibilityHint={`Turns the cube to this point in the ${
                    solving ? 'solve' : 'scramble'
                  }`}
                  style={
                    i === player.index - 1
                      ? [styles.currentToken, { color: CUBE_ACCENT }]
                      : i < player.index
                        ? { color: titleColor }
                        : null
                  }
                >
                  {i > 0 ? '  ' : ''}
                  {token}
                </Text>
              ))}
        </Text>
      </View>

      <View style={styles.actionRow}>
        {solving ? (
          <>
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

            {/* The middle control is whichever of the three things is actually
                available, because there is only room for one of them:

                  inspecting            → Set start  (the point of the phase)
                  set, nothing written  → Re-orient  (change your mind, freely)
                  set, moves written    → Start view (the hold is locked in)

                Locking once moves exist is the operator's call (2026-08-02):
                re-orienting under moves already written would silently change
                what every one of them does to the cube. */}
            {inspecting ? (
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
            ) : solveCount === 0 ? (
              <TouchableOpacity
                style={[styles.toolButton, { borderColor: border }]}
                onPress={reorient}
                accessibilityRole="button"
                accessibilityLabel="Pick the starting orientation again"
                accessibilityHint="Goes back to turning the cube to how you want to hold it"
              >
                <MaterialCommunityIcons name="rotate-3d-variant" size={18} color={titleColor} />
                <Text style={[styles.toolButtonText, { color: titleColor }]}>Re-orient</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.toolButton, { borderColor: border }]}
                onPress={startView}
                accessibilityRole="button"
                accessibilityLabel="Back to the starting view"
                accessibilityHint={`Looks at the cube from ${holdText} again`}
              >
                <MaterialCommunityIcons name="home-outline" size={18} color={titleColor} />
                <Text style={[styles.toolButtonText, { color: titleColor }]}>Start view</Text>
              </TouchableOpacity>
            )}

            {/* Icon-only: with a labelled button either side, labelling this one
                too wraps the row onto a second line at 320 points, and the 40
                points that costs come out of the cube. */}
            <TouchableOpacity
              style={[styles.toolButton, styles.iconOnly, { borderColor: border }]}
              onPress={showOtherSide}
              accessibilityRole="button"
              accessibilityLabel="Turn the cube around"
              accessibilityHint="Shows the three faces that are currently hidden"
            >
              <MaterialCommunityIcons
                name="rotate-3d-variant"
                size={18}
                color={titleColor}
              />
            </TouchableOpacity>
          </>
        ) : (
          <>
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
              <Text
                style={[styles.toolButtonText, { color: saved ? CUBE_ACCENT : titleColor }]}
              >
                {saved ? 'Saved' : 'Save'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

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
          startLabel={solving ? 'Back to the starting cube' : 'Back to the solved cube'}
          onPlayPause={player.togglePlay}
          onStepBack={player.stepBack}
          onStepForward={player.stepForward}
          onSeek={seek}
          onCycleSpeed={player.cycleSpeed}
        />
      )}

      {inspecting ? (
        <Text
          style={[styles.hold, { color: CUBE_ACCENT }]}
          accessibilityLiveRegion="polite"
          accessibilityLabel={`Holding ${holdText}`}
        >
          {describeOrientationSentence(facingCube)}
        </Text>
      ) : solving ? (
        <>
          <CubeMovePad
            modifier={modifier}
            canUndo={solveCount > 0}
            canClear={solveCount > 0}
            accent={CUBE_ACCENT}
            theme={theme}
            onKey={tapKey}
            onModifier={tapModifier}
            onUndo={undoMove}
            onClear={clearSolve}
            onType={() => setShowTyping(true)}
          />

          <Text
            style={[styles.hint, styles.solveHint, { color: titleColor }]}
            accessibilityLabel={`Started from ${holdText}. ${describeSolve(solve)}.`}
          >
            {holdText} · {describeSolve(solve)}
          </Text>
        </>
      ) : (
        <>
          <Text style={[styles.hint, { color: titleColor }]}>
            Drag the cube · tap a move to turn to it
          </Text>

          <View style={styles.bottomRow}>
            <TouchableOpacity
              style={[styles.toolButton, { borderColor: border }]}
              onPress={resetView}
              accessibilityRole="button"
              accessibilityLabel="Reset the view"
            >
              <MaterialCommunityIcons name="restore" size={18} color={titleColor} />
              <Text style={[styles.toolButtonText, { color: titleColor }]}>Reset view</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolButton, { borderColor: border }]}
              onPress={showOtherSide}
              accessibilityRole="button"
              accessibilityLabel="Turn the cube around"
              accessibilityHint="Shows the three faces that are currently hidden"
            >
              <MaterialCommunityIcons name="rotate-3d-variant" size={18} color={titleColor} />
              <Text style={[styles.toolButtonText, { color: titleColor }]}>Other side</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolButton, { borderColor: border }]}
              onPress={() => setShowFavorites(true)}
              accessibilityRole="button"
              accessibilityLabel={`Favorites, ${favorites.length} saved`}
              accessibilityHint="Opens the list of scrambles you have kept"
            >
              <MaterialCommunityIcons name="star-box-outline" size={18} color={titleColor} />
              <Text style={[styles.toolButtonText, { color: titleColor }]}>
                Favorites{favorites.length > 0 ? ` (${favorites.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

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
  scrambleCard: {
    alignSelf: 'stretch',
    marginHorizontal: 4,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  scrambleText: {
    fontFamily: ALG_FONT,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  // The scramble while a solve is being written: one line, smaller, above the
  // card. Twenty tokens do not fit and are not meant to — this is "which cube
  // am I on", and the whole thing is one tap away in the other mode.
  scrambleLine: {
    fontFamily: ALG_FONT,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    alignSelf: 'stretch',
    marginBottom: 4,
    paddingHorizontal: 6,
  },
  // Bold as well as coloured: the token you are on has to be findable in a
  // twenty-token block at a glance, and on a monospaced face weight is the
  // difference that survives a small screen.
  currentToken: {
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
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
  stage: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  hint: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 10,
    marginBottom: 2,
  },
  // The pad already ate the vertical the bottom row used to have, so the line
  // under it is tight to it rather than floating.
  solveHint: {
    marginTop: 2,
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
