import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native';
import { COLORS } from './colors';
import { EASE, SPRING, USE_NATIVE } from '../../utils/motion';
import { useBoardOrigin } from '../../utils/useBoardOrigin';
import { BoardGeom, linesAt } from './geometry';
import type { ColorLoopPalette } from './palette';
import type { Grid } from './puzzle';
import type { Physics } from './saveShape';

/**
 * The board: `n × n` tiles that follow your finger and wrap around the edge.
 *
 * ### What changed on the way in, and what deliberately did not
 *
 * **The physics did not.** Every constant, the velocity smoothing, the coast,
 * the magnet and the seam-straddling grab arrive from the sibling app unchanged
 * — they are the product of a tuning pass on a real device, and a browser cannot
 * tell you whether they are right. `computeGeom` and `linesAt` moved out to
 * `./geometry.ts` so the node runner can pin them (plan §5); nothing else here
 * is arithmetic.
 *
 * **The colours did.** The plan measured `THEME.` at about a hundred sites
 * across the incoming screens and found only **two** of them in this file, which
 * is what made the full theme adoption cheap: the board draws from `COLORS`, so
 * the palette swap is an import change, and the tray and socket are the two
 * chrome colours that now come in as props (plan §4.2).
 *
 * **The buzz came out.** The sibling board vibrated on each detent tick and
 * again on settle. The app has no haptics at all — `expo-haptics` is not a
 * dependency any more (plan §6) — so those calls are deleted rather than
 * translated. Nothing is lost that was not also drawn: a detent is the tile
 * visibly snapping into its slot, and the settle is the line coming to rest.
 * That test — *is the gesture still confirmed on screen?* — is the one to apply
 * before removing a buzz anywhere else.
 */

const V_MAX = 3.5;
const MAG_V = 0.55; // magnet fades out above this speed
const CAPTURE_V = 0.12; // coast is captured by the detent below this speed
const V_MIN = 0.05;
const DRAG_THRESHOLD = 8;

interface Drag {
  axis: 'row' | 'col';
  indices: number[];
  offset: number;
}

interface Props {
  n: number;
  grid: Grid;
  geom: BoardGeom;
  live: boolean;
  lit: boolean;
  physics: Physics;
  palette: ColorLoopPalette;
  onCommit: (axis: 'row' | 'col', indices: number[], cells: number) => void;
}

