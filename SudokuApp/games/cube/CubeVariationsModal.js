import React from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { best, variationStageCount } from './variations';

const CubeVariationsModal = ({ stage, active, variations, theme, accent, onClose, onTryAgain, onSwitch }) => {
  if (!stage) return null;
  const storedBest = best(variations, stage.at);
  const activeCount = active ? active.count : 0;
  const bestCount = Math.min(activeCount || Infinity, storedBest ? variationStageCount(storedBest) : Infinity);
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.colors.background }]} onPress={() => {}}>
          <Text style={[styles.title, { color: theme.colors.title }]}>{stage.stage} runs</Text>
          <View style={[styles.row, { borderColor: accent }]}>
            <Text style={{ color: theme.colors.title }}>
              {stage.state === 'open' ? 'Current retry' : 'Active'} · {activeCount} moves
            </Text>
            {activeCount === bestCount && <Text style={[styles.best, { color: accent }]}>best</Text>}
          </View>
          {(variations || []).filter((item) => item.phaseAt === stage.at).map((item) => {
            const count = variationStageCount(item);
            return (
              <TouchableOpacity key={item.id} style={[styles.row, { borderColor: theme.colors.numberPad.border }]} onPress={() => onSwitch(item)}>
                <Text style={{ color: theme.colors.title }}>Saved run · {count} moves</Text>
                {count === bestCount && <Text style={[styles.best, { color: accent }]}>best</Text>}
              </TouchableOpacity>
            );
          })}
          {stage.state === 'locked' && (
            <TouchableOpacity style={[styles.try, { backgroundColor: accent }]} onPress={onTryAgain}>
              <Text style={styles.tryText}>Try again</Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { padding: 18, paddingBottom: 28, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  row: { minHeight: 44, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  best: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  try: { minHeight: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  tryText: { color: '#fff', fontWeight: '700' },
});

export default CubeVariationsModal;
