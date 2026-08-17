/**
 * How long ago a solve was written, said the way a person would say it
 * (docs/cube-flow-plan.md §3.3, Step 3).
 *
 * `formatElapsed` (`utils/gameProgress.js`) is `mm:ss` and is the wrong
 * instrument for this: it measures *how long you played*, and a card in the
 * scramble's list is answering *when was this*. `04:37` on a solve written last
 * Tuesday is a number with no question behind it.
 *
 * Pure, and in its own file for the reason `compareLayout.js` and
 * `trackLayout.js` are: the test runner is a plain node environment, and the
 * boundaries below — the minute, the calendar day, the week — are exactly the
 * sort of arithmetic that is wrong by one and looks right on the screen you
 * happen to be looking at.
 *
 * ### The clock is injected
 *
 * `now` is a parameter and not a default read at call time, because a test that
 * had to reach `Date.now()` would be a stopwatch race — the same reason
 * `createSolve` takes `savedAt` (`solveList.js`) rather than minting one.
 *
 * ### Minutes are elapsed, days are calendar days
 *
 * They are different questions and the switch between them is deliberate. Under
 * an hour, "how long ago" is what anyone means. Past that, *"yesterday"* is a
 * fact about the calendar and not about 24 hours: a solve written at 11pm is
 * "yesterday" at 7am the next morning, not "8 hours ago", and one written at 1am
 * is still "today" at 11pm. Rounding the difference between the two local
 * midnights is also what makes this survive a daylight-saving change, where a
 * day is 23 or 25 hours long and a floor over milliseconds is off by one for
 * everything written before the switch.
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Local midnight at or before `ms`. Local rather than UTC because the operator
 *  is the one whose "yesterday" this is. */
const startOfDay = (ms) => {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

/**
 * `"yesterday"`, `"12 min ago"`, `"3 weeks ago"` — what a card says about when
 * it was written.
 *
 * A `savedAt` of `0` is what `sanitizeSolves` gives a record that never had one
 * (a file written by a build that did not keep the field), and the honest answer
 * to "when" for a solve with no date on it is **nothing** rather than a guess —
 * so this returns the empty string and the caller leaves the clause off. That is
 * the same choice `CubeFavoritesModal` already makes for a favorite with no date.
 *
 * A `savedAt` in the future reads as `"just now"` rather than as a negative
 * number of minutes. It cannot be right, and the two ways to get one — a clock
 * that has been set back, and a file carried between devices — both mean "very
 * recently" far more often than they mean anything else.
 *
 * @param {number} savedAt epoch ms, as stored on a solve
 * @param {number} now epoch ms, injected
 * @returns {string} the phrase, or `''` when there is no date to say
 */
export const describeRecency = (savedAt, now) => {
  if (!Number.isFinite(savedAt) || savedAt <= 0) return '';
  if (!Number.isFinite(now)) return '';

  const elapsed = now - savedAt;
  if (elapsed < MINUTE) return 'just now';
  if (elapsed < HOUR) {
    const minutes = Math.floor(elapsed / MINUTE);
    return minutes === 1 ? '1 min ago' : `${minutes} min ago`;
  }

  // Calendar days from here down — see the header. `round` rather than `floor`
  // because the two midnights are 23 or 25 hours apart across a daylight-saving
  // change, and every solve written before one would otherwise slip a day.
  const days = Math.round((startOfDay(now) - startOfDay(savedAt)) / DAY);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;

  const weeks = Math.floor(days / 7);
  if (weeks === 1) return 'last week';
  if (weeks < 5) return `${weeks} weeks ago`;

  // Past a month the card has stopped being about *when* and is only saying
  // "not recently", so the units get coarser rather than the number bigger.
  const months = Math.floor(days / 30);
  if (months === 1) return 'last month';
  if (months < 12) return `${months} months ago`;

  const years = Math.floor(days / 365);
  return years <= 1 ? 'last year' : `${years} years ago`;
};

export default { describeRecency };
