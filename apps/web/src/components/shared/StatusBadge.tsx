import type { TimesheetStatus, TaskStatus } from '@crewclock/shared';

import { Badge } from '@/components/ui/badge';
import { formatLabel } from '@/lib/format';

const TIMESHEET_TONES: Record<TimesheetStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  approved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
};

const TASK_TONES: Record<TaskStatus, string> = {
  todo: 'bg-muted text-muted-foreground',
  in_progress: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  done: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
};

export function TimesheetStatusBadge({ status }: { status: TimesheetStatus }) {
  return (
    <Badge variant="secondary" className={TIMESHEET_TONES[status]}>
      {formatLabel(status)}
    </Badge>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant="secondary" className={TASK_TONES[status]}>
      {formatLabel(status)}
    </Badge>
  );
}
