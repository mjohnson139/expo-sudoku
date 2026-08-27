import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ScreenHeader';
import useAppTheme from '../../hooks/useAppTheme';
import { METHODS } from './methods';
import { CUBE_ACCENT, styles as chrome } from './cubeChrome';
import { MAX_STAGES, normalizeStageName } from './userMethods';
import { useCube } from './CubeContext';

const CubeMethods = ({ navigation, route }) => {
  const { theme } = useAppTheme();
  const { methods, userMethods, duplicateMethodById, editMethodById, addMethodStageById, renameMethodStage, deleteMethodById } = useCube();
  const [stageDrafts, setStageDrafts] = useState({});
  const [addingStage, setAddingStage] = useState(false);
  const [newStage, setNewStage] = useState('');
  const id = route.params && route.params.id;
  const method = methods.find((entry) => entry.id === id);
  const preset = method && METHODS.some((entry) => entry.id === method.id);
  const color = theme.colors.title;
  const border = theme.colors.numberPad.border;
  const surface = theme.colors.numberPad.background;

  const open = (methodId) => navigation.setParams({ id: methodId });
  const duplicate = () => { const made = duplicateMethodById(method.id); if (made) open(made.id); };
  const move = (index, delta) => {
    const stages = [...method.stages];
    const target = index + delta;
    if (target < 0 || target >= stages.length) return;
    [stages[index], stages[target]] = [stages[target], stages[index]];
    editMethodById(method.id, { stages });
  };
  const removeStage = (stage) => editMethodById(method.id, { stages: method.stages.filter((one) => one !== stage) });
  const addStage = () => {
    const stage = normalizeStageName(newStage);
    if (!stage || method.stages.some((entry) => entry.toLowerCase() === stage.toLowerCase())) return;
    addMethodStageById(method.id, stage);
    setNewStage('');
    setAddingStage(false);
  };

  if (!method) return (
    <View style={[chrome.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title="Methods" theme={theme} onHomePress={navigation.goBack} homeIcon="chevron-left" homeLabel="Back to algorithms" dense />
      <ScrollView contentContainerStyle={styles.list}>
        <Text style={[styles.section, { color }]}>Presets</Text>
        {methods.map((entry) => (
          <TouchableOpacity key={entry.id} style={[styles.card, { backgroundColor: surface, borderColor: border }]} onPress={() => open(entry.id)}>
            <View style={styles.grow}><Text style={[styles.name, { color }]}>{entry.name}</Text><Text style={[styles.meta, { color }]}>{entry.stages.length} stages{METHODS.some((one) => one.id === entry.id) ? ' · preset' : entry.forNewSolves ? ' · in new solves' : ' · hidden from new solves'}</Text></View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={color} />
          </TouchableOpacity>
        ))}
        {userMethods.length === 0 && <Text style={[styles.empty, { color }]}>Open a preset and duplicate it to build your own method.</Text>}
      </ScrollView>
    </View>
  );

  return (
    <View style={[chrome.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title={method.name} theme={theme} onHomePress={() => navigation.setParams({ id: null })} homeIcon="chevron-left" homeLabel="Back to methods" dense />
      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color }]}>Method name</Text>
        <TextInput style={[styles.input, { color, borderColor: border, backgroundColor: surface }]} value={method.name} editable={!preset} onChangeText={(name) => editMethodById(method.id, { name })} />
        {preset && <Text style={[styles.readonly, { color }]}>Preset methods are read-only. Duplicate this method to edit it.</Text>}
        <View style={styles.heading}><Text style={[styles.section, { color }]}>Stages · in solve order</Text>{!preset && <Text style={[styles.meta, { color }]}>Reorder</Text>}</View>
        {method.stages.map((stage, index) => (
          <View key={`${stage}-${index}`} style={[styles.stage, { borderColor: border, backgroundColor: surface }]}>
            <Text style={[styles.number, { color: CUBE_ACCENT }]}>{index + 1}</Text>
            <TextInput style={[styles.stageInput, { color }]} editable={!preset} value={stageDrafts[stage] ?? stage} onChangeText={(value) => setStageDrafts((current) => ({ ...current, [stage]: value }))} onBlur={() => { const value = stageDrafts[stage]; if (value != null) renameMethodStage(method.id, stage, value); setStageDrafts((current) => { const next = { ...current }; delete next[stage]; return next; }); }} />
            {!preset && <><TouchableOpacity onPress={() => move(index, -1)} disabled={index === 0}><MaterialCommunityIcons name="chevron-up" size={22} color={index === 0 ? border : color} /></TouchableOpacity><TouchableOpacity onPress={() => move(index, 1)} disabled={index === method.stages.length - 1}><MaterialCommunityIcons name="chevron-down" size={22} color={index === method.stages.length - 1 ? border : color} /></TouchableOpacity><TouchableOpacity onPress={() => removeStage(stage)} disabled={method.stages.length === 1}><MaterialCommunityIcons name="close" size={20} color={method.stages.length === 1 ? border : color} /></TouchableOpacity></>}
          </View>
        ))}
        {preset ? <TouchableOpacity style={styles.primary} onPress={duplicate}><Text style={styles.primaryText}>Duplicate to edit</Text></TouchableOpacity> : <>
          <TouchableOpacity style={[styles.add, { borderColor: border }]} disabled={method.stages.length >= MAX_STAGES} onPress={() => setAddingStage(true)}><Text style={[styles.addText, { color }]}>＋ Add stage</Text></TouchableOpacity>
          <View style={styles.toggle}><View style={styles.grow}><Text style={[styles.name, { color }]}>Use for new solves</Text><Text style={[styles.meta, { color }]}>Appears in the method sheet</Text></View><Switch value={method.forNewSolves} onValueChange={(value) => editMethodById(method.id, { forNewSolves: value })} trackColor={{ true: CUBE_ACCENT }} /></View>
          <TouchableOpacity style={styles.secondary} onPress={duplicate}><Text style={[styles.secondaryText, { color }]}>Duplicate method</Text></TouchableOpacity>
          <TouchableOpacity style={styles.delete} onPress={() => { const reason = deleteMethodById(method.id); if (reason) Alert.alert('Can’t delete method', reason); else navigation.setParams({ id: null }); }}><Text style={styles.deleteText}>Delete method</Text></TouchableOpacity>
        </>}
      </ScrollView>
      {!preset && <Modal visible={addingStage} transparent animationType="fade" onRequestClose={() => setAddingStage(false)}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modal, { backgroundColor: surface, borderColor: border }]}>
            <Text style={[styles.modalTitle, { color }]}>Add stage</Text>
            <TextInput autoFocus value={newStage} onChangeText={setNewStage} onSubmitEditing={addStage} maxLength={40} placeholder="Stage name" placeholderTextColor={border} style={[styles.input, { color, borderColor: border }]} accessibilityLabel="New stage name" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={() => { setNewStage(''); setAddingStage(false); }}><Text style={[styles.secondaryText, { color }]}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalPrimary, { backgroundColor: CUBE_ACCENT }]} disabled={!normalizeStageName(newStage) || method.stages.some((entry) => entry.toLowerCase() === normalizeStageName(newStage).toLowerCase())} onPress={addStage}><Text style={styles.primaryText}>Add</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>}
    </View>
  );
};

