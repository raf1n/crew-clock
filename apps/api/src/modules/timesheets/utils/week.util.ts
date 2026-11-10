import { BadRequestException } from '@nestjs/common';
import { DEFAULT_TIMEZONE } from '@crewclock/shared';

import {
  addDaysToParts,
  datePartsInTimeZone,
  formatDateParts,
  parseDateString,
  weekdayOfParts,
  zonedTimeToUtc,
  type DateParts,
} from '../../../common/utils/timezone';

export interface WeekRange {
  periodStart: string;
  periodEnd: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
}

export function resolveWeek(weekStart?: string, timezone = DEFAULT_TIMEZONE): WeekRange {
  const parts = weekStart ? parseWeekStart(weekStart) : datePartsInTimeZone(new Date(), timezone);
  return buildWeek(parts, timezone);
}

export function resolveWeekForDate(date: Date, timezone = DEFAULT_TIMEZONE): WeekRange {
  return buildWeek(datePartsInTimeZone(date, timezone), timezone);
}

function buildWeek(parts: DateParts, timezone: string): WeekRange {
  const mondayOffset = (weekdayOfParts(parts) + 6) % 7;
  const monday = addDaysToParts(parts, -mondayOffset);
  const nextMonday = addDaysToParts(monday, 7);

  return {
    periodStart: formatDateParts(monday),
    periodEnd: formatDateParts(nextMonday),
    startAt: zonedTimeToUtc(monday, timezone),
    endAt: zonedTimeToUtc(nextMonday, timezone),
    timezone,
  };
}

function parseWeekStart(value: string): DateParts {
  try {
    return parseDateString(value);
  } catch {
    throw new BadRequestException('Invalid weekStart date');
  }
}
