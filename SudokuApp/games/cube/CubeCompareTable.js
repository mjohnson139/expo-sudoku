import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { NAME_WIDTH, ROW_RULE, cellWidth, tableScrolls } from './compareLayout';
import { accentInk } from './padPalette';
import { announceCompareCell, comparePhases } from './solveList';
import { useMethods } from './CubeContext';

/**
 * The attempts at one scramble, side by side (docs/cube-plan.md §8.10, Step 9).
 *
 * A solve screen can say `First block · 8` and cannot say whether that is better
 * than last time. This is the other half: one row per attempt, one column per
 * phase, and **the improvement reads down a column** — 8, 7, 6 — which is the
 * shape of the question the operator is actually asking (*"am I getting better
 * at this scramble?"*).
 *
 * ### It computes nothing
 *
 * Every number here comes from `comparePhases`, which is `phaseSpans` arranged.
 * Two implementations of "how long is the first block" is how a comparison ends
 * up disagreeing with the screen it is comparing (plan §8.5's rule, applied one
 * screen further along).
 *
 * ### Columns are names, not positions
 *
 * Solve 1's second group and Solve 3's second group line up only if they are
 * both `Second block`. A solve annotated with CFOP next to one annotated with
 * Roux therefore gets its own columns and leaves the other's empty, which is the
 * truth: `Cross` is not `First block` and no arrangement makes it one.
 *
 * ### Why it is in the solves list
 *
 * §8.6's budget rule: the cube is sized first and every other row is justified
 * against it. A comparison is another row on a page that has already spent 71
 * points of cube on the designed pad — so it goes where the per-scramble list of
 * solves already is, behind a toggle, and **costs the solve screen nothing.**
 */
