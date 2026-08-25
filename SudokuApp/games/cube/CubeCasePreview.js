import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { STICKER_COLORS } from './cubeState';
import { DEFAULT_PITCH, DEFAULT_YAW, buildScene } from './geometry';

/**
 * A static three-face view of the real cube an algorithm starts on.
 *
 * `CubeView` is deliberately interactive and installs the cube's pan responder;
 * a library card is already one button, so nesting another gesture surface in
 * it would steal taps. This shares the exact scene builder and sticker colours
 * while remaining a picture only.
 */
const CubeCasePreview = ({ cube, size = 56, label }) => {
  const scene = useMemo(
    () => buildScene(cube, { size, yaw: DEFAULT_YAW, pitch: DEFAULT_PITCH, colors: STICKER_COLORS }),
    [cube, size]
  );

  return (
    <View
      style={[styles.preview, { width: size, height: size }]}
      accessible={Boolean(label)}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      importantForAccessibility={label ? 'auto' : 'no-hide-descendants'}
    >
      <Svg width={size} height={size}>
        {scene.polygons.map((polygon) => (
          <Polygon
            key={polygon.key}
            points={polygon.points.map((point) => `${point[0]},${point[1]}`).join(' ')}
            fill={polygon.fill}
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
  preview: { alignItems: 'center', justifyContent: 'center' },
});

export default CubeCasePreview;
