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
 * header's height, which moves everything under it. `subtitleFont` sets its face:
 * the cube's solve screen names its scramble there and notation wants a
 * monospace (see `games/cube/algText.js`).
 *
 * ### The left-hand button is not always "home"
 *
 * It was, for three epics, because every screen this component served was one
 * push from the hub. The cube's solve screen is two (docs/cube-flow-plan.md
 * §3.2), and what its corner means is *back to the scramble* — so `homeIcon`,
 * `homeLabel` and `homeHint` override the glyph and what a screen reader says
 * about it. `onHomePress` keeps its name and its position; every existing caller
 * passes none of the three and keeps exactly the button it has.
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
  subtitleFont,
  theme,
  onHomePress,
  homeIcon = 'home',
  homeLabel = 'Back to games',
  homeHint = 'Leaves this game and returns to the game list',
  onMenuPress,
  dense = false,
  actions = null,
}) => {
  const titleColor = theme?.colors?.title || '#333';
  const iconSize = dense ? DENSE_ICON_SIZE : ICON_SIZE;

  return (
    <View style={dense ? styles.headerDense : styles.header}>
      <View style={dense ? styles.leftSectionDense : styles.leftSection}>
        <TouchableOpacity
          style={[dense ? styles.iconButtonDense : styles.iconButton, { borderColor: titleColor }]}
          onPress={onHomePress}
          accessibilityLabel={homeLabel}
          accessibilityRole="button"
          accessibilityHint={homeHint}
        >
          <MaterialCommunityIcons name={homeIcon} size={iconSize} color={titleColor} />
        </TouchableOpacity>
      </View>

      <View style={dense ? styles.centerSectionDense : styles.centerSection}>
        {/* One line, by construction, when dense — the whole point of the
            variant is that this row's height is known rather than discovered. */}
        <Text
          style={[dense ? styles.titleDense : styles.title, { color: titleColor }]}
          numberOfLines={dense ? 1 : undefined}
        >
          {title}
        </Text>
        {!!subtitle && (
          <Text
            style={[styles.subtitle, { color: titleColor, fontFamily: subtitleFont }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {/* Also balances the row so the title stays optically centered — the View
          stays even with no menu button in it. (When dense the title is
          left-aligned against the home button instead, because a row with
          controls on the right has no centre to be optical about.) */}
      <View style={dense ? styles.rightSectionDense : styles.rightSection}>
        {actions}
        {onMenuPress && (
          <TouchableOpacity
            style={[dense ? styles.iconButtonDense : styles.iconButton, { borderColor: titleColor }]}
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
  // ——— The dense row ————————————————————————————————————————————————
  //
  // **These are whole styles, not overrides layered on the ones above, and that
  // is load-bearing.** Written as `[styles.leftSection, dense && ...]` the
  // flattened result carries *both* the base `flex: 1` and this variant's
  // `flexGrow` / `flexShrink` / `flexBasis`, and which of the two wins is not
  // something the two platforms agree on: react-native-web resolved one way and
  // Yoga the other, so the header laid out correctly in the browser and, on a
  // real phone, collapsed the home button to a sliver and pushed the view
  // controls off the right-hand edge of the screen. There is nothing to disagree
  // about if only one of them is ever passed.
  //
  // The three columns also stop being thirds: the two ends take what they need
  // and the title takes what is left, which is what lets the right-hand end hold
  // three controls without squeezing the title into a wrap.
  headerDense: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    minHeight: 34,
    marginBottom: 4,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
    paddingLeft: 8,
  },
  // `flexBasis: 'auto'` with no shrink is "size to your content". Spelled out
  // rather than written `flex: 0`, which means that in CSS and does *not* mean
  // it in react-native-web — there it is `flex-basis: 0%` with shrink still on,
  // which collapses this column to its padding. Both spellings were wrong once,
  // in different directions, on different platforms.
  leftSectionDense: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
  },
  centerSectionDense: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
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
    fontWeight: 'bold',
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
    borderWidth: 1,
  },
});

export default ScreenHeader;
