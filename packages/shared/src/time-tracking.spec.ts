import { reportQuerySchema } from './reports';
import { createTimeEntrySchema, updateTimeEntrySchema } from './time-entries';
import { timesheetQuerySchema } from './timesheets';

describe('time entry schemas', () => {
  it('rejects an entry that ends before it starts', () => {
    const result = createTimeEntrySchema.safeParse({
      projectId: '3f4b2c1a-9d8e-4f7a-b6c5-d4e3f2a1b0c9',
      startedAt: '2026-01-05T10:00:00.000Z',
      endedAt: '2026-01-05T09:00:00.000Z',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an empty update', () => {
    expect(updateTimeEntrySchema.safeParse({}).success).toBe(false);
  });
});

describe('report schemas', () => {
  it('defaults grouping to user', () => {
    const parsed = reportQuerySchema.parse({
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-02-01T00:00:00.000Z',
    });

    expect(parsed.groupBy).toBe('user');
  });

  it('rejects an inverted range', () => {
    const result = reportQuerySchema.safeParse({
      from: '2026-02-01T00:00:00.000Z',
      to: '2026-01-01T00:00:00.000Z',
    });

    expect(result.success).toBe(false);
  });
});

describe('timesheet query schema', () => {
  it('accepts an optional week start date', () => {
    expect(timesheetQuerySchema.parse({})).toEqual({});
    expect(timesheetQuerySchema.parse({ weekStart: '2026-01-05' })).toEqual({
      weekStart: '2026-01-05',
    });
    expect(timesheetQuerySchema.safeParse({ weekStart: '01-05-2026' }).success).toBe(false);
  });
});
