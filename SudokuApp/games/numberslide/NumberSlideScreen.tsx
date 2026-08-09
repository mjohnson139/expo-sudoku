import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
  useWindowDimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import ScreenHeader from '../../components/ScreenHeader';
import useAppTheme from '../../hooks/useAppTheme';
import useBoardSize from '../../hooks/useBoardSize';
import { Btn, LinkBtn } from '../../components/Controls';
import Confetti from '../../components/Confetti';
import { FadeSlideIn, PopIn, useCountUp } from '../../components/Motion';
import { EASE, SPRING, USE_NATIVE } from '../../utils/motion';
import { formatElapsed } from '../../utils/gameProgress';
import {
  NS_SIZES,
  NSSize,
  NSState,
  nsCellAt,
  nsIsSolved,
  nsMoveDir,
  nsParseCode,
  nsSeedCode,
  nsShuffle,
  nsSlideAt,
} from './logic';
import { numberSlidePalette } from './palette';
import { useBoardOrigin } from './useBoardOrigin';

/**
 * Without this the tile slide animation silently does nothing on Android — no
 * error, no warning, just tiles that teleport. Module scope, because
 * `LayoutAnimation` has to be enabled before the first layout pass, and it must
 * survive any move of this file (plan §10).
 */
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Number Slide — the classic 15-puzzle at 3×3, the hub's fourth card
 * (docs/colorloop-merge-plan.md, Step 1).
 *
 * ### It renders entirely from the app theme
 *
 * There is no colour in this file. Every one of them comes from `./palette.ts`,
 * which derives the screen from `useAppTheme` and holds each pair to a measured
 * contrast floor on all seven themes. The parchment tiles and brass hardware of
 * the standalone app are gone rather than preserved — operator, 2026-08-08, plan
 * §4.2 — and cycling the theme is expected to carry this whole screen with it.
 *
 * ### The page does not scroll
 *
 * The board claims every gesture inside its square, and a `ScrollView` wrapping
 * it would put the two in competition for each drag — the race this repo already
 * lost once on Fungiku's board (docs/fungiku-plan.md §2). So it is a fixed
 * column, and the board is sized from the room the page has rather than from the
 * window alone.
 */
