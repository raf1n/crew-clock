import { resolveWeek, resolveWeekForDate } from './week.util';

describe('resolveWeek', () => {
  it('uses local Monday boundaries in the user timezone', () => {
    const week = resolveWeek('2026-11-10', 'Asia/Dhaka');

    expect(week.periodStart).toBe('2026-11-09');
    expect(week.periodEnd).toBe('2026-11-16');
    expect(week.startAt).toEqual(new Date('2026-11-08T18:00:00.000Z'));
    expect(week.endAt).toEqual(new Date('2026-11-15T18:00:00.000Z'));
  });

  it('handles DST transitions in the week boundaries', () => {
    const week = resolveWeek('2026-03-08', 'America/New_York');

    expect(week.startAt).toEqual(new Date('2026-03-02T05:00:00.000Z'));
    expect(week.endAt).toEqual(new Date('2026-03-09T04:00:00.000Z'));
  });

  it('resolves the local week containing a UTC instant', () => {
    const week = resolveWeekForDate(new Date('2026-11-10T18:03:00.000Z'), 'Asia/Dhaka');
    expect(week.periodStart).toBe('2026-11-09');
  });
});
