import React, { useEffect, useState } from 'react';
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DIFFICULTIES } from './difficulty';
import { SIZES } from './engine';

const ICON_SIZE = 24;

/**
 * The one constant that hides the developer controls (plan §14.1).
 *
 * Seeds and raw sizes are how a reported board gets reopened by hand, so they
 * stay reachable while the game is being built — but they are a developer
 * control, not a way a player picks a puzzle. Flip this to `false` and the menu
 * is four difficulty buttons; nothing else has to change, which is the point of
 * putting it behind a constant rather than deleting the UI later.
 *
 * **Off since the epic merged to `main` (Step 13).** The gift-coins button was
 * the deciding one: the assist economy (§14.4) is the thing the next play
 * sessions are meant to measure, and a button that hands out ten coins means
 * nobody ever plays for them. Free play and the seed field went with it because
 * they answer developer questions, not player ones. Set it back to `true`
 * locally to reopen a reported board by seed — that is what it is for.
 */
export const SHOW_DEVELOPER_CONTROLS = false;

/**
 * Fungiku's way in (docs/fungiku-plan.md §14.1).
 *
 * Deliberately built to Sudoku's `components/modals/GameMenuModal` — the same
 * four rungs, the same words, the same emoji, the same button colors, in the same
 * order. The platform hosts several games and picking a difficulty should not be
 * a different act in each one. It is a separate component rather than a shared
 * one because Sudoku's menu is wired straight into `GameContext` and carries
 * Sudoku-only controls; sharing the *shape* is what matters here.
 *
 * Below the rungs: free play. A size chip reaches one exact board size, which is
 * how a size gets checked by hand, and the seed field reopens a specific
 * `{difficulty, seed}` board. Both sit behind SHOW_DEVELOPER_CONTROLS.
 */
