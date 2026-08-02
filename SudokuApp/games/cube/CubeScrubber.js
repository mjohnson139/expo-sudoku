import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ALG_FONT } from './algText';
import { announcePosition, describePosition, describeSpeed } from './player';

/**
 * The transport under the cube: where you are in the scramble, and the five
 * ways to move through it (docs/cube-plan.md §8, Step 2).
 *
 * ### Why a row of buttons and not a slider
 *
 * A scramble is twenty discrete moves, not a continuum. A slider over twenty
 * stops on a phone is a 9pt target per move and no way to land on the one you
 * want; the moves themselves are the slider — they are printed above the cube
 * and every one of them is tappable. This row is for the two things a tap on a
 * token cannot say: "one at a time" and "play it".
 *
 * Purely presentational. Everything it shows and everything it calls comes from
 * `useScramblePlayer`, so the same props drive a solve — which is what Step 3
 * does. `noun` and `startLabel` are the only things that differ, because
 * position 0 of a scramble is a solved cube and position 0 of a solve is the
 * scrambled one, and a button that says the wrong one of those is worse than a
 * button with no label at all.
 */
const CubeScrubber = ({
  index,
  count,
  playing,
  rate,
  accent,
  theme,
  noun = 'scramble',
  startLabel = 'Back to the solved cube',
  onPlayPause,
  onStepBack,
  onStepForward,
  onSeek,
  onCycleSpeed,
}) => {
  const titleColor = theme.colors.title;
  const border = theme.colors.numberPad.border;

  const atStart = index <= 0;
  const atEnd = index >= count;

  const button = (name, label, onPress, disabled, primary) => (
    <TouchableOpacity
      style={[
        styles.button,
        { borderColor: primary ? accent : border },
        primary && { backgroundColor: accent },
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <MaterialCommunityIcons
        name={name}
        size={primary ? 20 : 18}
        color={primary ? '#ffffff' : titleColor}
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.row}>
      {button('skip-previous', startLabel, () => onSeek(0), atStart)}
      {button('chevron-left', 'Previous move', onStepBack, atStart)}
      {button(
        playing ? 'pause' : 'play',
        playing ? 'Pause' : `Play the ${noun}`,
        onPlayPause,
        count === 0,
        true
      )}
      {button('chevron-right', 'Next move', onStepForward, atEnd)}
      {button('skip-next', `Jump to the end of the ${noun}`, () => onSeek(count), atEnd)}

      <Text
        style={[styles.position, { color: titleColor }]}
        accessibilityLabel={announcePosition(index, count, noun)}
      >
        {describePosition(index, count)}
      </Text>

      {/* Tap to cycle rather than a slider or a menu: three speeds is a short
          enough cycle to be worth the one tap, and this row has no width for a
          control that opens something. */}
      <TouchableOpacity
        style={[styles.speed, { borderColor: rate === 1 ? border : accent }]}
        onPress={onCycleSpeed}
        accessibilityRole="button"
        accessibilityLabel={`Turn speed, ${describeSpeed(rate)}`}
        accessibilityHint="Cycles through half, normal and double speed"
      >
        <Text
          style={[styles.speedText, { color: rate === 1 ? titleColor : accent }]}
          // The chip is 26pt wide and holds "0.5×"; shrinking beats truncating.
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {describeSpeed(rate)}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  // Seven things on one line, and the narrowest phone this app supports has
  // 300 points to put them in. They add up to about 284, and the row wraps
  // rather than overflowing if a font or a locale makes that wrong.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    width: 36,
    height: 34,
    marginHorizontal: 2,
  },
  // Dimmed rather than hidden: the row keeps its shape at both ends of the
  // scramble, so nothing shifts under a finger that is stepping through it.
  disabled: {
    opacity: 0.35,
  },
  position: {
    fontFamily: ALG_FONT,
    fontSize: 12,
    marginHorizontal: 4,
    minWidth: 44,
    textAlign: 'center',
  },
  speed: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    width: 34,
    height: 34,
    marginLeft: 2,
  },
  speedText: {
    fontFamily: ALG_FONT,
    fontSize: 11,
    fontWeight: '700',
  },
});

export default CubeScrubber;
