export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (hours > 0) {
    return seconds > 0 ? `${hours}h ${minutes}m ${seconds}s` : `${hours}h ${minutes}m`;
  }
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function toDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayInput(): string {
  return toDateInput(new Date());
}

export function daysAgoInput(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toDateInput(date);
}

export function startOfDayIso(dateInput: string): string {
  return localDate(dateInput).toISOString();
}

export function endOfDayIso(dateInput: string): string {
  const date = localDate(dateInput);
  date.setDate(date.getDate() + 1);
  return date.toISOString();
}

export function startOfWeekIso(dateInput = todayInput()): string {
  return startOfWeekDate(dateInput).toISOString();
}

export function startOfWeekInput(dateInput = todayInput()): string {
  return toDateInput(startOfWeekDate(dateInput));
}

export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function startOfWeekDate(dateInput: string): Date {
  const date = localDate(dateInput);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return date;
}

function localDate(dateInput: string): Date {
  const [year = 1970, month = 1, day = 1] = dateInput.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/^\w/, (character) => character.toUpperCase());
}
