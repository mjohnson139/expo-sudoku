/**
 * Debounce with a `flush()` escape hatch.
 *
 * Extracted from utils/storage.js so both games' persistence layers share one
 * implementation. `flush()` runs a pending call immediately — needed when a
 * screen unmounts or the app backgrounds and the last write must land now
 * rather than 500ms from now.
 *
 * @param {Function} func - the function to debounce
 * @param {number} wait - milliseconds of quiet before invoking
 * @returns {Function} the debounced function, with `.flush()`
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
