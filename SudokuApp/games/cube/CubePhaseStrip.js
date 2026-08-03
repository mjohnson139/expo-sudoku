import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { announcePhaseSpan, currentSpan, describePhaseSpan } from './solveList';

/**
 * The move groups, and how long each one took (docs/cube-plan.md §8.5, Step 6).
 *
 * `First block · 8` `Second block · 12` — **the counts are half the value of
 * annotating at all**: "first block in 8" against "first block in 12" is exactly
 * what a Roux learner is trying to improve, and they are a subtraction over the
 * markers rather than anything stored.
 *
 * ### Tapping a span plays it
 *
 * The other half. *"Play just the second block"* is a jump to where it starts
 * and the transport it already had, run to where it ends — two calls, not a
 * second loop — and drilling one part of one solve is what the operator has been
 * doing by hand all along.
 *
 * ### Why it scrolls sideways
 *
 * The page does not scroll and must not (plan §2), and a wrapping row of chips
 * would take a second line out of the cube the moment a solve had four groups.
 * This one strip scrolls horizontally instead, which costs a **fixed 24 points**
 * however many phases are marked — measured at 320×568, where the cube goes from
 * 138 points to 114. That is the price of the feature and it is only paid by a
 * solve that has been annotated. It is well clear of the cube's square, so
 * nothing competes with the pan that turns it.
 */
const CubePhaseStrip = ({ spans, index, accent, theme, onPlay }) => {
  const titleColor = theme.colors.title;
  const border = theme.colors.numberPad.border;

  // The group the cube is standing in: the move just played belongs to it.
  const current = currentSpan(spans, index);

  return (
    <ScrollView
      style={styles.strip}
      contentContainerStyle={styles.body}
      horizontal
      showsHorizontalScrollIndicator={false}
      // The chips are the subject here, not a page to be scrolled — so a drag
      // that starts on one still hits it.
      keyboardShouldPersistTaps="handled"
    >
      {spans.map((span, i) => {
        // The boundary written a moment ago, before any moves have gone into
        // it. It is a real span and it is not worth a chip until it has
        // something in it.
        if (span.count === 0 && span.label.length === 0) return null;
        const live = i === current;

        return (
          <TouchableOpacity
            key={span.at}
            // Colour only, never a thicker border: the chips sit in a row that
            // scrolls, and two more points on one of them would shove the rest
            // sideways every time the cube crossed a boundary.
            style={[styles.chip, { borderColor: live ? accent : border }]}
            onPress={() => onPlay(span)}
            accessibilityRole="button"
            accessibilityLabel={`Play ${announcePhaseSpan(span)}`}
            accessibilityHint="Turns the cube to the start of this group and plays it"
            accessibilityState={{ selected: live }}
          >
            <Text
              style={[styles.chipText, { color: live ? accent : titleColor }]}
              numberOfLines={1}
            >
              {describePhaseSpan(span)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  // A fixed height rather than a flexed one: this sits between the solve card
  // and the stage, and the stage is the `flex: 1` that everything else on the
  // page is taken out of. A strip that could grow would take the cube with it.
  strip: {
    alignSelf: 'stretch',
    flexGrow: 0,
    maxHeight: 28,
    marginTop: 4,
  },
  body: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 9,
    marginRight: 5,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default CubePhaseStrip;
