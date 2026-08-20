import React, { useMemo } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ALG_FONT } from './algText';
import CubeGlyph from './CubeGlyph';
import { padPalette } from './padPalette';
import { announcePosition, describePosition, describeSpeed } from './player';
import { drawerEvent, PAD_EVENTS } from './swipeMode';

/**
 * The transport under the cube (plan §8.8, Step 8).
 *
 * ### The five glyphs are one family now
 *
 * They used to be `skip-previous` · `chevron-left` · `play` · `chevron-right` ·
 * `skip-next` off the icon set: two filled glyphs, two stroked ones and a
 * triangle, for five buttons that do one job. They are redrawn in `CubeGlyph` at
 * a single stroke weight — step is a chevron on a bar, jump is two chevrons on
 * the same bar — so the four scrubbing buttons read as a set and **play is the
 * only filled glyph and the only circle**, which is what makes it findable
 * without looking at it.
 *
 * ### The tick track was here, and the operator removed it
 *
 * Step 8 shipped a phase-split tick track above this row — one tick per move,
 * grouped by the marked phases, the current move the only full-height one. It
 * came out after one session with it (operator, 2026-08-05: *"let's remove the
 * red segments above the scrub controls"*).
 *
 * Worth recording *why* it was a reasonable thing to try and still wrong: on a
 * 42-move solve every tick is about six points wide, so the "picture of the
 * solve" it was supposed to draw is a row of identical dashes, and the position
 * it encodes is already said exactly by `39 / 42` an inch below it. It cost 22
 * points of cube to restate a number. The phase *chips* above the cube keep the
 * part that was carrying its weight — the counts, and tapping one to play that
 * block. `tickTrack.js` and its tests went with it.
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
  padShown,
  onShowPad,
  onHidePad,
}) => {
  const palette = padPalette(theme, accent);
  const surface = theme.colors.numberPad.background;
  const border = theme.colors.numberPad.border;

  const atStart = index <= 0;
  const atEnd = index >= count;

  const setPadFromEvent = (event) => {
    if (event === PAD_EVENTS.SHOW) onShowPad?.();
    if (event === PAD_EVENTS.HIDE) onHidePad?.();
  };

  const drawerPan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
        onPanResponderRelease: (_, gesture) => setPadFromEvent(drawerEvent(gesture.dy)),
      }),
    [onShowPad, onHidePad]
  );

  const button = (name, label, onPress, disabled, primary) => (
    <Pressable
      key={name}
      style={[
        primary ? styles.playButton : styles.button,
        primary
          ? { backgroundColor: accent, borderColor: accent }
          : { borderColor: palette.dark ? border : '#e2e5ea' },
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      {/* The triangle is optically off-centre in its own box, so the design
          nudges it right inside the circle. The pause bars are symmetric and
          must not be nudged. */}
      <View style={primary && name === 'play' ? styles.playNudge : null}>
        <CubeGlyph
          name={name}
          size={primary ? 22 : 20}
          color={primary ? '#ffffff' : palette.ink}
        />
      </View>
    </Pressable>
  );

  return (
    <View style={styles.drawer}>
      {/* This is the drawer's leading edge, so it stays above the scrubber when
          the pad below is gone instead of falling against the home indicator. */}
      {typeof padShown === 'boolean' && (
        <Pressable
          style={styles.drawerHandleTarget}
          onPress={padShown ? onHidePad : onShowPad}
          accessibilityRole="button"
          accessibilityLabel={padShown ? 'Hide move pad' : 'Show move pad'}
          accessibilityHint={padShown ? 'Swipe down to hide the move pad' : 'Swipe up to show the move pad'}
          accessibilityState={{ expanded: padShown }}
          {...drawerPan.panHandlers}
        >
          <View style={[styles.drawerHandle, { backgroundColor: palette.faint }]} />
          <MaterialCommunityIcons
            name={padShown ? 'chevron-down' : 'chevron-up'}
            size={18}
            color={palette.faint}
            style={styles.drawerChevron}
          />
        </Pressable>
      )}

      <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
        <View style={styles.row}>
        <Text
          style={[styles.counter, { color: palette.ink }]}
          accessibilityLabel={announcePosition(index, count, noun)}
          numberOfLines={1}
        >
          {describePosition(index, count)}
        </Text>

        <View style={styles.buttons}>
          {button('jumpStart', startLabel, () => onSeek(0), atStart)}
          {button('stepPrev', 'Previous move', onStepBack, atStart)}
          {button(
            playing ? 'pause' : 'play',
            playing ? 'Pause' : `Play the ${noun}`,
            onPlayPause,
            count === 0,
            true
          )}
          {button('stepNext', 'Next move', onStepForward, atEnd)}
          {button('jumpEnd', `Jump to the end of the ${noun}`, () => onSeek(count), atEnd)}
        </View>

        {/* Tap to cycle rather than a slider or a menu: three speeds is a short
            enough cycle to be worth the one tap. */}
        <Pressable
          style={styles.speed}
          onPress={onCycleSpeed}
          accessibilityRole="button"
          accessibilityLabel={`Turn speed, ${describeSpeed(rate)}`}
          accessibilityHint="Cycles through half, normal and double speed"
        >
          <Text
            style={[styles.speedText, { color: rate === 1 ? palette.faint : accent }]}
            numberOfLines={1}
          >
            {describeSpeed(rate)}
          </Text>
        </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  drawer: {
    alignSelf: 'stretch',
  },
  // The design gives this card "10pt side margins" — **measured from the screen
  // edge**, which the page's own padding already provides. Setting them here as
  // well double-counted them and pushed the transport 1pt off the right edge of
  // a 320pt phone; the horizontal-overflow check caught it, as it caught Step
  // 7's.
  card: {
    alignSelf: 'stretch',
    paddingTop: 9,
    // 8 rather than the design's 10, for the same 320-point reason as the gap.
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderWidth: 1,
    borderRadius: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // **The design's gap is 10, and it was drawn at 375.** The narrowest phone
  // this app supports is 320, where the card has 282 points inside it and the
  // row wants 292 — so the gap comes down to 6 and the buttons keep their size,
  // because the buttons are the targets and the gap is only air.
  //
  // The first cut let the two end labels shrink instead. They did: the position
  // readout came out as `39 / …` at 320, which is the one thing on this row that
  // has to be readable. Air first, then labels, never the targets.
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    width: 30,
    height: 30,
  },
  playButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 19,
    width: 38,
    height: 38,
  },
  playNudge: {
    marginLeft: 2,
  },
  // Dimmed rather than hidden: the row keeps its shape at both ends, so nothing
  // shifts under a finger that is stepping through.
  disabled: {
    opacity: 0.35,
  },
  // Both ends have the same minimum so the five buttons stay optically centred
  // as the counter's digit count changes. **Neither may shrink** — see the note
  // on `buttons`; the counter is the one label on this row that has to be read.
  counter: {
    fontFamily: ALG_FONT,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 44,
    flexShrink: 0,
  },
  speed: {
    minWidth: 44,
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  speedText: {
    fontFamily: ALG_FONT,
    fontSize: 12,
    fontWeight: '600',
  },
  drawerHandleTarget: {
    height: 44,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerHandle: {
    width: 34,
    height: 4,
    borderRadius: 2,
  },
  drawerChevron: {
    marginLeft: 5,
  },
});

export default CubeScrubber;
