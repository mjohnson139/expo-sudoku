import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ALG_FONT } from './algText';
import CubeGlyph from './CubeGlyph';
import { padPalette } from './padPalette';
import {
  BACKSPACE_REPEAT_MS,
  HOLD_MS,
  PAD_COLUMNS,
  PAD_LAYOUT,
  describeToken,
  isHold,
} from './solve';

/**
 * The pad's fixed geometry (plan §8.8): three 44pt rows, two 5pt gaps, 10pt of
 * top padding. **Fixed is the point** — plan §8.6 sizes the cube first and puts
 * every other row on a budget, and a pad whose height depended on anything would
 * resize the cube while it was being used.
 */
export const KEY_HEIGHT = 44;
export const KEY_GAP = 5;
export const PAD_TOP = 10;

/** How long a backspace waits before it starts repeating. */
const REPEAT_AFTER_MS = 400;

/**
 * The keyboard a solve gets written on — **the spatial cross** (plan §8.8,
 * Step 8).
 *
 * Six columns by three rows. The left three are a cube net, so `U` `F` `D` run
 * down the spine with `L` and `R` beside `F` and `B` marked *far* in the corner
 * the net cannot place; then slices, wides and rotations in their own columns.
 * `PAD_LAYOUT` owns which key goes where — this file owns what a press means and
 * what it looks like while it is happening.
 *
 * ### Two routes to a prime, because a finger hides one of them
 *
 * **Hold a key** past `HOLD_MS`, or **tap `′` and then the key**. Tap it a second
 * time and the `R` you just wrote becomes `R2`. Every rule about what a press
 * *means* is `applyPadPress`, in `solve.js`, where it can be tested.
 *
 * The hold shipped alone and the operator found the hole in it on a phone:
 * *"it's hard to see the prime symbols when your finger is on the button and
 * holding."* The fill, the ring and the `′` are all drawn on the key being
 * pressed — **under the thumb pressing it.** Three viewport widths in a browser
 * cannot show that, because the browser has no thumb. So the armed `′` is back
 * as a *second* route rather than a replacement: its feedback is on a key you
 * are not touching, and it relabels the rest of the pad besides.
 *
 * Three things about the gestures are load-bearing rather than decorative:
 *
 * - **The hold fires on touch-up.** `onPress`, not `onPressIn` — which is also
 *   what makes sliding off a key cancel it, because React Native only calls
 *   `onPress` for a touch released *on* the target. Firing on touch-down would
 *   make every prime a double entry, and there would be no way to abandon one.
 * - **The fill starts at 0ms.** A hold with no feedback until it completes is a
 *   hidden gesture. The hairline across the key's foot means the key is telling
 *   you what will happen *before* it happens; the ring, the `′` and the haptic
 *   at the threshold are the confirmation, not the first news.
 * - **While `′` is armed, every move key relabels itself** to `R'`, `U'`, `M'` …
 *   so the second of the two taps is aimed at a key that already reads the move
 *   it will make. This is Step 3's one genuinely good idea about armed
 *   modifiers, and it is what makes the state impossible to miss: the whole pad
 *   changes, not one corner of one key.
 */
