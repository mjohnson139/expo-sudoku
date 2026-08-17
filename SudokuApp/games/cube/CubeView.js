import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { DEFAULT_PITCH, DEFAULT_YAW, buildScene } from './geometry';
import { STICKER_COLORS } from './cubeState';
import useCubeTouch from './useCubeTouch';

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
 *
 * ### The gesture lives in a hook, not here
 *
 * Dragging used to mean one thing — orbit — and the responder that did it was
 * twenty lines in this file. `useCubeTouch` owns it now, because a drag can also
 * mean *turn this layer* (docs/cube-touch-exploration.md), and telling those
 * apart is enough logic to be worth testing away from a renderer. **Passing no
 * `turning` prop gives back exactly the old behaviour**, which is what keeps the
 * spike one prop away from being switched off.
 */
const CubeView = ({
  cube,
  size,
  yaw = DEFAULT_YAW,
  pitch = DEFAULT_PITCH,
  onOrbit,
  turn = null,
  turning = null,
  onDebug = null,
  colors = STICKER_COLORS,
  accessibilityLabel,
  accessibilityHint,
}) => {
  // Rebuilt on every frame of a turn, which is the whole cost of the animation
  // and the reason the polygon budget is worth keeping small: 27 faces at rest,
  // and a dozen more plastic seams while a layer is part-way round.
  const scene = useMemo(
    () => buildScene(cube, { size, yaw, pitch, colors, turn }),
    [cube, size, yaw, pitch, colors, turn]
  );

  // The scene goes in because picking a sticker is a point-in-polygon test
  // against the frame on screen — the cube the finger can see is the cube it is
  // allowed to grab.
  const panHandlers = useCubeTouch({ scene, size, yaw, pitch, onOrbit, turning, onDebug });

  return (
    <View
      {...panHandlers}
      // Android flattens views it thinks are inert; a view that exists only to
      // catch touches is exactly the kind it gets wrong.
      collapsable={false}
      style={[styles.container, { width: size, height: size }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel || 'Scrambled cube'}
      accessibilityHint={
        accessibilityHint || 'Drag to turn the cube and see the other faces'
      }
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
