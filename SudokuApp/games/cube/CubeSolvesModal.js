import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ALG_FONT } from './algText';
import { describeSolveSize } from './solveList';

const ICON_SIZE = 20;

/**
 * The solves written against the scramble on the cube (docs/cube-plan.md §7.1,
 * §8.2 — Step 4).
 *
 * A modal, and that is a layout decision rather than a habit: solve mode is
 * already header · scramble line · solve card · a three-button row · stage ·
 * transport · three pad rows · a caption, and at 320×568 that leaves the cube
 * about 120 points. **A picker cannot be another row.** The action row's middle
 * button is already three-way and cannot become four. So the list goes
 * somewhere the page isn't, and the way in is the caption under the pad — the
 * line that already says which solve you are on.
 *
 * ### Duplicate is the one that matters
 *
 * "Same first block, try the second block differently" is how drilling actually
 * goes, so the copy comes with the moves and the hold already in it and you
 * delete back to the fork. New starts empty, at inspection, which is the other
 * half of the practice: a different hold entirely.
 */
const CubeSolvesModal = ({
  visible,
  theme,
  accent,
  solves,
  currentId,
  describeHold,
  onOpen,
  onNew,
  onDuplicate,
  onRename,
  onRemove,
  onClose,
}) => {
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
            accessibilityLabel="Close solves"
          >
            <MaterialCommunityIcons name="close" size={22} color={titleColor} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: titleColor }]}>Solves</Text>
          <Text style={[styles.subtitle, { color: titleColor }]}>
            for the scramble on the cube
          </Text>

          {solves.length === 0 ? (
            <Text style={[styles.empty, { color: titleColor }]}>
              Nothing written for this scramble yet.
            </Text>
          ) : (
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollBody}>
              {solves.map((solve) => {
                const current = solve.id === currentId;

                return (
                  <View
                    key={solve.id}
                    style={[
                      styles.row,
                      { borderColor: border },
                      current && { borderColor: accent, borderWidth: 2 },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.rowBody}
                      onPress={() => onOpen(solve.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${solve.name}, ${describeSolveSize(solve)}`}
                      accessibilityHint="Puts this solve on the cube"
                      accessibilityState={{ selected: current }}
                    >
                      <Text style={[styles.rowName, { color: titleColor }]} numberOfLines={1}>
                        {solve.name}
                      </Text>
                      {/* "on the cube" comes before the hold rather than after
                          it: at 320 points this line ellipsizes, and the marker
                          is the part that must survive the clip. */}
                      <Text style={[styles.rowMeta, { color: titleColor }]} numberOfLines={1}>
                        {describeSolveSize(solve)}
                        {current ? ' · on the cube' : ''} · {describeHold(solve.orientation)}
                      </Text>
                      {solve.alg.length > 0 && (
                        <Text
                          style={[styles.rowAlg, { color: titleColor }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {solve.alg}
                        </Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.rowIcon}
                      onPress={() => onDuplicate(solve.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Duplicate ${solve.name}`}
                      accessibilityHint="Copies the moves and the hold into a new solve"
                    >
                      <MaterialCommunityIcons
                        name="content-copy"
                        size={ICON_SIZE}
                        color={titleColor}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.rowIcon}
                      onPress={() => onRename(solve.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Rename ${solve.name}`}
                    >
                      <MaterialCommunityIcons
                        name="pencil-outline"
                        size={ICON_SIZE}
                        color={titleColor}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.rowIcon}
                      onPress={() => onRemove(solve.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${solve.name}`}
                    >
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={ICON_SIZE}
                        color={titleColor}
                      />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          )}

          <TouchableOpacity
            style={[styles.newButton, { backgroundColor: accent }]}
            onPress={onNew}
            accessibilityRole="button"
            accessibilityLabel="Start a new solve"
            accessibilityHint="Opens a fresh page for this scramble, starting with the hold"
          >
            <MaterialCommunityIcons name="plus" size={18} color="#ffffff" />
            <Text style={styles.newButtonText}>New solve</Text>
          </TouchableOpacity>
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
  empty: {
    fontSize: 14,
    opacity: 0.75,
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  scroll: {
    alignSelf: 'stretch',
  },
  scrollBody: {
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 2,
    marginBottom: 8,
  },
  rowBody: {
    flex: 1,
    paddingRight: 4,
  },
  rowName: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowMeta: {
    fontSize: 11,
    opacity: 0.65,
    marginTop: 2,
  },
  // The moves themselves, one line and clipped. Enough to recognize which
  // attempt this is without turning the picker into a second solve card.
  rowAlg: {
    fontSize: 11,
    fontFamily: ALG_FONT,
    opacity: 0.5,
    marginTop: 3,
  },
  rowIcon: {
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 4,
  },
  newButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
});

export default CubeSolvesModal;
