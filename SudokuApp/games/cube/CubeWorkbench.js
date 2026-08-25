import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutAnimation, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenHeader from '../../components/ScreenHeader';
import useAppTheme from '../../hooks/useAppTheme';
import CubeAlgorithmSaveSheet from './CubeAlgorithmSaveSheet';
import CubeCasePreview from './CubeCasePreview';
import CubeMovePad from './CubeMovePad';
import CubeMoveTrack from './CubeMoveTrack';
import CubeScrubber from './CubeScrubber';
import CubeView from './CubeView';
import { caseOfAlgorithm, caseOfSetup, describeCase } from './algCase';
import { cubeFromAlg, solvedCube } from './cubeState';
import { CUBE_ACCENT, headerAction, styles as chrome } from './cubeChrome';
import { useCube } from './CubeContext';
import { mix } from '../../utils/color';
import {
  PROMOTE_MS, appendToken, applyPadPress, cancelInverse, cancelTail,
  condenseRepeat, consolidateTail, dropLastToken, promoteLastToken,
} from './solve';
import { moveCount } from './moves';
import { announcePosition } from './player';
import { PAD_EVENTS, initialPadVisibility, reducePadVisibility } from './swipeMode';
import useAppBackground from './useAppBackground';
import useCubeStage from './useCubeStage';
import useScramblePlayer from './useScramblePlayer';
import { inverseSetup, setupAt, workbenchDraft, workbenchSave } from './workbench';

const START = solvedCube();
const NO_MARKS = new Set();

/**
 * A cube-first algorithm editor (plan §3.2.5).
 *
 * Extraction decision: take the deliberately cheap path. The renderer, touch
 * hook, transport, track, scrubber, move pad and measured-stage hook were
 * already independent components, so this screen composes those pieces rather
 * than copying `CubeSolve`'s solve-specific phases, hold, rail and persistence.
 * Only the small move-writing coordinator is repeated for now; extracting the
 * whole apparatus would turn a behaviour change into a risky solve refactor.
 *
 * Its one extra row is the 60-point live-case row. At short heights those 60
 * points come directly from the cube; everything else replaces a row already
 * paid by `CubeSolve` rather than adding one.
 */
