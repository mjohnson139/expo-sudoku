import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_SPEED,
  buildPlayback,
  clampIndex,
  ease,
  extendsAlg,
  gapDuration,
  nextSpeed,
  promotedTurn,
  renderTurn,
  turnDuration,
} from './player';

/**
 * The clock behind the scrubber: where in a scramble the cube is, and the turn
 * it is part-way through.
 *
 * ### One loop, a goal, and a direction
 *
 * Playing the scramble, playing it backwards, and turning the cube to the move
 * someone tapped are the same thing: keep taking one move toward a goal until
 * you arrive. So there is one loop and it is told where to stop — `play` aims at
 * the end, a tapped token aims at itself, and both can be interrupted the same
 * way. A second "seek by animating" path would be the same walk written twice
 * and would drift the first time one of them learned something.
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
 * ### Growing an algorithm is not replacing one
 *
 * Loading a favorite means "show me that cube", and the transport resets to the
 * end of it. Tapping `R` on the solve pad means "turn R", and resetting to the
 * end would apply the move without ever showing it — the one thing the pad
 * exists to do. Both arrive here as the same thing, a changed `alg`, so they are
 * told apart by `extendsAlg`, asked at **where the cube currently is**: if the
 * new algorithm still says what the old one said everywhere the cube has been,
 * the cube *walks* to its new end rather than jumping to it.
 *
 * ### And there is a third kind: growing a move already on the cube
 *
 * The pad's second tap turns `R` into `R2` **in place**. That is neither a
 * growth nor a replacement — the token the cube is standing on is the one that
 * changed — so `extendsAlg` correctly says "replaced" and the reset made the
 * second quarter of every half turn *appear* rather than turn (operator,
 * 2026-08-05). `promotedTurn` spots it, and the cube carries on round the rest
 * of the sweep it is already half-way through instead of snapping to the end.
 *
 * @param {string} alg the algorithm to play — a scramble, or a solve
 * @param {{cubies: Array}} [from] the cube move 1 starts on. A solve starts from
 *   the scrambled cube; omitted means solved. Must be referentially stable — it
 *   is what tells "same algorithm, new starting cube" from "growing".
 */
