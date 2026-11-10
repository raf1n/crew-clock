import type {
  TimesheetDayTotal,
  TimesheetProjectTotal,
  TimesheetTaskTotal,
} from '@crewclock/shared';

export interface TimesheetTotals {
  totalSeconds: number;
  entryCount: number;
  projects: TimesheetProjectTotal[];
  tasks: TimesheetTaskTotal[];
  days: TimesheetDayTotal[];
}
