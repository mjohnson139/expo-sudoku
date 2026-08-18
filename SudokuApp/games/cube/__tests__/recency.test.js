import { describeRecency } from '../recency';

/**
 * Times are built with the local `Date` constructor rather than as epoch
 * constants, so the suite means the same thing in every timezone the CI and the
 * operator's machine might be set to — `describeRecency` counts *local*
 * midnights, and a hardcoded epoch would land on a different calendar day in
 * Auckland than in Los Angeles.
 */
const at = (year, month, day, hour = 12, minute = 0) =>
  new Date(year, month - 1, day, hour, minute, 0, 0).getTime();

const NOW = at(2026, 8, 17, 14, 30);

describe('describeRecency', () => {
  it('says nothing at all for a solve with no date on it', () => {
    // What `sanitizeSolves` gives a record written before the field existed.
    expect(describeRecency(0, NOW)).toBe('');
    expect(describeRecency(undefined, NOW)).toBe('');
    expect(describeRecency(null, NOW)).toBe('');
    expect(describeRecency(NaN, NOW)).toBe('');
    expect(describeRecency(-1, NOW)).toBe('');
  });

  it('says nothing when there is no clock to compare against', () => {
    expect(describeRecency(NOW, undefined)).toBe('');
    expect(describeRecency(NOW, NaN)).toBe('');
  });

  it('is "just now" for the first minute, and up to the last second of it', () => {
    expect(describeRecency(NOW, NOW)).toBe('just now');
    expect(describeRecency(NOW - 1, NOW)).toBe('just now');
    expect(describeRecency(NOW - 59_999, NOW)).toBe('just now');
  });

  it('reads a clock that has been set back as "just now" rather than as a negative', () => {
    expect(describeRecency(NOW + 5 * 60_000, NOW)).toBe('just now');
  });

  it('counts minutes up to the hour, singular at one', () => {
    expect(describeRecency(NOW - 60_000, NOW)).toBe('1 min ago');
    expect(describeRecency(NOW - 12 * 60_000, NOW)).toBe('12 min ago');
    expect(describeRecency(NOW - 59 * 60_000, NOW)).toBe('59 min ago');
  });

  it('switches to the calendar at an hour', () => {
    expect(describeRecency(NOW - 60 * 60_000, NOW)).toBe('today');
    expect(describeRecency(at(2026, 8, 17, 0, 1), NOW)).toBe('today');
  });

  it('is "yesterday" by the calendar, not by 24 hours', () => {
    // Written at 11pm last night, read at half past two in the afternoon: three
    // and a half hours short of a day, and unmistakably yesterday.
    expect(describeRecency(at(2026, 8, 16, 23, 0), NOW)).toBe('yesterday');
    expect(describeRecency(at(2026, 8, 16, 0, 5), NOW)).toBe('yesterday');
  });

  it('counts days to the week', () => {
    expect(describeRecency(at(2026, 8, 15), NOW)).toBe('2 days ago');
    expect(describeRecency(at(2026, 8, 11), NOW)).toBe('6 days ago');
  });

  it('counts weeks, naming the first one', () => {
    expect(describeRecency(at(2026, 8, 10), NOW)).toBe('last week');
    expect(describeRecency(at(2026, 8, 3), NOW)).toBe('2 weeks ago');
    expect(describeRecency(at(2026, 7, 20), NOW)).toBe('4 weeks ago');
  });

  it('coarsens to months and then to years', () => {
    expect(describeRecency(at(2026, 7, 13), NOW)).toBe('last month');
    expect(describeRecency(at(2026, 5, 17), NOW)).toBe('3 months ago');
    expect(describeRecency(at(2025, 8, 17), NOW)).toBe('last year');
    expect(describeRecency(at(2023, 8, 17), NOW)).toBe('3 years ago');
  });

  it('never comes back empty for a real date, so a card never loses its clause', () => {
    const days = [0, 1, 2, 6, 7, 8, 30, 45, 200, 400, 4000];
    days.forEach((back) => {
      expect(describeRecency(NOW - back * 24 * 60 * 60 * 1000, NOW).length).toBeGreaterThan(0);
    });
  });

  it('survives a daylight-saving change: a 23-hour day is still one day', () => {
    // Only meaningful where the runner's zone observes it; where it does not,
    // these are ordinary days and the answer is the same, which is the point.
    expect(describeRecency(at(2026, 3, 7, 12), at(2026, 3, 8, 12))).toBe('yesterday');
    expect(describeRecency(at(2026, 10, 31, 12), at(2026, 11, 1, 12))).toBe('yesterday');
  });
});
