import React from 'react';
import { Platform, useWindowDimensions } from 'react-native';

/**
 * The on-screen size of a square game board.
 *
 * Extracted from `screens/GameScreen.js`, where it lived as a private
 * `useGridContainerSize`, so Fungiku's board sizes the same way Sudoku's does
 * instead of carrying its own hardcoded constant. The numbers are Sudoku's,
 * unchanged: a fixed size on native, and on web a share of the smaller viewport
 * dimension clamped to a sane range.
 *
 * @returns {number} board width/height in px
 */
const BASE_SIZE = 324; // native
const MAX_WEB_SIZE = 450;
const MIN_WEB_SIZE = 270;
const WEB_VIEWPORT_SHARE = 0.7;

const useBoardSize = () => {
  const { width, height } = useWindowDimensions();

  return React.useMemo(() => {
    if (Platform.OS === 'web') {
      const smallerDimension = Math.min(width, height);
      return Math.floor(
        Math.min(MAX_WEB_SIZE, Math.max(MIN_WEB_SIZE, smallerDimension * WEB_VIEWPORT_SHARE))
      );
    }

    return BASE_SIZE;
  }, [width, height]);
};

export default useBoardSize;
