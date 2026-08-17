import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { describeSolveSize } from './solveList';
import { describeRecency } from './recency';
import {
  ACTION_HEIGHT,
  CARD_BORDER,
  CARD_GAP,
  CARD_HEIGHT,
  listMaxHeight,
  orderCards,
} from './solveCards';

/**
 * The solves written against the scramble on the cube — on the screen that owns
 * them (docs/cube-flow-plan.md §3.3, Step 3).
 *
 * ### This is the epic's thesis, made visible
 *
 * One scramble, several attempts, is the structure a drilling session actually
 * has, and until this step it was a **modal behind a caption under a pad on the
 * other screen**. The list is the bottom of the scramble screen now, and the row
 * it replaced — Solve · New · Save — is gone: Solve was "resume whichever page
 * you were last on", which is a guess the list does not have to make, and New
 * and Save moved to the header.
 *
 * ### The list scrolls; the page does not
 *
 * The cube claims every pan inside its square, so a `ScrollView` around the
 * *page* is the race Fungiku already lost (docs/fungiku-plan.md §2). The scroll
 * is therefore inside this component and nowhere near the cube — and it is
 * **capped rather than flexible** (`listMaxHeight`), because the stage takes
 * what is left and a list that grew with the number of solves would resize the
 * cube every time one was written.
 *
 * ### The two actions are pinned under the scroll, not in it
 *
 * The design draws `+ New solve` as the last card. It is the same thing one card
 * lower here: a card at the bottom of a list that scrolls is a card you cannot
 * see once you have three attempts, and starting the fourth is the single most
 * likely reason to be looking at this list at all. Compare joins it once there
 * are two attempts to compare — below that the table is a row of numbers with
 * nothing beside it, which is exactly the rule `CubeSolvesModal` already applied
 * to its own toggle.
 *
 * ### Rename, duplicate, clear and delete are a long-press
 *
 * The design's card is clean and has no room for five icons, so the management
 * actions live on a **long-press** (plan §3.3). That is invisible, which is the
 * standard objection and is open question 3 — it ships to be tried, not because
 * the question is closed.
 */
const CubeSolveList = ({
  solves,
  openId,
  now,
  windowHeight,
  theme,
  accent,
  onOpen,
  onNew,
  onManage,
  onCompare,
}) => {
  const titleColor = theme.colors.title;
  const border = theme.colors.numberPad.border;

  const cards = orderCards(solves, openId);
  const canCompare = solves.length > 1;

  return (
    <View style={styles.block}>
      {cards.length === 0 ? (
        <Text style={[styles.empty, { color: titleColor }]}>
          Nothing written for this scramble yet.
        </Text>
      ) : (
        <ScrollView
          style={[styles.scroll, { maxHeight: listMaxHeight(windowHeight) }]}
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
        >
          {cards.map((solve) => {
            const current = solve.id === openId;
            // The clause that says *when*, except on the card that is on the
            // cube — for that one the answer to "when" is "now", and what the
            // operator wants to know is that this is the page they are on.
            const when = current ? 'in progress' : describeRecency(solve.savedAt, now);
            const size = describeSolveSize(solve);
            const meta = when ? `${size} · ${when}` : size;

            return (
              <TouchableOpacity
                key={solve.id}
                // Whole styles, never `[base, variant]` with layout in the
                // variant: the flattened result is something Yoga and
                // react-native-web disagree about, and this repo shipped a
                // phone-only header bug on exactly that (`ScreenHeader.js`).
                // Only the colours differ between these two, and colours are
                // safe to layer.
                style={[styles.card, { borderColor: current ? accent : border }]}
                onPress={() => onOpen(solve.id)}
                onLongPress={() => onManage(solve.id)}
                delayLongPress={400}
                accessibilityRole="button"
                accessibilityLabel={`${solve.name}, ${meta}`}
                accessibilityHint="Opens this solve. Press and hold to rename, duplicate, clear or delete it"
                accessibilityState={{ selected: current }}
              >
                <View style={styles.cardBody}>
                  <Text style={[styles.cardName, { color: titleColor }]} numberOfLines={1}>
                    {solve.name}
                  </Text>
                  <Text style={[styles.cardMeta, { color: titleColor }]} numberOfLines={1}>
                    {meta}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={current ? accent : titleColor}
                  style={styles.chevron}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.newAction, { borderColor: accent }]}
          onPress={onNew}
          accessibilityRole="button"
          accessibilityLabel="Start a new solve"
          accessibilityHint="Opens a fresh page for this scramble, starting with the hold"
        >
          <MaterialCommunityIcons name="plus" size={16} color={accent} />
          <Text style={[styles.actionText, { color: accent }]}>New solve</Text>
        </TouchableOpacity>

        {canCompare && (
          <TouchableOpacity
            style={[styles.compareAction, { borderColor: border }]}
            onPress={onCompare}
            accessibilityRole="button"
            accessibilityLabel={`Compare the ${solves.length} attempts`}
            accessibilityHint="Shows each solve’s phase counts side by side"
          >
            <MaterialCommunityIcons name="table-large" size={16} color={titleColor} />
            <Text style={[styles.actionText, { color: titleColor }]}>Compare</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  block: {
    alignSelf: 'stretch',
    marginTop: CARD_GAP,
  },
  // Only present with nothing in the list, so the row it costs is a row nobody
  // with solves ever pays for.
  empty: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
    paddingVertical: 8,
  },
  scroll: {
    alignSelf: 'stretch',
  },
  scrollBody: {
    // The cap is a whole number of `CARD_HEIGHT + CARD_GAP`, so nothing extra
    // may be added here or the last visible card is clipped.
    paddingBottom: 0,
  },
  // Built from `solveCards.js`'s numbers rather than beside them: the cap that
  // decides how many of these fit is computed from the same constants, and two
  // sets of numbers is a list that shows two cards and a sliver.
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    height: CARD_HEIGHT,
    borderWidth: CARD_BORDER,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: CARD_GAP,
  },
  cardBody: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  cardName: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
  },
  cardMeta: {
    fontSize: 11,
    lineHeight: 14,
    opacity: 0.65,
  },
  chevron: {
    marginLeft: 4,
    opacity: 0.8,
  },
  actions: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: 6,
  },
  // Dashed, as the design draws it: this is the card that is not a solve yet.
  newAction: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: ACTION_HEIGHT,
    borderWidth: CARD_BORDER,
    borderStyle: 'dashed',
    borderRadius: 10,
  },
  // Solid, and narrower: it is a way of looking at what is already there rather
  // than a way of adding to it, so it does not wear the same outline.
  compareAction: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: ACTION_HEIGHT,
    paddingHorizontal: 12,
    borderWidth: CARD_BORDER,
    borderRadius: 10,
  },
  actionText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
    marginLeft: 5,
  },
});

export default CubeSolveList;
