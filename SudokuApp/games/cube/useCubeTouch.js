import { useCallback, useEffect, useRef } from 'react';
import { PanResponder } from 'react-native';
import { RADIANS_PER_POINT, isUpsideDown, wrapAngle } from './geometry';
import {
  TUNING,
  chooseMove,
  cornerMove,
  faceCornerMove,
  faceCornerZone,
  facingFace,
  nearestFace,
  pickFace,
  shouldCommit,
  turnProgress,
} from './touchTurn';

/** How far the finger must travel before the path takes another sample. Fine
 *  enough to find a corner, coarse enough that a slow drag does not fill the
 *  path with a hundred copies of the same point. */
const SAMPLE_POINTS = 3;

/** How far outside a sticker still counts as touching the cube, as a fraction of
 *  the cube's edge. A finger going for the very corner reports a point a little
 *  past the silhouette, and a corner grab that misses by that much should turn,
 *  not pan (operator, 2026-08-18): one finger only orbits when it is clearly off
 *  the cube. Two fingers always orbit, wherever they are. */
const NEAR_MARGIN = 0.12;

/**
 * One finger on the cube: orbit it, or turn a layer of it
 * (docs/cube-touch-exploration.md §3).
 *
 * ### What decides which
 *
 * The exploration doc opened with pressure as the engage signal — push harder
 * and the layer commits. The operator dropped that on 2026-08-17 in favour of
 * something the hardware cannot fail to report: **where the finger started.**
 * Land on a sticker and drag, and that layer turns; land anywhere else, or use
 * two fingers, and the cube orbits exactly as it always did.
 *
 * Two-finger orbit is the load-bearing half of that. It means there is always a
 * way to look around that can never be read as a turn, which is what makes it
 * safe for one finger to be ambiguous — and the header's two view buttons are
 * still there underneath as the answer that needs no gesture at all.
 *
 * ### Which layer, decided continuously
 *
 * The sticker the finger lands on says *that the cube was touched*. It does not
 * get to say which layer turns — a fingertip is wider than the edge between two
 * faces, and the direction the drag then goes says what was meant far more
 * clearly than the pixel it started on. So `chooseMove` is asked on every frame,
 * from the whole gesture (where it started, where the finger is now), and the
 * answer is allowed to change until the turn passes the detent.
 *
 * ### The face you are looking at needs a shape, not a direction
 *
 * No straight drag across the front face can turn it — the axis of a drag is
 * `normal × direction`, and on the face nearest the camera both of those lie in
 * the plane of the screen (`faceTurnFor`). So that one face is asked for by
 * drawing a **right angle**: a short leg, a corner, and the way the corner went
 * round is the way the face goes round. It is checked before the straight
 * reading, since otherwise the first leg would have already claimed the gesture.
 *
 * ### Spring-loaded
 *
 * The layer follows the finger the whole way, but you do not have to take it the
 * whole way. Past `COMMIT_T` — about a quarter of a quarter turn — letting go
 * carries it the rest of the way round and writes the move; short of that it
 * springs back and writes nothing. A flick that is still travelling fast commits
 * without having got there, which is the other half of what a detent feels like.
 *
 * **The commit is a handoff, not a second animation.** `player.handoff(t)` tells
 * the transport the move it is about to be given is already `t` of the way
 * round, so the turn the finger started is the turn that finishes. Appending
 * without it snaps the layer back to zero and turns it again.
 *
 * ### Why the handlers are built once and read everything from a ref
 *
 * The same trap `CubeView` documents: a `PanResponder` created per render would
 * be rebuilt mid-drag, and one created once closes over the first render's yaw,
 * pitch and scene forever. So it is created once and every live value is read
 * through `live.current` at the moment the finger moves.
 *
 * @param {Object} options
 * @param {{polygons: Array}} options.scene the frame currently on screen — what
 *   `pickFace` tests against, so the sticker picked is the one under the finger
 *   in the picture the operator is looking at
 * @param {number} options.size the cube's edge in points
 * @param {number} options.yaw
 * @param {number} options.pitch
 * @param {Function} options.onOrbit `(yaw, pitch)`
 * @param {Object|null} options.turning `null` disables layer turns entirely and
 *   the cube is orbit-only, exactly as before this file existed. Otherwise
 *   `{ onTurn, onCommit }` — `onTurn(turn|null)` every frame the layer moves,
 *   `onCommit(move, t)` once, when the drag has earned the move.
 */
