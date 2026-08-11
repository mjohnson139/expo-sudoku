import React, { useEffect, useRef } from 'react';
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

import { Btn, LinkBtn, Seg } from '../../components/Controls';
import { LEVELS, TrainingProgress, totalStars } from './levels';
import { PRESETS, PresetId, presetById } from './match';
import { Mode, maxN } from './puzzle';
import type { ColorLoopPalette } from './palette';

const ICON_SIZE = 24;

/**
 * Color Loop's way in — **the game's old home screen, as a menu**
 * (docs/colorloop-merge-plan.md §4.3).
 *
 * The sibling app was an app, so `ColorLoopGame.tsx` carried its own four-screen
 * router with its own front door: Training, Challenge and Quick Play as three
 * cards. Dropped onto this hub unchanged, a player taps "Color Loop" on the
 * front door and arrives at… another front door. So tapping the card now lands
 * on a **playable board**, and everything that was on that inner home screen
 * lives here, behind `ScreenHeader`'s menu button — the same corner Fungiku
 * opens its difficulty menu from, which is that component's stated contract.
 *
 * Built to `games/fungiku/FungikuMenuModal.js`'s shape rather than shared with
 * it: choosing what to play should not be a different act in each game, but that
 * menu is wired into Fungiku's own context and carries Fungiku-only controls.
 * Sharing the *shape* is what matters.
 *
 * ### What is in it, and what is only in it for now
 *
 * Free play, Training and Match are the three modes. **Touch feel** is the
 * fourth entry and it is the sibling app's developer screen — friction, flick,
 * magnet and twin — which plan §4.3 keeps behind the menu on the epic branch and
 * leaves as **open question 3** for the merge to `main`: a real setting, or the
 * tuned constants shipped and the sliders deleted. It is here so the operator
 * can answer that question with a phone rather than by argument.
 */
