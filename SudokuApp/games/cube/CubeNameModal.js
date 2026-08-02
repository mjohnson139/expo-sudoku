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
import { MAX_SOLVE_NAME, normalizeName } from './solveList';

const ICON_SIZE = 22;

/**
 * Naming a solve (docs/cube-plan.md §8.2, Step 4).
 *
 * A modal for the same reason `CubeAlgInputModal` is one: the cube screen is a
 * fixed column that never scrolls, so a keyboard would cover the field it was
 * opened for with nothing able to scroll out of its way.
 *
 * The name is what tells two attempts at one scramble apart, so an empty one is
 * refused rather than kept — a row with no name is a row you cannot ask for.
 * Uniqueness is *not* enforced here: `renameSolve` makes the name distinct
 * within its scramble, because that is a rule about the list rather than about
 * the field, and the field would have to be handed the list to know it.
 */
const CubeNameModal = ({ visible, theme, accent, title, name, onSubmit, onClose }) => {
  const [text, setText] = useState('');

  // Opening seeds the field with the name being changed, so a small correction
  // is a small edit rather than a retype.
  useEffect(() => {
    if (visible) setText(name || '');
  }, [visible, name]);

  const titleColor = theme.colors.title;
  const surface = theme.colors.numberPad.background;
  const border = theme.colors.numberPad.border;

  const ready = normalizeName(text).length > 0;

  const submit = () => {
    if (!ready) return;
    onSubmit(normalizeName(text));
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

          <Text style={[styles.title, { color: titleColor }]}>{title}</Text>

          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={submit}
            placeholder="First block, M first"
            placeholderTextColor={border}
            maxLength={MAX_SOLVE_NAME}
            autoCorrect={false}
            autoFocus
            returnKeyType="done"
            style={[styles.input, { color: titleColor, borderColor: border }]}
            accessibilityLabel="Solve name"
          />

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
                { backgroundColor: accent, borderColor: accent },
                !ready && styles.disabled,
              ]}
              onPress={submit}
              disabled={!ready}
              accessibilityRole="button"
              accessibilityLabel="Save this name"
              accessibilityState={{ disabled: !ready }}
            >
              <Text style={[styles.buttonText, styles.primaryText]}>Save</Text>
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
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 15,
    marginBottom: 14,
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
    paddingHorizontal: 16,
    marginLeft: 8,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  primaryText: {
    color: '#ffffff',
  },
  disabled: {
    opacity: 0.4,
  },
});

export default CubeNameModal;
