import { useCallback, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import useBoardSize from '../../hooks/useBoardSize';

/** Past this the cube stops growing. Reachability, not layout — the stage's own
 *  measurement is what keeps it inside the screen. Sized to sit just under
 *  Fungiku's board cap so the two games' play areas look like one app. */
const MAX_CUBE = 440;

/** Share of the window height the cube may take, before anything is measured. */
const CUBE_HEIGHT_SHARE = 0.42;

/**
 * The box the cube gets, measured rather than estimated — and the same
 * arithmetic on both of the cube's screens.
 *
 * A cube sized from a share of the *window* looked right on a 6" phone and
 * pushed its own caption through the buttons on a 4" one, because the space left
 * over depends on how many lines the header and the scramble took, which only
 * layout knows. So the stage measures itself and the cube is sized from what it
 * reports (docs/cube-plan.md §8.6).
 *
 * It is a hook rather than a component because the *number* is what the two
 * screens have to agree on, while what they hang around the stage differs — and
 * `room` is read by the move track, which sits above the stage it is asking
 * about.
 *
 * @returns {{measureStage: Function, cubeSize: number, room: number,
 *   windowHeight: number}} `measureStage` goes on the stage `View`'s `onLayout`.
 */
const useCubeStage = () => {
  const { height } = useWindowDimensions();
  const widthAllowance = useBoardSize({ fill: true });

  const [stage, setStage] = useState(null);
  const measureStage = useCallback(({ nativeEvent }) => {
    const { width, height: boxHeight } = nativeEvent.layout;
    setStage((current) =>
      current && current.width === width && current.height === boxHeight
        ? current
        : { width, height: boxHeight }
    );
  }, []);

  // Before the first layout there is nothing to measure, so fall back to the
  // window-share estimate — close enough that the cube does not visibly resize
  // on the frame the real number arrives.
  const cubeSize = Math.floor(
    stage
      ? Math.max(0, Math.min(widthAllowance, MAX_CUBE, stage.width, stage.height))
      : Math.min(widthAllowance, MAX_CUBE, height * CUBE_HEIGHT_SHARE)
  );

  return {
    measureStage,
    cubeSize,
    // How far the move track's drawer may be pulled down: the room the stage is
    // holding. It opens *over* the cube and never resizes it — the measurement
    // it is given is a limit, not a claim.
    room: stage ? stage.height : 0,
    windowHeight: height,
  };
};

export default useCubeStage;
