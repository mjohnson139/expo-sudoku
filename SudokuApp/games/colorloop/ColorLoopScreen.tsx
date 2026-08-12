import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';

import ScreenHeader from '../../components/ScreenHeader';
import useAppTheme from '../../hooks/useAppTheme';
import useBoardSize from '../../hooks/useBoardSize';
import { Btn, LinkBtn, Slider } from '../../components/Controls';
import Confetti from '../../components/Confetti';
import { FadeSlideIn, PopIn, useCountUp } from '../../components/Motion';
import { DUR, EASE, USE_NATIVE } from '../../utils/motion';
import { formatElapsed } from '../../utils/gameProgress';

import Board from './Board';
import ColorLoopMenuModal from './ColorLoopMenuModal';
import LevelSelect from './LevelSelect';
import { COLORS } from './colors';
import { computeGeom } from './geometry';
import { LEVELS, TrainingProgress, applyWin, starsFor, totalStars } from './levels';
import {
  MatchPreset,
  MatchSplit,
  PresetId,
  encodeMatchCode,
  formatMatchResult,
  matchSeeds,
  parseMatchCode,
  presetById,
  totalMoves,
  totalSecs,
} from './match';
import { colorLoopPalette } from './palette';
import {
  Grid,
  Mode,
  effectiveMoves,
  encodeCode,
  isSolved,
  makeScrambled,
  maxN,
  parseCode,
  rotateLine,
} from './puzzle';
import {
  BestEntry,
  ColorLoopBoard,
  ColorLoopSave,
  MatchBestEntry,
  PHYSICS_RANGE,
  Physics,
  SavedPlay,
  bestKey,
  emptyColorLoopSave,
} from './saveShape';
import { loadColorLoopSave, saveColorLoop } from './storage';

type Phase = 'armed' | 'live' | 'won';
type Screen = 'play' | 'training' | 'touch';

type PlayCtx =
  | { kind: 'free' }
  | { kind: 'level'; id: number }
  | {
      kind: 'match';
      code: string;
      preset: MatchPreset;
      seeds: number[];
      boardIdx: number;
      splits: MatchSplit[];
    };

/**
 * What of a `PlayCtx` reaches storage, and how it comes back.
 *
 * A match's `preset` and `seeds` are dropped on the way out and rebuilt on the
 * way in, because both are pure functions of the code — which is the whole
 * reason a match is cheap enough to resume at all (`saveShape.ts`'s note on
 * `SavedPlay`). `parseMatchCode` returning null cannot happen against a record
 * the reader accepted; the branch is here because it is the only honest way to
 * type it, and a fresh board is the right answer if it ever fires.
 */
const savedPlayOf = (ctx: PlayCtx): SavedPlay =>
  ctx.kind === 'match'
    ? { kind: 'match', code: ctx.code, boardIdx: ctx.boardIdx, splits: ctx.splits }
    : ctx;

const playCtxOf = (saved: SavedPlay): PlayCtx | null => {
  if (saved.kind !== 'match') return saved;
  const parsed = parseMatchCode(saved.code);
  if (!parsed) return null;
  return {
    kind: 'match',
    code: saved.code,
    preset: parsed.preset,
    seeds: matchSeeds(parsed.seed, parsed.preset.boards.length),
    boardIdx: saved.boardIdx,
    splits: saved.splits,
  };
};

/**
 * Color Loop — drag any row or column and it wraps until every row is one solid
 * colour. The hub's fifth card, and the game the epic is named after
 * (docs/colorloop-merge-plan.md, Step 2).
 *
 * ### Tapping the card lands on a board
 *
 * The sibling app's `ColorLoopGame.tsx` was an app: a four-screen router with
 * its own home screen offering Training, Challenge and Quick Play. On this hub
 * that would be a second front door one tap behind the first. So this screen
 * opens **playable**, and the modes moved into `ColorLoopMenuModal` behind
 * `ScreenHeader`'s menu button, where Fungiku's difficulty menu already is
 * (plan §4.3). Only the ladder stayed a full screen — eighteen rungs with stars
 * is not a modal — and its back arrow returns here rather than to a hub.
 *
 * ### There is no colour in this file
 *
 * Every one of them comes from `./palette.ts` (chrome, derived from
 * `useAppTheme` and held to a measured contrast floor on all seven themes) or
 * from `./colors.ts` (the seven fixed tile hues, the platform's own Okabe–Ito
 * palette). Walnut and brass are gone rather than preserved — operator,
 * 2026-08-08, plan §4.2 — and cycling the theme is expected to carry this whole
 * screen with it.
 *
 * ### The page does not scroll
 *
 * The board claims every gesture inside its square, and a `ScrollView` wrapping
 * it would put the two in competition for each drag — the race this repo already
 * lost once on Fungiku's board. It is a fixed column, and the board is sized
 * from the room the page has rather than from the window alone.
 *
 * ### The clock, and the bug that only a restored board can show you
 *
 * Number Slide's clock froze for the whole of every *restored* game because "is
 * it running" was a `useRef`, and the effect that owns the `setInterval` cannot
 * depend on a ref (plan §4.4). On a fresh board an unrelated dependency flipped
 * and started the interval **by accident**; on a restored one nothing in the
 * dependency list ever changed again. It typechecked and passed 1,059 tests.
 *
 * Step 2 left this note saying the failing case could not arise here because
 * there was nothing to restore. **Step 3 is where that stopped being true**, so
 * this is what holds instead:
 *
 * - The interval below depends on **`phase`, which is state**, and on nothing
 *   else. A restored board that was under way sets `phase` to `'live'`, so the
 *   effect re-runs and creates the interval the same way a `Start` tap does.
 * - `startTimeRef` is re-anchored to `Date.now() - secs * 1000` **before** that
 *   `setPhase`, so the first tick reads a start time that already accounts for
 *   the time the board had spent. It is a ref because it is read from closures,
 *   never reacted to — which is the only job a ref beside an effect may have.
 * - Time on the hub is not counted, and that falls out of the screen being
 *   unmounted there rather than needing a rule.
 *
 * No test substitutes for the thirty-second check: start a board, make a move,
 * go to the hub, come back, watch the clock for five seconds.
 */
