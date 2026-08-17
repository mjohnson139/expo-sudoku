import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TUNABLES, TUNING, TUNING_DEFAULTS } from './touchTurn';

/**
 * The gesture's dials, on the phone (docs/cube-touch-exploration.md §3.3d).
 *
 * **Temporary, and it says so on the front.** This is a spike, and a spike's
 * numbers are guesses until they have been in a hand — this one has been round
 * the loop four times on feel alone, at one number per round trip. Handing the
 * operator the dials is cheaper than another round of "try 0.25".
 *
 * ### It writes straight into `TUNING`, on purpose
 *
 * Every reader of these numbers looks them up at the moment a finger moves —
 * `tuning.CIRCLE_GAIN`, never a value closed over at import — so mutating the
 * object is enough and takes effect on the very next gesture. That would be a
 * poor way to build a *setting*, which is why this is not one: nothing here is
 * persisted, and closing the app puts every value back where the source has it.
 * A preference is a promise, and none of these numbers is ready to make one.
 *
 * When the spike either graduates or is abandoned, this file goes with it.
 */
const CubeTuningPanel = ({ visible, theme, accent, showReadout, onToggleReadout, onClose }) => {
  // The values live in `TUNING`; this only exists to redraw after a change.
  const [, bump] = useState(0);

  const set = (key, value) => {
    TUNING[key] = value;
    bump((n) => n + 1);
  };

  const nudge = (tunable, direction) => {
    const next = TUNING[tunable.key] + tunable.step * direction;
    const clamped = Math.min(tunable.max, Math.max(tunable.min, next));
    // Steps like 0.05 accumulate float dust that makes the readout ugly.
    set(tunable.key, Math.round(clamped * 1000) / 1000);
  };

  const reset = () => {
    Object.keys(TUNING_DEFAULTS).forEach((key) => {
      TUNING[key] = TUNING_DEFAULTS[key];
    });
    bump((n) => n + 1);
  };

  const title = theme.colors.title;
  const border = theme.colors.numberPad.border;
  const surface = theme.colors.numberPad.background;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.colors.background, borderColor: border }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: title }]}>Gesture tuning</Text>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.close, { borderColor: border }]}
              accessibilityRole="button"
              accessibilityLabel="Close tuning"
            >
              <MaterialCommunityIcons name="close" size={18} color={title} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.note, { color: title }]}>
            Spike only — nothing here is saved, and restarting the app puts it all back.
          </Text>

          <TouchableOpacity
            onPress={onToggleReadout}
            style={[
              styles.reset,
              { borderColor: showReadout ? accent : border, marginTop: 0, marginBottom: 4 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={showReadout ? 'Hide the touch readout' : 'Show the touch readout'}
            accessibilityState={{ selected: !!showReadout }}
          >
            <MaterialCommunityIcons
              name={showReadout ? 'eye' : 'eye-outline'}
              size={16}
              color={showReadout ? accent : title}
            />
            <Text style={[styles.resetText, { color: showReadout ? accent : title }]}>
              {showReadout ? 'Readout on' : 'Show touch readout'}
            </Text>
          </TouchableOpacity>

          <ScrollView style={styles.list}>
            {TUNABLES.map((tunable) => (
              <View key={tunable.key} style={[styles.row, { borderColor: border }]}>
                <View style={styles.rowText}>
                  <Text style={[styles.label, { color: title }]}>{tunable.label}</Text>
                  <Text style={[styles.hint, { color: title }]}>{tunable.hint}</Text>
                </View>

                <View style={styles.stepper}>
                  <TouchableOpacity
                    onPress={() => nudge(tunable, -1)}
                    style={[styles.step, { borderColor: border, backgroundColor: surface }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Decrease ${tunable.label}`}
                  >
                    <MaterialCommunityIcons name="minus" size={16} color={title} />
                  </TouchableOpacity>

                  <Text style={[styles.value, { color: accent }]}>
                    {TUNING[tunable.key]}
                    {tunable.unit}
                  </Text>

                  <TouchableOpacity
                    onPress={() => nudge(tunable, 1)}
                    style={[styles.step, { borderColor: border, backgroundColor: surface }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Increase ${tunable.label}`}
                  >
                    <MaterialCommunityIcons name="plus" size={16} color={title} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            onPress={reset}
            style={[styles.reset, { borderColor: border }]}
            accessibilityRole="button"
            accessibilityLabel="Reset tuning to the shipped values"
          >
            <MaterialCommunityIcons name="restore" size={16} color={title} />
            <Text style={[styles.resetText, { color: title }]}>Back to defaults</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    padding: 14,
    maxHeight: '82%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  close: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 5,
  },
  note: {
    fontSize: 11,
    opacity: 0.7,
    marginTop: 4,
    marginBottom: 8,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingVertical: 9,
  },
  rowText: {
    flex: 1,
    paddingRight: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  hint: {
    fontSize: 11,
    opacity: 0.65,
    marginTop: 1,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  step: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 9,
  },
  value: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 54,
    textAlign: 'center',
  },
  reset: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 9,
    marginTop: 10,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default CubeTuningPanel;
