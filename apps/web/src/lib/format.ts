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
  return date.toISOString().slice(0, 10);
}

export function todayInput(): string {
  return toDateInput(new Date());
}

export function daysAgoInput(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return toDateInput(date);
}

export function startOfDayIso(dateInput: string): string {
  return new Date(`${dateInput}T00:00:00.000Z`).toISOString();
}

export function endOfDayIso(dateInput: string): string {
  return new Date(new Date(`${dateInput}T00:00:00.000Z`).getTime() + 86_400_000).toISOString();
}

export function startOfWeekIso(dateInput = todayInput()): string {
  const date = new Date(`${dateInput}T00:00:00.000Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString();
}

export function startOfWeekInput(dateInput = todayInput()): string {
  return startOfWeekIso(dateInput).slice(0, 10);
}

export function formatLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/^\w/, (character) => character.toUpperCase());
}