export default function ColorLoopMenuModal({
  visible,
  palette,
  n,
  mode,
  presetChoice,
  training,
  codeInput,
  onChangeCode,
  onSubmitCode,
  onPickSize,
  onPickMode,
  onPickPreset,
  onFreePlay,
  onTraining,
  onNewMatch,
  onTouchFeel,
  onClose,
}: {
  visible: boolean;
  palette: ColorLoopPalette;
  n: number;
  mode: Mode;
  presetChoice: PresetId;
  training: TrainingProgress;
  codeInput: string;
  onChangeCode: (v: string) => void;
  onSubmitCode: () => void;
  onPickSize: (v: number) => void;
  onPickMode: (v: Mode) => void;
  onPickPreset: (v: PresetId) => void;
  onFreePlay: () => void;
  onTraining: () => void;
  onNewMatch: () => void;
  onTouchFeel: () => void;
  onClose: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: visible ? 400 : 200,
      useNativeDriver: true,
    }).start();
  }, [visible, anim]);

  const cleared = training.unlocked >= LEVELS.length && !!training.best[LEVELS.length];
  const seg = {
    background: palette.segBackground,
    selected: palette.segSelected,
    text: palette.segText,
    selectedText: palette.segSelectedText,
    border: palette.panelBorder,
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: anim }]}>
        <View
          style={[styles.box, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}
        >
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="Close menu"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="close" size={ICON_SIZE} color={palette.panelText} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: palette.panelText }]}>Color Loop</Text>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollBody}
            showsVerticalScrollIndicator={false}
          >
            {/* ——— Free play ——————————————————————————————————————— */}
            <Text style={[styles.sectionLabel, { color: palette.panelLabel }]}>FREE PLAY</Text>

            {/* A size the current goal cannot reach is shown and dimmed rather
                than hidden: "diagonal stops at 4×4" is a rule worth seeing,
                and a chip row that changes length as you switch goals is a row
                that moves under your finger. */}
            <Seg
              options={[3, 4, 5, 6].map((v) => ({
                label: `${v}×${v}`,
                value: v,
                disabled: v > maxN(mode),
              }))}
              value={n}
              onChange={onPickSize}
              {...seg}
            />
            <View style={styles.gap} />
            <Seg
              options={[
                { label: 'Rows', value: 'rows' as Mode },
                { label: 'In order', value: 'ordered' as Mode },
                { label: 'Diagonal', value: 'diag' as Mode },
              ]}
              value={mode}
              onChange={onPickMode}
              {...seg}
            />
            <View style={styles.gap} />
            <Btn
              label="New board"
              onPress={onFreePlay}
              color={palette.button}
              textColor={palette.buttonText}
              pressedColor={palette.buttonPressed}
            />

            <View style={[styles.divider, { backgroundColor: palette.panelBorder }]} />

            {/* ——— Training ——————————————————————————————————————— */}
            <Text style={[styles.sectionLabel, { color: palette.panelLabel }]}>TRAINING</Text>
            <Text style={[styles.sectionSub, { color: palette.panelText }]}>
              Learn the loop, one board at a time
            </Text>
            <Text style={[styles.meta, { color: palette.accent }]}>
              {cleared ? 'All levels cleared' : `Level ${training.unlocked} of ${LEVELS.length}`}
              {'  ·  ★ '}
              {totalStars(training)}/{LEVELS.length * 3}
            </Text>
            <View style={styles.gap} />
            <Btn
              label="Open the ladder"
              small
              onPress={onTraining}
              color={palette.button}
              textColor={palette.buttonText}
              pressedColor={palette.buttonPressed}
            />

            <View style={[styles.divider, { backgroundColor: palette.panelBorder }]} />

            {/* ——— Match ——————————————————————————————————————————— */}
            <Text style={[styles.sectionLabel, { color: palette.panelLabel }]}>MATCH</Text>
            <Text style={[styles.sectionSub, { color: palette.panelText }]}>
              Race friends on identical boards
            </Text>
            <Seg
              options={PRESETS.map((p) => ({ label: p.name, value: p.id }))}
              value={presetChoice}
              onChange={onPickPreset}
              {...seg}
            />
            <Text style={[styles.meta, { color: palette.accent }]}>
              {presetById(presetChoice).tagline}
            </Text>
            <View style={styles.gap} />
            <Btn
              label="New match"
              small
              onPress={onNewMatch}
              color={palette.button}
              textColor={palette.buttonText}
              pressedColor={palette.buttonPressed}
            />

            <View style={[styles.divider, { backgroundColor: palette.panelBorder }]} />

            {/* ——— A code ——————————————————————————————————————————— */}
            {/* One field for both grammars. A player who was sent a code does not
                know or care whether it names one board or five, and asking them
                to pick the right box first would be the app's filing system
                leaking into the invitation. `handleCode` tries the match grammar
                and then the single-board one. */}
            <Text style={[styles.sectionLabel, { color: palette.panelLabel }]}>PLAY A CODE</Text>
            <View style={styles.codeRow}>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: palette.inputText,
                    backgroundColor: palette.inputBackground,
                    borderColor: palette.inputBorder,
                  },
                ]}
                value={codeInput}
                onChangeText={onChangeCode}
                placeholder="MS-K7P2Q or 4-K7P2Q"
                placeholderTextColor={palette.inputPlaceholder}
                autoCapitalize="characters"
                autoCorrect={false}
                onSubmitEditing={onSubmitCode}
                accessibilityLabel="Puzzle or match code"
              />
              <Btn
                label="Go"
                small
                onPress={onSubmitCode}
                color={palette.button}
                textColor={palette.buttonText}
                pressedColor={palette.buttonPressed}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: palette.panelBorder }]} />

            <LinkBtn label="Touch feel…" onPress={onTouchFeel} color={palette.link} />
          </ScrollView>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  box: {
    width: 300,
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
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  scroll: { alignSelf: 'stretch' },
  scrollBody: { alignItems: 'center', paddingBottom: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.6, marginBottom: 6 },
  sectionSub: { fontSize: 12.5, textAlign: 'center', marginBottom: 8 },
  meta: { fontSize: 11.5, marginTop: 8, textAlign: 'center' },
  gap: { height: 10 },
  divider: { height: 1, alignSelf: 'stretch', marginVertical: 14 },
  codeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    fontSize: 14,
    minWidth: 150,
  },
});
