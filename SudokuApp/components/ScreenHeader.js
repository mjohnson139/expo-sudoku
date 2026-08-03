import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ICON_SIZE = 24;
const DENSE_ICON_SIZE = 20;

/**
 * Header for game screens that aren't Sudoku: a home affordance back to the hub
 * plus the game's title. Sudoku keeps its own richer GameHeader (menu + theme
 * cycle) and gets the same home button added there.
 *
 * `onMenuPress` is optional and adds a menu button on the right, in the same
 * corner Sudoku's GameHeader puts its own — a game with a difficulty menu should
 * open it from the same place in either game.
 *
 * `subtitle` is optional: one line under the title for what the current game *is*
 * (Fungiku uses it for "Easy · 6×6"). Callers should pass it either always or
 * never for a given screen — a subtitle that appears and disappears changes the
 * header's height, which moves everything under it.
 *
 * ### `dense`, and `actions` (added for the cube's Step 7)
 *
 * **The default header is two lines tall on a modern phone and nobody noticed
 * for three epics.** The title gets a `flex: 2` centre column — about 186 points
 * at 393 — and "Cube Scramble" at 24pt bold does not fit in it, so it wraps.
 * Wrapping is not an error, so no test, no overflow check and no doctor run ever
 * said a word (`docs/cube-plan.md` §10).
 *
 * `dense` is the opt-in fix, and it is opt-in precisely because this component is
 * shared: **every existing caller keeps exactly the header it has.** It drops the
 * title to one guaranteed line beside the home button, shrinks the icons, and
 * comes out around 38 points against 75.
 *
 * `actions` is a node for the right-hand end — screen controls that would
 * otherwise need a row of their own. A row is 40–50 points and on a screen built
 * around one big square, that is the square's height. The cube puts its view
 * controls here; see `games/cube/CubeScreen.js` and plan §8.6.
 */
const ScreenHeader = ({
  title,
  subtitle,
  theme,
  onHomePress,
  onMenuPress,
  dense = false,
  actions = null,
}) => {
  const titleColor = theme?.colors?.title || '#333';
  const iconSize = dense ? DENSE_ICON_SIZE : ICON_SIZE;

  return (
    <View style={[styles.header, dense && styles.headerDense]}>
      <View style={[styles.leftSection, dense && styles.leftSectionDense]}>
        <TouchableOpacity
          style={[styles.iconButton, dense && styles.iconButtonDense, { borderColor: titleColor }]}
          onPress={onHomePress}
          accessibilityLabel="Back to games"
          accessibilityRole="button"
          accessibilityHint="Leaves this game and returns to the game list"
        >
          <MaterialCommunityIcons name="home" size={iconSize} color={titleColor} />
        </TouchableOpacity>
      </View>

      <View style={[styles.centerSection, dense && styles.centerSectionDense]}>
        {/* One line, by construction, when dense — the whole point of the
            variant is that this row's height is known rather than discovered. */}
        <Text
          style={[styles.title, dense && styles.titleDense, { color: titleColor }]}
          numberOfLines={dense ? 1 : undefined}
        >
          {title}
        </Text>
        {!!subtitle && (
          <Text style={[styles.subtitle, { color: titleColor }]} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Also balances the row so the title stays optically centered — the View
          stays even with no menu button in it. (When dense the title is
          left-aligned against the home button instead, because a row with
          controls on the right has no centre to be optical about.) */}
      <View style={[styles.rightSection, dense && styles.rightSectionDense]}>
        {actions}
        {onMenuPress && (
          <TouchableOpacity
            style={[styles.iconButton, dense && styles.iconButtonDense, { borderColor: titleColor }]}
            onPress={onMenuPress}
            accessibilityLabel="Game menu"
            accessibilityRole="button"
            accessibilityHint="Choose a difficulty or start a new puzzle"
          >
            <MaterialCommunityIcons name="menu" size={iconSize} color={titleColor} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    minHeight: 48,
    marginBottom: 10,
  },
  headerDense: {
    minHeight: 34,
    marginBottom: 4,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
    paddingLeft: 8,
  },
  // The three columns stop being thirds: the title takes what is left after the
  // two ends have taken what they need, which is what lets the right-hand end
  // hold three controls without squeezing the title into a wrap.
  //
  // **Spelled out rather than `flex: 0`**, and that is not style. `flex: 0` here
  // means "size to your content", but react-native-web reads it as
  // `flex-basis: 0%` with shrink still on — so both ends collapsed to their
  // padding and their buttons hung off the right edge of the screen. Caught by
  // the horizontal-overflow check in Step 7's driver, which is the check this
  // repo has run since Step 1 and the reason it is still worth running.
  leftSectionDense: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    paddingLeft: 4,
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
  },
  centerSectionDense: {
    flex: 1,
    alignItems: 'flex-start',
    paddingLeft: 8,
  },
  rightSection: {
    flex: 1,
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  rightSectionDense: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  titleDense: {
    fontSize: 17,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
    // Single line by construction (numberOfLines={1}), so the header's height is
    // the same whatever the subtitle says.
    marginTop: 1,
  },
  iconButton: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  iconButtonDense: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
});

export default ScreenHeader;
