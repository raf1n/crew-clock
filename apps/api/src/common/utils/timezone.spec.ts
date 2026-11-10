import { dateInTimeZone, zonedTimeToUtc } from './timezone';

describe('timezone helpers', () => {
  it('reads the local date in a timezone', () => {
    expect(dateInTimeZone(new Date('2026-11-10T18:03:00.000Z'), 'Asia/Dhaka')).toBe('2026-11-11');
  });

  it('converts a zoned midnight to UTC', () => {
    expect(zonedTimeToUtc({ year: 2026, month: 3, day: 8 }, 'America/New_York')).toEqual(
      new Date('2026-03-08T05:00:00.000Z'),
    );
  });
});
