import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ALG_FONT } from './algText';
import { describeScramble } from './scramble';

const ICON_SIZE = 22;

/** `savedAt` as a short date. Falls back to nothing rather than to "Invalid
 *  Date" for a favorite written before timestamps existed. */
const savedOn = (savedAt) => {
  if (!Number.isFinite(savedAt) || savedAt <= 0) return '';
  try {
    return new Date(savedAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    return '';
  }
};

/**
 * The saved scrambles (docs/cube-plan.md §7).
 *
 * A modal rather than a section on the screen, for a layout reason worth
 * recording: the cube owns its square outright and claims every pan inside it,
 * so a scrolling page underneath would be a gesture fight between "turn the
 * cube" and "scroll the list". Putting the list somewhere the cube isn't settles
 * that by construction instead of by threshold tuning.
 *
 * Tapping a row loads that scramble onto the cube and closes — the reason to
 * open this list is almost always to go look at one of them again.
 */
const CubeFavoritesModal = ({
  visible,
  theme,
  accent,
  favorites,
  currentAlg,
  onLoad,
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
            accessibilityLabel="Close favorite scrambles"
          >
            <MaterialCommunityIcons name="close" size={ICON_SIZE} color={titleColor} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: titleColor }]}>Favorite scrambles</Text>

          {favorites.length === 0 ? (
            <Text style={[styles.empty, { color: titleColor }]}>
              Nothing here yet. Tap Save under a scramble to keep it.
            </Text>
          ) : (
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollBody}>
              {favorites.map((favorite) => {
                const current = favorite.alg === currentAlg;
                const date = savedOn(favorite.savedAt);

                return (
                  <View
                    key={favorite.alg}
                    style={[
                      styles.row,
                      { borderColor: border },
                      current && { borderColor: accent, borderWidth: 2 },
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.rowBody}
                      onPress={() => onLoad(favorite.alg)}
                      accessibilityRole="button"
                      accessibilityLabel={`Load scramble ${favorite.alg}`}
                      accessibilityHint="Shows this scramble on the cube"
                    >
                      <Text style={[styles.rowAlg, { color: titleColor }]}>{favorite.alg}</Text>
                      <Text style={[styles.rowMeta, { color: titleColor }]}>
                        {[describeScramble(favorite.alg), date].filter(Boolean).join(' · ')}
                        {current ? ' · on the cube' : ''}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.rowDelete}
                      onPress={() => onRemove(favorite.alg)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove scramble ${favorite.alg}`}
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
    width: 320,
    maxWidth: '92%',
    maxHeight: '80%',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
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
    marginBottom: 12,
    textAlign: 'center',
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
    paddingRight: 4,
    marginBottom: 8,
  },
  rowBody: {
    flex: 1,
    paddingRight: 6,
  },
  rowAlg: {
    fontSize: 13,
    fontFamily: ALG_FONT,
    lineHeight: 18,
  },
  rowMeta: {
    fontSize: 11,
    opacity: 0.65,
    marginTop: 3,
  },
  rowDelete: {
    padding: 8,
  },
});

export default CubeFavoritesModal;
