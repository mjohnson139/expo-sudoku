import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenHeader from '../../components/ScreenHeader';
import useAppTheme from '../../hooks/useAppTheme';
import { CUBE_ACCENT, headerAction, styles as chrome } from './cubeChrome';
import { LIBRARY_ROUTE, useCube } from './CubeContext';
import { stageResults } from './stageChecks';
import { DEMOS_REQUIRED, projectJourney } from './journey';

const STATE_LABEL = { done: 'Done', open: 'Open', locked: 'Locked' };

const CubeJourney = ({ navigation }) => {
  const { theme } = useAppTheme();
  const { methods, solves } = useCube();
  const color = theme.colors.title;
  const border = theme.colors.numberPad.border;
  const surface = theme.colors.numberPad.background;
  // Replay every solve exactly once per live collection, never per card.
  const checks = useMemo(() => solves.map((solve) => ({
    solve: solve.id, method: solve.method, results: stageResults(solve),
  })), [solves]);
  const journey = useMemo(() => projectJourney(methods, checks), [methods, checks]);

  return <View style={[chrome.container, { backgroundColor: theme.colors.background }]}>
    <ScreenHeader title="Journey" theme={theme} onHomePress={navigation.goBack} homeIcon="chevron-left" homeLabel="Back to algorithms" dense actions={[
      headerAction({ name: 'bookshelf', label: 'Algorithms', hint: 'Returns to the algorithm library', onPress: () => navigation.navigate(LIBRARY_ROUTE), color, border }),
    ]} />
    <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
      <Text style={[styles.intro, { color }]}>Lock each stage in {DEMOS_REQUIRED} solves to open the next. Progress comes from your last 100 saved solves.</Text>
      {journey.map((method, methodIndex) => <View key={method.id} style={styles.track}>
        <View style={[styles.spine, { backgroundColor: border }]} />
        <View style={[styles.node, { borderColor: method.state === 'locked' ? border : CUBE_ACCENT, backgroundColor: method.state === 'done' ? CUBE_ACCENT : theme.colors.background }]} />
        <View style={[styles.card, { backgroundColor: surface, borderColor: method.state === 'locked' ? border : CUBE_ACCENT }]}>
          <View style={styles.heading}><Text style={[styles.name, { color }]}>{method.name}</Text>{method.user && <Text style={styles.yours}>Yours</Text>}<Text style={[styles.badge, method.state !== 'locked' && styles.badgeActive]}>{STATE_LABEL[method.state]}</Text></View>
          <View style={styles.stages}>{method.stages.map((stage) => <View key={stage.name} style={[styles.pill, { borderColor: stage.state === 'locked' ? border : CUBE_ACCENT }, stage.state === 'done' && styles.pillDone]}>
            <Text style={[styles.pillText, { color: stage.state === 'done' ? '#fff' : color }]}>{stage.name} · {Math.min(stage.count, DEMOS_REQUIRED)}/{DEMOS_REQUIRED}</Text>
          </View>)}</View>
          {method.gate && <Text style={[styles.gate, { color }]}>🔒 {method.gate}</Text>}
          {method.user && <Text style={[styles.unverified, { color }]}>Your stages count real locks without an exit-state check.</Text>}
        </View>
        {methodIndex === journey.length - 1 && <View style={[styles.spineEnd, { backgroundColor: border }]} />}
      </View>)}
    </ScrollView>
  </View>;
};

const styles = StyleSheet.create({
  list: { padding: 14, paddingBottom: 36 }, intro: { opacity: .7, lineHeight: 19, marginBottom: 14 },
  track: { paddingLeft: 29, paddingBottom: 14, position: 'relative' }, spine: { position: 'absolute', left: 8, top: 0, bottom: 0, width: 2 }, spineEnd: { position: 'absolute', left: 8, top: 0, height: 13, width: 2 },
  node: { position: 'absolute', left: 1, top: 12, width: 16, height: 16, borderRadius: 8, borderWidth: 3 },
  card: { borderWidth: 1, borderRadius: 11, padding: 12 }, heading: { flexDirection: 'row', alignItems: 'center', gap: 7 }, name: { flex: 1, fontSize: 17, fontWeight: '800' },
  badge: { color: '#777', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' }, badgeActive: { color: CUBE_ACCENT }, yours: { color: CUBE_ACCENT, fontSize: 11, fontWeight: '800' },
  stages: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 11 }, pill: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5 }, pillDone: { backgroundColor: CUBE_ACCENT, borderColor: CUBE_ACCENT }, pillText: { fontSize: 11, fontWeight: '700' },
  gate: { fontSize: 12, lineHeight: 17, marginTop: 10, opacity: .8 }, unverified: { fontSize: 11, lineHeight: 16, marginTop: 8, opacity: .6 },
});
export default CubeJourney;