const styles = StyleSheet.create({ list: { padding: 14, paddingBottom: 30, gap: 10 }, section: { fontSize: 14, fontWeight: '800' }, heading: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }, card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 13 }, grow: { flex: 1 }, name: { fontSize: 15, fontWeight: '700' }, meta: { fontSize: 12, opacity: .6, marginTop: 2 }, empty: { opacity: .65, lineHeight: 20 }, label: { fontSize: 12, fontWeight: '700' }, input: { borderWidth: 1, borderRadius: 9, padding: 11, fontSize: 16 }, readonly: { fontSize: 12, opacity: .65 }, stage: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 9, paddingHorizontal: 8, minHeight: 48 }, number: { width: 24, fontWeight: '800' }, stageInput: { flex: 1, paddingVertical: 10 }, primary: { backgroundColor: CUBE_ACCENT, borderRadius: 9, padding: 13, alignItems: 'center', marginTop: 8 }, primaryText: { color: '#fff', fontWeight: '800' }, add: { borderWidth: 1, borderRadius: 9, padding: 12, alignItems: 'center' }, addText: { fontWeight: '700' }, toggle: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }, secondary: { alignItems: 'center', padding: 11 }, secondaryText: { fontWeight: '700' }, delete: { alignItems: 'center', padding: 11 }, deleteText: { color: '#c43b3b', fontWeight: '700' }, overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' }, modal: { width: 300, maxWidth: '92%', borderWidth: 1, borderRadius: 12, padding: 16 }, modalTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 12 }, modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 8 }, modalButton: { minWidth: 80, padding: 11, alignItems: 'center' }, modalPrimary: { borderRadius: 8 } });
export default CubeMethods;
