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
import CubeFavoritesModal from './CubeFavoritesModal';
import { ALG_FONT } from './algText';
import { DEFAULT_PITCH, DEFAULT_YAW } from './geometry';
import { cubeFromAlg, solvedCube } from './cubeState';
import { describeScramble, randomScramble } from './scramble';
import { addFavorite, isFavorite, removeFavorite } from './favorites';
import { loadCubeState, saveCubeState } from './storage';

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
 * Build the cube for an algorithm, never throwing.
 *
 * Every algorithm that reaches here has already been validated — the generator
 * writes them and storage filters them — but this screen's whole job is to show
 * a cube, and a scramble that somehow slipped through should cost the player a
 * confusing solved cube, not a red screen.
 */
const safeCube = (alg) => {
  try {
    return cubeFromAlg(alg);
  } catch (error) {
    console.error('Unparseable scramble, showing a solved cube:', error);
    return solvedCube();
  }
};

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
 * the cube is sized from the space its stage actually measures — and the one
 * list in this feature, the favorites, lives in a modal.
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

  const cube = useMemo(() => safeCube(scramble), [scramble]);
  const saved = isFavorite(favorites, scramble);

  const onOrbit = useCallback((nextYaw, nextPitch) => {
    setYaw(nextYaw);
    setPitch(nextPitch);
  }, []);

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

  const resetView = useCallback(() => {
    setYaw(DEFAULT_YAW);
    setPitch(DEFAULT_PITCH);
  }, []);

  // Half a turn from wherever the player is, so the three faces they cannot see
  // are one tap away rather than a long drag.
  const showOtherSide = useCallback(() => {
    setYaw((current) => current + Math.PI);
    setPitch((current) => -current);
  }, []);

  const titleColor = theme.colors.title;
  const surface = theme.colors.numberPad.background;
  const border = theme.colors.numberPad.border;

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

      <View style={[styles.scrambleCard, { backgroundColor: surface, borderColor: border }]}>
        <Text
          style={[styles.scrambleText, { color: titleColor }]}
          accessibilityLabel={`Scramble: ${scramble}`}
          selectable
        >
          {scramble}
        </Text>
        <Text style={[styles.scrambleMeta, { color: titleColor }]}>
          {describeScramble(scramble)}
        </Text>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: CUBE_ACCENT }]}
          onPress={newScramble}
          accessibilityRole="button"
          accessibilityLabel="New scramble"
          accessibilityHint="Generates a new random scramble and applies it to the cube"
        >
          <MaterialCommunityIcons name="dice-multiple" size={18} color="#ffffff" />
          <Text style={styles.primaryButtonText}>New scramble</Text>
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
      </View>

      {/* Takes the leftover height, and *is* the cube's allowance: it sits in
          the middle of whatever the phone has left rather than hanging under the
          scramble with the bottom third of a tall screen empty, and it can never
          be bigger than the space it was given. */}
      <View style={styles.stage} onLayout={measureStage}>
        <CubeView
          cube={cube}
          size={cubeSize}
          yaw={yaw}
          pitch={pitch}
          onOrbit={onOrbit}
          accessibilityLabel={`Cube after the scramble ${scramble}`}
        />
      </View>

      <Text style={[styles.hint, { color: titleColor }]}>Drag the cube to see every face</Text>

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
  scrambleMeta: {
    fontSize: 11,
    opacity: 0.65,
    textAlign: 'center',
    marginTop: 6,
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
});

export default CubeScreen;
