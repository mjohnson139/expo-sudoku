import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ALG_FONT } from './algText';

/** The two things a modifier can be. Order is left-to-right on the menu. */
export const MENU_OPTIONS = ["'", '2'];

/** How the menu is drawn. Exported so the pad can hit-test against it without
 *  either file guessing at the other's numbers. */
export const OPTION_WIDTH = 52;
export const OPTION_HEIGHT = 44;
export const MENU_PADDING = 4;
export const MENU_HEIGHT = OPTION_HEIGHT + MENU_PADDING * 2;
export const MENU_WIDTH = OPTION_WIDTH * MENU_OPTIONS.length + MENU_PADDING * 2;
/** The gap between the menu's foot and the key it belongs to. */
export const MENU_LIFT = 8;

/**
 * The accessory menu — **the experiment** (operator, 2026-08-05).
 *
 * Press and hold a move key and this opens above it: slide onto `′` or `2` and
 * release to write that token, release anywhere else and you get the plain move.
 * It is the iOS keyboard's accent picker, and it is being tried because the
 * shipped design reaches the same two tokens by three different routes — a hold,
 * a second tap, and an armed key — which is three things to remember for two
 * modifiers.
 *
 * ### Why it opens *above* the key
 *
 * Same reason the `′` key was added on the main branch: **a fingertip covers the
 * key it is pressing.** Anything the key says about itself while held is said
 * underneath the thumb saying it. The menu is drawn clear of the contact patch,
 * which is the whole point of the pattern — and it means the feedback and the
 * target are the same object, rather than the feedback being somewhere else on
 * the pad.
 *
 * Purely presentational: where it sits and what is under the finger are the
 * pad's business, because the pad owns the gesture.
 */
const CubeKeyMenu = ({ left, top, active, accent, palette }) => (
  <View
    pointerEvents="none"
    style={[
      styles.menu,
      {
        left,
        top,
        backgroundColor: palette.dark ? palette.pressed : '#ffffff',
        borderColor: palette.tone('face').border,
      },
    ]}
  >
    {MENU_OPTIONS.map((option, i) => {
      const live = i === active;
      return (
        <View
          key={option}
          style={[
            styles.option,
            live && { backgroundColor: accent },
          ]}
        >
          <Text
            style={[
              styles.optionText,
              { color: live ? '#ffffff' : palette.tone('face').ink },
            ]}
          >
            {option === "'" ? '′' : option}
          </Text>
        </View>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  menu: {
    position: 'absolute',
    flexDirection: 'row',
    width: MENU_WIDTH,
    height: MENU_HEIGHT,
    padding: MENU_PADDING,
    borderRadius: 12,
    borderWidth: 1,
    // Lifted off the pad, because it overlaps the keys around it and has to
    // read as being in front of them rather than among them.
    shadowColor: '#1f2430',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 20,
  },
  option: {
    width: OPTION_WIDTH,
    height: OPTION_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  optionText: {
    fontFamily: ALG_FONT,
    fontSize: 24,
    fontWeight: '700',
  },
});

export default CubeKeyMenu;
