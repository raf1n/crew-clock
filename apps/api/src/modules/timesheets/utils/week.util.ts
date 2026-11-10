import { BadRequestException } from '@nestjs/common';

export interface WeekRange {
  periodStart: string;
  periodEnd: string;
}

export function resolveWeek(weekStart?: string): WeekRange {
  return buildWeek(weekStart ? parseDate(weekStart) : new Date());
}

export function resolveWeekForDate(date: Date): WeekRange {
  return buildWeek(date);
}

function buildWeek(base: Date): WeekRange {
  const day = base.getUTCDay();
  const mondayOffset = (day + 6) % 7;
  const monday = new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() - mondayOffset),
  );
  const sunday = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000);

  return { periodStart: formatDate(monday), periodEnd: formatDate(sunday) };
}

function parseDate(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || formatDate(date) !== value) {
    throw new BadRequestException('Invalid weekStart date');
  }
  return date;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