const useCubeTouch = ({ scene, size, yaw, pitch, onOrbit, turning = null }) => {
  const live = useRef({ scene, size, yaw, pitch, onOrbit, turning });
  live.current = { scene, size, yaw, pitch, onOrbit, turning };

  /**
   * The gesture in flight.
   *
   * `mode` walks `orbit | undecided | turn`, and never back into `undecided` —
   * once a drag has been read as one thing it stays that thing until the finger
   * comes up. A gesture that could change its mind halfway is the "orbit and
   * turn fight" failure the doc's §5.3 says no amount of polish fixes.
   */
  const gesture = useRef({
    mode: 'orbit',
    pick: null,
    move: null,
    t: 0,
    speed: 0,
    at: 0,
    // Where the finger went down, and the cube as it stood at that moment.
    //
    // **The polygons are a snapshot, and they have to be.** Picking against the
    // live scene would mean picking against a cube with a layer part-way through
    // turning — our own animation — so the sticker under the finger would move
    // because of the turn the finger was driving. The cube does not orbit while
    // a layer is being dragged, so the still frame stays a true map of the
    // screen for the whole gesture.
    from: [0, 0],
    polygons: null,
    // Where progress is measured from. The touch-down point for an ordinary
    // drag; the **corner** for the gesture that turns the face you are looking
    // at, because the first leg of that one was how you asked rather than how
    // far round you have got.
    origin: [0, 0],
    // The drag so far, sampled, for finding that corner.
    path: [],
    // Whether the finger went down on the face pointing at the camera — the only
    // face the corner gesture applies to.
    onFacing: false,
    // Past the detent the reading stops changing. Swapping layers this far round
    // would take back a turn the operator has already watched happen.
    locked: false,
    // Where the cube was, and where the drag was, when this mode started —
    // `gestureState.dx` is measured from touch-down, so switching to orbit
    // partway through has to subtract the travel that meant something else.
    grabbed: { yaw: 0, pitch: 0 },
    offset: { dx: 0, dy: 0 },
  });

  const springRef = useRef(null);

  const stopSpring = useCallback(() => {
    if (springRef.current !== null) {
      cancelAnimationFrame(springRef.current);
      springRef.current = null;
    }
  }, []);

  /**
   * Let it go: run the layer back to where it started and write nothing.
   *
   * Fast — this is the gesture saying "that was not a turn", and the longer it
   * takes to say so the more it reads as the app having tried and failed to do
   * something.
   */
  const springBack = useCallback(
    (turn, from) => {
      stopSpring();
      const started = Date.now();
      const ms = Math.max(1, Math.round(140 * from));

      const tick = () => {
        const progress = Math.min(1, (Date.now() - started) / ms);
        // Ease out: it leaves quickly and arrives gently, which is what a spring
        // that was never really loaded does.
        const eased = 1 - (1 - progress) ** 2;
        const t = from * (1 - eased);

        if (progress >= 1) {
          springRef.current = null;
          turn(null);
          return;
        }

        turn({ ...gesture.current.move, t });
        springRef.current = requestAnimationFrame(tick);
      };

      springRef.current = requestAnimationFrame(tick);
    },
    [stopSpring]
  );

  /** Give up on the layer without animating — a second finger has landed, or the
   *  responder was taken away. */
  const abandonTurn = useCallback(() => {
    stopSpring();
    const { turning: t } = live.current;
    if (t) t.onTurn(null);
  }, [stopSpring]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: (event) => {
        const g = gesture.current;
        const { scene: frame, turning: turns, size: edge, yaw: y, pitch: p } = live.current;
        const { touches, locationX, locationY } = event.nativeEvent;

        g.grabbed = { yaw: y, pitch: p };
        g.offset = { dx: 0, dy: 0 };
        g.move = null;
        g.t = 0;
        g.speed = 0;
        g.at = Date.now();
        g.locked = false;
        g.from = [locationX, locationY];
        g.origin = [locationX, locationY];
        g.polygons = frame.polygons;
        g.path = [[locationX, locationY]];
        g.onFacing = false;
        g.cornerZone = null;

        // Turning switched off, or a second finger already down: orbit, and do
        // not even look at what is under the finger.
        if (!turns || (touches && touches.length > 1)) {
          g.mode = 'orbit';
          g.pick = null;
          return;
        }

        // Only whether the cube was touched at all is decided here. *Which* face
        // the gesture is about is `chooseMove`'s, on every frame, because the
        // direction the finger goes says it better than the pixel it landed on.
        // A finger on — or at the very edge of — the cube turns; only one that
        // is clearly off it pans. `pickFace` is the exact hit and decides which
        // sticker; `nearestFace` widens that to a margin so a corner grab whose
        // reported point lands just outside a sticker is still a turn, not a pan.
        g.pick =
          pickFace(frame.polygons, locationX, locationY) ||
          nearestFace(frame.polygons, locationX, locationY, edge * NEAR_MARGIN);
        g.mode = g.pick ? 'undecided' : 'orbit';
        g.onFacing =
          !!g.pick && g.pick.normal.join() === facingFace(y, p).join();
        // Landing in the outer corner of the facing face turns *that* face by a
        // straight drag (§3.3d) — decided here, from where the finger went down,
        // and exclusive: in the corner it is an F gesture or nothing, never the
        // straight U/L a corner sticker would otherwise read.
        g.cornerZone = faceCornerZone(
          g.pick,
          [locationX, locationY],
          { size: edge, yaw: y, pitch: p }
        );
      },

      onPanResponderMove: (event, state) => {
        const g = gesture.current;
        const { turning: turns, size: edge, yaw: y, pitch: p, onOrbit: orbitTo } = live.current;
        const touches = event.nativeEvent.touches;

        // **Two fingers is always orbit.** It arrives here rather than at grant
        // because the second finger usually lands a moment after the first, and
        // a turn that had already begun has to be given back.
        if (touches && touches.length > 1 && g.mode !== 'orbit') {
          if (g.mode === 'turn') abandonTurn();
          g.mode = 'orbit';
          g.pick = null;
          g.move = null;
          g.grabbed = { yaw: y, pitch: p };
          g.offset = { dx: state.dx, dy: state.dy };
        }

        const dx = state.dx - g.offset.dx;
        const dy = state.dy - g.offset.dy;

        if (g.mode === 'orbit') {
          if (!orbitTo) return;
          // Unchanged from `CubeView`'s own responder, flip and all: drag right
          // and the cube turns right, and the horizontal drag reverses once the
          // cube is over its own pole so it still pushes the surface under the
          // finger.
          const flip = isUpsideDown(g.grabbed.pitch) ? -1 : 1;
          orbitTo(
            wrapAngle(g.grabbed.yaw + flip * dx * RADIANS_PER_POINT),
            wrapAngle(g.grabbed.pitch + dy * RADIANS_PER_POINT)
          );
          return;
        }

        if (!turns) return;

        const to = [g.from[0] + dx, g.from[1] + dy];

        // The path only has to be long enough to find a corner in, and a corner
        // can only be found before the turn locks.
        if (!g.locked) {
          const last = g.path[g.path.length - 1];
          if (Math.hypot(to[0] - last[0], to[1] - last[1]) >= SAMPLE_POINTS) {
            g.path.push(to);
          }
        }

        // **Asked again on every frame, not once at the start.** A fingertip is
        // wider than the edge between two faces and a drag is not a straight
        // line, so the gesture is allowed to change its mind about which layer
        // it is turning right up until the detent.
        if (g.mode === 'undecided' || !g.locked) {
          let chosen;
          let named = false;
          if (g.cornerZone) {
            // The finger landed in a corner of the facing face, so this is an F
            // gesture and only an F gesture: spin from where it went down, and
            // do **not** fall back to the straight U/L a corner sticker would
            // otherwise give. Null until the drag turns clearly one way round.
            chosen = faceCornerMove({ zone: g.cornerZone, from: g.from, to });
            named = !!chosen;
          } else {
            // The corner *draw* is asked first among the rest, because it is the
            // only other way to ask for the face pointing at the camera — no
            // straight drag across it can name it (`faceTurnFor`) — and the
            // straight reading would otherwise take the gesture during its first
            // leg.
            const corner = g.onFacing
              ? cornerMove({ path: g.path, yaw: y, pitch: p })
              : null;
            chosen =
              corner ||
              chooseMove({
                polygons: g.polygons,
                from: g.from,
                to,
                view: { size: edge, yaw: y, pitch: p },
                current: g.mode === 'turn' ? g.move : null,
              });
            named = !!corner;
          }

          // Still too short a drag to mean anything.
          if (!chosen) return;

          if (g.mode === 'undecided') {
            g.mode = 'turn';
            g.at = Date.now();
            // A layer under a finger and a scramble playing itself are two
            // things turning the same cube. The finger wins, exactly as a tap on
            // the pad does.
            turns.onPause();
          } else if (chosen.token !== g.move.token) {
            // The reading changed under the finger. The old layer goes back
            // where it was, and the new one starts from wherever this drag puts
            // it — so the speed measured across the swap is meaningless and a
            // stale one could fling-commit a move nobody asked for.
            g.speed = 0;
            g.t = 0;
            g.at = Date.now();
          }

          g.move = chosen;

          if (named) {
            // The gesture has named itself and will not change its mind — a
            // drawn corner, or a corner-zone spin. Stop reconsidering, and for a
            // drawn corner measure from the corner rather than from touch-down
            // (the corner-zone spin already measures from where it went down).
            if (chosen.corner) g.origin = chosen.corner;
            g.locked = true;
          }
        }

        if (g.mode !== 'turn') return;

        const t = turnProgress(
          [to[0] - g.origin[0], to[1] - g.origin[1]],
          g.move.screen
        );
        if (t >= TUNING.COMMIT_T) g.locked = true;

        const now = Date.now();
        const elapsed = now - g.at;
        // Points per second along the arrow, for the flick that commits without
        // having travelled far. Guarded against the zero-length frame that would
        // otherwise report an infinite one.
        if (elapsed > 0) {
          g.speed = ((t - g.t) * TUNING.QUARTER_POINTS * 1000) / elapsed;
          g.at = now;
        }
        g.t = t;

        turns.onTurn({ ...g.move, t });
      },

      onPanResponderRelease: () => {
        const g = gesture.current;
        const { turning: turns } = live.current;

        if (g.mode !== 'turn' || !turns) {
          g.mode = 'orbit';
          return;
        }

        const move = g.move;
        const t = g.t;
        g.mode = 'orbit';
        g.move = null;

        if (shouldCommit(t, g.speed)) {
          // The screen hands `t` to the transport and appends the token; the
          // turn the finger started is finished by the player rather than
          // replayed by it.
          turns.onCommit(move, t);
          return;
        }

        gesture.current.move = move;
        springBack(turns.onTurn, t);
      },

      onPanResponderTerminate: () => {
        const g = gesture.current;
        if (g.mode === 'turn') abandonTurn();
        g.mode = 'orbit';
        g.move = null;
      },
    })
  ).current;

  // A spring still running against a screen that has gone is a frame loop
  // writing into an unmounted component.
  useEffect(() => stopSpring, [stopSpring]);

  return panResponder.panHandlers;
};

export default useCubeTouch;