const FungikuMenuModal = ({
  visible,
  theme,
  difficulty,
  size,
  seed,
  generating,
  coins,
  onPickDifficulty,
  onPickSize,
  onPickSeed,
  onGiftCoins,
  onClose,
}) => {
  const [menuAnim] = useState(new Animated.Value(0));

  // Local, so typing is not a state update per keystroke on the game — and so a
  // half-typed seed is never dispatched. Re-synced whenever the menu opens or
  // the board's seed changes underneath it (New puzzle, for instance).
  const [seedText, setSeedText] = useState(String(seed));
  useEffect(() => {
    setSeedText(String(seed));
  }, [seed, visible]);

  useEffect(() => {
    Animated.timing(menuAnim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 400 : 200,
      useNativeDriver: true,
    }).start();
  }, [visible, menuAnim]);

  const titleColor = theme.colors.title;
  const surface = theme.colors.numberPad.background;
  const border = theme.colors.numberPad.border;

  const submitSeed = () => {
    const parsed = Number.parseInt(seedText, 10);
    // A seed that is not a number is a typo, not a request. Snap the field back
    // rather than generating something the typist did not ask for.
    if (!Number.isFinite(parsed)) {
      setSeedText(String(seed));
      return;
    }
    onPickSeed(parsed);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: menuAnim }]}>
        <View style={[styles.box, { backgroundColor: surface, borderColor: border }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="Close menu"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="close" size={ICON_SIZE} color={titleColor} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: titleColor }]}>Fungiku</Text>
          <Text style={[styles.subtitle, { color: titleColor }]}>Select Difficulty</Text>

          {/* A menu tall enough to scroll on a short screen once free play is
              showing. Bounded by maxHeight rather than left to overflow. */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollBody}
            showsVerticalScrollIndicator={false}
          >
            {DIFFICULTIES.map((rung) => {
              const current = rung.id === difficulty;

              return (
                <TouchableOpacity
                  key={rung.id}
                  style={[
                    styles.button,
                    BUTTON_TINTS[rung.id],
                    current && { borderColor: titleColor, borderWidth: 2 },
                    generating && styles.disabled,
                  ]}
                  onPress={() => onPickDifficulty(rung.id)}
                  disabled={generating}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !!generating, selected: current }}
                  // The rung's sizes are announced because "Hard" on its own does
                  // not say the board is about to get bigger — and the state is
                  // named in the label because accessibilityState.selected does
                  // not reach the web reliably.
                  accessibilityLabel={`Start ${rung.label} game${current ? ', current' : ''}, ${describeSizes(rung.sizes)}`}
                >
                  <Text style={styles.buttonEmoji}>{rung.emoji}</Text>
                  <Text style={[styles.buttonText, { color: theme.colors.text || '#333' }]}>
                    {rung.label}
                  </Text>
                  <Text style={[styles.buttonMeta, { color: theme.colors.text || '#333' }]}>
                    {describeSizes(rung.sizes)}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {SHOW_DEVELOPER_CONTROLS && (
              <View style={styles.devSection}>
                <Text style={[styles.sectionLabel, { color: titleColor }]}>
                  Free play (developer)
                </Text>

                {/* Board size chips — moved off the game screen into the menu, so
                    the board is a board and every way into a puzzle is in one
                    place. Still every size the engine supports, straight from
                    SIZES (plan §14.1). */}
                <View style={styles.chipRow}>
                  {SIZES.map((option) => (
                    <TouchableOpacity
                      key={option}
                      onPress={() => onPickSize(option)}
                      disabled={generating}
                      style={[
                        styles.chip,
                        { borderColor: border },
                        option === size && { backgroundColor: titleColor, borderColor: titleColor },
                        generating && styles.disabled,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !!generating, selected: option === size }}
                      accessibilityLabel={`${option} by ${option} board${option === size ? ', current' : ''}`}
                    >
                      <Text
                        style={[styles.chipText, { color: option === size ? surface : titleColor }]}
                      >
                        {option}×{option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.sectionLabel, { color: titleColor }]}>Seed</Text>
                <View style={styles.seedRow}>
                  <TextInput
                    value={seedText}
                    onChangeText={setSeedText}
                    onSubmitEditing={submitSeed}
                    keyboardType="number-pad"
                    returnKeyType="go"
                    style={[styles.seedInput, { color: titleColor, borderColor: border }]}
                    accessibilityLabel="Puzzle seed"
                    accessibilityHint="A seed and a difficulty always rebuild the same board"
                  />
                  <TouchableOpacity
                    onPress={submitSeed}
                    disabled={generating}
                    style={[
                      styles.seedButton,
                      { borderColor: border },
                      generating && styles.disabled,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Open this seed"
                  >
                    <MaterialCommunityIcons name="dice-multiple" size={16} color={titleColor} />
                    <Text style={[styles.seedButtonText, { color: titleColor }]}>Go</Text>
                  </TouchableOpacity>
                </View>

                {/* **The purchase seam, standing in for a store that is not in
                    scope** (plan §14.4). A gift, a reward and a purchase are all
                    one call — `grant()` — and this button is the third of them
                    with the till left out. In-app purchase needs
                    `react-native-iap` or RevenueCat, neither of which runs in
                    Expo Go, so building it would break the epic's rule that
                    every step is visible on a device.

                    It is also how the wallet gets exercised without solving four
                    boards first, which is why it sits with the other developer
                    controls rather than anywhere a player would find it. */}
                <Text style={[styles.sectionLabel, { color: titleColor }]}>
                  Coins ({coins})
                </Text>
                <TouchableOpacity
                  onPress={onGiftCoins}
                  style={[styles.seedButton, styles.giftButton, { borderColor: border }]}
                  accessibilityRole="button"
                  accessibilityLabel="Gift ten coins"
                  accessibilityHint="Stands in for a purchase; both are the same grant"
                >
                  <MaterialCommunityIcons name="gift-outline" size={16} color={titleColor} />
                  <Text style={[styles.seedButtonText, { color: titleColor }]}>Gift 10 coins</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </Animated.View>
    </Modal>
  );
};

/** "5×5 or 6×6" / "10×10" — how a rung says what it will hand you. */
const describeSizes = (sizes) => sizes.map((n) => `${n}×${n}`).join(' or ');

// Sudoku's menu button colors, matched rung for rung: easy green, medium amber,
// hard and expert red.
const BUTTON_TINTS = {
  easy: { backgroundColor: '#d4edda' },
  medium: { backgroundColor: '#ffeeba' },
  hard: { backgroundColor: '#f8d7da' },
  expert: { backgroundColor: '#f8d7da' },
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  box: {
    width: 280,
    maxHeight: '88%',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 14,
  },
  scroll: {
    alignSelf: 'stretch',
  },
  scrollBody: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  button: {
    width: 200,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  buttonMeta: {
    fontSize: 11,
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.35,
  },
  devSection: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    opacity: 0.7,
    marginTop: 8,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 3,
    marginVertical: 3,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  seedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seedInput: {
    width: 96,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 13,
    marginRight: 8,
  },
  seedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  seedButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  giftButton: {
    alignSelf: 'center',
  },
});

export default FungikuMenuModal;
