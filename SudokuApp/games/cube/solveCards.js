/**
 * The solves-for-this-scramble list, as arithmetic (docs/cube-flow-plan.md
 * §3.3, Step 3).
 *
 * Two things live here and they are the two things about that list which can be
 * *wrong*: **what order the cards come in**, and **how much of the cube the list
 * is allowed to spend**. Both are pure, both have a suite, and neither is inside
 * a component — the test runner is `testEnvironment: "node"` with no renderer,
 * so a derivation kept in a component is a derivation nothing checks.
 *
 * The heights are exported and the stylesheet is built from them rather than
 * beside them, for the reason `trackLayout.js` gives: a cap computed from one
 * set of numbers and a card drawn from another is a list that shows two and a
 * sliver.
 */

/** The name line: 14pt, one line. */
const NAME_LINE = 18;

/** The meta line under it: 11pt — `57 moves · yesterday`. */
const META_LINE = 14;

/** Air inside a card, top and bottom. */
const CARD_PAD = 7;

/**
 * Every card's border, including the ones not wearing the accent.
 *
 * **2 on all of them, deliberately.** The picker this replaces drew the current
 * row at `borderWidth: 2` and every other row at 1, which is fine in a modal
 * that sizes itself to its content and is not fine here: the accent moves from
 * card to card as you open solves, and a border that changes width moves every
 * card below it by two points and changes what the list's cap fits.
 */
export const CARD_BORDER = 2;

/** A card, drawn. */
export const CARD_HEIGHT = CARD_PAD * 2 + NAME_LINE + META_LINE + CARD_BORDER * 2;

/** The space under one, so the accent border does not touch the next card. */
export const CARD_GAP = 6;

/** The row of actions under the list — `+ New solve`, and Compare beside it once
 *  there is more than one attempt to compare. */
export const ACTION_HEIGHT = 8 * 2 + 17 + CARD_BORDER * 2;

/**
 * How many cards the list shows before it scrolls.
 *
 * **Keyed on the window, not on the measured stage** — the same rule
 * `LEGEND_MIN_HEIGHT` follows on the solve screen (`CubeSolve.js`). The stage
 * takes the height this list leaves, so a cap derived from the stage's own
 * measurement would be a layout that resizes itself and then re-measures: it
 * oscillates, and the cube pulses a point at a time while it settles.
 *
 * Two on a short phone and three above it. The step is where it is because at
 * 568 points the cube is already the whole width of the screen with about 55
 * points of slack, and a third card costs it 55 more; at 852 the same third card
 * is nearly free. §8.6's rule is that the cube is sized first — so the list is
 * the row that gives, and on the phone with least to give it gives most.
 */
export const CARDS_TALL_ENOUGH = 700;

export const visibleCards = (windowHeight) =>
  Number.isFinite(windowHeight) && windowHeight >= CARDS_TALL_ENOUGH ? 3 : 2;

/**
 * The sliver of the next card left showing over the bottom edge.
 *
 * **Found in a browser, at 320×568, and it is the reason this is not a round
 * number of cards.** A cap of exactly two cards with a third behind it draws a
 * list that ends in a clean edge and looks finished — there is nothing on the
 * screen that says the third solve exists, no indicator (the scrollbar is off:
 * inside a 300-point card it is noise, and on a phone it only appears once you
 * are already scrolling), and the operator has no reason to try.
 *
 * Fourteen points is a card's border, its top padding and the cap of its name.
 * It costs the cube fourteen points, and only when there are more solves than
 * fit — below that the list is shorter than its cap and this is never reached.
 */
export const CARD_PEEK = 14;

/** The tallest the scrolling part of the list may be, in points: n whole cards
 *  and the top of the next. */
export const listMaxHeight = (windowHeight) =>
  visibleCards(windowHeight) * (CARD_HEIGHT + CARD_GAP) + CARD_PEEK;

/**
 * The cards, in the order they are drawn: **the one on the cube first, then the
 * rest as they are.**
 *
 * `solvesFor` returns creation order and does not sort, which is what keeps the
 * list from reshuffling under a thumb while a solve is being written
 * (`updateSolve`'s comment). Hoisting the open one is the single exception, and
 * it is stable for the same reason: the card at the top stays at the top for as
 * long as you are working on it.
 *
 * **"In progress" is derived here and stored nowhere.** `openId` is the page on
 * the cube — a fact about the workspace — and which card is accented is a fact
 * about this list. A flag on the record would be a second copy of the first,
 * and the two would disagree the moment a scramble changed underneath them.
 *
 * An `openId` naming a solve that is not in `solves` — the page belongs to
 * another scramble, or has been deleted — changes nothing, which is the same
 * tolerance `openSolve` already applies in `CubeContext`.
 *
 * @param {Array} solves the solves for one scramble, newest first
 * @param {string|null} openId the page on the cube
 * @returns {Array} the same solves, open one first
 */
export const orderCards = (solves, openId) => {
  const list = solves || [];
  const at = list.findIndex((solve) => solve && solve.id === openId);
  if (at <= 0) return list;
  return [list[at], ...list.slice(0, at), ...list.slice(at + 1)];
};

export default {
  CARD_BORDER,
  CARD_HEIGHT,
  CARD_GAP,
  CARD_PEEK,
  ACTION_HEIGHT,
  CARDS_TALL_ENOUGH,
  visibleCards,
  listMaxHeight,
  orderCards,
};
