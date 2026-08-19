import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { methodName } from './methods';
import { describeSolveSize, lastTouched } from './solveList';
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
 * ### Rename, duplicate, clear and delete are behind a `⋯`
 *
 * Step 3 shipped them on a **long-press** alone, on the argument that the design
 * draws a clean card and the picker it replaced needed four icons per row. The
 * device pass settled it the other way (operator, 2026-08-17):
 *
 * > *"the long press honestly I'm not even sure what you're talking about"*
 *
 * Which is a better answer than "hard to find": there was nothing on the card
 * giving anyone a **reason to look**. So the menu has a control now — one
 * 32-point target, not four — and the long-press stays as a shortcut for anyone
 * who reaches for it anyway. **Open question 3 is answered, not deferred.**
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
            //
            // **`lastTouched`, not `savedAt`, since Step 4** (operator,
            // 2026-08-18, plan §6 question 8): `savedAt` is when the solve was
            // *started* and nothing bumps it, so a card read "3 days ago" for a
            // solve you had been writing an hour earlier. `savedAt` keeps that
            // meaning — quietly redefining a stored field is not a UI tweak —
            // and `editedAt` joins it, falling back to `savedAt` for every
            // record written before it existed.
            const when = current ? 'in progress' : describeRecency(lastTouched(solve), now);
            const size = describeSolveSize(solve);
            // Null for a Freeform solve **and** for one written before Step 4 —
            // they are the same value, and a card that labelled every legacy
            // record "Freeform" would be making a claim about them nothing here
            // can support (`methods.js`). No method, no segment.
            const method = methodName(solve.method);
            const meta = [size, method, when].filter(Boolean).join(' · ');

            return (
              // A plain View, with the tappable region inside it — **not one
              // Touchable with another nested in it.** In React Native the inner
              // one claims the responder and the outer never fires, but
              // `react-native-web` runs on pointer events that bubble, so a tap
              // on the menu would open the sheet *and* push the solve. Two
              // siblings cannot disagree about that on either platform.
              //
              // Whole styles, never `[base, variant]` with layout in the
              // variant: the flattened result is something Yoga and
              // react-native-web disagree about, and this repo shipped a
              // phone-only header bug on exactly that (`ScreenHeader.js`).
              // Only the colours differ here, and colours are safe to layer.
              <View
                key={solve.id}
                style={[styles.card, { borderColor: current ? accent : border }]}
              >
                <TouchableOpacity
                  style={styles.cardBody}
                  onPress={() => onOpen(solve.id)}
                  // Kept as a shortcut for anyone who already reaches for it,
                  // and no longer the only way in — see `onManage` below.
                  onLongPress={() => onManage(solve.id)}
                  delayLongPress={400}
                  accessibilityRole="button"
                  accessibilityLabel={`${solve.name}, ${meta}`}
                  accessibilityHint="Opens this solve"
                  accessibilityState={{ selected: current }}
                >
                  <View style={styles.cardText}>
                    <Text style={[styles.cardName, { color: titleColor }]} numberOfLines={1}>
                      {solve.name}
                    </Text>
                    {/* The method is the same 11-point line as the rest of the
                        meta, in the accent and a heavier weight — **a coloured
                        span, not a bordered chip.** A chip is 20-odd points tall
                        with its padding, and this line is 14 inside a card whose
                        height is a constant `solveCards.js` derives the list's
                        cap from; a taller card is a change to that file and to
                        how many cards a short phone fits. The colour carries it
                        for nothing.

                        Nested `<Text>` with **only** colour and weight on it: a
                        font size in here would change the line's height on
                        Android, and layout is the thing this file's other
                        comments are careful about. Truncation still belongs to
                        the outer `numberOfLines={1}`, and the screen reader hears
                        the flat `meta` string off the row above. */}
                    <Text style={[styles.cardMeta, { color: titleColor }]} numberOfLines={1}>
                      {size}
                      {method ? ' · ' : ''}
                      {method ? (
                        <Text style={[styles.cardMethod, { color: accent }]}>{method}</Text>
                      ) : null}
                      {when ? ` · ${when}` : ''}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={current ? accent : titleColor}
                    style={styles.chevron}
                  />
                </TouchableOpacity>

                {/* **The long-press was invisible and the operator did not know
                    it was there** (device pass, 2026-08-17: *"the long press
                    honestly I'm not even sure what you're talking about"*).
                    That is not "hard to find", it is "no reason to look" — so
                    the menu gets a control of its own. It is one 32-point target
                    on a card that had room for it, which is the trade the design
                    was protecting the card from: four icons, not one. */}
                <TouchableOpacity
                  style={styles.cardMenu}
                  onPress={() => onManage(solve.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`More for ${solve.name}`}
                  accessibilityHint="Rename, duplicate, clear or delete this solve"
                >
                  <MaterialCommunityIcons
                    name="dots-horizontal"
                    size={20}
                    color={titleColor}
                    style={styles.chevron}
                  />
                </TouchableOpacity>
              </View>
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
  // Everything except the menu button: the text, and the chevron that says this
  // card opens. One target, the width of the card less 32 points, so there is no
  // dead strip between the name and the edge.
  cardBody: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  cardText: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  // 32 points wide and the full height of the card. It sits *outside* the body
  // rather than over it, so the two targets cannot overlap — see the comment
  // where they are rendered.
  cardMenu: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
    width: 32,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
  // No `fontSize` and no `lineHeight`: it inherits the meta line's, so the card
  // is exactly as tall with a method on it as without one.
  cardMethod: {
    fontWeight: '700',
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
