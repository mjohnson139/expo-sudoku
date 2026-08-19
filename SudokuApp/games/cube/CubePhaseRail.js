import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { mix } from '../../utils/color';

const LOCKED = '#2e7d32';

/** The method's permanent, horizontally scrolling stage row. */
const CubePhaseRail = ({ states, variations = [], accent, theme, onLock, onExpand }) => (
  <ScrollView
    style={styles.rail}
    contentContainerStyle={styles.body}
    horizontal
    showsHorizontalScrollIndicator={false}
    keyboardShouldPersistTaps="handled"
  >
    {states.map((item) => {
      const open = item.state === 'open';
      const locked = item.state === 'locked';
      const alternatives = variations.filter(
        (variation) => variation.phaseAt === item.at
      ).length;
      const color = locked
        ? LOCKED
        : open
          ? accent
          : mix(theme.colors.title, theme.colors.background, 0.55);
      return (
        <View key={item.stage} style={styles.stage}>
          <TouchableOpacity
            style={[
              styles.pill,
              { borderColor: color },
              item.state === 'upcoming' && styles.upcoming,
            ]}
            onPress={open ? () => onLock(item.stage) : locked ? () => onExpand(item) : undefined}
            disabled={!open && !locked}
            accessibilityRole={open || locked ? 'button' : 'text'}
            accessibilityLabel={`${item.stage}, ${item.state}${item.count == null ? '' : `, ${item.count} moves`}`}
            accessibilityHint={open ? 'Locks this stage at the end of the written solve' : undefined}
          >
            {locked && <MaterialCommunityIcons name="check" size={12} color={color} />}
            <Text style={[styles.text, { color }]} numberOfLines={1}>
              {item.stage}{item.count == null ? '' : ` · ${item.count}`}
            </Text>
            {locked && alternatives > 0 && (
              <Text style={[styles.badge, { color }]}>+{alternatives}</Text>
            )}
          </TouchableOpacity>
          {open && alternatives > 0 && (
            <TouchableOpacity
              style={[styles.alternatives, { borderColor: color }]}
              onPress={() => onExpand(item)}
              accessibilityRole="button"
              accessibilityLabel={`${alternatives} previous ${item.stage} ${alternatives === 1 ? 'attempt' : 'attempts'}`}
              accessibilityHint="Shows the saved branches and lets you switch attempts"
            >
              <Text style={[styles.badge, { color }]}>+{alternatives}</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    })}
  </ScrollView>
);

const styles = StyleSheet.create({
  rail: { alignSelf: 'stretch', flexGrow: 0, maxHeight: 28, marginTop: 4 },
  body: { alignItems: 'center', paddingHorizontal: 4 },
  stage: { height: 24, flexDirection: 'row', marginRight: 5 },
  pill: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 9,
  },
  alternatives: {
    height: 24,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    marginLeft: 3,
    paddingHorizontal: 6,
  },
  upcoming: { borderStyle: 'dashed', opacity: 0.7 },
  text: { fontSize: 11, fontWeight: '600' },
  badge: { fontSize: 10, fontWeight: '800', marginLeft: 4 },
});

export default CubePhaseRail;
