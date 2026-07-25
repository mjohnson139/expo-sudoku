import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MARKS } from './engine';
import { getRegionColor } from '../../utils/symbolSets';
import { useFungikuContext } from './FungikuContext';

/**
 * The playable Fungiku board.
 *
 * This is the engine preview's grid made interactive — a tap cycles a cell
 * through empty → X → 🍄 and conflicting mushrooms are outlined. Deliberately
 * plain: Step 5 replaces it with the real themed board component (region
 * boundary polish, the win flow, the palette tuning pass). The job here is that
 * the game can be *played*.
 *
 * Region outlines are the board's structure (plan §3), standing in for Sudoku's
 * 3×3 box lines: an edge is thick wherever the neighboring cell belongs to a
 * different region.
 */

const BOARD_MAX = 320;
const CONFLICT_COLOR = '#C1272D';

const MARK_LABELS = {
  [MARKS.EMPTY]: 'empty',
  [MARKS.X]: 'ruled out',
  [MARKS.MUSHROOM]: 'mushroom',
};

const FungikuBoard = () => {
  const { size, regions, marks, conflicts, cycleCell } = useFungikuContext();

  const cell = Math.floor(BOARD_MAX / size);
  const glyph = Math.round(cell * 0.62);

  return (
    <View style={[styles.board, { width: cell * size, height: cell * size }]}>
      {Array.from({ length: size }, (_, row) => (
        <View key={row} style={styles.row}>
          {Array.from({ length: size }, (_, col) => {
            const index = row * size + col;
            const region = regions[index];
            const palette = getRegionColor(region);
            const mark = marks[index];
            const conflicting = conflicts.has(index);

            const differs = (r, c) =>
              r < 0 ||
              c < 0 ||
              r >= size ||
              c >= size ||
              regions[r * size + c] !== region;

            return (
              <TouchableOpacity
                key={col}
                onPress={() => cycleCell(index)}
                activeOpacity={0.6}
                accessibilityRole="button"
                // Region name and mark are both spelled out, so the board is
                // usable without relying on color (plan §5).
                accessibilityLabel={`Row ${row + 1}, column ${col + 1}, ${palette.name} region, ${
                  MARK_LABELS[mark] || 'empty'
                }${conflicting ? ', conflict' : ''}`}
                accessibilityHint="Taps cycle empty, ruled out, mushroom"
                style={{
                  width: cell,
                  height: cell,
                  backgroundColor: palette.background,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderColor: '#33333355',
                  borderTopWidth: differs(row - 1, col) ? 2 : StyleSheet.hairlineWidth,
                  borderBottomWidth: differs(row + 1, col) ? 2 : StyleSheet.hairlineWidth,
                  borderLeftWidth: differs(row, col - 1) ? 2 : StyleSheet.hairlineWidth,
                  borderRightWidth: differs(row, col + 1) ? 2 : StyleSheet.hairlineWidth,
                }}
              >
                {/* A conflicting mushroom gets a ring as well as a red glyph, so
                    the signal is not carried by color alone. */}
                {conflicting && (
                  <View
                    style={[
                      styles.conflictRing,
                      { width: cell - 8, height: cell - 8, borderRadius: (cell - 8) / 2 },
                    ]}
                  />
                )}

                {mark === MARKS.MUSHROOM && (
                  <MaterialCommunityIcons
                    name="mushroom"
                    size={glyph}
                    color={conflicting ? CONFLICT_COLOR : palette.color}
                  />
                )}

                {mark === MARKS.X && (
                  <MaterialCommunityIcons
                    name="close"
                    size={Math.round(glyph * 0.8)}
                    color="#55555599"
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
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
    borderWidth: 2,
    borderColor: CONFLICT_COLOR,
  },
});

export default FungikuBoard;
