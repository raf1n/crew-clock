import { CalendarClock, CalendarDays, FolderKanban, Timer } from 'lucide-react';

import { useGetProjectsQuery } from '@/api/projectsApi';
import { useGetRunningQuery } from '@/api/timeEntriesApi';
import { useGetTimeReportQuery } from '@/api/reportsApi';
import { StatCard } from '@/components/shared/StatCard';
import {
  endOfDayIso,
  formatDuration,
  startOfDayIso,
  startOfWeekIso,
  todayInput,
} from '@/lib/format';

export function DashboardStats({ workspaceId }: { workspaceId: string }) {
  const today = todayInput();
  const from = startOfDayIso(today);
  const to = endOfDayIso(today);

  const { data: todayReport } = useGetTimeReportQuery({
    workspaceId,
    from,
    to,
    groupBy: 'project',
  });
  const { data: weekReport } = useGetTimeReportQuery({
    workspaceId,
    from: startOfWeekIso(today),
    to,
    groupBy: 'project',
  });
  const { data: projects } = useGetProjectsQuery({ workspaceId });
  const { data: runningData } = useGetRunningQuery(workspaceId);
  const running = runningData?.id ? runningData : null;
  const todayEntries =
    todayReport?.groups.reduce((total, group) => total + group.entryCount, 0) ?? 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Status"
        value={running ? 'Tracking' : 'Idle'}
        hint={running ? 'Timer is running' : 'No timer running'}
        icon={Timer}
        tone={running ? 'green' : 'slate'}
      />
      <StatCard
        label="Today"
        value={formatDuration(todayReport?.totalSeconds ?? 0)}
        hint={`${todayEntries} ${todayEntries === 1 ? 'entry' : 'entries'}`}
        icon={CalendarDays}
        tone="blue"
      />
      <StatCard
        label="This week"
        value={formatDuration(weekReport?.totalSeconds ?? 0)}
        hint="Monday to today"
        icon={CalendarClock}
        tone="amber"
      />
      <StatCard
        label="Projects"
        value={projects?.total ?? 0}
        hint="Active projects"
        icon={FolderKanban}
      />
    </div>
  );
}
