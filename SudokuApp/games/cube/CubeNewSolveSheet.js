import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FREEFORM_BLURB, FREEFORM_NAME, defaultMethod, stagesOf } from './methods';

/**
 * Which method is this attempt (docs/cube-flow-plan.md §3.4, Step 4).
 *
 * ### It exists because Step 5 needs the answer before the first move
 *
 * Until now a solve began the instant `+ New solve` was tapped: `startNewSolve`
 * then a push, and the first thing on the screen was the hold. That is one tap
 * fewer and it stops working at the next step — the phase rail is **pre-built
 * from the method's stages**, so a solve that acquired a method half way through
 * would be a rail that appeared over markers written without it. The question
 * has to be asked while the answer is still free, which is before the page
 * exists.
 *
 * So this sits between the card and the push, and it is the only thing between
 * them: pick, see what you picked commits you to, start.
 *
 * ### Three choices, and the third one stores nothing
 *
 * Roux, CFOP, **Freeform** — and Freeform stores `method: null`, which is the
 * same value every solve written before this step carries (`methods.js`). That
 * is what makes it nearly free: the null branch has to exist regardless, because
 * Step 5 keeps `CubePhaseStrip` alive for the solves already in the operator's
 * file, and a scratch attempt is simply a new solve that lands on it.
 *
 * **Open question 1, answered by the operator (2026-08-18):** the rail wants a
 * "no method" option. The alternative was Roux or CFOP only, which would have
 * made `null` a value with no way to reach it and forced a scratch attempt to
 * lie about what it was.
 *
 * ### The stages are shown, not summarised
 *
 * The numbered list under the pick is the point of the sheet being a sheet
 * rather than a two-button prompt. It is what the rail will be, in order, before
 * anything is committed to — so "CFOP" is a word with four steps under it rather
 * than a word you have to already know. Freeform gets a sentence in the same
 * slot instead of an empty box, because "nothing here" and "not loaded" look the
 * same otherwise.
 *
 * ### Nothing here decides anything
 *
 * It reports a method id (or null) and lets `CubeHome` create and push. The
 * rules — what a new solve is called, what it is created with — belong to
 * `solveList.js` and `CubeContext`, which is the division every other modal on
 * this screen already keeps.
 */
const CubeNewSolveSheet = ({ visible, theme, accent, methods, mySolves, onStart, onClose }) => {
  /**
   * The pick, reset every time the sheet opens.
   *
   * `defaultMethod` is derived from the solves for this scramble and stored
   * nowhere — "what you were doing here a minute ago", without any of it being
   * remembered. Reset on `visible` rather than on mount because this component
   * is never unmounted: `CubeHome` renders it permanently and the `Modal`'s own
   * `visible` is what comes and goes, which is the same shape `CubePhaseModal`
   * has and the reason it clears its field the same way.
   */
  const [picked, setPicked] = useState(null);
  useEffect(() => {
    if (visible) setPicked(defaultMethod(mySolves, methods));
    // `mySolves` deliberately out of the deps: the default is decided as the
    // sheet opens, and a solve arriving underneath it must not move the
    // operator's pick while they are looking at it.
  }, [visible]);

  const titleColor = theme.colors.title;
  const surface = theme.colors.numberPad.background;
  const border = theme.colors.numberPad.border;

  const stages = stagesOf(picked, methods);

  /** One method to choose. `id` is null for Freeform, which is a real answer and
   *  not the absence of one — so it is a row like the others. */
  const choice = (id, name) => {
    const current = picked === id;
    return (
      <TouchableOpacity
        key={id || 'freeform'}
        style={[styles.choice, { borderColor: current ? accent : border }]}
        onPress={() => setPicked(id)}
        accessibilityRole="radio"
        accessibilityLabel={name}
        accessibilityHint={
          id
            ? `Starts this solve with the ${name} stages`
            : 'Starts this solve with no stages, naming the groups yourself'
        }
        accessibilityState={{ selected: current, checked: current }}
      >
        <Text style={[styles.choiceText, { color: current ? accent : titleColor }]}>
          {name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.box, { backgroundColor: surface, borderColor: border }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <MaterialCommunityIcons name="close" size={22} color={titleColor} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: titleColor }]}>New solve</Text>
          <Text style={[styles.subtitle, { color: titleColor }]}>
            Which method are you drilling?
          </Text>

          <View style={styles.choices} accessibilityRole="radiogroup">
            {methods.map((method) => choice(method.id, method.name))}
            {choice(null, FREEFORM_NAME)}
          </View>

          {/* Fixed height, so picking a four-stage method and then Freeform does
              not resize the sheet under the thumb that is about to press Start
              solve. Four stages is every shipped method, and the scroll is what
              catches a fifth if one is ever added. */}
          <ScrollView
            style={styles.stages}
            contentContainerStyle={styles.stagesBody}
            showsVerticalScrollIndicator={false}
          >
            {stages.length > 0 ? (
              stages.map((stage, i) => (
                <View key={stage} style={styles.stageRow}>
                  <Text style={[styles.stageNumber, { color: accent }]}>{i + 1}</Text>
                  <Text style={[styles.stageText, { color: titleColor }]} numberOfLines={1}>
                    {stage}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.blurb, { color: titleColor }]}>{FREEFORM_BLURB}</Text>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.start, { backgroundColor: accent }]}
            onPress={() => onStart(picked)}
            accessibilityRole="button"
            accessibilityLabel="Start solve"
            accessibilityHint="Opens a fresh page for this scramble, starting with the hold"
          >
            <MaterialCommunityIcons name="play" size={18} color="#ffffff" />
            <Text style={styles.startText}>Start solve</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    width: 300,
    maxWidth: '92%',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 22,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 5,
    zIndex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 12,
  },
  choices: {
    flexDirection: 'row',
    gap: 6,
  },
  // Even thirds, so the three read as one control rather than as three buttons
  // that happen to be adjacent.
  // The pick is carried by **colour alone**: the border is 2 on all three
  // whether picked or not, for the reason `solveCards.js` gives about the card —
  // a border that changes width moves everything beside it, and here that would
  // be the other two choices twitching as the thumb moved between them.
  choice: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 10,
    paddingVertical: 9,
  },
  choiceText: {
    fontSize: 14,
    fontWeight: '700',
  },
  stages: {
    height: 108,
    marginTop: 12,
  },
  stagesBody: {
    paddingVertical: 2,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  stageNumber: {
    fontSize: 12,
    fontWeight: '700',
    width: 18,
  },
  stageText: {
    fontSize: 14,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  blurb: {
    fontSize: 13,
    opacity: 0.7,
    lineHeight: 19,
    paddingVertical: 4,
  },
  start: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 4,
  },
  startText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
});

export default CubeNewSolveSheet;
