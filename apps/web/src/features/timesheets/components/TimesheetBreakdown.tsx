import type {
  TimesheetDayTotal,
  TimesheetProjectTotal,
  TimesheetSummary,
  TimesheetTaskTotal,
} from '@crewclock/shared';

import { formatDuration } from '@/lib/format';

export function TimesheetBreakdown({
  timesheet,
  compact = false,
  mode = 'projects',
}: {
  timesheet: TimesheetSummary;
  compact?: boolean;
  mode?: 'projects' | 'tasks' | 'week';
}) {
  if (mode === 'week') {
    return <WeekBreakdown days={timesheet.days} compact={compact} />;
  }

  if (mode === 'tasks') {
    return <TaskBreakdown tasks={timesheet.tasks} compact={compact} />;
  }

  return <ProjectBreakdown projects={timesheet.projects} compact={compact} />;
}

function WeekBreakdown({ days, compact }: { days: TimesheetDayTotal[]; compact: boolean }) {
  const max = Math.max(...days.map((day) => day.seconds), 1);

  return (
    <ul className={compact ? 'space-y-1' : 'space-y-3'}>
      {days.map((day) => {
        const percent = Math.round((day.seconds / max) * 100);
        return (
          <li key={day.date}>
            <div className="flex items-center gap-3 text-sm">
              <span className="w-9 shrink-0 text-muted-foreground">{formatWeekday(day.date)}</span>
              <span className="w-16 shrink-0 tabular-nums">
                {day.seconds > 0 ? formatDuration(day.seconds) : '—'}
              </span>
              <div
                className={`flex-1 overflow-hidden rounded-full bg-muted ${
                  compact ? 'h-1' : 'h-2'
                }`}
              >
                <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ProjectBreakdown({
  projects,
  compact,
}: {
  projects: TimesheetProjectTotal[];
  compact: boolean;
}) {
  if (projects.length === 0) {
    return <p className="text-sm text-muted-foreground">No entries in this week.</p>;
  }

  const total = Math.max(
    projects.reduce((sum, project) => sum + project.seconds, 0),
    1,
  );

  return (
    <ul className={compact ? 'space-y-2' : 'space-y-4'}>
      {projects.map((project) => {
        const percent = Math.round((project.seconds / total) * 100);
        return (
          <li key={project.projectId}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-medium">{project.projectName}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatDuration(project.seconds)}
              </span>
            </div>
            <div
              className={`mt-1 overflow-hidden rounded-full bg-muted ${compact ? 'h-1' : 'h-2'}`}
            >
              <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function TaskBreakdown({ tasks, compact }: { tasks: TimesheetTaskTotal[]; compact: boolean }) {
  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">No tasks in this week.</p>;
  }

  const max = Math.max(...tasks.map((task) => task.seconds), 1);

  return (
    <ul className={compact ? 'space-y-2' : 'space-y-4'}>
      {tasks.map((task) => {
        const percent = Math.round((task.seconds / max) * 100);
        return (
          <li key={`${task.projectId}:${task.taskId ?? 'none'}`}>
            <div className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{task.taskTitle}</p>
                <p className="truncate text-xs text-muted-foreground">{task.projectName}</p>
              </div>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatDuration(task.seconds)}
              </span>
            </div>
            <div
              className={`mt-1 overflow-hidden rounded-full bg-muted ${compact ? 'h-1' : 'h-2'}`}
            >
              <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function formatWeekday(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString(undefined, {
    weekday: 'short',
    timeZone: 'UTC',
  });
}
