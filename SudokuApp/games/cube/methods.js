/**
 * The solving methods, as data (docs/cube-flow-plan.md §3.4, Step 4).
 *
 * Until this step a method was a **chip vocabulary**: `PHASE_METHODS` in
 * `solveList.js` was `{ name, labels }`, it existed so that naming a group of
 * moves could be one tap instead of typing on a phone, and nothing else in the
 * app knew a method existed. That was the right shape for what it did and it is
 * the wrong shape for what comes next — Step 5 builds a solve's phase rail from
 * its method's stages, and a rail cannot be built out of a list of words that
 * happen to be offered together.
 *
 * So a method is `{ id, name, stages }`, a solve stores an **id**, and this file
 * is the only place the stages are written down.
 *
 * ### Pure, and frozen
 *
 * Pure for the reason `solveList.js` and `favorites.js` are: the test runner is
 * `testEnvironment: "node"` with no renderer, and this is exactly the sort of
 * table that is worth pinning.
 *
 * **Frozen because the presets are shipped constants.** User-definable methods,
 * the journey screen and packs belong to the separate *Cube Methods &
 * Algorithms* design and are explicitly not in this epic (plan §4) — so nothing
 * in the app may edit one, and `Object.freeze` is how that stops being a
 * convention. When user methods do arrive they arrive as a second source that
 * `findMethod` consults, not as a mutation of this array.
 *
 * ### `null` is a method too, and it is two things at once
 *
 * A solve's `method` is an id **or `null`**, and `null` covers both:
 *
 * - a solve written before this step, which never had the field, and
 * - a solve the operator deliberately started as **Freeform**.
 *
 * They are the same value on purpose. What `null` means downstream is *"there
 * is no stage list to build a rail from"*, and that is equally true of both —
 * such a solve keeps the free-text markers and today's `CubePhaseStrip`. Making
 * them two values would be inventing a distinction no screen can act on, and it
 * would mean a migration that guesses which one an old record was.
 *
 * **This is what lets Step 5 retire the flag key without rewriting anyone's
 * saved work**, and it is why `method` lands a step before the rail does.
 *
 * ### Stages are plain strings, and they are the labels
 *
 * A stage is the string a marker is labelled with — `phases[].label` — not a
 * wrapper object. That is what makes the promotion lossless: every label the old
 * `PHASE_METHODS` could have written is still a stage of the method it came
 * from, so no marker in anybody's save file is orphaned by this step
 * (`methods.test.js` pins it against a literal copy of the old table).
 *
 * Step 7's variations attach to a **marker** (`phaseAt`), not to a stage, so
 * they do not want objects here either.
 */

/** Roux first, because it is what the operator is drilling (docs/cube-plan.md
 *  §8.2) — and because the sheet's default is "the first one" whenever there is
 *  nothing else to go on. */
export const METHODS = Object.freeze([
  Object.freeze({
    id: 'roux',
    name: 'Roux',
    stages: Object.freeze(['First block', 'Second block', 'CMLL', 'LSE']),
  }),
  Object.freeze({
    id: 'cfop',
    name: 'CFOP',
    stages: Object.freeze(['Cross', 'F2L', 'OLL', 'PLL']),
  }),
  Object.freeze({
    id: 'beginner-lbl',
    name: 'Beginner LBL',
    stages: Object.freeze(['Cross', 'F2L basic', 'OLL 2-look', 'PLL 2-look']),
  }),
]);

/**
 * What a solve with no method is called, where one has to be named.
 *
 * The sheet offers it as a choice and it stores `null`, so picking it and
 * inheriting it are indistinguishable — see the header. Nothing reading a solve
 * should print this: a **card shows no method segment at all** for a null solve
 * rather than labelling every pre-Step-4 record "Freeform", which would be a
 * claim about them that this app is in no position to make.
 */
export const FREEFORM_NAME = 'Freeform';

/** What the sheet says a Freeform solve gets instead of a stage list. */
export const FREEFORM_BLURB = 'No stages — name the groups yourself as you go.';

/** A method by id, or null. `null` in gives `null` back, which is the Freeform
 *  and legacy case and is not an error. */
export const findMethod = (id, catalogue = METHODS) =>
  (catalogue || []).find((method) => method.id === id) || null;

/** Shared rather than a fresh `[]` per call, so a memo reading `stagesOf` is not
 *  rebuilt on every render. Frozen for the same reason `METHODS` is. */
const EMPTY_STAGES = Object.freeze([]);

/**
 * A method's stages, or the empty list.
 *
 * The empty list rather than null for an unknown or absent id, because every
 * caller is about to iterate: Step 5's rail over an empty stage list is *no
 * rail*, which is exactly right for a legacy solve, and it needs no branch to
 * say so.
 */
export const stagesOf = (id, catalogue = METHODS) => {
  const method = findMethod(id, catalogue);
  return method ? method.stages : EMPTY_STAGES;
};

/** What a method is called — `null` for a solve that has none, so a caller can
 *  leave the clause off rather than print a placeholder. */
export const methodName = (id, catalogue = METHODS) => {
  const method = findMethod(id, catalogue);
  return method ? method.name : null;
};

/**
 * A stored method id, brought into shape.
 *
 * Storage is the boundary where a file written by an older build — or a newer
 * one, or a corrupt one — comes back in, and the answer to all three is the
 * same: **anything that is not a shipped id is `null`.** A file written by a
 * future build that knows a method this one does not gets the legacy treatment,
 * which is the honest one — its markers are still the operator's work, and this
 * build has no stage list to draw a rail from.
 */
export const sanitizeMethodId = (raw, catalogue = METHODS) =>
  (findMethod(raw, catalogue) ? raw : null);

/**
 * Which method the new-solve sheet should open on.
 *
 * **The method of the newest solve for this scramble, and Roux when there is
 * none.** Derived, and stored nowhere — the same discipline `orderCards` applies
 * to "in progress" (`solveCards.js`): a remembered *preference* would be the
 * first entry in a settings store this epic has not decided on yet (plan §6,
 * open question 13), and inventing one here is how two of them end up existing.
 *
 * It is also the better default of the two. The reason to write a second solve
 * against a scramble is almost always to try the same method again, so the
 * sheet opens on the answer the operator gave a minute ago without any of it
 * being remembered.
 *
 * A newest solve that is Freeform or legacy opens the sheet on Freeform, which
 * reads oddly written down and is right in the hand: it is still "what you were
 * doing on this scramble", and the sheet shows the pick before anything is
 * created, so nothing is chosen silently.
 *
 * @param {Array} mySolves the solves for one scramble, newest first
 * @returns {string|null} a method id, or null for Freeform
 */
export const defaultMethod = (mySolves, catalogue = METHODS) => {
  const list = mySolves || [];
  if (list.length === 0) return catalogue.length > 0 ? catalogue[0].id : null;
  return sanitizeMethodId(list[0] && list[0].method, catalogue);
};

export default {
  METHODS,
  FREEFORM_NAME,
  FREEFORM_BLURB,
  findMethod,
  stagesOf,
  methodName,
  sanitizeMethodId,
  defaultMethod,
};
