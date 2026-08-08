/**
 * Types for `utils/color.js` — see `utils/themes.d.ts` for why these shims
 * exist and what keeps them honest.
 *
 * This is the module the contrast floor is measured with. Colours are
 * `'#rrggbb'` strings throughout.
 */
export declare function hexToRgb(hex: string): { r: number; g: number; b: number };
export declare function rgbToHex(rgb: { r: number; g: number; b: number }): string;
export declare function mix(hex: string, target: string, weight: number): string;
export declare function relativeLuminance(hex: string): number;
export declare function contrastRatio(a: string, b: string): number;
export declare function readableOn(background: string, dark?: string, light?: string): string;
export declare function hexToLab(hex: string): { L: number; a: number; b: number };
export declare function deltaE(hexA: string, hexB: string): number;
export declare function simulateCvd(hex: string, type: string): string;
export declare const CVD_TYPES: string[];
export declare function closestPair(hexes: string[]): { a: string | null; b: string | null; distance: number };
