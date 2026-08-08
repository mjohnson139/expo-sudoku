import { readNumberSlideSave } from '../storage';

/**
 * The save is read **by shape**, not by version — a key that is absent and a
 * key that is corrupt want the same answer anyway (plan §4.4). These are the
 * shapes that would otherwise reach the screen as a best time it cannot draw.
 *
 * `storage.ts` imports AsyncStorage, which this node-environment runner has no
 * mock for; `readNumberSlideSave` is pure and is what is tested, the same split
 * `games/cube/solveList.js` and `games/fungiku/saveMigration.js` already use.
 */
describe('readNumberSlideSave', () => {
  it('reads a well-formed save', () => {
    expect(readNumberSlideSave({ _v: 1, best: { secs: 42, moves: 88, name: 'Mo' } })).toEqual({
      best: { secs: 42, moves: 88, name: 'Mo' },
    });
  });

  it('has one answer for nothing stored and for garbage stored', () => {
    const empty = { best: null };
    expect(readNumberSlideSave(null)).toEqual(empty);
    expect(readNumberSlideSave(undefined)).toEqual(empty);
    expect(readNumberSlideSave('not an object')).toEqual(empty);
    expect(readNumberSlideSave({})).toEqual(empty);
    expect(readNumberSlideSave({ best: 7 })).toEqual(empty);
  });

  it('rejects a best whose numbers are not numbers', () => {
    expect(readNumberSlideSave({ best: { secs: NaN, moves: 3, name: '' } }).best).toBeNull();
    expect(readNumberSlideSave({ best: { secs: 3, moves: null, name: '' } }).best).toBeNull();
    expect(readNumberSlideSave({ best: { secs: -1, moves: 3, name: '' } }).best).toBeNull();
  });

  it('accepts a best with a missing or wrongly-typed name', () => {
    expect(readNumberSlideSave({ best: { secs: 10, moves: 20 } }).best).toEqual({
      secs: 10,
      moves: 20,
      name: '',
    });
    expect(readNumberSlideSave({ best: { secs: 10, moves: 20, name: 99 } }).best?.name).toBe('');
  });

  it('truncates a name a hand-edited file could have grown', () => {
    expect(readNumberSlideSave({ best: { secs: 1, moves: 1, name: 'x'.repeat(40) } }).best?.name)
      .toHaveLength(12);
  });

  it('floors fractional seconds so the readout cannot show a decimal', () => {
    expect(readNumberSlideSave({ best: { secs: 42.9, moves: 3.7, name: '' } }).best).toEqual({
      secs: 42,
      moves: 3,
      name: '',
    });
  });
});
