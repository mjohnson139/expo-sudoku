# Experiment: the accessory menu

**This is a branch to try, not a step to merge.** It exists because the operator
looked at what Step 8 had ended up with and said *"I am second guessing how prime
and 2x work."* Fair — so here is the alternative, built far enough to hold.

Branch: `claude/cube-accessory-menu-experiment`, cut from
`claude/cube-scramble-epic-u7kmtr` (PR #94).

## What it does

**Tap a key** for the plain move. **Press and hold** and a small menu opens
*above* the key with `′` and `2`; slide onto one and release to write it. Release
anywhere else — including without moving — and you get the plain move, so a hold
you thought better of still writes what a tap would have.

That is the whole interaction. One gesture, both modifiers.

## What it replaces

The shipped branch reaches the same two tokens by **three** routes, each added
for a good reason and none of them wrong on its own:

| Route | Why it exists |
|---|---|
| Hold a key → prime | The design's answer to §9.8; keeps the whole key face for the letter |
| Tap the same key again → half turn | One `R2`, never `R R` |
| An armed `′` key | Added the same day, because the hold's feedback is drawn *under the thumb causing it* |

Three things to remember for two modifiers, and the third exists to patch a hole
in the first. **All three come off here.** The armed key's cell goes back to
being the cross's deliberate gap, which is what the design asked for originally.

The accessory menu answers the hidden-feedback problem differently and, arguably,
better: **the menu opens clear of the fingertip**, so the thing you are choosing
from and the thing you are touching are the same object, rather than the feedback
being somewhere else on the pad.

## What to judge it on

1. **Does the hold-then-slide feel quicker than a hold, or slower?** A prime is
   now hold + a short slide, where it was just a hold. That is the central
   trade and only a drilling session answers it.
2. **Is 180ms right for opening a menu?** It is the same constant as the hold
   threshold, and a menu appearing may want longer than a prime committing.
3. **Does the menu land where your thumb expects it?** It is centred over the
   key and clamped to the pad, so on the first and last columns it sits off to
   one side.
4. **The top row opens over the scrubber.** There is nowhere else for it to go,
   and it currently covers the jump-to-start button while it is open. Acceptable?
5. **Is losing the second-tap promotion a loss?** `R` `R` → `R2` was quick once
   you knew it.

## What it costs, and what is not finished

- **Accessibility took a real hit and it is only half repaired.** The keys are no
  longer `Pressable`s — one `PanResponder` on the pad owns the gesture, because a
  finger sliding from a key onto a menu that overlaps its neighbours crosses
  several views and no per-key handler can follow it. **VoiceOver therefore
  cannot open the menu.** `accessibilityActions` carry Prime and Half turn on
  every key instead, which is the standard equivalent of a long-press menu, but
  it has not been tried with a screen reader. That is the one thing that must be
  checked before this could ship.
- The pad's height, the cube's budget and every other row are **unchanged** —
  145 / 244 / 373 at the three widths, same as the shipped branch.
- `promotedTurn` and its signed sweep are still in `player.js` and now unused:
  nothing on this branch rewrites a move already on the cube. Left in place so
  the two branches stay easy to diff. If this one wins, that code goes with the
  promotion.

## Two things this cost me, worth not rediscovering

- **`locationX`/`locationY` are relative to the element the touch landed on**,
  not to the view holding the responder. Every key reported roughly the same
  local point, so the hit test always answered with whichever cell sits at the
  pad's top-left. Page coordinates minus a measured pad origin are the only frame
  the gesture and the layout agree on.
- **`onLayout` runs children before parents.** A cell that folded in its row's
  offset as it was measured folded in a zero — so the top row worked perfectly
  and every key below it was unhittable, which reads like a flaky gesture rather
  than a geometry bug. The row offset is resolved when the hit test asks.

## Verified

`npm test` (832), `expo-doctor` 18/18, `expo export --platform all`, and at
320×568, 375×667 and 393×852: a new `menu.mjs` driver that presses, waits past
the threshold, slides onto each option and releases — tap writes the plain move,
each option writes its token, releasing on nothing writes the plain move, sliding
off before the menu opens writes nothing, and the menu closes after a choice.
`walk.mjs` and `budget.mjs` re-run unchanged in intent.

The haptic, and how any of this feels under a thumb, still need a device.
