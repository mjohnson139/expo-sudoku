import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { METHODS } from './methods';
import { MAX_SOLVE_NAME, describePhaseSpan, normalizeName } from './solveList';

const ICON_SIZE = 20;

/**
 * Naming a group of moves (docs/cube-plan.md §8.5, Step 6).
 *
 * *"These moves solve first block. This set solves second block."* The whole
 * modal is that sentence: it opens on the moves written since the last marker,
 * and a tap on a name closes them.
 *
 * ### A chip is the action, not a selection
 *
 * **One tap on the name beats typing it on a phone** (plan §8.5), and the names
 * are the point — this is the operator's own method talking back to them. So the
 * eight chips submit and dismiss; there is no chip-then-Save. The field below
 * them is the escape hatch for a method this app has never heard of, and it is
 * where the second tap is spent rather than on the common case.
 *
 * ### Naming a group that is already closed renames it
 *
 * A mis-tapped name has to be fixable, and the fix is the same control: with a
 * boundary already where the cube is, there is nothing new to close and the only
 * thing a name can mean is the group behind it. So the modal says which of the
 * two it is about to do — the operator should never have to infer that from
 * where the transport happens to be sitting.
 *
 * ### It is also the list
 *
 * The markers already written are listed underneath with a bin each, because
 * removing a boundary is the other half of getting an annotation wrong.
 * Deleting one merges the two groups either side of it, which is what removing a
 * boundary means.
 *
 * Purely presentational: what a name *does* to the list is `endPhase`, and it is
 * pure and tested next to the rest of the shape rules.
 */
const CubePhaseModal = ({
  visible,
  theme,
  accent,
  at,
  openCount,
  renaming,
  spans,
  onEnd,
  onRemove,
  onClose,
}) => {
  const [text, setText] = useState('');

  // Opening always starts on an empty field. Unlike a rename, there is nothing
  // being corrected here — the last name typed is not a draft of this one.
  useEffect(() => {
    if (visible) setText('');
  }, [visible]);

  const titleColor = theme.colors.title;
  const surface = theme.colors.numberPad.background;
  const border = theme.colors.numberPad.border;

  // A group with no moves in it — the very start of a solve — has nothing to
  // name. The chips go quiet rather than the modal refusing to open, because the
  // list below them is still worth reaching.
  const canEnd = openCount > 0;
  const typed = normalizeName(text);
  const ready = canEnd && typed.length > 0;

  const end = (label) => {
    if (!canEnd) return;
    onEnd(label);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.box, { backgroundColor: surface, borderColor: border }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close phases"
          >
            <MaterialCommunityIcons name="close" size={22} color={titleColor} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: titleColor }]}>
            {renaming ? 'Rename the phase' : 'End the phase'}
          </Text>
          <Text
            style={[styles.subtitle, { color: titleColor }]}
            accessibilityLabel={
              canEnd
                ? `${renaming ? 'Renaming' : 'Ending'} the group of ${openCount} move${
                    openCount === 1 ? '' : 's'
                  } up to move ${at}`
                : 'No moves to name'
            }
          >
            {canEnd
              ? `${openCount} move${openCount === 1 ? '' : 's'}, up to move ${at}`
              : 'No moves to name'}
          </Text>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollBody}>
            {/* The vocabulary is `methods.js`'s now — Step 4 promoted this file's
                old `PHASE_METHODS` into `{ id, name, stages }` so that a solve
                could *store* which method it is. The chips are the same strings
                they always were, which is what keeps every marker already in a
                save file resolvable (`methods.test.js`). */}
            {METHODS.map((method) => (
              <View key={method.id}>
                <Text style={[styles.method, { color: titleColor }]}>{method.name}</Text>
                <View style={styles.chips}>
                  {method.stages.map((label) => (
                    <TouchableOpacity
                      key={label}
                      style={[
                        styles.chip,
                        { borderColor: canEnd ? accent : border },
                        !canEnd && styles.disabled,
                      ]}
                      onPress={() => end(label)}
                      disabled={!canEnd}
                      accessibilityRole="button"
                      accessibilityLabel={`${label}, ${openCount} move${
                        openCount === 1 ? '' : 's'
                      }`}
                      accessibilityHint={
                        renaming
                          ? 'Renames the group of moves up to here'
                          : 'Names this group of moves and starts the next one'
                      }
                      accessibilityState={{ disabled: !canEnd }}
                    >
                      <Text
                        style={[styles.chipText, { color: canEnd ? accent : titleColor }]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            <View style={styles.typeRow}>
              <TextInput
                value={text}
                onChangeText={setText}
                onSubmitEditing={() => ready && end(typed)}
                placeholder="Or a name of your own"
                placeholderTextColor={border}
                maxLength={MAX_SOLVE_NAME}
                autoCorrect={false}
                returnKeyType="done"
                editable={canEnd}
                style={[styles.input, { color: titleColor, borderColor: border }]}
                accessibilityLabel="Phase name"
              />
              <TouchableOpacity
                style={[
                  styles.addButton,
                  { backgroundColor: accent, borderColor: accent },
                  !ready && styles.disabled,
                ]}
                onPress={() => end(typed)}
                disabled={!ready}
                accessibilityRole="button"
                accessibilityLabel={
                  renaming ? 'Rename the phase to this' : 'End the phase with this name'
                }
                accessibilityState={{ disabled: !ready }}
              >
                <Text style={styles.addButtonText}>{renaming ? 'Rename' : 'End'}</Text>
              </TouchableOpacity>
            </View>

            {spans.length > 0 && (
              <>
                <Text style={[styles.method, { color: titleColor }]}>Marked so far</Text>
                {spans.map((span) => (
                  <View
                    key={span.at}
                    style={[styles.spanRow, { borderColor: border }]}
                  >
                    <Text
                      style={[styles.spanText, { color: titleColor }]}
                      numberOfLines={1}
                    >
                      {describePhaseSpan(span)}
                    </Text>
                    {/* The first marker is at move 0 and is the start of the
                        solve rather than a boundary anyone put there — removing
                        it would only take its name off, so the bin sits on
                        every row and `removePhase` is the same call each time. */}
                    <TouchableOpacity
                      style={styles.spanIcon}
                      onPress={() => onRemove(span.at)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${span.label || 'this marker'}`}
                      accessibilityHint="Joins this group to the one before it"
                    >
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={ICON_SIZE}
                        color={titleColor}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
    width: 340,
    maxWidth: '94%',
    maxHeight: '84%',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 24,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
    zIndex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 8,
  },
  scroll: {
    alignSelf: 'stretch',
  },
  scrollBody: {
    paddingBottom: 4,
  },
  method: {
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.55,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  // Wrapping is right here in a way it is not on the cube screen: this is a
  // modal that may scroll, so a long name taking a second line costs nothing.
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  input: {
    flex: 1,
    // A `TextInput` will not shrink below its intrinsic width without this, and
    // "Rename" is a wider button than "End" — which pushed it off the edge of
    // the box at 320 points until the field was allowed to give way.
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  addButton: {
    flexShrink: 0,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginLeft: 6,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  spanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 10,
    paddingRight: 2,
    paddingVertical: 4,
    marginBottom: 6,
  },
  spanText: {
    flex: 1,
    fontSize: 13,
  },
  spanIcon: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  disabled: {
    opacity: 0.35,
  },
});

export default CubePhaseModal;
