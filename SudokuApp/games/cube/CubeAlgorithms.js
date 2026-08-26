import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ScreenHeader';
import useAppTheme from '../../hooks/useAppTheme';
import CubeCasePreview from './CubeCasePreview';
import { describeCase } from './algCase';
import { ALG_FONT } from './algText';
import {
  MAX_ALGORITHMS,
  algorithmCase,
  algorithmStartingCube,
  algorithmFilters,
  describeAssignment,
  filterAlgorithms,
  liveFilter,
  searchAlgorithms,
} from './algorithms';
import { CUBE_ACCENT, headerAction, styles as chrome } from './cubeChrome';
import { ENTRY_ROUTE, WORKBENCH_ROUTE, useCube } from './CubeContext';

/** A legible three-face starting cube. Device evidence on PR #133 showed the
 * flat U tile losing the side stickers that distinguish real cases. */
const CASE_PREVIEW = 56;

/**
 * The algorithm library — the list (docs/cube-methods-plan.md §3.1, Step 1).
 *
 * ### What it is for
 *
 * Until this step an algorithm existed only as moves inside a solve. This is the
 * screen that makes one a *thing*: named, findable, and assigned to the stages
 * it belongs to. Entries are written by hand here; Steps 2 and 3 are what make
 * writing one by hand the unusual case.
 *
 * ### It reads the library from the context, never from a copy
 *
 * **A screen under a push stays mounted** (plan §5) — this one sits under the
 * entry screen for as long as an entry is open, so anything it worked out once
 * at mount would be stale the moment that entry was renamed. The list, the
 * chips and the counts are all derived on every render from `CubeContext`.
 *
 * ### The page does not scroll; the cards do
 *
 * There is no cube on this screen, so there is no pan to lose (the race
 * `CubeHome` describes). The reason the header, the search field and the chips
 * are pinned anyway is plainer: they are how you get *out* of a filter, and a
 * filter that shows nothing would scroll them off the top and leave the operator
 * looking at an empty screen with no control on it.
 *
 * ### Why the chips are not just "one per method"
 *
 * `algorithmFilters` offers a chip only when it leads somewhere, and puts the
 * count on it. A `CFOP` chip over a library with no CFOP algorithms is a control
 * whose only outcome is an empty list, and the operator has to tap it to find
 * that out. Deriving the chips is also what lets `liveFilter` catch the case the
 * screen cannot: unassign the last Roux entry while the Roux chip is selected,
 * and the chip is gone — so the filter falls back to `All` rather than leaving
 * the library looking empty with no way out.
 */
