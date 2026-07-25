import {
  closestPair,
  contrastRatio,
  deltaE,
  hexToLab,
  hexToRgb,
  mix,
  readableOn,
  relativeLuminance,
  rgbToHex,
} from '../color';

describe('hex and rgb', () => {
  it('round-trips', () => {
    expect(hexToRgb('#56b4e9')).toEqual({ r: 0x56, g: 0xb4, b: 0xe9 });
    expect(rgbToHex({ r: 0x56, g: 0xb4, b: 0xe9 })).toBe('#56b4e9');
  });

  it('clamps and rounds out-of-range channels', () => {
    expect(rgbToHex({ r: -20, g: 300, b: 127.6 })).toBe('#00ff80');
  });
});

describe('mix', () => {
  it('returns the endpoints at weight 0 and 1', () => {
    expect(mix('#0072b2', '#ffffff', 0)).toBe('#0072b2');
    expect(mix('#0072b2', '#ffffff', 1)).toBe('#ffffff');
  });

  it('blends halfway', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
  });

  it('clamps weights outside 0..1', () => {
    expect(mix('#000000', '#ffffff', -1)).toBe('#000000');
    expect(mix('#000000', '#ffffff', 2)).toBe('#ffffff');
  });
});

describe('luminance and contrast', () => {
  it('anchors at black and white', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
  });

  it('gives the known 21:1 extreme', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 2);
  });

  it('is symmetric and 1:1 against itself', () => {
    expect(contrastRatio('#56b4e9', '#0072b2')).toBeCloseTo(
      contrastRatio('#0072b2', '#56b4e9'),
      10
    );
    expect(contrastRatio('#56b4e9', '#56b4e9')).toBeCloseTo(1, 10);
  });

  it('picks the more legible ink for a background', () => {
    expect(readableOn('#ffffff')).toBe('#1a1a1a');
    expect(readableOn('#000000')).toBe('#ffffff');
  });
});

describe('hexToLab', () => {
  it('places white and black', () => {
    const white = hexToLab('#ffffff');
    expect(white.L).toBeCloseTo(100, 1);
    expect(white.a).toBeCloseTo(0, 1);
    expect(white.b).toBeCloseTo(0, 1);

    expect(hexToLab('#000000').L).toBeCloseTo(0, 5);
  });

  it('places mid gray near L* 53.6', () => {
    expect(hexToLab('#808080').L).toBeCloseTo(53.6, 1);
  });
});

describe('deltaE (CIEDE2000)', () => {
  it('is zero for identical colors', () => {
    expect(deltaE('#56b4e9', '#56b4e9')).toBeCloseTo(0, 10);
  });

  it('is symmetric', () => {
    expect(deltaE('#56b4e9', '#0072b2')).toBeCloseTo(deltaE('#0072b2', '#56b4e9'), 10);
  });

  // Pinned against the reference implementation's published behavior for the
  // extremes; these guard against an algebra slip in the formula above.
  it('reports the black/white extreme as 100', () => {
    expect(deltaE('#000000', '#ffffff')).toBeCloseTo(100, 0);
  });

  it('rates a barely-different color below the just-noticeable threshold', () => {
    expect(deltaE('#56b4e9', '#56b5e9')).toBeLessThan(1);
  });

  it('rates clearly different hues well above it', () => {
    expect(deltaE('#e69f00', '#0072b2')).toBeGreaterThan(40);
  });

  it('does not overstate how different two similar blues are', () => {
    // The whole reason for CIEDE2000 over CIE76 here: these two are close, and
    // the simpler formula would have called them comfortably distinct.
    expect(deltaE('#bfe3f7', '#9ec9e2')).toBeLessThan(10);
  });
});

describe('closestPair', () => {
  it('finds the worst pair in a list', () => {
    const worst = closestPair(['#000000', '#ffffff', '#fefefe']);
    expect(worst.distance).toBeLessThan(1);
    expect([worst.a, worst.b].sort()).toEqual(['#fefefe', '#ffffff']);
  });

  it('reports Infinity for a list too short to have a pair', () => {
    expect(closestPair(['#000000']).distance).toBe(Infinity);
  });
});
