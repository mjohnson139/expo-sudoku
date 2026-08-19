import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { mix } from '../../utils/color';

const LOCKED = '#2e7d32';

/** The method's permanent, horizontally scrolling stage row. */
const CubePhaseRail = ({ states, accent, theme, onLock }) => (
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
      const color = locked
        ? LOCKED
        : open
          ? accent
          : mix(theme.colors.title, theme.colors.background, 0.55);
      return (
        <TouchableOpacity
          key={item.stage}
          style={[
            styles.pill,
            { borderColor: color },
            item.state === 'upcoming' && styles.upcoming,
          ]}
          onPress={open ? () => onLock(item.stage) : undefined}
          disabled={!open}
          accessibilityRole={open ? 'button' : 'text'}
          accessibilityLabel={`${item.stage}, ${item.state}${item.count == null ? '' : `, ${item.count} moves`}`}
          accessibilityHint={open ? 'Locks this stage at the end of the written solve' : undefined}
        >
          {locked && <MaterialCommunityIcons name="check" size={12} color={color} />}
          <Text style={[styles.text, { color }]} numberOfLines={1}>
            {item.stage}{item.count == null ? '' : ` · ${item.count}`}
          </Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

const styles = StyleSheet.create({
  rail: { alignSelf: 'stretch', flexGrow: 0, maxHeight: 28, marginTop: 4 },
  body: { alignItems: 'center', paddingHorizontal: 4 },
  pill: {
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 9,
    marginRight: 5,
  },
  upcoming: { borderStyle: 'dashed', opacity: 0.7 },
  text: { fontSize: 11, fontWeight: '600' },
});

export default CubePhaseRail;
