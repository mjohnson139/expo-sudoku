import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LEGEND, padPalette } from './padPalette';

/**
 * What the four tints mean (plan §8.8).
 *
 * A swatch and a word each for faces, slices, wides and rotations. It exists
 * because the pad now says something in colour that it does not say in text —
 * four groups at the same lightness are four groups you have to be told about
 * once.
 *
 * **It is the row most likely to be cut, and that is by design.** §8.8 names it
 * as the first thing to question if the new chrome takes too much from the cube:
 * a key is the first row a returning operator stops reading, and the pad's
 * grouping is also carried by *position* — the slices are a column, the wides
 * are a column, the rotations are a column — so the colour is a second encoding
 * of something the layout already says. Which is exactly why it can go, and
 * exactly why it is worth having on the first run.
 */
const CubePadLegend = ({ theme, accent }) => {
  const palette = padPalette(theme, accent);

  // Said from `LEGEND` rather than restated. The hand-written version listed the
  // same four groups a second time, so a fifth tint would have been drawn and
  // not announced — the failure `PAD_KEYS` is derived to avoid, one file over.
  const spoken = LEGEND.map((group) => group.spoken).join(', ');

  return (
    <View
      style={styles.legend}
      accessibilityRole="summary"
      accessibilityLabel={`Key colours: ${spoken}`}
    >
      {LEGEND.map(({ tone, label }) => {
        const group = palette.tone(tone);
        return (
          <View key={tone} style={styles.item}>
            <View
              style={[styles.swatch, { backgroundColor: group.bg, borderColor: group.border }]}
            />
            <Text style={[styles.label, { color: palette.faint }]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 12,
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  swatch: {
    width: 11,
    height: 11,
    borderRadius: 3,
    borderWidth: 1,
  },
  label: {
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
});

export default CubePadLegend;
