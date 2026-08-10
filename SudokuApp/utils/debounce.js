/**
 * Debounce with a `flush()` escape hatch.
 *
 * Extracted from utils/storage.js so both games' persistence layers share one
 * implementation. `flush()` runs a pending call immediately — needed when a
 * screen unmounts or the app backgrounds and the last write must land now
 * rather than 500ms from now.
 *
 * The signature is written generically rather than as `Function` on purpose.
 * TypeScript reads JSDoc out of JavaScript — see `utils/themes.d.ts` — and
 * `{Function}` is a type with no call signature and no `flush`, so it hid this
 * util's whole contract from the TypeScript games and would have cost a
 * hand-written `.d.ts` to say what the JavaScript already knew. Comment-only:
 * nothing about the behaviour changes.
 *
 * @template {(...args: any[]) => any} F
 * @param {F} func - the function to debounce
 * @param {number} wait - milliseconds of quiet before invoking
 * @returns {F & { flush: () => void }} the debounced function, with `.flush()`
 */
const debounce = (func, wait) => {
  let timeout = null;
  let lastArgs;
  let lastThis;

  const invoke = () => {
    const result = func.apply(lastThis, lastArgs);
    timeout = null;
    return result;
  };

  const debounced = function (...args) {
    lastArgs = args;
    lastThis = this;
    clearTimeout(timeout);
    timeout = setTimeout(invoke, wait);
  };

  debounced.flush = () => {
    if (timeout) {
      clearTimeout(timeout);
      return invoke();
    }
  };

  return debounced;
};

export default debounce;
