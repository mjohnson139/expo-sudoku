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
import { MAX_ALG_NAME, hasAssignment, toggleAssignment } from './algorithms';

/** Shared by the workbench now and solve tagging in Step 3. */
const CubeAlgorithmSaveSheet = ({ visible, theme, accent, methods = [], initialName, initialAssignments, error, onClose, onSave }) => {
  const [name, setName] = useState(initialName);
  const [assignments, setAssignments] = useState(initialAssignments);
  useEffect(() => {
    if (!visible) return;
    setName(initialName);
    setAssignments(initialAssignments);
  }, [visible, initialName, initialAssignments]);
  const ink = theme.colors.title;
  const border = theme.colors.numberPad.border;
  const surface = theme.colors.numberPad.background;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* A modal is outside the screen's KeyboardAvoidingView, so it must own
          this one. Without it, iOS raises the keyboard over the bottom sheet
          and leaves the name field behind the keyboard — exactly the field the
          operator is trying to read. `padding` moves the whole sheet above the
          keyboard; the bounded scroll is the fallback on short devices where
          the method chips and actions cannot all fit in the remaining room. */}
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.sheet, { backgroundColor: theme.colors.background, borderColor: border }]}>
          <ScrollView
            contentContainerStyle={styles.sheetBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.title, { color: ink }]}>Save algorithm</Text>
            <Text style={[styles.label, { color: ink }]}>Name</Text>
            <TextInput value={name} onChangeText={setName} maxLength={MAX_ALG_NAME} autoCorrect={false}
              placeholder="Sune" placeholderTextColor={border}
              style={[styles.input, { color: ink, borderColor: border, backgroundColor: surface }]} />
            <Text style={[styles.label, { color: ink }]}>Used for</Text>
            {methods.map((method) => <View key={method.id} style={styles.method}>
              <Text style={[styles.methodName, { color: ink }]}>{method.name}</Text>
              <View style={styles.chips}>{method.stages.map((stage) => {
                const on = hasAssignment(assignments, method.id, stage);
                return <TouchableOpacity key={stage} style={[styles.chip, { borderColor: on ? accent : border }]}
                  accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                  onPress={() => setAssignments((current) => toggleAssignment(current, method.id, stage, methods))}>
                  <Text style={[styles.chipText, { color: on ? accent : ink }]}>{stage}</Text>
                </TouchableOpacity>;
              })}</View>
            </View>)}
            {!!error && <Text accessibilityRole="alert" style={[styles.error, { color: accent }]}>{error}</Text>}
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.action, { borderColor: border }]} onPress={onClose}><Text style={{ color: ink }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.action, { backgroundColor: accent, borderColor: accent }]}
                onPress={() => onSave({ name, assignments })}>
                <MaterialCommunityIcons name="check" color="#fff" size={17} /><Text style={styles.save}>Save</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { maxHeight: '92%', borderTopWidth: 1, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  sheetBody: { padding: 18, paddingBottom: 28 },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 10 }, label: { fontSize: 11, fontWeight: '700', opacity: 0.65, marginTop: 10, marginBottom: 5, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderRadius: 10, padding: 10 }, method: { marginBottom: 7 }, methodName: { fontSize: 12, fontWeight: '700', marginBottom: 5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, chip: { borderWidth: 2, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 }, chipText: { fontSize: 12, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 }, action: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 11, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }, save: { color: '#fff', fontWeight: '700', marginLeft: 5 },
  error: { fontSize: 12, fontWeight: '700', marginTop: 8 },
});
export default CubeAlgorithmSaveSheet;
