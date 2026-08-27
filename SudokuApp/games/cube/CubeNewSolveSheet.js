import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FREEFORM_BLURB, FREEFORM_NAME } from './methods';
import { methodsForNewSolves } from './userMethods';

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
 * them: tap a method and that choice creates and opens the solve immediately.
 *
 * ### Presets, user methods, and Freeform
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
 * ### The whole choice is one row
 *
 * The stage names are summarized on the row, so method names stay readable and
 * there is no selection state, second summary, or confirm action below the list.
 *
 * ### Nothing here decides anything
 *
 * A tapped row reports a method id (or null) and lets `CubeHome` create and push. The
 * rules — what a new solve is called, what it is created with — belong to
 * `solveList.js` and `CubeContext`, which is the division every other modal on
 * this screen already keeps.
 */
const CubeNewSolveSheet = ({ visible, theme, accent, methods, onStart, onClose }) => {
  const availableMethods = methodsForNewSolves(methods);

  const titleColor = theme.colors.title;
  const surface = theme.colors.numberPad.background;
  const border = theme.colors.numberPad.border;

  /** One method starts one solve. `null` is Freeform, not a missing selection. */
  const choice = (id, name, methodStages = []) => {
    const summary = methodStages.length > 0
      ? `${methodStages.length} stages · ${methodStages.join(' · ')}`
      : FREEFORM_BLURB;
    return (
      <TouchableOpacity
        key={id || 'freeform'}
        style={[styles.choice, { borderColor: border }]}
        onPress={() => onStart(id)}
        accessibilityRole="button"
        accessibilityLabel={name}
        accessibilityHint={
          id
            ? `Starts this solve with the ${name} stages`
            : 'Starts this solve with no stages, naming the groups yourself'
        }
      >
        <View style={styles.choiceCopy}>
          <Text style={[styles.choiceText, { color: titleColor }]}> 
            {name}
          </Text>
          <Text style={[styles.choiceSummary, { color: titleColor }]} numberOfLines={1}>
            {summary}
          </Text>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={21}
          color={accent}
        />
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

          <ScrollView
            style={styles.choices}
            contentContainerStyle={styles.choicesBody}
            showsVerticalScrollIndicator={false}
          >
            {availableMethods.map((method) => choice(method.id, method.name, method.stages))}
            {choice(null, FREEFORM_NAME)}
          </ScrollView>

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
    maxHeight: 360,
  },
  choicesBody: {
    gap: 5,
  },
  // A vertical list keeps every method name readable and stays usable as user
  // methods join the three presets. The bounded scroll keeps the Start action
  // reachable on short phones.
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 11,
    minHeight: 48,
  },
  choiceCopy: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  choiceText: {
    fontSize: 14,
    fontWeight: '700',
  },
  choiceSummary: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 2,
  },
});

export default CubeNewSolveSheet;