const CubeAlgorithms = ({ navigation }) => {
  const { theme } = useAppTheme();
  const { algorithms, methods } = useCube();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(null);

  const titleColor = theme.colors.title;
  const border = theme.colors.numberPad.border;
  const surface = theme.colors.numberPad.background;

  const chips = useMemo(() => algorithmFilters(algorithms, methods), [algorithms, methods]);
  // The chip the screen is holding may have stopped existing under it.
  const active = liveFilter(chips, filter);

  const shown = useMemo(
    () => searchAlgorithms(filterAlgorithms(algorithms, active), query),
    [algorithms, active, query]
  );

  const full = algorithms.length >= MAX_ALGORITHMS;

  const openEntry = useCallback(
    (id) => navigation.navigate(ENTRY_ROUTE, { id }),
    [navigation]
  );

  /** `＋` opens the cube-first workbench. Pasting notation remains available
   *  from an entry, but is no longer the library's primary door. */
  const addEntry = useCallback(
    () => navigation.navigate(WORKBENCH_ROUTE, { id: null }),
    [navigation]
  );

  const headerActions = headerAction({
    name: 'plus',
    label: full ? `Library full, ${MAX_ALGORITHMS} algorithms` : 'Write a new algorithm',
    hint: full
      ? 'Delete an algorithm before writing another'
      : 'Opens a solved cube where turns write the algorithm',
    onPress: full ? undefined : addEntry,
    color: full ? border : titleColor,
    border,
  });

  return (
    <View style={[chrome.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader
        title="Algorithms"
        theme={theme}
        onHomePress={navigation.goBack}
        homeIcon="chevron-left"
        homeLabel="Back to the scramble"
        homeHint="Leaves the library and shows the scramble again"
        dense
        actions={headerActions}
      />

      {/* Searches the name **and** the moves, which is the half a name cannot
          cover: the entry you are looking for is often the one you can only
          remember the first three tokens of. */}
      <View style={[styles.search, { borderColor: border, backgroundColor: surface }]}>
        <MaterialCommunityIcons name="magnify" size={16} color={titleColor} style={styles.searchIcon} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search moves or name"
          placeholderTextColor={border}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          returnKeyType="search"
          style={[styles.searchInput, { color: titleColor }]}
          accessibilityLabel="Search the library"
          accessibilityHint="Matches an algorithm’s name or its moves"
        />
        {query.length > 0 && (
          <TouchableOpacity
            style={styles.searchClear}
            onPress={() => setQuery('')}
            accessibilityRole="button"
            accessibilityLabel="Clear the search"
          >
            <MaterialCommunityIcons name="close-circle" size={16} color={titleColor} />
          </TouchableOpacity>
        )}
      </View>

      {/* A horizontal scroll rather than a wrap: the chips grow with the number
          of methods (Step 5 adds the operator's own), and a wrapping row would
          change the screen's height as they arrived. */}
      {algorithms.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chips}
          contentContainerStyle={styles.chipsBody}
          accessibilityRole="radiogroup"
        >
          {chips.map((chip) => {
            const current = chip.id === active;
            return (
              <TouchableOpacity
                key={chip.id || 'all'}
                // Colour only, and a border that is 2 either way: a border that
                // changed width would shove every chip to its right along as the
                // thumb moved between them (`solveCards.js` makes the same call
                // about the solve cards).
                style={[styles.chip, { borderColor: current ? CUBE_ACCENT : border }]}
                onPress={() => setFilter(chip.id)}
                accessibilityRole="radio"
                accessibilityLabel={`${chip.label}, ${chip.count}`}
                accessibilityState={{ selected: current, checked: current }}
              >
                <Text
                  style={[styles.chipText, { color: current ? CUBE_ACCENT : titleColor }]}
                  numberOfLines={1}
                >
                  {chip.label} · {chip.count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {shown.length === 0 ? (
        // Three different silences, said differently. "Nothing here" and "nothing
        // matches" look the same on screen and mean opposite things about what to
        // do next.
        <Text style={[styles.empty, { color: titleColor }]}>
          {algorithms.length === 0
            ? 'No algorithms yet. Tap ＋ to write one.'
            : 'Nothing matches.'}
        </Text>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listBody}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {shown.map((entry) => {
            const tags = entry.assignments.map(describeAssignment).filter(Boolean);
            // The preview itself is silent and the case is said
            // here instead, in the row's own label — one stop on the screen
            // reader rather than two, and never a colour on its own.
            const pattern = algorithmCase(entry);
            const startingCube = algorithmStartingCube(entry);
            const said = [
              entry.name,
              entry.moves,
              describeCase(pattern),
              tags.join(', '),
              entry.notes ? 'has notes' : '',
            ]
              .filter(Boolean)
              .join(', ');

            return (
              <TouchableOpacity
                key={entry.id}
                style={[styles.card, { borderColor: border }]}
                onPress={() => openEntry(entry.id)}
                accessibilityRole="button"
                accessibilityLabel={said}
                accessibilityHint="Opens this algorithm"
              >
                {/* The real authored or inverse-derived starting cube. */}
                <CubeCasePreview cube={startingCube} size={CASE_PREVIEW} />

                <View style={styles.cardText}>
                  <View style={styles.cardTitle}>
                    <Text style={[styles.cardName, { color: titleColor }]} numberOfLines={1}>
                      {entry.name}
                    </Text>
                    {/* The **presence** of notes, never the notes themselves —
                        they are finger tricks and personal cues, and a list is
                        not where you read them. */}
                    {entry.notes.length > 0 && (
                      <Text style={[styles.cardPencil, { color: titleColor }]}>✎</Text>
                    )}
                  </View>

                  {/* Monospaced, for the reason `algText.js` gives: it is the
                      apostrophes a hurried eye drops. */}
                  <Text style={[styles.cardMoves, { color: titleColor }]} numberOfLines={1}>
                    {entry.moves}
                  </Text>

                  {/* A bullet between the tags and a middot inside each one, so
                      `Roux · LSE • CFOP · PLL` reads as two assignments rather
                      than as four words. One line that ellipsizes rather than a
                      wrapping row of pills: twelve assignments are allowed, and a
                      card whose height depends on how many an entry has would make
                      the list jump as they were added. */}
                  {tags.length > 0 && (
                    <Text
                      style={[styles.cardTags, { color: CUBE_ACCENT }]}
                      numberOfLines={1}
                    >
                      {tags.join('  •  ')}
                    </Text>
                  )}
                </View>

                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={titleColor}
                  style={styles.chevron}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  search: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  searchIcon: {
    opacity: 0.7,
    marginRight: 6,
  },
  searchInput: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    fontSize: 14,
    // No vertical padding: the row's height is fixed above, and a TextInput that
    // sizes itself would make it two points taller on Android than on iOS.
    paddingVertical: 0,
  },
  searchClear: {
    paddingLeft: 6,
    opacity: 0.7,
  },
  chips: {
    alignSelf: 'stretch',
    flexGrow: 0,
    flexShrink: 0,
    marginTop: 8,
  },
  chipsBody: {
    alignItems: 'center',
    gap: 6,
    paddingRight: 6,
  },
  chip: {
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  empty: {
    fontSize: 13,
    opacity: 0.7,
    textAlign: 'center',
    paddingTop: 28,
  },
  list: {
    alignSelf: 'stretch',
    flexGrow: 1,
    flexShrink: 1,
    marginTop: 8,
  },
  listBody: {
    paddingBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  cardText: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    marginLeft: 10,
  },
  cardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardName: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  cardPencil: {
    fontSize: 12,
    marginLeft: 5,
    opacity: 0.6,
  },
  cardMoves: {
    fontFamily: ALG_FONT,
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.75,
  },
  cardTags: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  chevron: {
    marginLeft: 4,
    opacity: 0.8,
  },
});

export default CubeAlgorithms;