const NumberSlideScreen = ({ onExitToHub }: { onExitToHub: () => void }) => {
  const { theme, isDark } = useAppTheme();
  const palette = useMemo(() => numberSlidePalette(theme, isDark), [theme, isDark]);

  const [size, setSize] = useState<NSSize>(3);
  const [seed, setSeed] = useState(randomSeed);
  const [state, setState] = useState<NSState>(() => nsShuffle(seed, size));
  const [moves, setMoves] = useState(0);
  const [secs, setSecs] = useState(0);
  const [solved, setSolved] = useState(false);
  const [toast, setToast] = useState('');
  const [showCodeEntry, setShowCodeEntry] = useState(false);
  const [codeInput, setCodeInput] = useState('');

  const startTimeRef = useRef(0);
  const runningRef = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const started = moves > 0;
  useEffect(() => {
    if (!runningRef.current || solved) return undefined;
    const id = setInterval(() => {
      setSecs(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [solved, started]);

  // Leaving the screen mid-toast must not leave a timer holding a setState.
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  };

  /**
   * Board geometry.
   *
   * The width comes from `useBoardSize({ fill: true })` rather than from this
   * screen's own `useWindowDimensions` arithmetic, because that hook is the one
   * that knows the web page is a 600pt centred column — the sibling app's
   * `min(width - 36, 440)` does not, and the board and the header would
   * disagree about where the middle of the page is in a browser (plan §10).
   *
   * The height allowance is this screen's own business: the page never scrolls,
   * so on a short phone the board is what has to give rather than the share row
   * being pushed off the bottom.
   */
  const { height } = useWindowDimensions();
  const widthAllowance = useBoardSize({ fill: true });
  const SIZE = Math.max(200, Math.min(widthAllowance, height - CHROME_HEIGHT));
  const PAD = Math.round(SIZE * 0.05);
  // The gap shrinks as the grid grows, so 3×3 and 5×5 fill the same square
  // rather than 5×5 spilling out of it.
  const GAP = Math.round((SIZE * 0.105) / size);
  const CELL = Math.round((SIZE - PAD * 2 - GAP * (size - 1)) / size);
  const step = CELL + GAP;

  const stateRef = useRef(state);
  stateRef.current = state;
  const solvedRef = useRef(solved);
  solvedRef.current = solved;
  const geomRef = useRef({ PAD, step, size });
  geomRef.current = { PAD, step, size };
  const { ref: boardRef, origin, measure } = useBoardOrigin();

  const applyResult = (res: { state: NSState; moved: number[] } | null) => {
    if (!res || res.moved.length === 0) return;
    if (!runningRef.current) {
      runningRef.current = true;
      startTimeRef.current = Date.now();
    }
    animateSlide();
    setState(res.state);
    setMoves((m) => {
      if (nsIsSolved(res.state.board)) onSolved();
      return m + res.moved.length;
    });
  };

  // Solve wave: a scale pop cascading across the tiles when the board locks in.
  // The board celebrates first and the chrome arrives after — the third rule of
  // the motion language in utils/motion.ts.
  const wave = useMemo(
    () => Array.from({ length: size * size }, () => new Animated.Value(1)),
    [size]
  );
  useEffect(() => {
    if (!solved) {
      wave.forEach((v) => v.setValue(1));
      return;
    }
    Animated.parallel(
      wave.map((v, i) =>
        Animated.sequence([
          Animated.delay((Math.floor(i / size) + (i % size)) * 55),
          Animated.timing(v, {
            toValue: 1.12,
            duration: 130,
            easing: EASE.standard,
            useNativeDriver: USE_NATIVE,
          }),
          Animated.spring(v, { toValue: 1, ...SPRING.pop, useNativeDriver: USE_NATIVE }),
        ])
      )
    ).start();
  }, [solved, wave]);

  // The win backdrop waits for the solve wave before dimming the board.
  const backdropT = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!solved) return;
    backdropT.setValue(0);
    Animated.timing(backdropT, {
      toValue: 1,
      duration: 320,
      delay: 520,
      easing: EASE.standard,
      useNativeDriver: USE_NATIVE,
    }).start();
  }, [solved, backdropT]);

  const shownSecs = useCountUp(secs, solved, 1200);
  const shownMoves = useCountUp(moves, solved, 1200);

  const onSolved = () => {
    const t = Math.floor((Date.now() - startTimeRef.current) / 1000);
    runningRef.current = false;
    setSecs(t);
    setSolved(true);

    // `expo-haptics`, not RN's `Vibration` — one API for one thing, and
    // `Vibration` has no iOS intensity control (plan §6). Web has no haptics and
    // resolves to a no-op, so the platform guard is belt and braces. **This is a
    // device-only check**: no browser pass covers it.
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  };

  const tapPoint = useRef<{ px: number; py: number } | null>(null);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !solvedRef.current,
      onMoveShouldSetPanResponder: () => !solvedRef.current,
      onPanResponderGrant: (evt) => {
        measure(); // refresh the origin in case the board shifted since layout
        tapPoint.current = { px: evt.nativeEvent.pageX, py: evt.nativeEvent.pageY };
      },
      onPanResponderRelease: (_evt, gs) => {
        if (solvedRef.current) return;
        const adx = Math.abs(gs.dx);
        const ady = Math.abs(gs.dy);
        if (Math.max(adx, ady) < 16) {
          const t = tapPoint.current;
          if (t) {
            const { PAD: pad, step: st, size: sz } = geomRef.current;
            const { r, c } = nsCellAt(
              t.px,
              t.py,
              origin.current.x,
              origin.current.y,
              pad,
              st,
              sz
            );
            applyResult(nsSlideAt(stateRef.current, r, c));
          }
        } else if (adx > ady) {
          applyResult(nsMoveDir(stateRef.current, gs.dx > 0 ? 'right' : 'left'));
        } else {
          applyResult(nsMoveDir(stateRef.current, gs.dy > 0 ? 'down' : 'up'));
        }
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  const shuffle = (newSeed?: number | null, newSize: NSSize = size) => {
    const sd = (newSeed ?? randomSeed()) >>> 0;
    if (newSize !== size) setSize(newSize);
    setSeed(sd);
    setState(nsShuffle(sd, newSize));
    setMoves(0);
    setSecs(0);
    setSolved(false);
    runningRef.current = false;
  };

  const copyCode = async () => {
    await Clipboard.setStringAsync(nsSeedCode(seed, size));
    showToast('Puzzle code copied — share it to race');
  };

  const handleCode = () => {
    // A code now carries its board size — `4-0K3JZ` is a 4×4, a bare five
    // characters is the 3×3 the format has always meant — so loading one can
    // change the size out from under the screen. That is deliberate: the code
    // *is* the puzzle, and a code that opened the wrong-sized board would not be.
    const parsed = nsParseCode(codeInput);
    if (parsed === null) {
      showToast("Couldn't read that code");
      return;
    }
    setCodeInput('');
    setShowCodeEntry(false);
    shuffle(parsed.seed, parsed.size);
    showToast('Loaded Puzzle ' + nsSeedCode(parsed.seed, parsed.size) + ' — good luck');
  };

  const tiles: React.ReactNode[] = [];
  const sockets: React.ReactNode[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const x = PAD + c * step;
      const y = PAD + r * step;
      sockets.push(
        <View
          key={`s${r}-${c}`}
          style={[
            styles.socket,
            { left: x, top: y, width: CELL, height: CELL, backgroundColor: palette.socket },
          ]}
        />
      );
      const v = state.board[r][c];
      if (v !== 0) {
        tiles.push(
          <Animated.View
            key={`v${v}`}
            style={[
              styles.tile,
              {
                left: x,
                top: y,
                width: CELL,
                height: CELL,
                backgroundColor: solved ? palette.litTile : palette.tile,
                borderColor: palette.tileBorder,
              },
              solved && { transform: [{ scale: wave[r * size + c] }] },
            ]}
          >
            <Text
              selectable={false}
              style={[
                styles.tileText,
                {
                  fontSize: Math.round(CELL * 0.46),
                  color: solved ? palette.litTileInk : palette.tileInk,
                },
              ]}
            >
              {v}
            </Text>
          </Animated.View>
        );
      }
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      {/* Dense, like the cube's: one guaranteed line, and about 38 points
          against 75 — on a screen built around one big square that difference
          is the square's (docs/cube-plan.md §8.6). */}
      <ScreenHeader title="Number Slide" theme={theme} onHomePress={onExitToHub} dense />

      <Text style={[styles.goalLine, { color: palette.muted }]}>
        Order the tiles 1 to {size * size - 1} — tap or swipe toward the gap
      </Text>

      {/* Changing size deals a fresh board of that size — there is nothing to
          preserve across the change, and asking would be a dialog in front of a
          one-tap decision. */}
      <View style={styles.sizeRow}>
        {NS_SIZES.map((n) => {
          const on = n === size;
          return (
            <Pressable
              key={n}
              onPress={() => !on && shuffle(null, n)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${n} by ${n} board`}
              style={[
                styles.sizeChip,
                {
                  backgroundColor: on ? palette.inputBackground : palette.panel,
                  borderColor: on ? palette.accent : palette.panelBorder,
                },
              ]}
            >
              <Text
                selectable={false}
                style={[styles.sizeChipText, { color: on ? palette.accent : palette.panelLabel }]}
              >
                {n}×{n}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.stats}>
        <Stat label="MOVES" value={String(moves)} palette={palette} />
        <Stat label="TIME" value={formatElapsed(secs)} palette={palette} />
      </View>

      <View>
        <View
          ref={boardRef}
          onLayout={measure}
          style={[styles.board, { width: SIZE, height: SIZE, backgroundColor: palette.tray }]}
          accessibilityLabel="Number Slide board"
          {...pan.panHandlers}
        >
          {sockets}
          {tiles}
        </View>

        {solved && (
          <View style={[styles.overlay, { width: SIZE, height: SIZE }]}>
            <Confetti colors={palette.confetti} />
          </View>
        )}

        {solved && (
          <Animated.View
            style={[
              styles.winWrap,
              { width: SIZE, height: SIZE, opacity: backdropT, backgroundColor: palette.backdrop },
            ]}
          >
            <PopIn delay={560} from={0.55}>
              <Text style={[styles.winBadge, { color: palette.winAccent }]}>SOLVED</Text>
            </PopIn>
            <FadeSlideIn delay={720}>
              <Text style={[styles.winLine, { color: palette.winInk }]}>
                {shownMoves} {moves === 1 ? 'move' : 'moves'} · {formatElapsed(shownSecs)}
              </Text>
            </FadeSlideIn>
            <FadeSlideIn delay={800}>
              <Btn
                label="Play again"
                onPress={() => shuffle()}
                color={palette.button}
                textColor={palette.buttonText}
                pressedColor={palette.buttonPressed}
              />
            </FadeSlideIn>
          </Animated.View>
        )}
      </View>

      {!solved && (
        <View style={styles.controls}>
          <Btn
            label="New game"
            onPress={() => shuffle()}
            color={palette.button}
            textColor={palette.buttonText}
            pressedColor={palette.buttonPressed}
          />
        </View>
      )}

      <View style={styles.shareRow}>
        <Text style={[styles.shareK, { color: palette.muted }]}>PUZZLE</Text>
        <Pressable
          style={[
            styles.codeChip,
            { backgroundColor: palette.inputBackground, borderColor: palette.inputBorder },
          ]}
          onPress={copyCode}
          accessibilityRole="button"
          accessibilityLabel={`Copy puzzle code ${nsSeedCode(seed, size)}`}
        >
          <Text selectable={false} style={[styles.codeChipText, { color: palette.accent }]}>
            {nsSeedCode(seed, size)}
          </Text>
        </Pressable>
        <LinkBtn
          label="Play a code"
          onPress={() => setShowCodeEntry((s) => !s)}
          color={palette.link}
        />
      </View>

      {showCodeEntry && (
        <View style={styles.codeRow}>
          <TextInput
            style={[
              styles.input,
              styles.codeInput,
              {
                color: palette.inputText,
                backgroundColor: palette.inputBackground,
                borderColor: palette.inputBorder,
              },
            ]}
            value={codeInput}
            onChangeText={setCodeInput}
            placeholder="Paste a puzzle code"
            placeholderTextColor={palette.inputPlaceholder}
            autoCapitalize="characters"
            autoCorrect={false}
            onSubmitEditing={handleCode}
          />
          <Btn
            label="Go"
            small
            onPress={handleCode}
            color={palette.button}
            textColor={palette.buttonText}
            pressedColor={palette.buttonPressed}
          />
        </View>
      )}

      {!!toast && (
        <View
          style={[
            styles.toast,
            { backgroundColor: palette.panel, borderColor: palette.panelBorder },
          ]}
        >
          <Text style={[styles.toastText, { color: palette.panelText }]}>{toast}</Text>
        </View>
      )}
    </View>
  );
};

/**
 * The vertical room everything that is not the board takes: the container's
 * padding, the dense header, the goal line, the size chips, the stat row, the
 * button row, the share row and the gaps between them. The board gets what is
 * left, so a short phone gets a smaller board rather than a share row it cannot
 * see.
 */
const CHROME_HEIGHT = 345;

function randomSeed(): number {
  return Math.floor(Math.random() * 60466176);
}

function animateSlide(): void {
  LayoutAnimation.configureNext(
    LayoutAnimation.create(
      140,
      LayoutAnimation.Types.easeInEaseOut,
      LayoutAnimation.Properties.opacity
    )
  );
}

/** One of the two readouts above the board. */
function Stat({
  label,
  value,
  palette,
}: {
  label: string;
  value: string;
  palette: ReturnType<typeof numberSlidePalette>;
}) {
  return (
    <View
      style={[styles.stat, { backgroundColor: palette.panel, borderColor: palette.panelBorder }]}
    >
      <Text style={[styles.statK, { color: palette.panelLabel }]}>{label}</Text>
      <Text style={[styles.statV, { color: palette.panelText }]}>{value}</Text>
    </View>
  );
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
  goalLine: { fontSize: 12.5, textAlign: 'center' },
  sizeRow: { flexDirection: 'row', gap: 8 },
  sizeChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 9,
    borderWidth: 1,
  },
  sizeChipText: { fontSize: 13, fontWeight: '600', letterSpacing: 1 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: {
    minWidth: 110,
    paddingVertical: 8,
    paddingHorizontal: 14,
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
  board: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  socket: {
    position: 'absolute',
    borderRadius: 14,
  },
  tile: {
    position: 'absolute',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tileText: {
    fontWeight: '600',
    userSelect: 'none',
  },
  overlay: { position: 'absolute', top: 0, left: 0 },
  winWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
  },
  winBadge: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 3,
  },
  winLine: { fontSize: 14, fontVariant: ['tabular-nums'] },
  codeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    fontSize: 14,
    minWidth: 120,
  },
  codeInput: { minWidth: 190 },
  controls: { flexDirection: 'row' },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  shareK: { fontSize: 11, letterSpacing: 1.8 },
  codeChip: {
    borderWidth: 1,
    borderRadius: 9,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  codeChipText: {
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 1.5,
  },
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
});

export default NumberSlideScreen;
