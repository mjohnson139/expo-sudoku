import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ScreenHeader';
import useAppTheme from '../../hooks/useAppTheme';

/**
 * The chrome the cube's two screens share (docs/cube-flow-plan.md §3.2).
 *
 * Step 2 split one screen into `CubeHome` and `CubeSolve`, and the page they
 * draw is the *same page*: a dense header, a measured stage with a cube in it,
 * and a row of controls under it. **The styles are here rather than copied into
 * both, because two copies of a padding is two paddings that drift** — and this
 * screen's layout is on a budget measured in points (docs/cube-plan.md §8.6),
 * so a drift is a cube that is a different size on one of the two screens.
 *
 * Nothing in here has a rule in it. It is a stylesheet, the accent, and the one
 * button both headers are built out of.
 */

/** The accent this game is identified by on the hub card, reused for the primary
 *  action on both screens so they look like the card they were opened from. */
export const CUBE_ACCENT = '#c62828';

/**
 * A control that rides on the header row (docs/cube-plan.md §8.6, V1 Step 7).
 *
 * Icon-only, and that is the trade: a label is a word you read once and an icon
 * is a target you hit every time. What a label says that an icon cannot is a
 * *count* — so `count` is a parameter, and Favorites keeps its number.
 *
 * A function rather than a component so it can be called inline in the header's
 * `actions` fragment, which is how it was written when both headers were one.
 */
export const headerAction = ({ name, label, hint, onPress, count, color, border }) => (
  <TouchableOpacity
    key={label}
    style={[styles.headerAction, { borderColor: border }]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityHint={hint}
  >
    <MaterialCommunityIcons name={name} size={18} color={color} />
    {count > 0 && <Text style={[styles.headerActionCount, { color }]}>{count}</Text>}
  </TouchableOpacity>
);

/**
 * What the cube looks like before it knows what to draw.
 *
 * Two moments wear it, and they are the same moment: the save has not landed
 * yet (`CubeProvider`), or it has and it said a solve was open, which the
 * scramble screen takes one commit to put back on the stack (`CubeHome`). One
 * component so the two are the same pixels and the second is invisible.
 *
 * **Both are cold starts only.** Until Step 3a a resume remounted the whole game
 * (`App.js`), so this spinner flashed every time the app came back; the cube
 * keeps its state across a resume now and there is nothing to wait for.
 */
export const CubeLoading = ({ onExitToHub }) => {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title="Cube Scramble" theme={theme} onHomePress={onExitToHub} dense />
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.title} />
      </View>
    </View>
  );
};

export const styles = StyleSheet.create({
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
  // `bottomRow` was here — the scramble screen's Solve · New · Save. Step 3
  // spent it on `CubeSolveList` and moved the other two onto the header, so the
  // only row style left is `actionRow`, which the solve screen's inspection
  // phase still uses.
  //
  // A view control on the header row. Square-ish and icon-only, but still 30
  // points of border around an 18-point glyph with the row's own height behind
  // it — the space this row bought back was never bought from the size of a
  // target.
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
  // Takes the leftover — but the leftover is not an afterthought, which is the
  // whole of V1's Step 7 (docs/cube-plan.md §8.6). Every row above and below
  // this one has to justify its height against what it costs the cube.
  stage: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
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

export default styles;
