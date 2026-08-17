import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

/**
 * What the gesture layer is actually measuring, on the glass
 * (`docs/cube-front-face-prompt.md` §4).
 *
 * **Temporary, and the point of it is to stop the guessing.** Two attempts at
 * the fast-movement problem were fixes for causes that were *reasoned* and never
 * observed, and the second one broke the animation and had to be reverted. Every
 * number below is one of those theories, made visible instead of assumed.
 *
 * ### It stays on screen after the finger lifts, on purpose
 *
 * A live readout during a fast flick is unreadable — the interesting values are
 * gone before the eye arrives. So this is not cleared on release: the last
 * gesture's numbers sit there to be read, and the **peaks** are what to read.
 * `peak/samp` is the big one. If a single sample ever approaches 180°, the
 * aliasing theory is confirmed; if it never gets near, that theory is dead and
 * the fast-movement bug is somewhere else entirely.
 *
 * `pointerEvents="none"` throughout: a debug overlay that ate touches would be
 * measuring itself.
 */
const CubeTouchDebug = ({ report }) => {
  if (!report) return null;

  const deg = (radians) => `${((radians * 180) / Math.PI).toFixed(0)}°`;
  const num = (value, places = 2) =>
    Number.isFinite(value) ? value.toFixed(places) : '—';

  const rows = [
    ['mode', report.mode + (report.angular ? ' · circle' : '')],
    ['touches', String(report.touches)],
    ['face', report.normal ? `[${report.normal}] @ [${report.pos}]` : '—'],
    ['drag', `${num(report.dx, 0)}, ${num(report.dy, 0)}  (${num(report.reach, 0)}pt)`],
    ['speed', `${num(report.speed, 0)} pt/s`],
    ['peak spd', `${num(report.peakSpeed, 0)} pt/s`],
    ['samples', `${report.samples} @ ${num(report.gap, 0)}ms`],
    ['last samp', deg(report.turned)],
    ['peak samp', deg(report.peak)],
    ['sweep', deg(report.sweep)],
    ['drawn', deg(report.shown)],
    ['turns · t', `${report.turns ?? '—'} · ${num(report.t)}`],
    ['move', report.token || '—'],
  ];

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.panel} pointerEvents="none">
        {rows.map(([label, value]) => (
          <View key={label} style={styles.row} pointerEvents="none">
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}
        <Text style={styles.note}>
          peak samp near 180° = the reading can reverse
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  panel: {
    margin: 6,
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.72)',
    minWidth: 176,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: '#8fb6ff',
    fontSize: 9.5,
    marginRight: 8,
    ...Platform.select({ ios: { fontFamily: 'Menlo' }, android: { fontFamily: 'monospace' } }),
  },
  value: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '600',
    ...Platform.select({ ios: { fontFamily: 'Menlo' }, android: { fontFamily: 'monospace' } }),
  },
  note: {
    color: '#ffcf8f',
    fontSize: 8.5,
    marginTop: 3,
  },
});

export default CubeTouchDebug;
