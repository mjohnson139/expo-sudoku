import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { resolveSymbol } from '../utils/symbolSets';

/**
 * Symbol — owns "value → glyph" for the active symbol set (docs/fungiku-plan.md
 * §2). It is the single rendering seam Fungiku rides on: swap the symbol set and
 * every place a value is drawn changes, without touching game logic.
 *
 * The "numbers" path returns today's digit <Text> verbatim, using the exact
 * `textStyle` the caller already computes — so with `symbolSet` hardcoded to
 * "numbers" (Step 1) the board is pixel-identical to before.
 *
 * Props:
 *   symbolSet — active set id ('numbers' | 'fungiku')
 *   value     — numeric cell value (1..9); the board stays numeric internally
 *   textStyle — style passed straight through to the digit <Text> (numbers mode)
 *   size      — glyph size for swatch/mushroom rendering (fungiku mode)
 *   color     — optional color override for the mushroom glyph
 */
const Symbol = ({ symbolSet, value, textStyle, size = 22, color }) => {
  const symbol = resolveSymbol(symbolSet, value);

  if (symbol.kind === 'swatch') {
    const [tl, tr, br, bl] = symbol.corners;
    return (
      <View
        style={[
          styles.swatch,
          {
            width: size,
            height: size,
            backgroundColor: symbol.color,
            borderTopLeftRadius: tl * size,
            borderTopRightRadius: tr * size,
            borderBottomRightRadius: br * size,
            borderBottomLeftRadius: bl * size,
          },
        ]}
      />
    );
  }

  if (symbol.kind === 'icon') {
    return <MaterialCommunityIcons name={symbol.icon} size={size} color={color || symbol.color} />;
  }

  // 'text' — the digit, drawn exactly as the cell drew it before the seam.
  return <Text style={textStyle}>{symbol.text}</Text>;
};

const styles = StyleSheet.create({
  swatch: {
    // A subtle rim so a swatch reads against any theme background — a redundant,
    // non-color edge cue that pairs with the per-swatch corner shape.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.25)',
  },
});

export default React.memo(Symbol);
