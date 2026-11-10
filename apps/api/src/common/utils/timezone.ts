export interface DateParts {
  year: number;
  month: number;
  day: number;
}

export function datePartsInTimeZone(date: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = parts.find((part) => part.type === type)?.value;
    return Number(value);
  };

  return { year: read('year'), month: read('month'), day: read('day') };
}

export function dateInTimeZone(date: Date, timeZone: string): string {
  return formatDateParts(datePartsInTimeZone(date, timeZone));
}

export function parseDateString(value: string): DateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Invalid date: ${value}`);
  }
  const parts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  if (formatDateParts(parts) !== value) {
    throw new Error(`Invalid date: ${value}`);
  }
  return parts;
}

export function formatDateParts(parts: DateParts): string {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export function addDaysToParts(parts: DateParts, days: number): DateParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

export function weekdayOfParts(parts: DateParts): number {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

export function zonedTimeToUtc(parts: DateParts, timeZone: string, hour = 0): Date {
  const wallClock = Date.UTC(parts.year, parts.month - 1, parts.day, hour, 0, 0, 0);
  const offset = timeZoneOffset(new Date(wallClock), timeZone);
  let result = wallClock - offset;
  const corrected = timeZoneOffset(new Date(result), timeZone);
  if (corrected !== offset) {
    result = wallClock - corrected;
  }
  return new Date(result);
}

function timeZoneOffset(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = parts.find((part) => part.type === type)?.value;
    return Number(value);
  };

  const asUtc = Date.UTC(
    read('year'),
    read('month') - 1,
    read('day'),
    read('hour'),
    read('minute'),
    read('second'),
  );
  return asUtc - date.getTime();
}
