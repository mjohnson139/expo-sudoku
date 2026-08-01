import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ALG_FONT } from './algText';
import { announcePosition, describePosition } from './player';

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
 * `useScramblePlayer`, so the screen can hand the same props to a solve
 * playback later without this knowing the difference.
 */
const CubeScrubber = ({
  index,
  count,
  playing,
  accent,
  theme,
  onPlayPause,
  onStepBack,
  onStepForward,
  onSeek,
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
      {button('skip-previous', 'Back to the solved cube', () => onSeek(0), atStart)}
      {button('chevron-left', 'Previous move', onStepBack, atStart)}
      {button(
        playing ? 'pause' : 'play',
        playing ? 'Pause' : 'Play the scramble',
        onPlayPause,
        count === 0,
        true
      )}
      {button('chevron-right', 'Next move', onStepForward, atEnd)}
      {button('skip-next', 'Jump to the end of the scramble', () => onSeek(count), atEnd)}

      <Text
        style={[styles.position, { color: titleColor }]}
        accessibilityLabel={announcePosition(index, count)}
      >
        {describePosition(index, count)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    width: 38,
    height: 32,
    marginHorizontal: 3,
  },
  // Dimmed rather than hidden: the row keeps its shape at both ends of the
  // scramble, so nothing shifts under a finger that is stepping through it.
  disabled: {
    opacity: 0.35,
  },
  position: {
    fontFamily: ALG_FONT,
    fontSize: 12,
    marginLeft: 10,
    minWidth: 52,
    textAlign: 'center',
  },
});

export default CubeScrubber;
