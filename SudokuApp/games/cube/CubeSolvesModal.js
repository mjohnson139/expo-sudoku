import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ALG_FONT } from './algText';
import CubeCompareTable from './CubeCompareTable';
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
 *
 * ### And Compare is the other half of that (Step 9, plan §8.10)
 *
 * Duplicating a solve and rewriting the block is only half a loop: the loop
 * closes when the two attempts sit next to each other. So the list has a second
 * mode rather than a second screen — it is already the per-scramble list of
 * solves, so a comparison here is *columns added to a list that exists*, and it
 * costs the solve screen nothing. §8.6's budget rule is why that matters: a new
 * row on the solve screen is paid for out of the cube.
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
  onClear,
  onClose,
}) => {
  const titleColor = theme.colors.title;
  const surface = theme.colors.numberPad.background;
  const border = theme.colors.numberPad.border;

  const [comparing, setComparing] = useState(false);

  // Which mode you left it in is *where you were standing*, not something you
  // wrote (plan §7.1), so it does not go in the save file — and it resets when
  // the list closes, because the way in is a button that says "Solves".
  useEffect(() => {
    if (!visible) setComparing(false);
  }, [visible]);

  const compare = comparing && solves.length > 0;

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
            {compare ? 'phase counts across your attempts' : 'for the scramble on the cube'}
          </Text>

          {/* Two modes, one list. The toggle is only worth its 30 points once
              there is more than one attempt to compare — with a single solve the
              table is a row of numbers with nothing beside them, which is the
              solve screen's job and it already does it. */}
          {solves.length > 1 && (
            <View style={[styles.modes, { borderColor: border }]}>
              {[
                { key: 'list', text: 'List', on: !compare },
                { key: 'compare', text: 'Compare', on: compare },
              ].map((mode) => (
                <TouchableOpacity
                  key={mode.key}
                  style={[styles.mode, mode.on && { backgroundColor: accent }]}
                  onPress={() => setComparing(mode.key === 'compare')}
                  accessibilityRole="button"
                  accessibilityLabel={
                    mode.key === 'compare' ? 'Compare the attempts' : 'List the solves'
                  }
                  accessibilityHint={
                    mode.key === 'compare'
                      ? 'Shows each solve’s phase counts side by side'
                      : undefined
                  }
                  accessibilityState={{ selected: mode.on }}
                >
                  <Text
                    style={[styles.modeText, { color: mode.on ? '#ffffff' : titleColor }]}
                  >
                    {mode.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {compare ? (
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollBody}>
              <CubeCompareTable
                solves={solves}
                currentId={currentId}
                theme={theme}
                accent={accent}
              />
            </ScrollView>
          ) : solves.length === 0 ? (
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

                    {/* **Clear came off the pad in Step 8** (plan §8.8): the
                        design's rule is that nothing which edits the solve wears
                        a move colour, and emptying a page you have been drilling
                        into does not belong under a thumb that is aiming at `R`.
                        It lands here rather than on the header, which is three
                        icons at 320 points and full — and here is where the
                        other destructive thing already lives, so "empty it" and
                        "delete it" are one decision made in one place.

                        Only offered for a solve that has something in it. */}
                    <TouchableOpacity
                      style={[styles.rowIcon, solve.alg.length === 0 && styles.rowIconOff]}
                      onPress={() => onClear(solve.id)}
                      disabled={solve.alg.length === 0}
                      accessibilityRole="button"
                      accessibilityLabel={`Clear the moves from ${solve.name}`}
                      accessibilityHint="Removes every move and every marker, and keeps the page"
                      accessibilityState={{ disabled: solve.alg.length === 0 }}
                    >
                      <MaterialCommunityIcons
                        name="close-circle-outline"
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
  // A segmented pair rather than two buttons: they are one choice, and at this
  // width a pair of outlined buttons reads as two unrelated things to press.
  modes: {
    flexDirection: 'row',
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  mode: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '700',
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
  // Four of these on a row now that Clear has moved in, where there were three.
  // A point off each side is what pays for the fourth without the name beside
  // them losing a character.
  rowIcon: {
    paddingHorizontal: 5,
    paddingVertical: 8,
  },
  rowIconOff: {
    opacity: 0.35,
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
