import { formatDuration, formatRecordedDate, yearOf } from '../format';

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [9, '0:09'],
    [15.6, '0:15'],
    [60, '1:00'],
    [90, '1:30'],
    [605, '10:05'],
  ])('formats %p seconds as %p', (input, expected) => {
    expect(formatDuration(input)).toBe(expected);
  });

  it('treats invalid/negative input as zero', () => {
    expect(formatDuration(-5)).toBe('0:00');
    expect(formatDuration(NaN)).toBe('0:00');
  });
});

describe('formatRecordedDate', () => {
  it('formats an ISO date as "Month Year"', () => {
    expect(formatRecordedDate('2008-08-15')).toBe('August 2008');
    expect(formatRecordedDate('1996-07-04')).toBe('July 1996');
  });

  it('falls back to the raw value when unparseable', () => {
    expect(formatRecordedDate('not-a-date')).toBe('not-a-date');
  });
});

describe('yearOf', () => {
  it('extracts the year', () => {
    expect(yearOf('2015-04-22')).toBe(2015);
  });
  it('returns null when unparseable', () => {
    expect(yearOf('nope')).toBeNull();
  });
});