const CubeWorkbench = ({ navigation, route }) => {
  const { theme } = useAppTheme();
  const { algorithms, algorithmById, addAlgorithm, editAlgorithmById, yaw, pitch, turnTo, showOtherSide } = useCube();
  const id = route.params?.id || null;
  const entry = algorithmById(id);
  const initial = useRef(workbenchDraft(algorithms, entry)).current;
  const [moves, setMoves] = useState(initial.moves);
  const [setup, setSetup] = useState(initial.setup);
  const [selectingStart, setSelectingStart] = useState(id === null);
  const [openAtStart, setOpenAtStart] = useState(false);
  const [deriveFromMoves, setDeriveFromMoves] = useState(false);
  const [name, setName] = useState(initial.name);
  const [assignments, setAssignments] = useState(initial.assignments);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [padShown, setPadShown] = useState(initialPadVisibility);
  const padRef = useRef(initialPadVisibility);
  const [promoteKey, setPromoteKey] = useState(null);
  const [primed, setPrimed] = useState(false);
  const promoteTimer = useRef(null);
  const [gestureTurn, setGestureTurn] = useState(null);
  const { measureStage, cubeSize, room } = useCubeStage();
  const startingCube = useMemo(() => {
    if (selectingStart || !setup) return START;
    try { return cubeFromAlg(setup); } catch (error) { return START; }
  }, [selectingStart, setup]);
  const activeMoves = selectingStart ? setup : moves;
  const player = useScramblePlayer(activeMoves, startingCube);
  const { pause, handoff, afterSettle, retract, playTo, seek } = player;

  // Confirming a start promises to show that start. A changed player normally
  // opens at its end, which would immediately show the solved result and make
  // both "Use this start" and "Use inverse" look as though they did nothing.
  useEffect(() => {
    if (selectingStart || !openAtStart) return;
    seek(0);
    setOpenAtStart(false);
  }, [selectingStart, openAtStart, seek]);

  const armPromotion = useCallback((key) => {
    if (promoteTimer.current) clearTimeout(promoteTimer.current);
    setPromoteKey(key);
    promoteTimer.current = key ? setTimeout(() => setPromoteKey(null), PROMOTE_MS) : null;
  }, []);
  const resetGesture = useCallback(() => { armPromotion(null); setPrimed(false); }, [armPromotion]);
  useAppBackground(useCallback(() => { resetGesture(); setGestureTurn(null); }, [resetGesture]));

  const changePad = useCallback((event) => {
    const next = reducePadVisibility(padRef.current, event);
    if (next === padRef.current) return;
    padRef.current = next;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPadShown(next);
  }, []);

  const commitTurn = useCallback((move, t) => {
    handoff(t);
    const cancelling = cancelInverse(activeMoves, move.token) !== null;
    const folding = !cancelling && condenseRepeat(activeMoves, move.token) !== null;
    const write = selectingStart ? setSetup : setMoves;
    write((current) => appendToken(current, move.token));
    if (cancelling || folding) afterSettle(() => write((current) => {
      const tidied = cancelling ? cancelTail(current) : consolidateTail(current);
      return tidied === null ? current : tidied;
    }));
    requestAnimationFrame(() => setGestureTurn(null));
  }, [activeMoves, selectingStart, handoff, afterSettle]);

  const turning = useMemo(() => Platform.OS === 'web' ? null : {
    onTurn: setGestureTurn, onCommit: commitTurn, onPause: pause,
  }, [commitTurn, pause]);

  const tapKey = useCallback((key, { held = false } = {}) => {
    pause();
    const repeat = !primed && promoteKey === key;
    const write = selectingStart ? setSetup : setMoves;
    write((current) => applyPadPress(current, key, { held, repeat, primed }));
    const promoted = repeat && promoteLastToken(activeMoves, key) !== null;
    armPromotion(promoted || held || primed ? null : key);
    setPrimed(false);
  }, [pause, primed, promoteKey, activeMoves, selectingStart, armPromotion]);

  const undo = useCallback(() => {
    resetGesture();
    const write = selectingStart ? setSetup : setMoves;
    retract(() => write((current) => dropLastToken(current)));
  }, [resetGesture, retract, selectingStart]);

  const save = useCallback((details) => {
    const decision = workbenchSave({ id, moves, setup, ...details }, algorithms.length);
    if (!decision.ok) { setSaveError(decision.reason === 'full' ? 'The library is full. Delete an entry first.' : 'Write at least one move first.'); return; }
    if (decision.mode === 'edit') editAlgorithmById(id, decision.fields);
    else if (!addAlgorithm(decision.fields)) { setSaveError('The library is full. Delete an entry first.'); return; }
    setSaving(false);
    navigation.goBack();
  }, [id, moves, setup, algorithms.length, editAlgorithmById, addAlgorithm, navigation]);

  const previewSetup = deriveFromMoves ? inverseSetup(moves) : setup;
  const pattern = deriveFromMoves ? caseOfAlgorithm(moves) : caseOfSetup(setup);
  const previewCube = useMemo(() => {
    try { return cubeFromAlg(previewSetup); } catch (error) { return START; }
  }, [previewSetup]);
  const ink = theme.colors.title;
  const border = theme.colors.numberPad.border;
  const pending = mix(ink, theme.colors.background, 0.55);
  const count = moveCount(activeMoves);
  return <View style={[chrome.container, { backgroundColor: theme.colors.background }]}>
    <ScreenHeader title={selectingStart ? 'Set starting case' : (entry ? `Edit ${entry.name}` : 'Write algorithm')} theme={theme} dense
      onHomePress={navigation.goBack} homeIcon="chevron-left" homeLabel="Back to the library"
      actions={headerAction({ name: 'rotate-3d-variant', label: 'Turn the cube around', hint: 'Shows the hidden faces', onPress: showOtherSide, color: ink, border })} />

    <View style={styles.caseTrack}>
      {selectingStart ? (
        <CubeCasePreview cube={previewCube} size={56} label={`Starting cube. ${describeCase(pattern)}`} />
      ) : (
        // The tile is also the missing door back to the case in 3D. The
        // transport can technically seek to zero, but a generic jump glyph
        // does not say "show me the case"; tapping the picture of the case does.
        <TouchableOpacity
          style={styles.caseButton}
          onPress={() => { pause(); seek(0); }}
          accessibilityRole="button"
          accessibilityLabel={`${describeCase(pattern)}. Show starting case in 3D`}
          accessibilityHint="Moves the large cube back to the position where this algorithm begins"
        >
          <CubeCasePreview cube={previewCube} size={56} />
          <View style={[styles.caseBadge, { backgroundColor: CUBE_ACCENT }]}>
            <MaterialCommunityIcons name="cube-outline" size={10} color="#ffffff" />
          </View>
        </TouchableOpacity>
      )}
      <View style={styles.track}>
        <CubeMoveTrack tokens={player.tokens} index={player.index} marks={NO_MARKS} placeholder="Turn the cube to begin"
          accent={CUBE_ACCENT} theme={theme} pendingColor={pending} noun="algorithm"
          label={selectingStart ? `Setup: ${setup || 'solved'}` : `Algorithm: ${moves || 'nothing yet'}`} room={room} onSeek={playTo} />
      </View>
    </View>

    <View style={chrome.stage} onLayout={measureStage}>
      <CubeView cube={player.cube} turn={gestureTurn || player.turn} size={cubeSize} yaw={yaw} pitch={pitch}
        onOrbit={(nextYaw, nextPitch) => { pause(); turnTo(nextYaw, nextPitch); }} turning={turning}
        accessibilityLabel={`Cube — ${announcePosition(player.index, player.count, selectingStart ? 'setup' : 'algorithm')}`} />
    </View>
    <CubeScrubber index={player.index} count={player.count} playing={player.playing} rate={player.rate}
      accent={CUBE_ACCENT} theme={theme} noun={selectingStart ? 'setup' : 'algorithm'}
      startLabel={selectingStart ? 'Back to the solved cube' : 'Show the starting case in 3D'}
      onPlayPause={player.togglePlay} onStepBack={player.stepBack} onStepForward={player.stepForward}
      onSeek={seek} onCycleSpeed={player.cycleSpeed} padShown={padShown}
      onShowPad={() => changePad(PAD_EVENTS.SHOW)} onHidePad={() => changePad(PAD_EVENTS.HIDE)} canDelete={count > 0} onDelete={undo} />
    {padShown && <CubeMovePad canUndo={count > 0} promoteKey={promoteKey} primed={primed} accent={CUBE_ACCENT}
      theme={theme} onKey={tapKey} onPrime={() => setPrimed((value) => !value)} onUndo={undo} />}
    <View style={styles.actions}>
    {selectingStart && <TouchableOpacity style={[styles.secondaryButton, { borderColor: CUBE_ACCENT }]}
      onPress={() => {
        pause();
        setSetup(inverseSetup(moves));
        setDeriveFromMoves(!moves);
        setOpenAtStart(true);
        setSelectingStart(false);
      }} accessibilityRole="button"
      accessibilityLabel={moves ? 'Use the inverse as the starting case' : 'Derive the starting case after writing the algorithm'}>
      <MaterialCommunityIcons name="history" size={18} color={CUBE_ACCENT} />
      <Text style={[styles.secondaryText, { color: CUBE_ACCENT }]}>{moves ? 'Use inverse' : 'Derive later'}</Text>
    </TouchableOpacity>}
    <TouchableOpacity style={[styles.saveButton, { backgroundColor: CUBE_ACCENT }]}
      onPress={() => {
        resetGesture();
        if (selectingStart) {
          pause();
          // The cube on screen is the promise this button makes. If the setup
          // was scrubbed backward, keep only the prefix currently displayed
          // rather than silently restoring the later moves when authoring starts.
          setSetup(setupAt(player.tokens, player.index));
          setDeriveFromMoves(false);
          setOpenAtStart(true);
          setSelectingStart(false);
        }
        else { setSetup(''); setDeriveFromMoves(false); setSelectingStart(true); }
      }} accessibilityRole="button" accessibilityLabel={selectingStart ? 'Use this starting case' : 'Change the starting case'}>
      <MaterialCommunityIcons name={selectingStart ? 'check' : 'cube-scan'} size={18} color="#fff" />
      <Text style={styles.saveText}>{selectingStart ? 'Use this start' : 'Change start'}</Text>
    </TouchableOpacity>
    {!selectingStart && <TouchableOpacity style={[styles.saveButton, { backgroundColor: moveCount(moves) ? CUBE_ACCENT : border }]} disabled={!moveCount(moves)}
      onPress={() => { setSaveError(''); setSaving(true); }} accessibilityRole="button" accessibilityLabel="Save algorithm">
      <MaterialCommunityIcons name="content-save" size={18} color="#fff" /><Text style={styles.saveText}>Save algorithm</Text>
    </TouchableOpacity>}
    </View>
    <CubeAlgorithmSaveSheet visible={saving} theme={theme} accent={CUBE_ACCENT} initialName={name}
      initialAssignments={assignments} error={saveError} onClose={() => setSaving(false)} onSave={(details) => { setName(details.name); setAssignments(details.assignments); save(details); }} />
  </View>;
};

const styles = StyleSheet.create({
  caseTrack: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 60 },
  caseButton: { width: 56, height: 56 },
  caseBadge: { position: 'absolute', right: -3, bottom: -3, width: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  track: { flex: 1, minWidth: 0 },
  actions: { alignSelf: 'stretch', flexDirection: 'row', gap: 8, marginTop: 7 },
  saveButton: { flex: 1, minHeight: 40, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  secondaryButton: { flex: 1, minHeight: 40, borderWidth: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontWeight: '800', marginLeft: 6 },
  saveText: { color: '#fff', fontWeight: '800', marginLeft: 6 },
});
export default CubeWorkbench;