const ColorLoopScreen = ({ onExitToHub }: { onExitToHub: () => void }) => {
  const { theme, isDark } = useAppTheme();
  const palette = useMemo(() => colorLoopPalette(theme, isDark), [theme, isDark]);

  // Hydration gate. Until the save is read there is nothing honest to draw: the
  // board dealt depends on the size and goal the player last chose, and dealing
  // one immediately would flash a puzzle they never asked for. `CubeScreen` and
  // `NumberSlideScreen` gate the same way.
  const [hydrated, setHydrated] = useState(false);
  const [screen, setScreen] = useState<Screen>('play');
  const [menuOpen, setMenuOpen] = useState(false);
  const [playCtx, setPlayCtx] = useState<PlayCtx>({ kind: 'free' });

  // The live board.
  const [n, setN] = useState(4);
  const [mode, setMode] = useState<Mode>('rows');
  const [seed, setSeed] = useState(randomSeed);
  const [grid, setGrid] = useState<Grid>(() => makeScrambled(seed, 4, 'rows'));
  const [phase, setPhase] = useState<Phase>('armed');
  const [moves, setMoves] = useState(0);
  const [secs, setSecs] = useState(0);

  /**
   * The board a fresh free-play deal will use.
   *
   * **Separate from the live `n`/`mode` on purpose**, and it is the sibling
   * app's own rule made explicit rather than a change: `loadBoard` there was
   * commented *"reset board state for a specific puzzle without touching
   * free-play prefs"*, because playing a 3×3 training rung must not silently
   * become your preference. Holding it as its own state instead of as an
   * omission means the menu can show what "New board" will actually deal, even
   * while a level is on screen.
   */
  const [prefs, setPrefs] = useState<{ n: number; mode: Mode }>({ n: 4, mode: 'rows' });

  // Everything else that persists.
  const [physics, setPhysics] = useState<Physics>(() => emptyColorLoopSave().physics);
  const [bestMap, setBestMap] = useState<Record<string, BestEntry>>({});
  const [matchBest, setMatchBest] = useState<Record<string, MatchBestEntry>>({});
  const [training, setTraining] = useState<TrainingProgress>({ unlocked: 1, best: {} });
  const [playerName, setPlayerName] = useState('');

  const [presetChoice, setPresetChoice] = useState<PresetId>('sprint');
  const [wasRecord, setWasRecord] = useState(false);
  const [toast, setToast] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const startTimeRef = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadColorLoopSave().then((saved) => {
      if (cancelled) return;
      setPrefs({ n: saved.n, mode: saved.mode });
      setN(saved.n);
      setMode(saved.mode);
      setPlayerName(saved.playerName);
      setBestMap(saved.bestMap);
      setPhysics(saved.physics);
      setTraining(saved.training);
      setMatchBest(saved.matchBest);

      // The board the player left, if there is one this build can trust.
      //
      // **Its `n`/`mode` are not written back into `prefs`** — the two are held
      // apart for exactly this case: a restored board may be a training rung's
      // or a match leg's, and playing one must not silently become the shape
      // "New board" deals.
      const restored = saved.board;
      const restoredCtx = restored ? playCtxOf(restored.ctx) : null;
      if (restored && restoredCtx) {
        setPlayCtx(restoredCtx);
        setN(restored.n);
        setMode(restored.mode);
        setSeed(restored.seed);
        setGrid(restored.grid);
        setMoves(restored.moves);
        setSecs(restored.secs);
        if (restored.phase === 'live') {
          // Anchored *before* the phase changes, so the interval's first tick
          // already reads a start time that accounts for the time this board
          // had spent. See the note in this file's header — the ref is read
          // from closures, and `phase` is what the effect reacts to.
          startTimeRef.current = Date.now() - restored.secs * 1000;
          setPhase('live');
        }
      } else {
        const sd = randomSeed();
        setSeed(sd);
        setGrid(makeScrambled(sd, saved.n, saved.mode));
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * The clock. **`phase` is state**, so this effect sees every transition — see
   * the note in this file's header about the bug this shape hid in Number Slide.
   */
  useEffect(() => {
    if (phase !== 'live') return undefined;
    const id = setInterval(() => {
      setSecs(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [phase]);

  // Leaving the screen mid-toast, or mid-match-advance, must not leave a timer
  // holding a setState on an unmounted tree.
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    []
  );

  /* ---------- what the board currently is ---------- */

  // Ahead of persistence rather than beside the lifecycle handlers below,
  // because the save reads `matchMid` and a `const` cannot be read above its
  // own declaration. Every one of these is a pure derivation of state already
  // in hand.
  const code = encodeCode(n, seed, mode);
  const bk = bestKey(n, mode);
  const best = bestMap[bk];

  const levelDef = playCtx.kind === 'level' ? LEVELS[playCtx.id - 1] : undefined;
  const matchCount = playCtx.kind === 'match' ? playCtx.preset.boards.length : 0;
  // Mid-match solves get the solve wave only; the celebration waits for the last
  // board.
  const matchMid = playCtx.kind === 'match' && playCtx.boardIdx < matchCount - 1;

  /* ---------- persistence ---------- */

  /**
   * The board in flight, or null when there is nothing to come back to.
   *
   * A finished puzzle is not something to continue, and a save left behind would
   * give the hub card a badge that reopens a win screen — so a solve writes null
   * rather than a solved grid. **`won` is never stored**, which is why
   * `SavedPhase` does not have it.
   */
  const boardSave: ColorLoopBoard | null =
    phase === 'won'
      ? null
      : { seed, n, mode, grid, moves, secs, phase, ctx: savedPlayOf(playCtx) };

  const save: ColorLoopSave = {
    // Only free play writes the size and goal back, for the reason `prefs`
    // exists at all.
    n: prefs.n,
    mode: prefs.mode,
    playerName,
    bestMap,
    physics,
    training,
    matchBest,
    board: boardSave,
  };

  /**
   * Between two match boards the run is not over and this board is done.
   *
   * `phase` is `'won'` for the 850ms the solve wave runs before the next leg
   * arms itself, and neither answer the branch above can give is right for that
   * moment: null throws the match away, and the solved grid is not a board
   * anyone can play. So the ref simply keeps the last board that *was* worth
   * returning to — the previous leg, one move from solved, with its splits — and
   * the next `loadBoard` overwrites it a moment later.
   */
  const midMatchHandoff = phase === 'won' && matchMid;
  const saveRef = useRef(save);
  if (!midMatchHandoff) saveRef.current = save;

  /**
   * Driven by the board rather than by the clock. **`secs` is deliberately not a
   * dependency**: an effect on it would write once a second for as long as the
   * screen is open, to record a number the next move updates anyway. The seconds
   * still land, because every write carries the current value and the two
   * flushes below carry the last one — `NumberSlideScreen`'s comment on its own
   * effect spells out the same arrangement.
   */
  useEffect(() => {
    if (!hydrated) return;
    saveColorLoop(saveRef.current);
  }, [
    hydrated,
    prefs,
    playerName,
    bestMap,
    physics,
    training,
    matchBest,
    grid,
    moves,
    phase,
    playCtx,
    n,
    mode,
    seed,
  ]);

  /**
   * Write the pending save immediately.
   *
   * Both callers need this and neither can wait 500ms: a game screen unmounts
   * the instant the player taps home, and a backgrounded app may not get another
   * turn. `flush()` alone would replay the *previous* arguments, so the current
   * save is queued first and flushed second — the arrangement
   * `NumberSlideScreen` and `usePersistentReducer` both make.
   */
  const persistNow = useCallback(() => {
    if (!hydrated) return;
    saveColorLoop(saveRef.current);
    saveColorLoop.flush();
  }, [hydrated]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') persistNow();
    });
    return () => subscription.remove();
  }, [persistNow]);

  useEffect(() => () => persistNow(), [persistNow]);

  /* ---------- toasts ---------- */

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  };

  /* ---------- board lifecycle ---------- */

  /** Reset board state for a specific puzzle, without touching free-play prefs. */
  const loadBoard = (nn: number, mm: Mode, sd: number, scramble?: number) => {
    setN(nn);
    setMode(mm);
    setSeed(sd);
    setGrid(makeScrambled(sd, nn, mm, scramble));
    setMoves(0);
    setSecs(0);
    setWasRecord(false);
    setShowNameEdit(false);
    setPhase('armed');
  };

  /** Deal a fresh free-play board — and remember the shape of it. */
  const startNew = (newSeed?: number | null, newN?: number, newMode?: Mode) => {
    let nn = newN ?? prefs.n;
    const mm = newMode ?? prefs.mode;
    if (nn > maxN(mm)) nn = maxN(mm);
    const sd = (newSeed ?? randomSeed()) >>> 0;
    setPrefs({ n: nn, mode: mm });
    setPlayCtx({ kind: 'free' });
    loadBoard(nn, mm, sd);
  };

  const begin = () => {
    startTimeRef.current = Date.now();
    setPhase('live');
  };

  // The armed cover lifts off the board before play begins.
  const coverT = useRef(new Animated.Value(1)).current;
  const liftCover = () => {
    Animated.timing(coverT, {
      toValue: 0,
      duration: DUR.snap,
      easing: EASE.exit,
      useNativeDriver: USE_NATIVE,
    }).start(() => {
      begin();
      coverT.setValue(1);
    });
  };

  // The win backdrop waits for the board's solve wave before dimming it.
  const backdropT = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (phase !== 'won') return;
    backdropT.setValue(0);
    Animated.timing(backdropT, {
      toValue: 1,
      duration: 320,
      delay: 520,
      easing: EASE.standard,
      useNativeDriver: USE_NATIVE,
    }).start();
  }, [phase, backdropT]);

  const winSecs = playCtx.kind === 'match' ? totalSecs(playCtx.splits) : secs;
  const shownSecs = useCountUp(winSecs, phase === 'won', 1200);

  const startLevel = (id: number) => {
    const def = LEVELS[id - 1];
    if (!def) return;
    setPlayCtx({ kind: 'level', id });
    loadBoard(def.n, def.mode, def.seed, def.scramble);
    setScreen('play');
  };

  const startMatch = (preset: MatchPreset, sd: number) => {
    const seeds = matchSeeds(sd, preset.boards.length);
    setPlayCtx({
      kind: 'match',
      code: encodeMatchCode(preset.id, sd),
      preset,
      seeds,
      boardIdx: 0,
      splits: [],
    });
    loadBoard(preset.boards[0].n, preset.boards[0].mode, seeds[0]);
    setScreen('play');
  };

  const newMatch = async () => {
    const preset = presetById(presetChoice);
    const sd = randomSeed();
    await Clipboard.setStringAsync(encodeMatchCode(preset.id, sd));
    startMatch(preset, sd);
    showToast('Match code copied — send it to your rivals');
  };

  const rematch = () => {
    if (playCtx.kind !== 'match') return;
    const pm = parseMatchCode(playCtx.code);
    if (pm) startMatch(pm.preset, pm.seed);
  };

  const onSolved = () => {
    const t = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setSecs(t);
    setPhase('won');
    // The win is announced by the board — the solve wave, then the card. There
    // is deliberately no haptic: the app has none anywhere (plan §6), and the
    // sibling app's `Vibration` call was dropped rather than translated.

    if (playCtx.kind === 'match') {
      const splits = [...playCtx.splits, { secs: t, moves }];
      if (playCtx.boardIdx < playCtx.preset.boards.length - 1) {
        // Mid-match: let the solve wave land, then arm the next board.
        const next = { ...playCtx, boardIdx: playCtx.boardIdx + 1, splits };
        advanceTimer.current = setTimeout(() => {
          setPlayCtx(next);
          const b = next.preset.boards[next.boardIdx];
          loadBoard(b.n, b.mode, next.seeds[next.boardIdx]);
        }, 850);
        return;
      }
      setPlayCtx({ ...playCtx, splits });
      const total = totalSecs(splits);
      const prev = matchBest[playCtx.code];
      const record = !prev || total < prev.secs;
      setWasRecord(record);
      if (record) {
        setMatchBest({
          ...matchBest,
          [playCtx.code]: { secs: total, moves: totalMoves(splits), name: playerName },
        });
      }
      return;
    }

    if (playCtx.kind === 'level') {
      const prev = training.best[playCtx.id];
      setWasRecord(!prev || t < prev.secs);
      setTraining(applyWin(training, playCtx.id, t, moves));
      return;
    }

    const prev = bestMap[bk];
    const record = !prev || t < prev.secs;
    setWasRecord(record);
    if (record) setBestMap({ ...bestMap, [bk]: { secs: t, name: playerName } });
    if (!playerName) {
      setShowNameEdit(true);
      setNameInput('');
    }
  };

  const onCommit = (axis: 'row' | 'col', indices: number[], cells: number) => {
    if (phase !== 'live') return;
    const did = effectiveMoves(cells, n);
    if (did === 0) return;
    let next = grid;
    for (const idx of indices) next = rotateLine(next, axis, idx, cells);
    setGrid(next);
    setMoves(moves + did);
    if (isSolved(next, mode)) onSolved();
  };

  /* ---------- codes ---------- */

  const copyCode = async () => {
    await Clipboard.setStringAsync(code);
    showToast('Puzzle code copied — share it to race');
  };

  const copyResult = async () => {
    if (playCtx.kind !== 'match') return;
    await Clipboard.setStringAsync(formatMatchResult(playCtx.code, playCtx.splits, playerName));
    showToast('Result copied — paste it in the group chat');
  };

  /**
   * One field, both grammars. A match code is tried first because
   * `parseCode` deliberately rejects it — the two grammars do not overlap, and
   * `match.test.ts` pins that they do not.
   */
  const handleCode = () => {
    const m = parseMatchCode(codeInput);
    if (m) {
      setCodeInput('');
      setMenuOpen(false);
      startMatch(m.preset, m.seed);
      showToast(`${m.preset.name} match — everyone gets these exact boards`);
      return;
    }
    const p = parseCode(codeInput);
    if (!p) {
      showToast("Couldn't read that code");
      return;
    }
    setCodeInput('');
    setMenuOpen(false);
    setScreen('play');
    startNew(p.seed, p.n, p.mode);
    showToast('Loaded Puzzle ' + encodeCode(p.n, p.seed, p.mode));
  };

  const saveName = () => {
    const name = nameInput.trim().slice(0, 12);
    setPlayerName(name);
    if (wasRecord && bestMap[bk]) {
      setBestMap({ ...bestMap, [bk]: { ...bestMap[bk], name } });
    }
    setShowNameEdit(false);
  };

  /* ---------- menu actions ---------- */

  /**
   * Change the goal.
   *
   * **`rows` ↔ `in order` keep the board**, which is the sibling app's rule and
   * worth preserving: the two goals use the same colours in the same counts, so
   * the board you are looking at is a valid — and usually harder — puzzle under
   * the other one, and re-dealing would throw away the position you were reading.
   * Crossing into or out of `diagonal` does not, because a diagonal board is
   * built from 2n−1 colours rather than n.
   */
  const changeMode = (m: Mode) => {
    setMenuOpen(false);
    if (m === prefs.mode && playCtx.kind === 'free') return;
    const crossingDiag = m === 'diag' || prefs.mode === 'diag';
    const keepable =
      playCtx.kind === 'free' && phase !== 'won' && !crossingDiag && prefs.n <= maxN(m);
    if (keepable) {
      setMode(m);
      setPrefs({ n: prefs.n, mode: m });
      return;
    }
    startNew(null, Math.min(prefs.n, maxN(m)), m);
  };

  const changeSize = (v: number) => {
    setMenuOpen(false);
    if (v > maxN(prefs.mode)) return; // the chip is dimmed; belt and braces
    startNew(null, v, prefs.mode);
  };

  const updatePhysics = (patch: Partial<Physics>) => setPhysics({ ...physics, ...patch });

  /* ---------- geometry ---------- */

  /**
   * The width comes from `useBoardSize({ fill: true })` rather than from this
   * screen's own arithmetic, because that hook is the one that knows the web
   * page is a 600pt centred column — the sibling app's `min(width - 36, 440)`
   * does not, and the board and the header would disagree about where the middle
   * of the page is in a browser (plan §10). `computeGeom`'s own 440 cap still
   * applies on top.
   *
   * The height allowance is this screen's own business: the page never scrolls,
   * so on a short phone the board is what has to give.
   */
  const { height } = useWindowDimensions();
  const widthAllowance = useBoardSize({ fill: true });
  const keyWidth = mode === 'ordered' ? KEY_COLUMN : 0;
  const room = Math.max(
    200,
    Math.min(widthAllowance - keyWidth, height - CHROME_HEIGHT)
  );
  const geom = computeGeom(room, n);
  const live = phase === 'live';

  /* ---------- screens ---------- */

  if (!hydrated) {
    return (
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <ScreenHeader title="Color Loop" theme={theme} onHomePress={onExitToHub} dense />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={palette.accent} />
        </View>
      </View>
    );
  }

  if (screen === 'training') {
    return (
      <LevelSelect
        progress={training}
        theme={theme}
        palette={palette}
        onPick={startLevel}
        onExitToHub={onExitToHub}
        onBackToBoard={() => setScreen('play')}
      />
    );
  }

  if (screen === 'touch') {
    return (
      <TouchFeelScreen
        theme={theme}
        palette={palette}
        physics={physics}
        onChange={updatePhysics}
        onExitToHub={onExitToHub}
        onDone={() => setScreen('play')}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      {/* Dense, like the cube's and Number Slide's: one guaranteed line, and
          about 38 points against 75 — on a screen built around one big square
          that difference is the square's (docs/cube-plan.md §8.6). */}
      <ScreenHeader
        title="Color Loop"
        theme={theme}
        onHomePress={onExitToHub}
        onMenuPress={() => setMenuOpen(true)}
        dense
      />

      <Text style={[styles.goalLine, { color: palette.muted }]}>{goalText(mode)}</Text>

      <View style={styles.stats}>
        <Stat label="MOVES" value={String(moves)} holder=" " palette={palette} />
        <Stat label="TIME" value={formatElapsed(secs)} holder=" " palette={palette} />
        {playCtx.kind === 'match' ? (
          <Stat
            label="BOARD"
            value={`${playCtx.boardIdx + 1}/${matchCount}`}
            holder={playCtx.preset.name}
            palette={palette}
          />
        ) : playCtx.kind === 'level' ? (
          <Stat
            label="BEST"
            value={
              training.best[playCtx.id] ? formatElapsed(training.best[playCtx.id].secs) : '—'
            }
            holder={`Level ${playCtx.id}`}
            palette={palette}
          />
        ) : (
          <Stat
            label="BEST"
            value={best ? formatElapsed(best.secs) : '—'}
            holder={best?.name ?? ' '}
            palette={palette}
          />
        )}
      </View>

      <View style={styles.playArea}>
        {/* The colour key for "in order" mode — which row wants which colour. */}
        {mode === 'ordered' && (
          <View style={[styles.key, { paddingTop: geom.pad, gap: geom.gap }]}>
            {Array.from({ length: n }, (_, r) => (
              <View
                key={r}
                style={[styles.chip, { height: geom.cell, backgroundColor: COLORS[r].c }]}
                accessibilityLabel={`Row ${r + 1}: ${COLORS[r].name}`}
              />
            ))}
          </View>
        )}

        <View>
          <Board
            n={n}
            grid={grid}
            geom={geom}
            live={live}
            lit={phase === 'won'}
            physics={physics}
            palette={palette}
            onCommit={onCommit}
          />

          {phase === 'armed' && (
            <Animated.View
              style={[
                styles.cover,
                { width: geom.size, height: geom.size, backgroundColor: palette.cover },
                {
                  opacity: coverT,
                  transform: [
                    { translateY: coverT.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) },
                  ],
                },
              ]}
            >
              <Text style={[styles.coverK, { color: palette.coverLabel }]}>
                {playCtx.kind === 'level'
                  ? `LEVEL ${playCtx.id}`
                  : playCtx.kind === 'match'
                    ? `BOARD ${playCtx.boardIdx + 1} OF ${matchCount}`
                    : 'COLOR LOOP'}
              </Text>
              <Text style={[styles.coverGoal, { color: palette.coverInk }]}>{goalText(mode)}</Text>
              {!!levelDef?.hint && (
                <Text style={[styles.coverGoal, { color: palette.coverInk }]}>{levelDef.hint}</Text>
              )}
              {mode === 'diag' && (
                <View style={[styles.diagHint, { backgroundColor: palette.tray }]}>
                  {Array.from({ length: n }, (_, r) => (
                    <View key={r} style={styles.diagRow}>
                      {Array.from({ length: n }, (_, c) => (
                        <View
                          key={c}
                          style={[styles.diagCell, { backgroundColor: COLORS[r + c].c }]}
                        />
                      ))}
                    </View>
                  ))}
                </View>
              )}
              <Btn
                label="Start"
                onPress={liftCover}
                color={palette.button}
                textColor={palette.buttonText}
                pressedColor={palette.buttonPressed}
              />
            </Animated.View>
          )}

          {phase === 'won' && !matchMid && (
            <View style={[styles.overlay, { width: geom.size, height: geom.size }]}>
              <Confetti colors={palette.confetti} />
            </View>
          )}

          {phase === 'won' && !matchMid && (
            <Animated.View
              style={[
                styles.winWrap,
                {
                  width: geom.size,
                  height: geom.size,
                  opacity: backdropT,
                  backgroundColor: palette.backdrop,
                },
              ]}
            >
              {/* The card is opaque, so every string on it measures against one
                  known colour rather than against a scrim over seven hues —
                  ./palette.ts has the whole argument. */}
              <PopIn
                delay={560}
                style={[styles.shareCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}
              >
                <Text style={[styles.brand, { color: palette.cardLabel }]}>COLOR LOOP</Text>
                <PopIn delay={760} from={0.55}>
                  <Text style={[styles.winBadge, { color: palette.cardAccent }]}>
                    {wasRecord ? 'NEW RECORD!' : 'SOLVED'}
                  </Text>
                </PopIn>

                {playCtx.kind === 'level' && levelDef && (
                  <>
                    <View style={styles.starRow}>
                      {[0, 1, 2].map((i) => (
                        <PopIn key={i} delay={820 + i * 130} from={0.4}>
                          <Text
                            style={[
                              styles.winStar,
                              {
                                color:
                                  i < starsFor(levelDef, secs)
                                    ? palette.cardAccent
                                    : palette.starOff,
                              },
                            ]}
                          >
                            ★
                          </Text>
                        </PopIn>
                      ))}
                    </View>
                    <Text style={[styles.shareTime, { color: palette.cardInk }]}>
                      {formatElapsed(shownSecs)}
                    </Text>
                    <Text style={[styles.shareMeta, { color: palette.cardMuted }]}>
                      LEVEL {playCtx.id} · {n}×{n} · {moves} {moves === 1 ? 'move' : 'moves'}
                    </Text>
                  </>
                )}

                {playCtx.kind === 'match' && (
                  <>
                    <CodeBlock label="MATCH" value={playCtx.code} palette={palette} />
                    <Text style={[styles.shareTime, { color: palette.cardInk }]}>
                      {formatElapsed(shownSecs)}
                    </Text>
                    <Text style={[styles.shareMeta, { color: palette.cardMuted }]}>
                      {playCtx.splits.map((s) => formatElapsed(s.secs)).join('  ·  ')}
                    </Text>
                    <Text style={[styles.shareMeta, { color: palette.cardMuted }]}>
                      {playCtx.preset.name} · {totalMoves(playCtx.splits)} moves
                      {playerName ? ` · ${playerName}` : ''}
                    </Text>
                    {!wasRecord && matchBest[playCtx.code] && (
                      <Text style={[styles.winSub, { color: palette.cardMuted }]}>
                        Your best {formatElapsed(matchBest[playCtx.code].secs)}
                      </Text>
                    )}
                  </>
                )}

                {playCtx.kind === 'free' && (
                  <>
                    <CodeBlock label="PUZZLE" value={code} palette={palette} />
                    <Text style={[styles.shareTime, { color: palette.cardInk }]}>
                      {formatElapsed(shownSecs)}
                    </Text>
                    <Text style={[styles.shareMeta, { color: palette.cardMuted }]}>
                      {n}×{n}
                      {mode === 'ordered' ? ' · in order' : mode === 'diag' ? ' · diagonal' : ''} ·{' '}
                      {moves} {moves === 1 ? 'move' : 'moves'}
                      {playerName ? ` · ${playerName}` : ''}
                    </Text>
                    {!wasRecord && best && (
                      <Text style={[styles.winSub, { color: palette.cardMuted }]}>
                        Best to beat {formatElapsed(best.secs)}
                        {best.name ? ` · ${best.name}` : ''}
                      </Text>
                    )}
                    {showNameEdit ? (
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
                          value={nameInput}
                          onChangeText={setNameInput}
                          placeholder="Your name"
                          placeholderTextColor={palette.inputPlaceholder}
                          maxLength={12}
                          onSubmitEditing={saveName}
                          accessibilityLabel="Your name"
                        />
                        <Btn
                          label="Save"
                          small
                          onPress={saveName}
                          color={palette.button}
                          textColor={palette.buttonText}
                          pressedColor={palette.buttonPressed}
                        />
                      </View>
                    ) : (
                      <LinkBtn
                        label={playerName ? 'Edit name' : 'Add your name'}
                        onPress={() => {
                          setNameInput(playerName);
                          setShowNameEdit(true);
                        }}
                        color={palette.cardMuted}
                      />
                    )}
                  </>
                )}
              </PopIn>

              <FadeSlideIn delay={880} style={styles.winActions}>
                {playCtx.kind === 'level' ? (
                  <>
                    <Btn
                      label="Replay"
                      small
                      onPress={() => startLevel(playCtx.id)}
                      color={palette.button}
                      textColor={palette.buttonText}
                      pressedColor={palette.buttonPressed}
                    />
                    {playCtx.id < LEVELS.length ? (
                      <Btn
                        label="Next level"
                        small
                        onPress={() => startLevel(playCtx.id + 1)}
                        color={palette.button}
                        textColor={palette.buttonText}
                        pressedColor={palette.buttonPressed}
                      />
                    ) : (
                      <Btn
                        label="Levels"
                        small
                        onPress={() => setScreen('training')}
                        color={palette.button}
                        textColor={palette.buttonText}
                        pressedColor={palette.buttonPressed}
                      />
                    )}
                    {playCtx.id < LEVELS.length && (
                      <LinkBtn
                        label="Levels"
                        onPress={() => setScreen('training')}
                        color={palette.link}
                      />
                    )}
                  </>
                ) : playCtx.kind === 'match' ? (
                  <>
                    <Btn
                      label="Copy result"
                      small
                      onPress={copyResult}
                      color={palette.button}
                      textColor={palette.buttonText}
                      pressedColor={palette.buttonPressed}
                    />
                    <Btn
                      label="Rematch"
                      small
                      onPress={rematch}
                      color={palette.button}
                      textColor={palette.buttonText}
                      pressedColor={palette.buttonPressed}
                    />
                    <LinkBtn
                      label="Free play"
                      onPress={() => startNew()}
                      color={palette.link}
                    />
                  </>
                ) : (
                  <>
                    <Btn
                      label="Copy code"
                      small
                      onPress={copyCode}
                      color={palette.button}
                      textColor={palette.buttonText}
                      pressedColor={palette.buttonPressed}
                    />
                    <Btn
                      label="Play again"
                      small
                      onPress={() => startNew()}
                      color={palette.button}
                      textColor={palette.buttonText}
                      pressedColor={palette.buttonPressed}
                    />
                  </>
                )}
              </FadeSlideIn>
            </Animated.View>
          )}
        </View>
      </View>

      {/* The code chip is a free-play affordance: a level's board is the same
          board for everyone by definition, and a match has its own code on the
          win card. `flexWrap` because a row wider than the board is the bug
          Fungiku shipped with a row of hearts (plan §10). */}
      {phase !== 'won' && playCtx.kind === 'free' && (
        <View style={styles.shareRow}>
          <Text style={[styles.shareK, { color: palette.muted }]}>PUZZLE</Text>
          <Pressable
            style={[
              styles.codeChip,
              { backgroundColor: palette.inputBackground, borderColor: palette.inputBorder },
            ]}
            onPress={copyCode}
            accessibilityRole="button"
            accessibilityLabel={`Copy puzzle code ${code}`}
          >
            <Text selectable={false} style={[styles.codeChipText, { color: palette.accent }]}>
              {code}
            </Text>
          </Pressable>
          <LinkBtn label="New board" onPress={() => startNew()} color={palette.link} />
        </View>
      )}

      {phase !== 'won' && playCtx.kind !== 'free' && (
        <View style={styles.shareRow}>
          <LinkBtn
            label={playCtx.kind === 'level' ? 'Back to the ladder' : 'Leave the match'}
            onPress={() => (playCtx.kind === 'level' ? setScreen('training') : startNew())}
            color={palette.link}
          />
        </View>
      )}

      {phase !== 'won' && (
        <Text style={[styles.help, { color: palette.label }]}>{helpText(mode)}</Text>
      )}

      {!!toast && (
        <View
          style={[styles.toast, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}
        >
          <Text style={[styles.toastText, { color: palette.panelText }]}>{toast}</Text>
        </View>
      )}

      <ColorLoopMenuModal
        visible={menuOpen}
        palette={palette}
        n={prefs.n}
        mode={prefs.mode}
        presetChoice={presetChoice}
        training={training}
        codeInput={codeInput}
        onChangeCode={setCodeInput}
        onSubmitCode={handleCode}
        onPickSize={changeSize}
        onPickMode={changeMode}
        onPickPreset={setPresetChoice}
        onFreePlay={() => {
          setMenuOpen(false);
          startNew();
        }}
        onTraining={() => {
          setMenuOpen(false);
          setScreen('training');
        }}
        onNewMatch={() => {
          setMenuOpen(false);
          newMatch();
        }}
        onTouchFeel={() => {
          setMenuOpen(false);
          setScreen('touch');
        }}
        onClose={() => setMenuOpen(false)}
      />
    </View>
  );
};

/**
 * The touch-feel sliders — the sibling app's developer screen, kept behind the
 * menu on the epic branch.
 *
 * **Whether this ships is open question 3** (plan §4.3): a real setting, or the
 * tuned constants shipped and the sliders deleted before the merge to `main`.
 * The tuning pass it exists for is still on the sibling repo's backlog, and it
 * is a question a phone answers rather than an argument — which is why it is
 * reachable at all rather than being ported and commented out.
 */
function TouchFeelScreen({
  theme,
  palette,
  physics,
  onChange,
  onExitToHub,
  onDone,
}: {
  theme: ReturnType<typeof useAppTheme>['theme'];
  palette: ReturnType<typeof colorLoopPalette>;
  physics: Physics;
  onChange: (patch: Partial<Physics>) => void;
  onExitToHub: () => void;
  onDone: () => void;
}) {
  /** A physics value as a 0..100 slider position, and back. */
  const toSlider = (key: keyof Physics, invert = false) => {
    const { lo, hi } = PHYSICS_RANGE[key];
    const t = (physics[key] - lo) / (hi - lo);
    return Math.round((invert ? 1 - t : t) * 100);
  };
  const fromSlider = (key: keyof Physics, v: number, invert = false) => {
    const { lo, hi } = PHYSICS_RANGE[key];
    const t = invert ? 1 - v / 100 : v / 100;
    return lo + t * (hi - lo);
  };

  const rows: { key: keyof Physics; label: string; invert?: boolean; hint: string }[] = [
    { key: 'friction', label: 'COAST', hint: 'How far a flicked line keeps going' },
    { key: 'flick', label: 'FLICK', invert: true, hint: 'How hard a flick has to be to coast' },
    { key: 'magnet', label: 'MAGNET', hint: 'How strongly a line clicks into its slot' },
    { key: 'twin', label: 'TWIN', hint: 'How near a seam grabs both neighbours' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ScreenHeader title="Touch feel" theme={theme} onHomePress={onExitToHub} dense />
      <Text style={[styles.goalLine, { color: palette.muted }]}>
        Drag a row on the board to feel a change — these are saved as you set them
      </Text>

      <View
        style={[styles.devBody, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}
      >
        {rows.map((row) => (
          <View key={row.key} style={styles.devRow}>
            <View style={styles.devKeyColumn}>
              <Text style={[styles.devK, { color: palette.panelLabel }]}>{row.label}</Text>
              <Text style={[styles.devHint, { color: palette.panelLabel }]}>{row.hint}</Text>
            </View>
            <Slider
              value={toSlider(row.key, row.invert)}
              onChange={(v) => onChange({ [row.key]: fromSlider(row.key, v, row.invert) })}
              track={palette.sliderTrack}
              fill={palette.accent}
            />
          </View>
        ))}
      </View>

      <Btn
        label="Done"
        onPress={onDone}
        color={palette.button}
        textColor={palette.buttonText}
        pressedColor={palette.buttonPressed}
      />
    </View>
  );
}

/** One of the three readouts above the board. */
function Stat({
  label,
  value,
  holder,
  palette,
}: {
  label: string;
  value: string;
  holder: string;
  palette: ReturnType<typeof colorLoopPalette>;
}) {
  return (
    <View style={[styles.stat, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}>
      <Text style={[styles.statK, { color: palette.panelLabel }]}>{label}</Text>
      <Text style={[styles.statV, { color: palette.panelText }]}>{value}</Text>
      {/* Always rendered, even when empty: a line that appears and disappears
          changes the row's height, which moves the board under the player's
          finger. */}
      <Text style={[styles.statHolder, { color: palette.accent }]} numberOfLines={1}>
        {holder || ' '}
      </Text>
    </View>
  );
}

/** The code on the win card — the thing the player is meant to send someone. */
function CodeBlock({
  label,
  value,
  palette,
}: {
  label: string;
  value: string;
  palette: ReturnType<typeof colorLoopPalette>;
}) {
  return (
    <View
      style={[
        styles.codeWrap,
        { backgroundColor: palette.inputBackground, borderColor: palette.inputBorder },
      ]}
    >
      <Text style={[styles.shareCodeK, { color: palette.cardLabel }]}>{label}</Text>
      <Text selectable={false} style={[styles.shareCode, { color: palette.cardAccent }]}>
        {value}
      </Text>
    </View>
  );
}

/**
 * The vertical room everything that is not the board takes: the container's
 * padding, the dense header, the goal line, the stat row, the share row, the
 * help line and the gaps between them. The board gets what is left, so a short
 * phone gets a smaller board rather than a help line it cannot see.
 */
const CHROME_HEIGHT = 300;

/** The "in order" colour key beside the board: chip width plus its gap. */
const KEY_COLUMN = 28;

function randomSeed(): number {
  return Math.floor(Math.random() * 60466176);
}

function goalText(mode: Mode): string {
  return mode === 'diag'
    ? 'Make each diagonal one solid color'
    : mode === 'ordered'
      ? 'Match each row to its color key'
      : 'Make every row one solid color';
}

function helpText(mode: Mode): string {
  return mode === 'diag'
    ? 'Each diagonal one solid color — either direction counts. Colors have different counts: work out which goes where.'
    : mode === 'ordered'
      ? 'Match each row to the color key on the left. Drag any row or column — it wraps around the edge.'
      : 'Drag any row or column — it follows your finger and wraps around the edge.';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    gap: 10,
    ...(Platform.OS === 'web'
      ? {
          paddingTop: 20,
          paddingBottom: 20,
          maxWidth: 600,
          marginHorizontal: 'auto',
          width: '100%',
        }
      : {}),
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  goalLine: { fontSize: 12.5, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: 8 },
  stat: {
    minWidth: 92,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statK: { fontSize: 10, letterSpacing: 2 },
  statV: {
    fontSize: 22,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  statHolder: { fontSize: 11, minHeight: 13, marginTop: 1 },
  playArea: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  key: { flexDirection: 'column' },
  chip: { width: 16, borderRadius: 6 },
  cover: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 13,
    padding: 22,
  },
  coverK: { fontSize: 11, letterSpacing: 2.4 },
  coverGoal: { fontSize: 12.5, maxWidth: 220, lineHeight: 19, textAlign: 'center' },
  diagHint: { padding: 6, borderRadius: 10, gap: 3 },
  diagRow: { flexDirection: 'row', gap: 3 },
  diagCell: { width: 22, height: 22, borderRadius: 5 },
  overlay: { position: 'absolute', top: 0, left: 0 },
  winWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 12,
  },
  shareCard: {
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 22,
  },
  brand: { fontSize: 10, letterSpacing: 3 },
  winBadge: { fontSize: 26, fontWeight: '700', letterSpacing: 3 },
  codeWrap: {
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 22,
    marginTop: 2,
  },
  shareCodeK: { fontSize: 10, letterSpacing: 2.6 },
  shareCode: { fontSize: 24, fontWeight: '700', letterSpacing: 3 },
  shareTime: { fontSize: 29, fontWeight: '600', fontVariant: ['tabular-nums'] },
  shareMeta: { fontSize: 12.5, textAlign: 'center' },
  winSub: { fontSize: 12.5 },
  winActions: { flexDirection: 'row', gap: 9, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
  starRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  winStar: { fontSize: 28, lineHeight: 32 },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  shareK: { fontSize: 11, letterSpacing: 1.8 },
  codeChip: {
    borderWidth: 1,
    borderRadius: 9,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  codeChipText: { fontWeight: '600', fontSize: 15, letterSpacing: 1.5 },
  codeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    fontSize: 14,
    minWidth: 140,
  },
  help: { fontSize: 12, maxWidth: 330, textAlign: 'center', lineHeight: 18 },
  toast: {
    position: 'absolute',
    top: 48,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  toastText: { fontSize: 12.5, textAlign: 'center' },
  devBody: {
    width: '100%',
    maxWidth: 440,
    gap: 14,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  devRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 34 },
  devKeyColumn: { width: 120 },
  devK: { fontSize: 11, letterSpacing: 1.8, fontWeight: '700' },
  devHint: { fontSize: 10, marginTop: 2 },
});

export default ColorLoopScreen;
