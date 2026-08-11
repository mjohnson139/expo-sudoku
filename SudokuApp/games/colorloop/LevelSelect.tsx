import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import ScreenHeader from '../../components/ScreenHeader';
import { FadeSlideIn, ScalePress } from '../../components/Motion';
import { STAGGER } from '../../utils/motion';
import type { AppTheme } from '../../utils/themes';
import type { ColorLoopPalette } from './palette';
import { LEVELS, LevelDef, TrainingProgress, isUnlocked, totalStars } from './levels';

const PER_ROW = 6;

/**
 * The training ladder — eighteen rungs, three stars each.
 *
 * **A full screen rather than a modal**, which is plan §4.3's one exception to
 * "the inner hub becomes a menu": an eighteen-rung ladder with stars is not a
 * modal. What changed is where its back arrow goes — it returns to the *board*,
 * not to a hub, because the hub is one level up and reached from the header's
 * home button like every other screen in the app.
 *
 * Step 4 is the step that makes this ladder feel finished; here it needs to be
 * reachable, themed and not broken. The star thresholds in `levels.ts` are still
 * the sibling app's estimates and are still untuned — that is on the epic's
 * backlog, not in this step.
 */
export default function LevelSelect({
  progress,
  theme,
  palette,
  onPick,
  onExitToHub,
  onBackToBoard,
}: {
  progress: TrainingProgress;
  theme: AppTheme;
  palette: ColorLoopPalette;
  onPick: (id: number) => void;
  onExitToHub: () => void;
  onBackToBoard: () => void;
}) {
  const rows: LevelDef[][] = [];
  for (let i = 0; i < LEVELS.length; i += PER_ROW) rows.push(LEVELS.slice(i, i + PER_ROW));

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ScreenHeader
        title="Training"
        theme={theme}
        onHomePress={onExitToHub}
        dense
        actions={
          <ScalePress style={styles.starPill} onPress={onBackToBoard}>
            <Text selectable={false} style={[styles.starPillText, { color: palette.accent }]}>
              ★ {totalStars(progress)}/{LEVELS.length * 3}
            </Text>
          </ScalePress>
        }
      />

      <Text style={[styles.sub, { color: palette.muted }]}>
        Learn the loop — beat a level to open the next
      </Text>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {rows.map((row, r) => (
            <FadeSlideIn key={r} delay={STAGGER * (r + 1)} style={styles.row}>
              {row.map((level) => (
                <Chip
                  key={level.id}
                  level={level}
                  progress={progress}
                  palette={palette}
                  onPick={onPick}
                />
              ))}
            </FadeSlideIn>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function Stars({ count, palette }: { count: number; palette: ColorLoopPalette }) {
  return (
    <Text style={styles.chipStars}>
      {Array.from({ length: 3 }, (_, i) => (
        <Text key={i} style={{ color: i < count ? palette.accent : palette.starOff }}>
          ★
        </Text>
      ))}
    </Text>
  );
}

function Chip({
  level,
  progress,
  palette,
  onPick,
}: {
  level: LevelDef;
  progress: TrainingProgress;
  palette: ColorLoopPalette;
  onPick: (id: number) => void;
}) {
  const unlocked = isUnlocked(progress, level.id);
  const best = progress.best[level.id];

  if (!unlocked) {
    return (
      <View style={styles.cell}>
        <View
          style={[
            styles.chip,
            styles.chipLocked,
            { backgroundColor: palette.panel, borderColor: palette.panelBorder },
          ]}
          accessibilityLabel={`Level ${level.id}, locked`}
        >
          <Text style={[styles.chipNum, { color: palette.panelLabel }]}>{level.id}</Text>
        </View>
      </View>
    );
  }

  const next = level.id === progress.unlocked && !best;
  return (
    <View style={styles.cell}>
      <ScalePress
        style={[
          styles.chip,
          {
            backgroundColor: palette.panel,
            borderColor: next ? palette.accent : palette.panelBorder,
          },
        ]}
        onPress={() => onPick(level.id)}
      >
        <Text style={[styles.chipNum, { color: palette.panelText }]}>{level.id}</Text>
        <Stars count={best?.stars ?? 0} palette={palette} />
      </ScalePress>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    gap: 10,
    // The 600pt centred column is a web-only shape and `marginHorizontal: 'auto'`
    // is not a value native Yoga understands — same guard as
    // `NumberSlideScreen`'s container.
    ...(Platform.OS === 'web'
      ? { paddingTop: 20, paddingBottom: 20, maxWidth: 600, marginHorizontal: 'auto', width: '100%' }
      : {}),
  },
  scrollBody: { alignItems: 'center', paddingBottom: 12, width: '100%' },
  sub: { fontSize: 12.5, textAlign: 'center' },
  starPill: { paddingHorizontal: 6, paddingVertical: 2 },
  starPillText: { fontSize: 12, fontWeight: '600' },
  grid: { width: '100%', maxWidth: 400, gap: 9 },
  row: { flexDirection: 'row', gap: 9 },
  cell: { flex: 1 },
  chip: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  chipLocked: { opacity: 0.4 },
  chipNum: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  chipStars: { fontSize: 9, letterSpacing: 1 },
});