const useScramblePlayer = (alg, from) => {
  const { moves, tokens, states } = useMemo(() => buildPlayback(alg, { from }), [alg, from]);
  const count = moves.length;

  // How many moves of the scramble are on the cube, and — while one is turning
  // — that move and how far through it is.
  const [index, setIndexState] = useState(count);
  const [turn, setTurn] = useState(null);
  const [playing, setPlayingState] = useState(false);

  // How fast turns run. Not persisted, for the same reason the view angle is
  // not: it is how the player is watching right now, and the save file holds
  // algorithm text (plan §7).
  const [rate, setRateState] = useState(DEFAULT_SPEED);

  const indexRef = useRef(count);
  const playingRef = useRef(false);
  const rateRef = useRef(DEFAULT_SPEED);
  const movesRef = useRef(moves);
  const frameRef = useRef(null);
  const timerRef = useRef(null);
  // The turn the frame loop is in the middle of, so an interruption can land it
  // rather than abandon it half-way.
  const pendingRef = useRef(null);
  // Where the walk is heading. Only meaningful while `playing`.
  const goalRef = useRef(count);
  // What the last render's algorithm was, so the effect below can tell a solve
  // being added to from a scramble being replaced. `undefined` means "first
  // render", which is never a growth.
  const algRef = useRef(undefined);
  const fromRef = useRef(from);
  // The caller's half of an undo — dropping the move — held until the backwards
  // turn has run. See `retract`.
  const retractRef = useRef(null);
  // How far round the *next* appended move already is. See `handoff`.
  const handoffRef = useRef(null);

  movesRef.current = moves;

  const setIndex = useCallback((next) => {
    indexRef.current = next;
    setIndexState(next);
  }, []);

  const setPlaying = useCallback((next) => {
    playingRef.current = next;
    setPlayingState(next);
  }, []);

  // The turn already running keeps the tempo it started at — retiming it
  // mid-flight would make the cube lurch on the frame the chip was tapped. The
  // next one picks the new speed up.
  const cycleSpeed = useCallback(() => {
    const next = nextSpeed(rateRef.current);
    rateRef.current = next;
    setRateState(next);
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
   * Run the caller's half of an undo, if one is owed.
   *
   * An undo is two things — turn the move backwards, then drop it — and they
   * cannot happen at once: dropping first is a jump, and turning first means
   * the algorithm still has a move in it that the operator has already taken
   * back. So the drop is owed, and *every* way out of the turn pays it: it
   * lands, or something interrupts it, and either way the move goes.
   *
   * Leaving it unpaid is the bug this exists to stop. A second undo, or a key
   * tapped inside the 260ms the turn takes, would otherwise walk away from a
   * removal that never happened and the solve would quietly keep a move the
   * operator had already deleted.
   */
  const flushRetract = useCallback(() => {
    const owed = retractRef.current;
    retractRef.current = null;
    if (owed) owed();
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
    if (!pending) {
      flushRetract();
      return;
    }

    setTurn(null);
    setIndex(pending.forward ? pending.at + 1 : pending.at);
    flushRetract();
  }, [flushRetract, setIndex, stopClock]);

  /**
   * Animate move `at`, forwards or backwards.
   *
   * Backwards is the same move run from `t = 1` down to 0 on the cube *before*
   * it — no inverse move, no second code path, and the frame it lands on is the
   * one the still cube would draw.
   *
   * `options.from` starts the sweep part-way through instead of at an end, and
   * `options.turns` overrides which way round it travels. Both exist for the
   * **promotion** — the pad's second tap growing `R` into `R2` while the cube is
   * already a quarter of the way through it — and they are options on this
   * function rather than a second walk beside it, because a partial turn is
   * still a turn and one loop is the rule this hook is built on.
   */
  const animate = useCallback(
    (at, forward, onDone, options) => {
      const move = movesRef.current[at];
      if (!move) {
        if (onDone) onDone();
        return;
      }

      settle();

      const start = options && Number.isFinite(options.from)
        ? Math.max(0, Math.min(1, options.from))
        : forward
          ? 0
          : 1;
      const turns = options ? options.turns : undefined;
      // Only the part of the sweep still to travel is paid for, or the second
      // quarter of a half turn would take as long as the whole thing.
      const span = forward ? 1 - start : start;
      const ms = Math.max(1, Math.round(turnDuration(move, rateRef.current) * span));
      const started = Date.now();
      pendingRef.current = { at, forward };
      setTurn({ at, t: start, turns });

      const tick = () => {
        const progress = Math.min(1, (Date.now() - started) / ms);
        const eased = ease(progress);
        setTurn({ at, t: forward ? start + span * eased : start - span * eased, turns });

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

  // One move toward the goal, plus a beat, then itself again — checking on each
  // hop whether it is still wanted, because pause and a drag both work by
  // saying no. Direction falls out of which side of the goal we are on, so
  // walking a scramble backwards costs nothing extra.
  const stepTowardRef = useRef(null);
  const stepToward = useCallback(() => {
    if (!playingRef.current) return;

    const at = indexRef.current;
    const goal = goalRef.current;
    if (at === goal) {
      setPlaying(false);
      return;
    }

    const forward = goal > at;
    animate(forward ? at : at - 1, forward, () => {
      if (!playingRef.current) return;
      if (indexRef.current === goalRef.current) {
        setPlaying(false);
        return;
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        stepTowardRef.current();
      }, gapDuration(rateRef.current));
    });
  }, [animate, setPlaying]);
  stepTowardRef.current = stepToward;

  const pause = useCallback(() => {
    settle();
    setPlaying(false);
  }, [settle, setPlaying]);

  /**
   * Turn the cube, one move at a time, until it is `target` moves in.
   *
   * Interrupts whatever was already walking, including one heading the other
   * way: the in-flight turn lands first, and the next step is taken from where
   * that left it rather than from where the old walk was going.
   */
  const playTo = useCallback(
    (target) => {
      settle();

      const goal = clampIndex(target, movesRef.current.length);
      goalRef.current = goal;

      if (indexRef.current === goal) {
        setPlaying(false);
        return;
      }

      setPlaying(true);
      stepTowardRef.current();
    },
    [setPlaying, settle]
  );

  const play = useCallback(() => {
    settle();
    // Pressing play at the end means "show me that again", not nothing.
    if (indexRef.current >= movesRef.current.length) setIndex(0);
    playTo(movesRef.current.length);
  }, [playTo, setIndex, settle]);

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

  /**
   * Turn the last move backwards and then hand back, so the caller can drop it.
   *
   * Undo, from the solve pad. It has to run the move *backwards* before the
   * algorithm loses it: dropping it first and letting the effect below reset
   * would be a jump, and the wrong direction of exactly the bug the growth rule
   * fixes. Stepping backwards is free (`animate` runs the same move from `t = 1`
   * down to 0 on the cube before it), so this is `stepBack` with a callback and
   * a guard.
   *
   * Only the *end* can be undone. Anywhere else, there is nothing to animate
   * that matches what is about to be removed, so the caller is handed straight
   * back and the reset does the work.
   */
  const retract = useCallback(
    (onDone) => {
      // Pays off any undo still in the air first, so hammering the button
      // removes one move per tap rather than losing the ones that overlap.
      pause();

      const at = indexRef.current;
      if (at <= 0 || at !== movesRef.current.length) {
        if (onDone) onDone();
        return;
      }

      animate(at - 1, false, flushRetract);
      // After `animate`, never before: it settles on the way in, and settling
      // is one of the things that pays this off.
      retractRef.current = onDone;
    },
    [animate, flushRetract, pause]
  );

  /**
   * Jump straight to a position — no animation.
   *
   * This is what the two skip buttons do, and only them. "Back to the solved
   * cube" is a way out of wherever you are; turning twenty moves to get there
   * would be the opposite of what the button says. Tapping a *move* is the
   * other intent — take me there — and that is `playTo`.
   */
  const seek = useCallback(
    (next) => {
      pause();
      setIndex(clampIndex(next, movesRef.current.length));
    },
    [pause, setIndex]
  );

  /**
   * "The next move appended is already `t` of the way round."
   *
   * A move entered by *dragging the layer* (`useCubeTouch`) has been turning
   * under a finger before it was ever a token, and it arrives here the way every
   * other edit does — as a longer algorithm. Without this the growth below would
   * animate it from zero, which snaps the layer back to where the drag started
   * and turns it a second time.
   *
   * It is one call rather than an argument to `playTo` because it describes one
   * *edit*, not a mode: the caller says it immediately before the append that it
   * belongs to, and anything else that changes the algorithm first clears it. The
   * sweep itself is `animate`'s existing `from` — the same option the pad's
   * promotion carries the second quarter of an `R2` on, for the same reason.
   */
  const handoff = useCallback((t, turns) => {
    handoffRef.current = Number.isFinite(t)
      ? { from: Math.max(0, Math.min(1, t)), turns }
      : null;
  }, []);

  // A new scramble — or a favorite loaded back — opens fully applied, which is
  // the cube this screen showed before it could play anything. Where you were
  // in the last scramble is not somewhere to be in this one.
  //
  // Unless the algorithm *grew*, which is what entering a move looks like from
  // here: then the cube is already right up to the old last move and the new
  // ones are turned rather than applied behind your back.
  useEffect(() => {
    const previousAlg = algRef.current;
    const previousFrom = fromRef.current;
    algRef.current = alg;
    fromRef.current = from;

    // Where the cube is, or — mid-walk — where it is on its way to. A second tap
    // on the pad while the first move is still turning is still an append, and
    // reading the settled index alone would call it a replacement and jump.
    const heading = playingRef.current ? goalRef.current : indexRef.current;

    // The moves past where the cube has got to have not been played, so whether
    // they changed cannot matter — what matters is that everywhere the cube has
    // *been* still says the same thing. A different starting cube is always a
    // different algorithm, whatever the text says, which is what keeps switching
    // between the scramble and the solve a reset.
    const growing =
      previousAlg !== undefined &&
      previousFrom === from &&
      extendsAlg(previousAlg, alg, heading);

    // Claimed by whichever change arrives next, and spent by that one only: a
    // handoff left lying around would start some later, unrelated move part-way
    // through itself.
    const resumeFrom = handoffRef.current;
    handoffRef.current = null;

    if (growing) {
      // One move, added on the end, already part-way round because a finger put
      // it there. Carry on from where the drag left it instead of starting over.
      //
      // `turns` matters as much as `from` for a move a *circled* finger entered:
      // the short way round is not necessarily the way the finger went, and
      // finishing a three-quarter twist by sweeping back a quarter would undo
      // most of what the operator had just watched happen.
      if (resumeFrom !== null && moves.length === heading + 1) {
        goalRef.current = moves.length;
        setPlaying(false);
        animate(moves.length - 1, true, undefined, resumeFrom);
        return;
      }

      // Settles the in-flight turn and walks on from there; if nothing was
      // added after all, it is a no-op.
      playTo(moves.length);
      return;
    }

    // **A promotion is the third thing an algorithm change can be**, and it
    // looks like a replacement to `extendsAlg` because the token the cube is
    // standing on is the one that changed. Resetting to it is what made the
    // second quarter of an `R2` appear rather than turn. Instead, carry the
    // layer round the rest of the sweep it is already half-way through.
    const carry =
      previousAlg !== undefined && previousFrom === from
        ? promotedTurn(previousAlg, alg, heading)
        : null;

    if (carry) {
      goalRef.current = moves.length;
      setPlaying(false);
      // Half-way is where the *pad's* second tap finds the layer: the first
      // quarter has landed and the second has not begun. A **gesture** has
      // already carried it part of the way into that second quarter, and its `t`
      // is a fraction of a quarter — half a fraction of the half turn now being
      // drawn.
      const from = resumeFrom ? 0.5 + resumeFrom.from * 0.5 : 0.5;
      animate(carry.at, true, undefined, { from, turns: carry.turns });
      return;
    }

    stopClock();
    pendingRef.current = null;
    goalRef.current = moves.length;
    setTurn(null);
    setPlaying(false);
    setIndex(moves.length);
  }, [alg, from, moves, animate, playTo, setIndex, setPlaying, stopClock]);

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
  // **`renderTurn`, and not a spread written here.** This line dropped the
  // promotion's signed sweep for nine steps and no test could see it, because a
  // line inside a hook is not something the node runner can reach. It is a pure
  // function in `player.js` now, pinned there, and this is the call.
  const turning = renderTurn(moves[live ? live.at : 0], live);

  return {
    moves,
    tokens,
    count,
    index,
    cube,
    turn: turning,
    playing,
    rate,
    play,
    pause,
    togglePlay,
    playTo,
    stepForward,
    stepBack,
    retract,
    seek,
    handoff,
    cycleSpeed,
  };
};

export default useScramblePlayer;