const CubeCompareTable = ({ solves, currentId, theme, accent }) => {
  const methods = useMethods();
  const titleColor = theme.colors.title;
  const border = theme.colors.numberPad.border;
  // The accent is a *fill* everywhere else on this screen — the flag key, the
  // New solve button — and here it is a number, a 2pt bar and a 3pt rule, all
  // of them drawn *on* the theme's surface. That is a different contrast
  // problem and `#c62828` loses it: 1.63 on twilight. Everything the accent
  // draws in this table is the lifted one (see `accentInk`); a bar nobody can
  // see is not a marker.
  const ink = accentInk(theme, accent);

  const { labels, rows } = comparePhases(solves, methods);
  const marked = rows.filter((row) => row.annotated);
  const bare = rows.filter((row) => !row.annotated);

  // Measured rather than assumed: the modal is 340 wide or 94% of the screen,
  // whichever is smaller, and which of those it is decides whether four columns
  // fit or have to be swiped for.
  const [width, setWidth] = useState(0);
  const cell = cellWidth(width, labels.length);
  const scrolls = tableScrolls(width, labels.length);

  return (
    <View style={styles.wrap} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {labels.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.grid}
        >
          <View>
            <View style={[styles.headRow, styles.headRowIndent, { borderColor: border }]}>
              <View style={styles.nameCell} />
              {labels.map((label) => (
                <Text
                  key={label}
                  style={[styles.headText, { color: titleColor, width: cell }]}
                  numberOfLines={2}
                >
                  {label}
                </Text>
              ))}
            </View>

            {marked.map((row) => (
              <View
                key={row.id}
                style={[
                  styles.row,
                  { borderColor: border },
                  // The solve on the cube, marked with a rule rather than with
                  // words: `36 moves · on the cube` does not fit 96 points at
                  // 9pt and clips to `on the c…`, which says nothing.
                  { borderLeftColor: row.id === currentId ? ink : 'transparent' },
                ]}
                accessibilityRole="text"
                accessibilityLabel={
                  row.id === currentId ? `${row.name}, on the cube` : row.name
                }
                accessibilityState={{ selected: row.id === currentId }}
              >
                <View style={styles.nameCell}>
                  <Text style={[styles.name, { color: titleColor }]} numberOfLines={1}>
                    {row.name}
                  </Text>
                  <Text style={[styles.meta, { color: titleColor }]} numberOfLines={1}>
                    {row.total} moves
                  </Text>
                </View>

                {labels.map((label, i) => {
                  const cellValue = row.cells[i];

                  return (
                    <View
                      key={label}
                      style={[styles.cell, { width: cell }]}
                      accessibilityLabel={announceCompareCell(row.name, label, cellValue)}
                    >
                      <Text
                        style={[
                          styles.count,
                          { color: cellValue && cellValue.best ? ink : titleColor },
                          !cellValue && styles.countOff,
                          cellValue && cellValue.best && styles.countBest,
                        ]}
                      >
                        {/* An em dash rather than a zero: this solve did not
                            mark the phase, which is a different thing from
                            solving it in no moves. */}
                        {cellValue ? cellValue.count : '—'}
                      </Text>
                      {/* Two goes at the same phase is still that phase's move
                          count, and the row should say it was two rather than
                          reading like one long group. */}
                      {cellValue && cellValue.groups > 1 && (
                        <Text style={[styles.groups, { color: titleColor }]}>
                          {cellValue.groups} groups
                        </Text>
                      )}
                      {/* The best marker is a bar and a colour, never a tinted
                          background: Step 8 measured what tints do to four
                          adjacent cells on a dark theme (ΔE 0.9–2.6) and this
                          would be the same mistake one screen along. */}
                      <View
                        style={[
                          styles.bestBar,
                          {
                            backgroundColor:
                              cellValue && cellValue.best ? ink : 'transparent',
                          },
                        ]}
                      />
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {labels.length > 0 && (
        <View style={styles.legend}>
          <View style={[styles.bestBar, styles.legendBar, { backgroundColor: ink }]} />
          <Text style={[styles.legendText, { color: titleColor }]}>
            fewest moves — marked only where two or more attempts have the phase
            {/* A column past the right edge is invisible, and a swipe nobody
                knows to make is the same as a column that is not there. */}
            {scrolls ? ` · swipe the table for ${labels.length} phases` : ''}
          </Text>
        </View>
      )}

      {/* A solve with no markers has nothing to line up, and saying so plainly is
          the whole of it: writing a solve without annotating it is a legitimate
          thing to have done and it is not a worse attempt. */}
      {bare.length > 0 && (
        <Text style={[styles.note, { color: titleColor }]}>
          {labels.length === 0
            ? 'No groups named yet, so there is nothing to line up. Tap the flag while writing to close a group and name it.'
            : `No groups named: ${bare.map((row) => row.name).join(', ')}.`}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
  },
  grid: {
    paddingBottom: 2,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    paddingBottom: 4,
  },
  // Every row carries the accent rule, transparent on all but the open solve,
  // so marking one does not shove its columns three points out of line with the
  // rest of the table.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderLeftWidth: ROW_RULE,
    paddingVertical: 6,
  },
  headRowIndent: {
    paddingLeft: ROW_RULE,
  },
  nameCell: {
    width: NAME_WIDTH,
    paddingRight: 6,
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
  },
  meta: {
    fontSize: 9,
    opacity: 0.6,
    marginTop: 1,
  },
  headText: {
    fontSize: 10,
    fontWeight: '700',
    opacity: 0.7,
    textAlign: 'center',
  },
  cell: {
    alignItems: 'center',
  },
  count: {
    fontSize: 15,
    fontWeight: '600',
  },
  countBest: {
    fontWeight: '800',
  },
  countOff: {
    opacity: 0.3,
  },
  groups: {
    fontSize: 8,
    opacity: 0.55,
  },
  bestBar: {
    height: 2,
    width: 16,
    borderRadius: 1,
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  legendBar: {
    marginTop: 0,
    marginRight: 6,
  },
  legendText: {
    flex: 1,
    fontSize: 10,
    opacity: 0.6,
  },
  note: {
    fontSize: 11,
    opacity: 0.7,
    marginTop: 8,
    lineHeight: 15,
  },
});

export default CubeCompareTable;
