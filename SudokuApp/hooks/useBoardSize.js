import React from 'react';
import { Platform, useWindowDimensions } from 'react-native';

/**
 * The on-screen size of a square game board.
 *
 * Extracted from `screens/GameScreen.js`, where it lived as a private
 * `useGridContainerSize`, so Fungiku's board sizes the same way Sudoku's does
 * instead of carrying its own hardcoded constant.
 *
 * ### Two rules, and which game gets which
 *
 * **Sudoku's, unchanged** (the default): a **fixed** 324pt on native, and on web
 * a share of the smaller viewport dimension clamped to a range. Sudoku's screen
 * is laid out around that number — the number pad, the notes toggle, the timer —
 * and widening the grid under it is not this hook's call to make.
 *
 * **`{ fill: true }` — take the width the screen actually offers.** Fungiku asks
 * for this. A fixed 324 was leaving about 35pt of dead margin on each side of a
 * modern phone (393pt wide), while the header's buttons ran nearly edge to edge —
 * so the board read as compressed, and it got worse the bigger the board: at
 * 10×10 the difference is a 31pt cell against a 36pt one, which is the difference
 * between a cramped glyph and a comfortable one (plan §12.3).
 *
 * Capped, because "fill the width" on a tablet would produce a board nobody wants
 * to reach across, and floored by nothing in particular — a narrow phone simply
 * gets a smaller board, which is the correct answer and is what stops the board
 * overflowing a 320pt screen.
 *
 * @param {{fill?: boolean}} [options]
 * @returns {number} board width/height in px
 */
const BASE_SIZE = 324; // native, Sudoku's
const MAX_WEB_SIZE = 450;
const MIN_WEB_SIZE = 270;
const WEB_VIEWPORT_SHARE = 0.7;

/** How much of the window the screen's own container padding takes, both sides. */
const SCREEN_PADDING = 20;

/** The web screen is a centred column, not the whole viewport (see the screens). */
const WEB_CONTAINER_MAX = 600;

/** Past this the board stops growing: reachability, not layout. */
const FILL_MAX = 460;

const useBoardSize = ({ fill = false } = {}) => {
  const { width, height } = useWindowDimensions();

  return React.useMemo(() => {
    if (fill) {
      // The same rule on both platforms, so what a browser check shows is what
      // the device gets — the two used to diverge, and native-only layout bugs
      // are exactly the kind this project keeps finding late (plan §2).
      const container = Platform.OS === 'web' ? Math.min(width, WEB_CONTAINER_MAX) : width;
      return Math.floor(Math.min(FILL_MAX, Math.max(0, container - SCREEN_PADDING)));
    }

    if (Platform.OS === 'web') {
      const smallerDimension = Math.min(width, height);
      return Math.floor(
        Math.min(MAX_WEB_SIZE, Math.max(MIN_WEB_SIZE, smallerDimension * WEB_VIEWPORT_SHARE))
      );
    }

    return BASE_SIZE;
  }, [width, height, fill]);
};

export default useBoardSize;