const CubeMovePad = ({
  canUndo,
  canPhase,
  // The key a second tap would promote — `R` when the solve ends `… R` and `R`
  // was the last key pressed. Drawn as a `2` in the corner, which is the
  // design's fourth hold state: the pad says "again and this becomes R2" rather
  // than leaving it to be discovered.
  promoteKey,
  // The `′` key is armed: the next move key writes a prime.
  primed,
  accent,
  theme,
  onKey,
  onPrime,
  onUndo,
  onType,
  onPhase,
}) => {
  const palette = padPalette(theme, accent);

  // Only one key can be down at a time, so one press's worth of state lives
  // here rather than in eighteen children.
  const [pressed, setPressed] = useState(null);
  const [armed, setArmed] = useState(false);
  const fill = useRef(new Animated.Value(0)).current;
  const startedAt = useRef(0);
  const armTimer = useRef(null);
  const repeatTimer = useRef(null);
  const repeatTick = useRef(null);

  const clearTimers = useCallback(() => {
    if (armTimer.current) clearTimeout(armTimer.current);
    if (repeatTimer.current) clearTimeout(repeatTimer.current);
    if (repeatTick.current) clearInterval(repeatTick.current);
    armTimer.current = null;
    repeatTimer.current = null;
    repeatTick.current = null;
  }, []);

  // A pad that unmounts mid-press — switching to the scramble, or the solve
  // being deleted under it — must not leave a timer holding a haptic.
  useEffect(() => clearTimers, [clearTimers]);

  const pressIn = useCallback(
    (key) => {
      startedAt.current = Date.now();
      setPressed(key);
      setArmed(false);
      fill.setValue(0);
      Animated.timing(fill, {
        toValue: 1,
        duration: HOLD_MS,
        easing: Easing.linear,
        // Width, so it cannot go on the native driver.
        useNativeDriver: false,
      }).start();
      armTimer.current = setTimeout(() => {
        setArmed(true);
        // The confirmation you get without looking. Web has no haptics and
        // throws nothing — `impactAsync` resolves to a no-op there.
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
      }, HOLD_MS);
    },
    [fill]
  );

  const pressOut = useCallback(() => {
    clearTimers();
    fill.stopAnimation();
    fill.setValue(0);
    setPressed(null);
    setArmed(false);
  }, [clearTimers, fill]);

  // Touch-up **on the key**. `onPressOut` has already run and cleared the
  // visual state, so the gesture is read off the clock rather than off `armed`,
  // which is gone by now.
  const press = useCallback(
    (key) => {
      onKey(key, { held: isHold(Date.now() - startedAt.current) });
    },
    [onKey]
  );

  // Backspace is the one key that repeats: holding it deletes back through the
  // solve at 120ms a token, after a pause long enough that a single tap is
  // never two.
  const holdBackspace = useCallback(() => {
    repeatTimer.current = setTimeout(() => {
      repeatTick.current = setInterval(onUndo, BACKSPACE_REPEAT_MS);
    }, REPEAT_AFTER_MS);
  }, [onUndo]);

  const rows = [];
  for (let i = 0; i < PAD_LAYOUT.length; i += PAD_COLUMNS) {
    rows.push(PAD_LAYOUT.slice(i, i + PAD_COLUMNS));
  }

  const moveKey = (cell) => {
    const { key, tag } = cell;
    const group = palette.tone(cell.tone);
    const down = pressed === key;
    // **The accent fill belongs to the hold alone.** Filling all fourteen keys
    // while `′` is armed was tried and is too much: the four tints — a whole
    // feature, with a legend under the pad explaining them — vanish under one
    // wash of red, and the flag stops being the one accent key. The armed state
    // is already unmissable from the relabelling below plus the `′` key itself
    // lighting up, which is one key rather than the whole board.
    const live = down && armed;
    // A promotion cannot happen while `′` is armed: the press is going to write
    // `R'`, so promising `R2` would be a lie.
    const promoting = !down && !primed && promoteKey === key;
    // What this key will actually write, which is what it should say.
    const token = primed ? `${key}'` : key;

    // Whole styles rather than a base with overrides layered on it: Step 7
    // shipped a header where `[base, variant]` flattened to an object carrying
    // both `flex: 1` and a `flexBasis`, and web and Yoga disagreed about which
    // won. Nothing here sets a layout property twice.
    const face = live
      ? { backgroundColor: accent, borderColor: accent }
      : down
        ? { backgroundColor: palette.pressed, borderColor: palette.pressedBorder }
        : { backgroundColor: group.bg, borderColor: group.border };

    return (
      <Pressable
        key={key}
        style={[styles.cell, styles.key, face, down && styles.keyDown, styles.keyShadow]}
        onPressIn={() => pressIn(key)}
        onPressOut={pressOut}
        onPress={() => press(key)}
        accessibilityRole="button"
        // Reads the move it will *make*, not the letter printed on it — so with
        // `′` armed a screen reader says "R prime" like the key does.
        accessibilityLabel={describeToken(token)}
        accessibilityHint="Tap to add this move; hold for prime; tap again for a half turn"
      >
        <Text
          style={[styles.keyText, { color: live ? '#ffffff' : group.ink }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {token}
        </Text>

        {/* `B` is the face a net cannot show in place, so it is the one key that
            has to say where it is. */}
        {!!tag && !live && !promoting && (
          <Text style={[styles.tag, { color: palette.faint }]}>{tag}</Text>
        )}

        {/* The corner mark is the hold's, and only the hold's. With `′` armed
            the label already ends in one, and a second prime mark in the corner
            would read as `R''`. */}
        {live && !primed && <Text style={[styles.tag, styles.tagArmed]}>′</Text>}


        {/* "Again and this becomes R2." */}
        {promoting && <Text style={[styles.tag, { color: accent }]}>2</Text>}

        {/* The hold, drawn from 0ms. */}
        {down && (
          <View style={[styles.holdTrack, { backgroundColor: palette.holdTrack }]}>
            <Animated.View
              style={[
                styles.holdFill,
                {
                  backgroundColor: live ? '#ffffff' : accent,
                  width: fill.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        )}

        {/* The ring, and the soft halo outside it. Two views because React
            Native has no spread shadow to put a 3pt glow on a border.

            **The hold's, and only the hold's.** It marks the one key crossing
            the threshold; ringing all fourteen while `′` is armed would be a
            pad of alarm bells saying something the labels already say. */}
        {down && armed && (
          <>
            <View style={[styles.halo, { borderColor: 'rgba(198,40,40,0.16)' }]} pointerEvents="none" />
            <View style={[styles.ring, { borderColor: accent }]} pointerEvents="none" />
          </>
        )}
      </Pressable>
    );
  };

  const toolKey = (cell) => {
    const { tool } = cell;
    const isFlag = tool === 'flag';
    const isPrime = tool === 'prime';

    /**
     * The prime key lights for **either** route (operator, 2026-08-05).
     *
     * `primed` is the key having been tapped. `armed` is a *hold* having crossed
     * the threshold — and lighting this key for that is the same fix as adding
     * the key in the first place: everything the hold says about itself is drawn
     * on the key being held, which is the key under the thumb. This is the one
     * place on the pad that says "you are about to write a prime" and is
     * guaranteed not to be the thing your finger is covering.
     *
     * `armed` can only be true while a *move* key is down — the arm timer is
     * started in `pressIn`, which tools do not call — so there is no state where
     * this lights for a hold on a tool.
     */
    const primeLive = isPrime && (primed || armed);

    // The flag is the design's one accent fill *at rest*. The prime key borrows
    // it only while live, which is a state rather than a resting style — and
    // being the loud thing on the pad is the entire job it was added to do.
    const group = isFlag || primeLive ? palette.accent : palette.tone('tool');
    const disabled = tool === 'backspace' ? !canUndo : isFlag ? !canPhase : false;

    const config = {
      backspace: {
        label: 'Undo the last move',
        hint: 'Removes the last move whole, and turns it back. Hold to keep deleting',
        onPress: onUndo,
      },
      keyboard: {
        label: 'Type an algorithm',
        hint: 'Opens a field for typing or pasting a whole sequence',
        onPress: onType,
      },
      flag: {
        label: 'End the phase here',
        hint: 'Names the group of moves since the last marker, and lists the ones already marked',
        onPress: onPhase,
      },
      prime: {
        // Reads what it looks like. A hold past the threshold really has armed
        // a prime, so saying otherwise while the key is filled accent would be
        // the label and the pixels disagreeing.
        label: primeLive ? 'Prime, armed' : 'Prime',
        hint: primed
          ? 'The next move you tap will be a prime. Tap again to cancel'
          : 'Arms a prime for the next move you tap. Holding a move key does the same thing',
        onPress: onPrime,
      },
    }[tool];

    const down = pressed === tool;

    return (
      <Pressable
        key={tool}
        style={[
          styles.cell,
          styles.key,
          { backgroundColor: down ? palette.pressed : group.bg, borderColor: group.border },
          down && styles.keyDown,
          disabled && styles.disabled,
        ]}
        onPressIn={() => {
          setPressed(tool);
          if (tool === 'backspace') holdBackspace();
        }}
        onPressOut={() => {
          clearTimers();
          setPressed(null);
        }}
        onPress={config.onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={config.label}
        accessibilityHint={config.hint}
        accessibilityState={{ disabled, selected: isPrime ? primeLive : undefined }}
      >
        {isPrime ? (
          // A glyph would be a 1.9pt stroke of an apostrophe. The notation is
          // the icon.
          <Text style={[styles.primeText, { color: group.ink }]}>′</Text>
        ) : (
          <CubeGlyph name={tool} size={tool === 'keyboard' ? 20 : 19} color={group.ink} />
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.pad}>
      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((cell, cellIndex) => {
            // The cross's one deliberate hole. A real cell holding real width,
            // and not a target — it is what makes the cross read as a cross.
            if (cell.gap) return <View key={`gap-${cellIndex}`} style={styles.cell} />;
            return cell.tool ? toolKey(cell) : moveKey(cell);
          })}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  pad: {
    alignSelf: 'stretch',
    paddingTop: PAD_TOP,
    paddingHorizontal: 8,
    gap: KEY_GAP,
  },
  row: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: KEY_GAP,
  },
  // Spelled out rather than `flex: 1`. Step 7's lesson: react-native-web reads
  // the shorthand as `flex-basis: 0%` with shrink still on, and a row of six
  // that disagrees with Yoga about its basis is a row that lays out one way in
  // the browser and another on the phone.
  cell: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  key: {
    height: KEY_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 10,
  },
  keyShadow: {
    shadowColor: '#1f2430',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 0,
    elevation: 1,
  },
  keyDown: {
    transform: [{ translateY: 1 }],
  },
  keyText: {
    fontFamily: ALG_FONT,
    fontSize: 17,
    fontWeight: '700',
  },
  // Much larger than a move label, because `′` is a small mark in a big empty
  // em and at 17pt it reads as a speck next to `R`. The key has to be as
  // findable as its neighbours — being findable is the entire reason it exists.
  //
  // The glyph also sits at cap height rather than on the centre line, so
  // centring the *box* leaves the ink high. The nudge puts the mark itself on
  // the middle of the key; it is a transform rather than a `lineHeight` because
  // line box maths differs between web and Yoga and this only has to move ink.
  primeText: {
    fontFamily: ALG_FONT,
    fontSize: 32,
    fontWeight: '700',
    transform: [{ translateY: 5 }],
  },
  tag: {
    position: 'absolute',
    top: 3,
    right: 5,
    fontFamily: ALG_FONT,
    fontSize: 9,
    fontWeight: '700',
  },
  tagArmed: {
    color: 'rgba(255,255,255,0.85)',
  },
  holdTrack: {
    position: 'absolute',
    left: 5,
    right: 5,
    bottom: 4,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  holdFill: {
    height: 3,
    borderRadius: 2,
  },
  ring: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderWidth: 2,
    borderRadius: 10,
  },
  halo: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderWidth: 3,
    borderRadius: 13,
  },
  disabled: {
    opacity: 0.35,
  },
});

export default CubeMovePad;
