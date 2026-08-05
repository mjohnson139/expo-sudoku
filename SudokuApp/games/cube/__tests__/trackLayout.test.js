import {
  HANDLE,
  LINE,
  LINES,
  PAD,
  TRACK_HEIGHT,
  drawerHeight,
  followScrollTop,
} from '../trackLayout';

describe('the move track', () => {
  // The whole of Step 7 rests on this one: the stage measures itself, so a track
  // whose height depended on the solve would resize the cube as the solve was
  // written — which is the bug the step exists to kill.
  it('costs the page the same whatever is in it', () => {
    expect(TRACK_HEIGHT).toBe(LINES * LINE + PAD * 2 + HANDLE);
    expect(drawerHeight({ open: false })).toBe(TRACK_HEIGHT);
    expect(drawerHeight({ open: false, content: 4000, room: 500 })).toBe(TRACK_HEIGHT);
  });

  describe('following the cube', () => {
    it('parks the current move on the second line, with the line above it', () => {
      // Token on the third rendered line: PAD + 2 * LINE.
      expect(followScrollTop(PAD + 2 * LINE)).toBe(PAD + LINE);
    });

    it('does not scroll above the top for the first line', () => {
      expect(followScrollTop(PAD)).toBe(0);
      expect(followScrollTop(0)).toBe(0);
    });
  });

  describe('the drawer', () => {
    it('opens to exactly what the moves need', () => {
      // Four lines of content, and room to spare.
      const content = 4 * LINE + PAD * 2;
      expect(drawerHeight({ open: true, content, room: 400 })).toBe(content + HANDLE);
    });

    it('never opens shorter than it was shut', () => {
      // A one-move solve: the panel does not shrink below the resting size, or
      // opening it would make the moves *harder* to read than leaving it alone.
      expect(drawerHeight({ open: true, content: LINE, room: 400 })).toBe(TRACK_HEIGHT);
    });

    it('stops at the cube rather than reaching the transport', () => {
      // A very long solve with only 120 points of stage to borrow.
      expect(drawerHeight({ open: true, content: 2000, room: 120 })).toBe(TRACK_HEIGHT + 120);
    });

    it('opens to the resting size before the stage has been measured', () => {
      // The first render has no measurement, and a negative one is not a thing
      // this should have to reason about either.
      expect(drawerHeight({ open: true, content: 2000, room: 0 })).toBe(TRACK_HEIGHT);
      expect(drawerHeight({ open: true, content: 2000, room: -50 })).toBe(TRACK_HEIGHT);
    });
  });
});
