import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ALG_FONT } from './algText';
import { moveCount } from './moves';
import { solveError } from './solve';

const ICON_SIZE = 22;

/**
 * Typing a whole algorithm into a solve (docs/cube-plan.md §8.2, Step 3).
 *
 * The pad is for solving move by move; this is for the sequences that arrive
 * whole — a CMLL alg, something off a tutorial, a first block you already wrote
 * down somewhere else. `parseAlg` does all the work (spaces optional, curly
 * apostrophes, and it refuses anything it cannot read *whole*), so this is a
 * screen rather than a second parser.
 *
 * ### Why a modal and not a field on the page
 *
 * The cube screen is a fixed column that never scrolls, because the cube claims
 * every pan inside its square (plan §2). A keyboard covering the bottom half of
 * a phone would therefore cover the field it was opened for, with nothing able
 * to scroll out of its way. A modal can move; the page cannot.
 *
 * ### It appends
 *
 * What gets typed is added to the end of the solve, not put in place of it. The
 * field is for dropping a known sequence into a solve being written, and undo is
 * one tap away on the pad if it was the wrong one.
 */
const CubeAlgInputModal = ({ visible, theme, accent, onAdd, onClose }) => {
  const [text, setText] = useState('');

  // Opening is a fresh field. Otherwise the alg you added last time is sitting
  // there waiting to be added twice.
  useEffect(() => {
    if (visible) setText('');
  }, [visible]);

  const titleColor = theme.colors.title;
  const surface = theme.colors.numberPad.background;
  const border = theme.colors.numberPad.border;

  // Live, but only ever *shown* as a reason — the button is what refuses, and it
  // does not blink on and off while a token is half-typed.
  const error = solveError(text);
  const count = error ? 0 : moveCount(text);
  const ready = count > 0;

  const submit = () => {
    if (!ready) return;
    onAdd(text);
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
            accessibilityLabel="Close"
          >
            <MaterialCommunityIcons name="close" size={ICON_SIZE} color={titleColor} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: titleColor }]}>Type an algorithm</Text>

          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={submit}
            placeholder="R U R' U'"
            placeholderTextColor={theme.colors.numberPad.border}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            autoFocus
            returnKeyType="done"
            blurOnSubmit={false}
            multiline
            style={[styles.input, { color: titleColor, borderColor: error ? accent : border }]}
            accessibilityLabel="Algorithm"
            accessibilityHint="Spaces are optional; anything that is not notation is refused"
          />

          {/* Says why, with the token that caused it — a field that just greys
              its button out is a field you cannot get out of. */}
          <Text
            style={[styles.status, { color: error ? accent : titleColor }]}
            accessibilityLiveRegion="polite"
          >
            {error || (ready ? `${count} ${count === 1 ? 'move' : 'moves'}` : ' ')}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, { borderColor: border }]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={[styles.buttonText, { color: titleColor }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.primary,
                { backgroundColor: accent, borderColor: accent },
                !ready && styles.disabled,
              ]}
              onPress={submit}
              disabled={!ready}
              accessibilityRole="button"
              accessibilityLabel="Add these moves to the solve"
              accessibilityState={{ disabled: !ready }}
            >
              <MaterialCommunityIcons name="plus" size={16} color="#ffffff" />
              <Text style={[styles.buttonText, styles.primaryText]}>Add</Text>
            </TouchableOpacity>
          </View>
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
    width: 320,
    maxWidth: '92%',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
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
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    alignSelf: 'stretch',
    minHeight: 64,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontFamily: ALG_FONT,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  // Reserves its line whether or not there is anything to say, so the buttons
  // do not jump under a finger the moment a typo appears.
  status: {
    fontSize: 12,
    minHeight: 30,
    paddingTop: 6,
    opacity: 0.9,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginLeft: 8,
  },
  primary: {
    paddingHorizontal: 16,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  primaryText: {
    color: '#ffffff',
    marginLeft: 4,
  },
  disabled: {
    opacity: 0.4,
  },
});

export default CubeAlgInputModal;
