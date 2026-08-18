import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { describeSolveSize } from './solveList';

const ICON_SIZE = 20;

/**
 * What you can do to a solve that is not "open it" (docs/cube-flow-plan.md
 * §3.3, Step 3).
 *
 * ### Why it is a long-press and not four icons
 *
 * The design draws a card with a name, a count and a chevron on it, and that is
 * a good card — the picker this replaces carried **four icon buttons per row**
 * and had to shave a point off each side of them to fit the fourth without the
 * name losing a character (`CubeSolvesModal`'s `rowIcon`). Rename, duplicate,
 * clear and delete are also all things you do rarely and deliberately, and
 * putting a delete target permanently a thumb's width from "open this solve" on
 * a list you scroll is asking for it.
 *
 * **A long-press is invisible**, which is the standard objection and is open
 * question 3 in the plan. It ships to be tried against a drilling session rather
 * than argued about; the alternatives on the table are a row of icons on the
 * card or an overflow button in the solve header.
 *
 * ### Nothing here decides anything
 *
 * Every row calls back out with the id. The rules — what a duplicate is called,
 * what happens to the open page when the solve under it is deleted — belong to
 * `solveList.js` and `CubeContext`, which is the same division `CubeSolvesModal`
 * kept and the reason deleting the open solve does the right thing without this
 * component knowing what "the open solve" is.
 */
const CubeSolveMenu = ({
  visible,
  theme,
  accent,
  solve,
  onRename,
  onDuplicate,
  onClear,
  onDelete,
  onClose,
}) => {
  const titleColor = theme.colors.title;
  const surface = theme.colors.numberPad.background;
  const border = theme.colors.numberPad.border;

  // Deleting from here empties both the id and the modal on the same tap, and
  // for the frame in between there is nothing honest to draw a row about.
  if (!solve) return null;

  const empty = solve.alg.length === 0;

  const row = (name, label, hint, onPress, { disabled = false, danger = false } = {}) => (
    <TouchableOpacity
      style={[styles.row, { borderColor: border }, disabled && styles.rowOff]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
    >
      <MaterialCommunityIcons
        name={name}
        size={ICON_SIZE}
        color={danger ? accent : titleColor}
      />
      <Text style={[styles.rowText, { color: danger ? accent : titleColor }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.box, { backgroundColor: surface, borderColor: border }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <MaterialCommunityIcons name="close" size={22} color={titleColor} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
            {solve.name}
          </Text>
          <Text style={[styles.subtitle, { color: titleColor }]}>
            {describeSolveSize(solve)}
          </Text>

          {row(
            'pencil-outline',
            'Rename',
            'Changes what this solve is called',
            () => onRename(solve.id)
          )}
          {row(
            'content-copy',
            'Duplicate',
            'Copies the moves and the hold into a new solve',
            () => onDuplicate(solve.id)
          )}
          {/* Only offered for a page with something in it, exactly as the picker
              offered it — clearing an empty solve is a button that does nothing
              and a confirmation you have to read to find that out. */}
          {row(
            'close-circle-outline',
            'Clear the moves',
            'Removes every move and every marker, and keeps the page',
            () => onClear(solve.id),
            { disabled: empty }
          )}
          {row('trash-can-outline', 'Delete', 'Forgets this solve', () => onDelete(solve.id), {
            danger: true,
          })}
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
  box: {
    width: 300,
    maxWidth: '92%',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 22,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 6,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 5,
    zIndex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  subtitle: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  rowOff: {
    opacity: 0.35,
  },
  rowText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default CubeSolveMenu;