function nowMs(): number {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export default function Board({ n, grid, geom, live, lit, physics, palette, onCommit }: Props) {
  // Latest props readable from inside the long-lived PanResponder callbacks.
  // The responder is created once, so without this every handler would read the
  // props of the first render forever — the same arrangement (and the same
  // hazard) `NumberSlideScreen` documents around its own refs.
  const propsRef = useRef({ n, geom, live, physics, onCommit });
  propsRef.current = { n, geom, live, physics, onCommit };

  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const { ref: boardRef, measure, toLocal } = useBoardOrigin();
  const phys = useRef({
    v: 0,
    lastT: 0,
    grabOffset: 0,
    coasting: false,
    raf: 0,
    lastDetent: undefined as number | undefined,
    pending: null as { px: number; py: number } | null,
  });

  const setDragBoth = (d: Drag | null) => {
    dragRef.current = d;
    setDrag(d);
    if (d) {
      const step = propsRef.current.geom.cell + propsRef.current.geom.gap;
      const detent = Math.round(d.offset / step);
      const p = phys.current;
      if (p.lastDetent === undefined) p.lastDetent = detent;
      // The detent is still tracked even though nothing buzzes on it any more:
      // it is what stops a slow drag re-announcing the same slot, and the next
      // thing that wants to mark a crossing (a sound, a flash) needs it.
      if (detent !== p.lastDetent) p.lastDetent = detent;
    }
  };

  // which line(s) a grab lands on; straddling a seam grabs both neighbours
  const grabLines = (axis: 'row' | 'col', bx: number, by: number): number[] => {
    const { n: N, geom: g, physics: ph } = propsRef.current;
    return linesAt(N, g, ph.twin, axis, bx, by);
  };

  const settle = () => {
    const d = dragRef.current;
    if (!d) return;
    const { geom: g, onCommit: commit } = propsRef.current;
    const step = g.cell + g.gap;
    const cells = Math.round(d.offset / step);
    phys.current.coasting = false;
    phys.current.lastDetent = undefined;
    setDragBoth(null);
    commit(d.axis, d.indices, cells);
  };

  const coast = () => {
    const p = phys.current;
    p.coasting = true;
    let last = nowMs();
    const frame = () => {
      const d = dragRef.current;
      if (!d || !p.coasting) return;
      const { geom: g, physics: ph } = propsRef.current;
      const now = nowMs();
      let dt = now - last;
      last = now;
      if (dt > 40) dt = 40;
      if (dt <= 0) dt = 16.7;
      const offset = d.offset + p.v * dt;
      p.v *= Math.pow(ph.friction, dt / 16.7);
      setDragBoth({ ...d, offset });
      const step = g.cell + g.gap;
      const spd = Math.abs(p.v);
      const dist = Math.abs(offset - Math.round(offset / step) * step);
      // magnet grabs the line and clicks it in
      if (spd < CAPTURE_V || (spd < CAPTURE_V * 2.4 && dist < step * 0.18) || spd < V_MIN) {
        settle();
        return;
      }
      p.raf = requestAnimationFrame(frame);
    };
    p.raf = requestAnimationFrame(frame);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => propsRef.current.live,
      onMoveShouldSetPanResponder: () => propsRef.current.live,
      onPanResponderGrant: (evt) => {
        const p = phys.current;
        const d = dragRef.current;
        if (d && p.coasting) {
          // catch a spinning line and keep manipulating it
          p.coasting = false;
          cancelAnimationFrame(p.raf);
          p.v = 0;
          p.grabOffset = d.offset;
          p.lastT = nowMs();
          p.lastDetent = undefined;
          p.pending = null;
        } else {
          measure(); // refresh origin in case the board moved since layout
          p.pending = { px: evt.nativeEvent.pageX, py: evt.nativeEvent.pageY };
          p.grabOffset = 0;
          p.v = 0;
          p.lastT = nowMs();
        }
      },
      onPanResponderMove: (_evt, gs) => {
        const p = phys.current;
        let d = dragRef.current;
        if (!d && p.pending) {
          if (Math.max(Math.abs(gs.dx), Math.abs(gs.dy)) < DRAG_THRESHOLD) return;
          const axis: 'row' | 'col' = Math.abs(gs.dx) >= Math.abs(gs.dy) ? 'row' : 'col';
          const b = toLocal(p.pending.px, p.pending.py);
          d = { axis, indices: grabLines(axis, b.x, b.y), offset: 0 };
          p.grabOffset = 0;
          p.pending = null;
          p.lastT = nowMs();
          p.lastDetent = undefined;
          dragRef.current = d;
        }
        if (d) {
          const pos = d.axis === 'row' ? gs.dx : gs.dy;
          const offset = p.grabOffset + pos;
          // gs.vx/vy come from RN's native touch history (real event
          // timestamps), unlike a hand-rolled JS-side dt which can be
          // thrown off by JS-thread batching/jitter on device and spike
          // the smoothed velocity well past the flick threshold — that
          // spurious spike is what launched a multi-cell coast for what
          // was meant to be a single-cell move.
          const vel = d.axis === 'row' ? gs.vx : gs.vy;
          p.v = p.v * 0.6 + vel * 0.4;
          setDragBoth({ ...d, offset });
        }
      },
      onPanResponderRelease: (_evt, gs) => {
        const p = phys.current;
        const d = dragRef.current;
        if (!d) {
          // drag finished before any move event fired
          if (p.pending && Math.max(Math.abs(gs.dx), Math.abs(gs.dy)) >= DRAG_THRESHOLD) {
            const axis: 'row' | 'col' = Math.abs(gs.dx) >= Math.abs(gs.dy) ? 'row' : 'col';
            const b = toLocal(p.pending.px, p.pending.py);
            dragRef.current = {
              axis,
              indices: grabLines(axis, b.x, b.y),
              offset: axis === 'row' ? gs.dx : gs.dy,
            };
            p.pending = null;
            settle();
            return;
          }
          p.pending = null; // a tap
          return;
        }
        const speed = Math.abs(p.v);
        if (speed > propsRef.current.physics.flick) {
          p.v = clamp(p.v, -V_MAX, V_MAX);
          coast();
        } else {
          settle();
        }
      },
      onPanResponderTerminate: () => {
        if (dragRef.current && !phys.current.coasting) settle();
        phys.current.pending = null;
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  // Solve wave: a scale pop rolling across the board by diagonal when `lit`
  // flips on. The board celebrates first and the chrome arrives after — the
  // third rule of the motion language in utils/motion.ts.
  const wave = useMemo(() => Array.from({ length: 2 * n - 1 }, () => new Animated.Value(1)), [n]);
  useEffect(() => {
    if (!lit) {
      wave.forEach((v) => v.setValue(1));
      return;
    }
    Animated.parallel(
      wave.map((v, i) =>
        Animated.sequence([
          Animated.delay(i * 55),
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
  }, [lit, wave]);

  const step = geom.cell + geom.gap;
  const P = n * step;
  const fontSize = Math.round(geom.cell * 0.38);

  // magnetic detent shaping: pulls the display toward aligned cells, fading out at speed
  const magnetize = (raw: number): number => {
    if (step <= 0) return raw;
    const nd = Math.round(raw / step);
    const d = raw - nd * step; // signed distance to nearest detent
    let mf = physics.magnet * (1 - Math.min(1, Math.abs(phys.current.v) / MAG_V));
    if (mf < 0) mf = 0;
    const a = Math.max(0.12, 1 - mf * 0.9); // slope near detent (1 = linear)
    const t = Math.abs(d) / (step / 2);
    return nd * step + d * (a + (1 - a) * t * t);
  };

  const dispOffset = drag ? magnetize(drag.offset) : 0;
  const inDrag = (r: number, c: number): number | null => {
    if (!drag) return null;
    if (drag.axis === 'row' && drag.indices.includes(r)) return c;
    if (drag.axis === 'col' && drag.indices.includes(c)) return r;
    return null;
  };

  const sockets: React.ReactNode[] = [];
  const tiles: React.ReactNode[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const baseX = geom.pad + c * step;
      const baseY = geom.pad + r * step;
      sockets.push(
        <View
          key={`s${r}-${c}`}
          style={[
            styles.socket,
            {
              left: baseX,
              top: baseY,
              width: geom.cell,
              height: geom.cell,
              backgroundColor: palette.socket,
            },
          ]}
        />
      );

      const colorIdx = grid[r][c];
      const color = COLORS[colorIdx];
      let x = baseX;
      let y = baseY;
      let wrapCopy: { x: number; y: number } | null = null;
      const s = inDrag(r, c);
      if (drag && s !== null) {
        const w = (((s * step + dispOffset) % P) + P) % P;
        if (drag.axis === 'row') x = geom.pad + w;
        else y = geom.pad + w;
        if (w > P - geom.cell) {
          wrapCopy =
            drag.axis === 'row' ? { x: geom.pad + w - P, y } : { x, y: geom.pad + w - P };
        }
      }

      const tileStyle = (tx: number, ty: number) => [
        styles.tile,
        {
          left: tx,
          top: ty,
          width: geom.cell,
          height: geom.cell,
          backgroundColor: color.c,
          borderColor: lit ? palette.litTileBorder : palette.tileBorder,
        },
        lit && styles.lit,
        lit && { transform: [{ scale: wave[r + c] }] },
      ];
      const glyph = (
        <Text selectable={false} style={[styles.glyph, { fontSize, color: palette.glyphInk }]}>
          {color.g}
        </Text>
      );
      tiles.push(
        <Animated.View
          key={`t${r}-${c}`}
          style={tileStyle(x, y)}
          // The hue's own stable name from the platform palette, so a screen
          // reader says "green" rather than reading a glyph character out.
          accessibilityLabel={color.name}
        >
          {glyph}
        </Animated.View>
      );
      if (wrapCopy) {
        // The same tile, drawn a second time on the other side of the board so a
        // line that has slid past the edge is continuous rather than appearing
        // to vanish and reappear.
        tiles.push(
          <Animated.View
            key={`g${r}-${c}`}
            style={tileStyle(wrapCopy.x, wrapCopy.y)}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {glyph}
          </Animated.View>
        );
      }
    }
  }

  return (
    <View
      ref={boardRef}
      onLayout={measure}
      style={[
        styles.board,
        { width: geom.size, height: geom.size, backgroundColor: palette.tray },
      ]}
      accessibilityLabel="Color Loop board"
      {...pan.panHandlers}
    >
      {sockets}
      {tiles}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  socket: {
    position: 'absolute',
    borderRadius: 11,
  },
  tile: {
    position: 'absolute',
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  lit: {
    borderWidth: 2,
  },
  glyph: {
    fontWeight: '700',
    userSelect: 'none',
  },
});
