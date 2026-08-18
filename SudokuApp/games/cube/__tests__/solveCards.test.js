import {
  ACTION_HEIGHT,
  CARDS_TALL_ENOUGH,
  CARD_GAP,
  CARD_HEIGHT,
  CARD_PEEK,
  listMaxHeight,
  orderCards,
  visibleCards,
} from '../solveCards';

/** Just enough of a solve for the ordering to have something to move. */
const solve = (id) => ({ id, name: id, alg: '', phases: [], savedAt: 1 });

const LIST = [solve('s3'), solve('s2'), solve('s1')];

describe('orderCards', () => {
  it('leaves the list alone when the open solve is already the newest', () => {
    expect(orderCards(LIST, 's3')).toBe(LIST);
  });

  it('lifts the open solve to the top and keeps the rest in creation order', () => {
    expect(orderCards(LIST, 's1').map((one) => one.id)).toEqual(['s1', 's3', 's2']);
    expect(orderCards(LIST, 's2').map((one) => one.id)).toEqual(['s2', 's3', 's1']);
  });

  it('keeps every solve exactly once, whichever one is open', () => {
    ['s1', 's2', 's3', null, 'gone'].forEach((openId) => {
      const ids = orderCards(LIST, openId).map((one) => one.id);
      expect(ids.slice().sort()).toEqual(['s1', 's2', 's3']);
    });
  });

  it('changes nothing when the open page belongs to another scramble, or to nothing', () => {
    expect(orderCards(LIST, null)).toBe(LIST);
    expect(orderCards(LIST, 'gone')).toBe(LIST);
    expect(orderCards(LIST, undefined)).toBe(LIST);
  });

  it('does not mind an empty or missing list', () => {
    expect(orderCards([], 's1')).toEqual([]);
    expect(orderCards(undefined, 's1')).toEqual([]);
    expect(orderCards(null, null)).toEqual([]);
  });

  it('survives a hole in the list rather than throwing on it', () => {
    expect(orderCards([null, solve('s1')], 's1').map((one) => one && one.id)).toEqual([
      's1',
      null,
    ]);
  });
});

describe('visibleCards', () => {
  it('shows two on the short phones and three once there is room', () => {
    expect(visibleCards(568)).toBe(2); // 320×568 — the width V1's rows stopped fitting at
    expect(visibleCards(667)).toBe(2);
    expect(visibleCards(CARDS_TALL_ENOUGH - 1)).toBe(2);
    expect(visibleCards(CARDS_TALL_ENOUGH)).toBe(3);
    expect(visibleCards(852)).toBe(3);
  });

  it('takes the cautious answer before the window has been measured', () => {
    expect(visibleCards(undefined)).toBe(2);
    expect(visibleCards(0)).toBe(2);
  });
});

describe('listMaxHeight', () => {
  it('is whole cards plus a peek, so the cut is always across the next one', () => {
    [568, 667, 700, 852].forEach((height) => {
      expect((listMaxHeight(height) - CARD_PEEK) % (CARD_HEIGHT + CARD_GAP)).toBe(0);
    });
  });

  it('leaves a sliver too small to read as a card and too big to miss', () => {
    // If the peek ever reached a whole card the list would show three where the
    // arithmetic says two, and the cube would be short by a card nobody counted.
    expect(CARD_PEEK).toBeGreaterThan(8);
    expect(CARD_PEEK).toBeLessThan(CARD_HEIGHT / 2);
  });

  it('spends what §8.6 says it spends: 126 points on a short phone, 182 on a tall one', () => {
    expect(listMaxHeight(568)).toBe(126);
    expect(listMaxHeight(852)).toBe(182);
  });

  it('leaves the small phone a cube worth looking at', () => {
    // 320×568: 213 points of fixed rows and safe area above the stage, so the
    // stage has 355 to divide between the list and the cube. V1 shipped a
    // 123-point cube on the solve screen at this size; the scramble screen has
    // fewer rows and must stay well clear of it.
    const block = listMaxHeight(568) + CARD_GAP + ACTION_HEIGHT;
    expect(355 - block).toBeGreaterThanOrEqual(180);
  });
});
