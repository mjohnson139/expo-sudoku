import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ALG_FONT } from './algText';
import CubeGlyph from './CubeGlyph';
import { padPalette } from './padPalette';
import { announcePosition, describePosition, describeSpeed } from './player';
import { CURRENT, PENDING, tickGroups } from './tickTrack';

/** The band the ticks stand in, and the height of the tallest one. */
export const TICK_BAND = 12;
/** How short a tick is when it is not the current move. */
const TICK_SHORT = 5;

/**
 * The transport under the cube, and **where you are in the solve** (plan §8.8,
 * Step 8).
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
 * ### The tick track
 *
 * One tick per move, grouped into the phases the operator marked, each group
 * `flex`ed to its move count, the current move the only full-height tick. It
 * turns "17 / 21" into a picture: how far through, how far through *this block*,
 * and how big the blocks are next to each other — which is the comparison
 * open question 13 keeps asking for and the closest this screen has come to
 * answering it.
 *
 * It is a **readout, not a slider**. Scrubbing already has two instruments that
 * are better at it: every token in the track above is a tap target that turns
 * the cube to it, and the phase chips play a whole group. A drag here would be a
 * third, at 15pt a move on a 375pt phone — see the note in `docs/cube-handoff.md`
 * about what it would take to be worth adding.
 */
const CubeScrubber = ({
  index,
  count,
  playing,
  rate,
  accent,
  theme,
  // The solve's phase spans, or nothing — the scramble has no phases and cannot
  // have any, so it gets one undivided group.
  spans,
  noun = 'scramble',
  startLabel = 'Back to the solved cube',
  onPlayPause,
  onStepBack,
  onStepForward,
  onSeek,
  onCycleSpeed,
}) => {
  const palette = padPalette(theme, accent);
  const surface = theme.colors.numberPad.background;
  const border = theme.colors.numberPad.border;

  const atStart = index <= 0;
  const atEnd = index >= count;

  const groups = tickGroups(spans, count, index);

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
    <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
      <View
        style={styles.track}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={announcePosition(index, count, noun)}
      >
        {groups.map((group, gi) => (
          <View
            key={`${group.at}-${gi}`}
            style={[
              styles.group,
              { flexGrow: group.count, flexShrink: 1, flexBasis: 0 },
              gi > 0 && styles.groupGap,
            ]}
          >
            {group.ticks.map((state, ti) => (
              <View
                key={ti}
                style={[
                  styles.tick,
                  state === CURRENT ? styles.tickCurrent : styles.tickShort,
                  {
                    backgroundColor:
                      state === CURRENT
                        ? accent
                        : state === PENDING
                          ? palette.trackEmpty
                          : 'rgba(198,40,40,0.42)',
                  },
                ]}
              />
            ))}
          </View>
        ))}
      </View>

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
  );
};

const styles = StyleSheet.create({
  // The design gives this card "10pt side margins" — **measured from the screen
  // edge**, which the page's own padding already provides. Setting them here as
  // well double-counted them and pushed the transport 1pt off the right edge of
  // a 320pt phone; the horizontal-overflow check caught it, as it caught Step
  // 7's.
  card: {
    alignSelf: 'stretch',
    marginTop: 6,
    paddingTop: 9,
    // 8 rather than the design's 10, for the same 320-point reason as the gap.
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderWidth: 1,
    borderRadius: 12,
    gap: 10,
  },
  track: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: TICK_BAND,
  },
  group: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: TICK_BAND,
    gap: 2,
  },
  // The gap between phases, and the whole reason the track is worth splitting:
  // it is what makes "the second block" a place on the bar.
  groupGap: {
    marginLeft: 9,
  },
  tick: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    borderRadius: 3,
  },
  tickShort: {
    height: TICK_SHORT,
  },
  tickCurrent: {
    height: TICK_BAND,
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
});

export default CubeScrubber;
