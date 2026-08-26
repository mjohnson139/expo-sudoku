import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CubeCasePreview from './CubeCasePreview';
import { algorithmStartingCube, searchAlgorithms } from './algorithms';
import { methodName } from './methods';
import { libraryState, orderAlgorithmPicker } from './tagRun';

const CubeSolveAlgorithmsSheet = ({
  methods, visible, algorithms, method, stage, theme, accent, onClose, onSelectRun, onApply, onCreate }) => {
  const [query, setQuery] = useState('');
  const state = libraryState(algorithms);
  const entries = useMemo(
    () => orderAlgorithmPicker(searchAlgorithms(algorithms, query), method, stage),
    [algorithms, query, method, stage]
  );
  const ink = theme.colors.title;
  const border = theme.colors.numberPad.border;
  const surface = theme.colors.numberPad.background;

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.backdrop}><View style={[styles.sheet, { backgroundColor: theme.colors.background, borderColor: border }]}>
      <View style={styles.heading}>
        <Text style={[styles.title, { color: ink }]}>Algorithms</Text>
        <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close algorithms"><MaterialCommunityIcons name="close" size={22} color={ink} /></TouchableOpacity>
      </View>
      <TouchableOpacity style={[styles.saveRun, { borderColor: accent }]} onPress={onSelectRun} disabled={state.full} accessibilityState={{ disabled: state.full }}>
        <MaterialCommunityIcons name="selection-drag" size={20} color={state.full ? border : accent} />
        <View><Text style={[styles.saveTitle, { color: state.full ? border : ink }]}>Save a run from this solve</Text>
          <Text style={[styles.meta, { color: border }]}>{state.full ? 'Library full — applying still works' : 'Choose its first and last move'}</Text></View>
      </TouchableOpacity>
      {state.empty ? <View style={styles.empty}><Text style={[styles.emptyTitle, { color: ink }]}>No algorithms yet</Text>
        <TouchableOpacity style={[styles.create, { backgroundColor: accent }]} onPress={onCreate}><Text style={styles.createText}>Open the workbench</Text></TouchableOpacity></View> : <>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search name or moves" placeholderTextColor={border}
          style={[styles.search, { color: ink, borderColor: border, backgroundColor: surface }]} />
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {entries.map((entry) => <View key={entry.id} style={[styles.entry, { borderColor: border, backgroundColor: surface }]}>
            <CubeCasePreview cube={algorithmStartingCube(entry)} size={54} />
            <View style={styles.copy}><Text style={[styles.name, { color: ink }]}>{entry.name}</Text>
              <Text numberOfLines={1} style={[styles.moves, { color: ink }]}>{entry.moves}</Text>
              <Text numberOfLines={1} style={[styles.meta, { color: border }]}>{(entry.assignments || []).map((a) => `${methodName(a.method, methods)} · ${a.stage}`).join(' · ') || 'Unassigned'}</Text></View>
            <TouchableOpacity style={[styles.apply, { backgroundColor: accent }]} onPress={() => onApply(entry)} accessibilityRole="button" accessibilityLabel={`Apply ${entry.name}`}><Text style={styles.applyText}>Apply</Text></TouchableOpacity>
          </View>)}
        </ScrollView>
      </>}
    </View></View>
  </Modal>;
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { maxHeight: '88%', minHeight: '45%', padding: 16, paddingBottom: 28, borderTopWidth: 1, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }, title: { fontSize: 19, fontWeight: '800' },
  saveRun: { borderWidth: 1, borderRadius: 12, minHeight: 58, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }, saveTitle: { fontSize: 14, fontWeight: '800' },
  search: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 10 },
  entry: { minHeight: 72, borderWidth: 1, borderRadius: 12, marginBottom: 8, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }, copy: { flex: 1 }, name: { fontWeight: '800', fontSize: 14 }, moves: { fontFamily: 'monospace', fontSize: 12, marginVertical: 3 }, meta: { fontSize: 11 },
  apply: { borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10 }, applyText: { color: '#fff', fontWeight: '800' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }, emptyTitle: { fontSize: 16, fontWeight: '700' }, create: { borderRadius: 10, padding: 12 }, createText: { color: '#fff', fontWeight: '800' },
});
export default CubeSolveAlgorithmsSheet;
