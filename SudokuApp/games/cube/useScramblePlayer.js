import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MOVE_GAP_MS,
  buildPlayback,
  clampIndex,
  ease,
  turnDuration,
} from './player';

/**
 * The clock behind the scrubber: where in a scramble the cube is, and the turn
 * it is part-way through.
 *
 * ### Why `requestAnimationFrame` and not `Animated`
 *
 * A turn rebuilds the SVG scene every frame, so there is nothing for
 * `useNativeDriver` to drive — and an `Animated.Value` that cannot use it is a
 * listener writing into React state, which is what this does directly with one
 * fewer moving part. `docs/fungiku-plan.md` §2 is emphatic about mixing
 * `setValue()` with a native driver; not having one closes the question.
 *
 * ### Refs, not state, for the things the loop reads
 *
 * The frame callback and the gap timer both outlive the render that scheduled
 * them, so anything they consult — where we are, whether we are still playing,
 * which moves — is held in a ref and mirrored into state for rendering. Reading
 * `index` from a closure instead is how playback ends up replaying move four
 * forever, and it is the same stale-closure trap `CubeView`'s pan handlers
 * already dodge.
 *
 * @param {string} alg the scramble
 */
const useScramblePlayer = (alg) => {
  const { moves, states } = useMemo(() => buildPlayback(alg), [alg]);
  const count = moves.length;

  // How many moves of the scramble are on the cube, and — while one is turning
  // — that move and how far through it is.
  const [index, setIndexState] = useState(count);
  const [turn, setTurn] = useState(null);
  const [playing, setPlayingState] = useState(false);

  const indexRef = useRef(count);
  const playingRef = useRef(false);
  const movesRef = useRef(moves);
  const frameRef = useRef(null);
  const timerRef = useRef(null);
  // The turn the frame loop is in the middle of, so an interruption can land it
  // rather than abandon it half-way.
  const pendingRef = useRef(null);

  movesRef.current = moves;

  const setIndex = useCallback((next) => {
    indexRef.current = next;
    setIndexState(next);
  }, []);

  const setPlaying = useCallback((next) => {
    playingRef.current = next;
    setPlayingState(next);
  }, []);

  const stopClock = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /**
   * Stop, and land whatever was mid-air.
   *
   * A turn frozen half-way is a cube in a position no cube can be in, and the
   * model has not moved yet, so leaving one on screen desynchronizes the
   * picture from the state behind it. Every interruption — a tap, a drag, a
   * seek — finishes the move first.
   */
  const settle = useCallback(() => {
    stopClock();
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (!pending) return;

    setTurn(null);
    setIndex(pending.forward ? pending.at + 1 : pending.at);
  }, [setIndex, stopClock]);

  /**
   * Animate move `at`, forwards or backwards.
   *
   * Backwards is the same move run from `t = 1` down to 0 on the cube *before*
   * it — no inverse move, no second code path, and the frame it lands on is the
   * one the still cube would draw.
   */
  const animate = useCallback(
    (at, forward, onDone) => {
      const move = movesRef.current[at];
      if (!move) {
        if (onDone) onDone();
        return;
      }

      settle();

      const ms = turnDuration(move);
      const started = Date.now();
      pendingRef.current = { at, forward };
      setTurn({ at, t: forward ? 0 : 1 });

      const tick = () => {
        const progress = Math.min(1, (Date.now() - started) / ms);
        const eased = ease(progress);
        setTurn({ at, t: forward ? eased : 1 - eased });

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(tick);
          return;
        }

        frameRef.current = null;
        pendingRef.current = null;
        setTurn(null);
        setIndex(forward ? at + 1 : at);
        if (onDone) onDone();
      };

      frameRef.current = requestAnimationFrame(tick);
    },
    [setIndex, settle]
  );

  // Playback is one move plus a beat, then itself again — checking on each hop
  // whether it is still wanted, because pause and a drag both work by saying no.
  const playNextRef = useRef(null);
  const playNext = useCallback(() => {
    if (!playingRef.current) return;
    if (indexRef.current >= movesRef.current.length) {
      setPlaying(false);
      return;
    }

    animate(indexRef.current, true, () => {
      if (!playingRef.current) return;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        playNextRef.current();
      }, MOVE_GAP_MS);
    });
  }, [animate, setPlaying]);
  playNextRef.current = playNext;

  const pause = useCallback(() => {
    settle();
    setPlaying(false);
  }, [settle, setPlaying]);

  const play = useCallback(() => {
    settle();
    // Pressing play at the end means "show me that again", not nothing.
    if (indexRef.current >= movesRef.current.length) setIndex(0);
    setPlaying(true);
    playNext();
  }, [playNext, setIndex, setPlaying, settle]);

  const togglePlay = useCallback(() => {
    if (playingRef.current) pause();
    else play();
  }, [pause, play]);

  const stepForward = useCallback(() => {
    pause();
    if (indexRef.current >= movesRef.current.length) return;
    animate(indexRef.current, true);
  }, [animate, pause]);

  const stepBack = useCallback(() => {
    pause();
    if (indexRef.current <= 0) return;
    animate(indexRef.current - 1, false);
  }, [animate, pause]);

  /** Jump straight to a position — no animation; a jump is not a turn. */
  const seek = useCallback(
    (next) => {
      pause();
      setIndex(clampIndex(next, movesRef.current.length));
    },
    [pause, setIndex]
  );

  // A new scramble — or a favorite loaded back — opens fully applied, which is
  // the cube this screen showed before it could play anything. Where you were
  // in the last scramble is not somewhere to be in this one.
  useEffect(() => {
    stopClock();
    pendingRef.current = null;
    setTurn(null);
    setPlaying(false);
    setIndex(moves.length);
  }, [moves, setIndex, setPlaying, stopClock]);

  // Leaving the screen mid-turn must not leave a frame loop running against an
  // unmounted component.
  useEffect(() => () => stopClock(), [stopClock]);

  // The cube being drawn is the one *before* the turning move: `buildScene`
  // carries the moving layer itself, so handing it the cube afterwards would
  // apply the move twice.
  //
  // A turn is dropped if it does not belong to the current algorithm. The
  // effect above clears it, but effects run *after* the render that changed the
  // scramble, and a move index left over from a longer one would reach the
  // renderer first — as `undefined`.
  const live = turn && turn.at < count ? turn : null;
  const cube = live ? states[live.at] : states[clampIndex(index, count)];
  const turning = live ? { ...moves[live.at], t: live.t } : null;

  return {
    moves,
    count,
    index,
    cube,
    turn: turning,
    playing,
    play,
    pause,
    togglePlay,
    stepForward,
    stepBack,
    seek,
  };
};

export default useScramblePlayer;
