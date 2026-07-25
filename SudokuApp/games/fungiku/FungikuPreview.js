import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { generate, MIN_SIZE } from './engine';
import { getRegionColor } from '../../utils/symbolSets';

/**
 * FungikuPreview — a read-only look at what the engine produces
 * (docs/fungiku-plan.md §7). It exists so every delivery step, including the
 * pure-logic ones, ships something runnable in Expo Go: here you can see the
 * generated color regions and the solution mushrooms, and reseed to judge
 * whether region shapes and colors are heading the right way.
 *
 * This is deliberately NOT the real board — there is no input, no marks, no
 * conflict handling. Step 3 moves it onto Fungiku's own screen off the hub,
 * Step 4 makes it playable, and Step 5 supersedes it with the real board
 * component. Until then it is scaffolding for looking at the engine's output.
 */

const SIZES = [5, 6, 7, 8];
const BOARD_MAX = 320;

const FungikuPreview = ({ visible, onClose, theme }) => {
  const [size, setSize] = useState(MIN_SIZE);
  const [seed, setSeed] = useState(1);
  const [showSolution, setShowSolution] = useState(true);

  // Generation is deterministic, so this only recomputes when size/seed change.
  const puzzle = useMemo(() => {
    try {
      return generate({ size, seed });
    } catch (error) {
      return { error: error.message };
    }
  }, [size, seed]);

  const cell = Math.floor(BOARD_MAX / size);

  const solutionCells = useMemo(() => {
    if (!puzzle || puzzle.error) return new Set();
    return new Set(puzzle.solution.map((col, row) => row * size + col));
  }, [puzzle, size]);

  const titleColor = theme?.colors?.title || '#222';
  const surface = theme?.colors?.numberPad?.background || '#fff';
  const border = theme?.colors?.numberPad?.border || '#ccc';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: surface, borderColor: border }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: titleColor }]}>Fungiku — engine preview</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close Fungiku preview" accessibilityRole="button">
              <MaterialCommunityIcons name="close" size={24} color={titleColor} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.caption, { color: titleColor }]}>
            One mushroom per row, column and color region — none touching.
          </Text>

          <ScrollView contentContainerStyle={styles.scrollBody}>
            {puzzle.error ? (
              <Text style={styles.error}>{puzzle.error}</Text>
            ) : (
              <View style={[styles.board, { width: cell * size, height: cell * size }]}>
                {Array.from({ length: size }, (_, row) => (
                  <View key={row} style={styles.boardRow}>
                    {Array.from({ length: size }, (_, col) => {
                      const index = row * size + col;
                      const region = puzzle.regions[index];
                      const palette = getRegionColor(region);

                      // Thick edges wherever neighboring cells belong to a
                      // different region — the region outline *is* the board's
                      // structure (plan §3), replacing Sudoku's 3×3 box lines.
                      const differs = (r, c) =>
                        r < 0 ||
                        c < 0 ||
                        r >= size ||
                        c >= size ||
                        puzzle.regions[r * size + c] !== region;

                      return (
                        <View
                          key={col}
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
                          {showSolution && solutionCells.has(index) && (
                            <MaterialCommunityIcons
                              name="mushroom"
                              size={Math.round(cell * 0.62)}
                              color={palette.color}
                            />
                          )}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            )}

            <View style={styles.controls}>
              <Text style={[styles.label, { color: titleColor }]}>Board size</Text>
              <View style={styles.row}>
                {SIZES.map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => setSize(option)}
                    style={[
                      styles.chip,
                      { borderColor: border },
                      option === size && { backgroundColor: titleColor, borderColor: titleColor },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${option} by ${option} board`}
                  >
                    <Text style={[styles.chipText, { color: option === size ? surface : titleColor }]}>
                      {option}×{option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.row}>
                <TouchableOpacity
                  onPress={() => setSeed((s) => s + 1)}
                  style={[styles.wideButton, { borderColor: border }]}
                  accessibilityRole="button"
                  accessibilityLabel="Generate the next puzzle"
                >
                  <MaterialCommunityIcons name="dice-multiple" size={18} color={titleColor} />
                  <Text style={[styles.buttonText, { color: titleColor }]}>Seed {seed}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowSolution((v) => !v)}
                  style={[styles.wideButton, { borderColor: border }]}
                  accessibilityRole="button"
                  accessibilityLabel={showSolution ? 'Hide the solution' : 'Show the solution'}
                >
                  <MaterialCommunityIcons
                    name={showSolution ? 'eye-off' : 'eye'}
                    size={18}
                    color={titleColor}
                  />
                  <Text style={[styles.buttonText, { color: titleColor }]}>
                    {showSolution ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 18, fontWeight: 'bold' },
  caption: { fontSize: 12, opacity: 0.75, marginTop: 4, marginBottom: 12 },
  scrollBody: { alignItems: 'center' },
  board: { alignSelf: 'center' },
  boardRow: { flexDirection: 'row' },
  controls: { width: '100%', marginTop: 16 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'center', marginBottom: 10 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  wideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 4,
    minWidth: 110,
  },
  buttonText: { fontSize: 13, fontWeight: '600', marginLeft: 6 },
  error: { color: '#C1272D', fontSize: 13, textAlign: 'center', padding: 20 },
});

export default FungikuPreview;
