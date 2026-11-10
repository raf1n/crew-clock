import { CalendarClock, CalendarDays, FolderKanban, ListChecks } from 'lucide-react';

import { useGetProjectsQuery } from '@/api/projectsApi';
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
  const todayEntries =
    todayReport?.groups.reduce((total, group) => total + group.entryCount, 0) ?? 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Today"
        value={formatDuration(todayReport?.totalSeconds ?? 0)}
        hint="Tracked today"
        icon={CalendarDays}
        tone="blue"
      />
      <StatCard
        label="Entries today"
        value={todayEntries}
        hint={`${todayEntries === 1 ? 'Entry' : 'Entries'} logged`}
        icon={ListChecks}
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
