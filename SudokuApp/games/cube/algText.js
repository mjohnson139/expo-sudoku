import { Platform } from 'react-native';

/**
 * The face the scramble is set in.
 *
 * Notation is read one token at a time against a cube in your hands, and a
 * proportional face makes `R U R' U'` a smear — the apostrophes in particular
 * are what a hurried eye drops, and they need the width. A monospaced face also
 * keeps the line breaks in the same places between renders, so re-reading a
 * scramble you are halfway through does not mean finding your place again.
 */
export const ALG_FONT = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export default ALG_FONT;
