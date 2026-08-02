import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ALG_FONT } from './algText';
import { MODIFIERS, PAD_COLUMNS, PAD_KEYS, describeToken, padToken } from './solve';

/**
 * The keyboard a solve gets written on (docs/cube-plan.md §8.2, Step 3).
 *
 * Twelve keys, two rows of six, and a row underneath for the two modifiers, the
 * two ways to take a move back, the text field and the phase marker. Which
 * twelve is a Roux decision and is argued in `solve.PAD_KEYS`; how many fit on a
 * row is a phone decision — the narrowest screen this app supports has 300
 * points, and the stage above is the `flex: 1` that pays for every one of them.
 *
 * The bottom row is the one place a sixth control could go, and Step 6 spent it
 * on the flag: the rows above are six keys wide, so a sixth here costs the page
 * no height at all. It is the *only* free slot on this screen — everything else
 * would be another row, and another row comes out of the cube.
 *
 * ### The modifiers are armed, and the keys say so
 *
 * Tap `'`, then `R`, and you get `R'`. Two taps for a move Roux uses constantly,
 * which is the honest cost of the alternatives being worse: modifying the move
 * you just made means un-turning and re-turning the cube, and cycling
 * `R → R2 → R'` on repeated taps animates a cube rocking back and forth rather
 * than a solve being written (plan §9.8 — this is the first thing to revisit
 * after a real drilling session).
 *
 * What makes two taps bearable is that the pad *shows* the arming: every key
 * relabels itself to `U'`, `D'`, `R'` … while a modifier is live, so the second
 * tap is aimed at a key that already reads the move it is about to make. Nothing
 * has to be remembered between the two taps.
 *
 * Purely presentational — every decision about what a tap means is in `solve.js`.
 */
const CubeMovePad = ({
  modifier,
  canUndo,
  canClear,
  canPhase,
  accent,
  theme,
  onKey,
  onModifier,
  onUndo,
  onClear,
  onType,
  onPhase,
}) => {
  const titleColor = theme.colors.title;
  const surface = theme.colors.numberPad.background;
  const border = theme.colors.numberPad.border;

  const rows = [];
  for (let i = 0; i < PAD_KEYS.length; i += PAD_COLUMNS) {
    rows.push(PAD_KEYS.slice(i, i + PAD_COLUMNS));
  }

  const tool = (name, label, hint, onPress, disabled) => (
    <TouchableOpacity
      key={label}
      style={[styles.tool, { borderColor: border }, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled }}
    >
      <MaterialCommunityIcons name={name} size={17} color={titleColor} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.pad}>
      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((key) => {
            const token = padToken(key, modifier);
            return (
              <TouchableOpacity
                key={key}
                style={[styles.key, { borderColor: border, backgroundColor: surface }]}
                onPress={() => onKey(key)}
                accessibilityRole="button"
                accessibilityLabel={describeToken(token)}
                accessibilityHint="Adds this move to the solve and turns the cube"
              >
                <Text
                  style={[styles.keyText, { color: titleColor }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {token}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      <View style={styles.row}>
        {MODIFIERS.map((mark) => {
          const armed = modifier === mark;
          return (
            <TouchableOpacity
              key={mark}
              style={[
                styles.key,
                styles.modifier,
                { borderColor: armed ? accent : border, backgroundColor: surface },
                armed && { backgroundColor: accent, borderColor: accent },
              ]}
              onPress={() => onModifier(mark)}
              accessibilityRole="button"
              accessibilityLabel={mark === '2' ? 'Half turn' : 'Prime'}
              accessibilityHint={
                armed
                  ? 'Armed — tap again to cancel'
                  : 'Applies to the next move you tap'
              }
              accessibilityState={{ selected: armed }}
            >
              <Text
                style={[styles.keyText, { color: armed ? '#ffffff' : titleColor }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {mark}
              </Text>
            </TouchableOpacity>
          );
        })}

        {tool(
          'backspace-outline',
          'Undo the last move',
          'Turns the last move back and removes it',
          onUndo,
          !canUndo
        )}
        {tool(
          'close-circle-outline',
          'Clear the solve',
          'Removes every move and puts the cube back to the scramble',
          onClear,
          !canClear
        )}
        {tool(
          'keyboard-outline',
          'Type an algorithm',
          'Opens a field for typing or pasting a whole sequence',
          onType,
          false
        )}
        {/* The one that annotates. It is not only "end the phase here" — it is
            also the list of the ones already marked, and the only way to delete
            one, which is why it stays live once a solve has any markers even if
            there is nothing new to close. */}
        {tool(
          'flag-outline',
          'End the phase here',
          'Names the group of moves since the last marker, and lists the ones already marked',
          onPhase,
          !canPhase
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pad: {
    alignSelf: 'stretch',
    marginTop: 6,
  },
  // Six keys, each taking an equal share of whatever the screen has. Fixed
  // widths would either waste a wide phone or overflow a narrow one, and this
  // row is the one thing on the page that has to fit exactly.
  row: {
    flexDirection: 'row',
    alignSelf: 'stretch',
  },
  key: {
    flex: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 2,
    marginBottom: 4,
  },
  keyText: {
    fontFamily: ALG_FONT,
    fontSize: 15,
    fontWeight: '700',
  },
  // The two modifiers keep a fifth more width than the four icons beside them:
  // they are the keys that get hit in a hurry, and Roux is prime-heavy. The row
  // is six controls now rather than five, so this is what pays for the flag —
  // at 320 points a tool key comes out about 43 wide against the 46 of a move
  // key above it, which is the honest cost of the sixth slot and was measured
  // rather than assumed.
  modifier: {
    flex: 1.2,
  },
  tool: {
    flex: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 2,
    marginBottom: 4,
  },
  disabled: {
    opacity: 0.35,
  },
});

export default CubeMovePad;
