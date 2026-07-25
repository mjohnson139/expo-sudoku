import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MARKS } from './engine';
import { getRegionPalette } from '../../utils/symbolSets';
import useBoardSize from '../../hooks/useBoardSize';
import { useFungikuContext } from './FungikuContext';

/**
 * The Fungiku board.
 *
 * Region outlines *are* the board's structure (docs/fungiku-plan.md §3) — they
 * stand in for Sudoku's 3×3 box lines, and they are the only way the player sees
 * where one color region ends. An edge is drawn thick wherever the neighboring
 * cell belongs to a different region.
 *
 * Everything visual comes from the active theme: which region palette (light or
 * dark) is chosen, the outline color, and the glyph ink — which is picked for
 * contrast against each region's own fill rather than being the region's hue, so
 * a mushroom never disappears into an orange cell.
 *
 * @param {boolean} isDark - whether the active theme is a dark one
 * @param {Object} theme - a theme object from utils/themes
 */

const MARK_LABELS = {
  [MARKS.EMPTY]: 'empty',
  [MARKS.X]: 'ruled out',
  [MARKS.MUSHROOM]: 'mushroom',
};

const FungikuBoard = ({ isDark, theme }) => {
  const { size, regions, marks, conflicts, cycleCell, solved } = useFungikuContext();

  const boardSize = useBoardSize();
  const cell = Math.floor(boardSize / size);
  const glyph = Math.round(cell * 0.62);

  const palette = useMemo(() => getRegionPalette(isDark), [isDark]);

  // Region outlines come from the theme's grid colors so the board reads as part
  // of the app; they need to hold up over both light and dark region fills.
  const outline = theme?.colors?.grid?.boxBorder || (isDark ? '#e8e8e8' : '#333333');
  const hairline = theme?.colors?.grid?.cellBorder || (isDark ? '#ffffff44' : '#33333344');

  // The board itself celebrates a win first (a gentle lift), before the banner
  // above it arrives — same "board celebrates first" idea the sibling color-loop
  // app uses for its win sequence.
  const winLift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(winLift, {
      toValue: solved ? 1 : 0,
      duration: solved ? 420 : 160,
      easing: solved ? Easing.out(Easing.back(2)) : Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [solved, winLift]);

  return (
    <Animated.View
      style={[
        styles.board,
        {
          width: cell * size,
          height: cell * size,
          transform: [
            { scale: winLift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) },
          ],
        },
      ]}
    >
      {Array.from({ length: size }, (_, row) => (
        <View key={row} style={styles.row}>
          {Array.from({ length: size }, (_, col) => {
            const index = row * size + col;
            const region = regions[index];
            const entry = palette[region % palette.length];
            const mark = marks[index];
            const conflicting = conflicts.has(index);

            const differs = (r, c) =>
              r < 0 || c < 0 || r >= size || c >= size || regions[r * size + c] !== region;

            // X is a thinking aid, so it sits quieter than a mushroom — but it
            // still has to be visible on its own fill, so it is the same
            // contrast-checked ink at reduced strength rather than a fixed gray.
            const inkFaded = entry.ink === '#ffffff' ? '#ffffffaa' : '#1a1a1aaa';

            return (
              <TouchableOpacity
                key={col}
                onPress={() => cycleCell(index)}
                activeOpacity={0.6}
                accessibilityRole="button"
                // Region name and mark are both spelled out, so the board is
                // usable without relying on color (plan §5). These labels are
                // also the seam the browser tests address cells through.
                accessibilityLabel={`Row ${row + 1}, column ${col + 1}, ${entry.name} region, ${
                  MARK_LABELS[mark] || 'empty'
                }${conflicting ? ', conflict' : ''}`}
                accessibilityHint="Taps cycle empty, ruled out, mushroom"
                style={{
                  width: cell,
                  height: cell,
                  backgroundColor: entry.background,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderTopColor: differs(row - 1, col) ? outline : hairline,
                  borderBottomColor: differs(row + 1, col) ? outline : hairline,
                  borderLeftColor: differs(row, col - 1) ? outline : hairline,
                  borderRightColor: differs(row, col + 1) ? outline : hairline,
                  borderTopWidth: differs(row - 1, col) ? 2 : StyleSheet.hairlineWidth,
                  borderBottomWidth: differs(row + 1, col) ? 2 : StyleSheet.hairlineWidth,
                  borderLeftWidth: differs(row, col - 1) ? 2 : StyleSheet.hairlineWidth,
                  borderRightWidth: differs(row, col + 1) ? 2 : StyleSheet.hairlineWidth,
                }}
              >
                {/* Conflict is signalled by a ring *and* a color change, so it
                    survives a colorblind reader and a dark theme alike. The ring
                    color is contrast-checked against every fill in the palette
                    (see symbolSets.js). */}
                {conflicting && (
                  <View
                    style={[
                      styles.conflictRing,
                      {
                        width: cell - 6,
                        height: cell - 6,
                        borderRadius: (cell - 6) / 2,
                        borderColor: entry.conflictInk,
                      },
                    ]}
                  />
                )}

                {mark === MARKS.MUSHROOM && (
                  <MaterialCommunityIcons
                    name="mushroom"
                    size={glyph}
                    color={conflicting ? entry.conflictInk : entry.ink}
                  />
                )}

                {mark === MARKS.X && (
                  <MaterialCommunityIcons
                    name="close"
                    size={Math.round(glyph * 0.8)}
                    color={inkFaded}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  board: {
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  conflictRing: {
    position: 'absolute',
    borderWidth: 2.5,
  },
});

export default FungikuBoard;
