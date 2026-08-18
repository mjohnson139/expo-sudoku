import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CubeCompareTable from './CubeCompareTable';

/**
 * The attempts at one scramble, side by side (docs/cube-plan.md §8.10, V1 Step
 * 9 — reduced to this in Cube Flow Step 3).
 *
 * ### What this used to be
 *
 * `CubeSolvesModal`: the per-scramble list of solves *and* the comparison, two
 * modes behind a segmented toggle, opened from a caption under the pad. Step 3
 * put the list on the scramble screen — which is the epic's whole point, and it
 * leaves this modal with one mode. So the toggle goes, the rows go, and what is
 * left is the half that genuinely wants to be a modal: **a table wider than the
 * page, on a page that must not scroll** (docs/cube-plan.md §8.6 — the cube is
 * sized first, and a comparison is a row nobody wants to pay for permanently).
 *
 * ### It computes nothing, and it is not where Compare is decided
 *
 * Every number comes from `comparePhases` via `CubeCompareTable`. Whether there
 * is anything worth comparing is the caller's question — the scramble screen
 * only offers the button once there are two attempts, because with one the table
 * is a row of numbers with nothing beside it.
 */
const CubeCompareModal = ({ visible, theme, accent, solves, currentId, onClose }) => {
  const titleColor = theme.colors.title;
  const surface = theme.colors.numberPad.background;
  const border = theme.colors.numberPad.border;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.box, { backgroundColor: surface, borderColor: border }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close the comparison"
          >
            <MaterialCommunityIcons name="close" size={22} color={titleColor} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: titleColor }]}>Compare</Text>
          <Text style={[styles.subtitle, { color: titleColor }]}>
            phase counts across your attempts
          </Text>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollBody}>
            <CubeCompareTable
              solves={solves}
              currentId={currentId}
              theme={theme}
              accent={accent}
            />
          </ScrollView>
        </View>
      </View>
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
  // 340 and 94% are `compareLayout.js`'s assumption about the room the table
  // gets — `compareLayout.test.js` divides exactly these numbers up. Changing
  // one without the other is how four Roux columns stop fitting at 320.
  box: {
    width: 340,
    maxWidth: '94%',
    maxHeight: '80%',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 24,
    paddingBottom: 14,
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
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 12,
  },
  scroll: {
    alignSelf: 'stretch',
  },
  scrollBody: {
    paddingBottom: 4,
  },
});

export default CubeCompareModal;
