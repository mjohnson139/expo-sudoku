import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { mix } from '../../utils/color';

const LOCKED = '#2e7d32';

/** The method's permanent, horizontally scrolling stage row. */
const CubePhaseRail = ({ states, accent, theme, onPlace }) => (
  <ScrollView
    style={styles.rail}
    contentContainerStyle={styles.body}
    horizontal
    showsHorizontalScrollIndicator={false}
    keyboardShouldPersistTaps="handled"
  >
    {states.map((item) => {
      const marked = item.state === 'marked';
      const passed = marked && item.verified === true;
      const color = marked
        ? LOCKED
        : item.available
          ? accent
          : mix(theme.colors.title, theme.colors.background, 0.55);
      return (
        <TouchableOpacity
          key={item.stage}
          style={[
            styles.pill,
            { borderColor: color },
            passed && { backgroundColor: mix(LOCKED, theme.colors.background, 0.18) },
            !item.available && styles.unavailable,
            item.atCursor && { backgroundColor: mix(accent, theme.colors.background, 0.82) },
          ]}
          onPress={item.available ? () => onPlace(item.stage) : undefined}
          disabled={!item.available}
          accessibilityRole="button"
          accessibilityState={{ disabled: !item.available, selected: item.atCursor }}
          accessibilityLabel={`${item.stage}, ${item.state}${marked ? item.verified === true ? ', exit state verified' : item.verified === false ? ', exit state not reached' : ', exit state unverified' : ''}${item.atCursor ? ', boundary at scrubber' : ''}${item.count == null ? '' : `, ${item.count} moves`}`}
          accessibilityHint={item.available ? 'Places this stage ending at the scrubber position' : 'Move the scrubber between the neighbouring stage boundaries first'}
        >
          {marked && <MaterialCommunityIcons name={item.atCursor ? 'map-marker' : passed ? 'check-circle' : 'check-circle-outline'} size={12} color={color} />}
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
  unavailable: { borderStyle: 'dashed', opacity: 0.55 },
  text: { fontSize: 11, fontWeight: '600' },
});

export default CubePhaseRail;
