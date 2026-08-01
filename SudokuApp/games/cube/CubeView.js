import React, { useMemo, useRef } from 'react';
import { PanResponder, View, StyleSheet } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import {
  DEFAULT_PITCH,
  DEFAULT_YAW,
  MAX_PITCH,
  RADIANS_PER_POINT,
  buildScene,
} from './geometry';
import { STICKER_COLORS } from './cubeState';

/**
 * The 3D cube, drawn as SVG polygons and turned with a finger
 * (docs/cube-plan.md §5).
 *
 * ### Why SVG and not WebGL or a WebView
 *
 * A cube is 54 flat quads on a convex solid. That is small enough that a
 * painter's-algorithm renderer over `react-native-svg` is *exact*, not an
 * approximation — and `react-native-svg` is in Expo Go, ships the same code path
 * on iOS, Android and web, and needs no bridge, no HTML string and no bundled
 * megabyte of three.js. `expo-gl` + three.js would give real lighting and
 * bevels; it would also give a second rendering stack to keep working across
 * Expo upgrades for a shape with 27 visible faces. The plan revisits this if
 * bevels or reflections ever become the point.
 *
 * The component is **controlled**: `yaw`/`pitch` come from the screen so a
 * "reset view" button is a state change like any other, and so the angle the
 * player left the cube at survives a new scramble.
 */
const CubeView = ({
  cube,
  size,
  yaw = DEFAULT_YAW,
  pitch = DEFAULT_PITCH,
  onOrbit,
  colors = STICKER_COLORS,
  accessibilityLabel,
}) => {
  // The pan handlers are created once, so they must not close over `yaw`,
  // `pitch` or `onOrbit` — the first render's values would be frozen into them
  // and every drag would start from the cube's opening angle. A ref updated on
  // each render is what keeps them current.
  const live = useRef({ yaw, pitch, onOrbit });
  live.current = { yaw, pitch, onOrbit };

  // Where the cube was when this drag started. `gestureState.dx/dy` are measured
  // from the touch-down point, so anchoring here means no accumulated drift and
  // no jump when a second finger lands.
  const grabbed = useRef({ yaw, pitch });

  const panResponder = useRef(
    PanResponder.create({
      // Claim the gesture outright. The cube owns its whole square, there is
      // nothing scrollable underneath it on this screen, and a threshold would
      // only cost the first few degrees of every turn.
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: () => {
        grabbed.current = { yaw: live.current.yaw, pitch: live.current.pitch };
      },

      onPanResponderMove: (_event, gesture) => {
        const handler = live.current.onOrbit;
        if (!handler) return;

        // Drag right and the cube turns right, bringing the left face round;
        // drag down and it tips its top toward you. Both are "push the surface
        // under your finger", which is the only mapping that needs no learning.
        const nextYaw = grabbed.current.yaw + gesture.dx * RADIANS_PER_POINT;
        const nextPitch = grabbed.current.pitch + gesture.dy * RADIANS_PER_POINT;

        // Pitch is clamped just short of the pole. Past it the cube rolls over
        // and the drag direction inverts, which reads as the cube fighting you.
        handler(nextYaw, Math.max(-MAX_PITCH, Math.min(MAX_PITCH, nextPitch)));
      },
    })
  ).current;

  const scene = useMemo(
    () => buildScene(cube, { size, yaw, pitch, colors }),
    [cube, size, yaw, pitch, colors]
  );

  return (
    <View
      {...panResponder.panHandlers}
      // Android flattens views it thinks are inert; a view that exists only to
      // catch touches is exactly the kind it gets wrong.
      collapsable={false}
      style={[styles.container, { width: size, height: size }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel || 'Scrambled cube'}
      accessibilityHint="Drag to turn the cube and see the other faces"
    >
      <Svg width={size} height={size}>
        {/* No backdrop: every visible cubie face is drawn plastic-first, edge to
            edge with its neighbours, so the cube is already opaque. */}
        {scene.polygons.map((polygon) => (
          <Polygon
            key={polygon.key}
            points={polygon.points.map((p) => `${p[0]},${p[1]}`).join(' ')}
            fill={polygon.fill}
            // Stroking a polygon in its own fill with a round join is what gives
            // the tiles their rounded corners without a path per tile.
            stroke={polygon.fill}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        ))}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CubeView;
