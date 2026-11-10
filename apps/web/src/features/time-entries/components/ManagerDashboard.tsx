import { CalendarClock, ClipboardCheck, Clock, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useGetTimeReportQuery } from '@/api/reportsApi';
import { useListTimesheetsQuery } from '@/api/timesheetsApi';
import { useGetMembersQuery } from '@/api/workspacesApi';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatCard } from '@/components/shared/StatCard';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  endOfDayIso,
  formatDuration,
  startOfDayIso,
  startOfWeekIso,
  todayInput,
} from '@/lib/format';
import { RecentEntriesPanel } from './RecentEntriesPanel';

export function ManagerDashboard({ workspaceId }: { workspaceId: string }) {
  const today = todayInput();
  const weekStart = startOfWeekIso(today);
  const dayEnd = endOfDayIso(today);

  const { data: members } = useGetMembersQuery(workspaceId);
  const { data: todayReport } = useGetTimeReportQuery({
    workspaceId,
    from: startOfDayIso(today),
    to: dayEnd,
    groupBy: 'user',
  });
  const { data: weekReport } = useGetTimeReportQuery({
    workspaceId,
    from: weekStart,
    to: dayEnd,
    groupBy: 'user',
  });
  const { data: timesheets } = useListTimesheetsQuery({ workspaceId, weekStart: today });

  const pending = (timesheets ?? []).filter((sheet) => sheet.status === 'submitted');
  const pendingApprovals = pending.length;
  const memberName = (userId: string): string =>
    members?.find((member) => member.userId === userId)?.user.name ?? userId;
  const trackableMembers = (members ?? []).filter((member) => member.role === 'member');
  const trackableIds = new Set(trackableMembers.map((member) => member.userId));
  const todayGroups = (todayReport?.groups ?? []).filter(
    (group) => group.key !== null && trackableIds.has(group.key),
  );
  const todaySeconds = todayGroups.reduce((total, group) => total + group.seconds, 0);
  const todayActive = todayGroups.length;
  const allWeekGroups = (weekReport?.groups ?? []).filter(
    (group) => group.key !== null && trackableIds.has(group.key),
  );
  const weekSeconds = allWeekGroups.reduce((total, group) => total + group.seconds, 0);
  const weekGroups = allWeekGroups.slice(0, 4);
  const weekTotal = Math.max(weekSeconds, 1);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Team today"
          value={formatDuration(todaySeconds)}
          hint={`${todayActive} of ${trackableMembers.length} active`}
          icon={Clock}
          tone="blue"
        />
        <StatCard
          label="Team this week"
          value={formatDuration(weekSeconds)}
          hint="Monday to today"
          icon={CalendarClock}
          tone="amber"
        />
        <StatCard
          label="Members"
          value={trackableMembers.length}
          hint="Members who track time"
          icon={Users}
        />
        <StatCard
          label="Pending approvals"
          value={pendingApprovals}
          hint="Submitted timesheets"
          icon={ClipboardCheck}
          tone={pendingApprovals > 0 ? 'amber' : 'green'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Team this week</CardTitle>
            <CardDescription>Tracked time by member</CardDescription>
          </CardHeader>
          <CardContent>
            {weekGroups.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No team time yet"
                description="Member time will appear here once they start tracking."
              />
            ) : (
              <ul className="space-y-4">
                {weekGroups.map((group) => {
                  const member = group.key
                    ? members?.find((item) => item.userId === group.key)
                    : undefined;
                  const name = member?.user.name ?? group.label;
                  const percent = Math.round((group.seconds / weekTotal) * 100);

                  return (
                    <li key={group.key ?? group.label}>
                      <div className="flex items-center gap-2 text-sm">
                        <UserAvatar name={name} size="sm" />
                        <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {formatDuration(group.seconds)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending review</CardTitle>
            <CardDescription>Submitted weeks waiting for approval</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing waiting for review.</p>
            ) : (
              <>
                <ul className="space-y-3">
                  {pending.slice(0, 4).map((sheet) => (
                    <li
                      key={sheet.id ?? sheet.userId}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <UserAvatar name={memberName(sheet.userId)} size="sm" />
                        <span className="truncate font-medium">{memberName(sheet.userId)}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {formatDuration(sheet.totalSeconds)}
                      </span>
                    </li>
                  ))}
                </ul>
                {pending.length > 4 ? (
                  <p className="text-xs text-muted-foreground">+{pending.length - 4} more</p>
                ) : null}
              </>
            )}
            <Button asChild variant="outline" className="w-full">
              <Link to="/timesheets">Review in timesheets</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <RecentEntriesPanel workspaceId={workspaceId} team />
    </>
  );
}
