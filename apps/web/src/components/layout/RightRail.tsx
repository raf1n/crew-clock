import { CalendarDays, ClipboardCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useGetTimeReportQuery } from '@/api/reportsApi';
import { useListTimesheetsQuery } from '@/api/timesheetsApi';
import { useGetRunningQuery } from '@/api/timeEntriesApi';
import { useGetMembersQuery } from '@/api/workspacesApi';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSelectedWorkspace } from '@/hooks/useSelectedWorkspace';
import {
  endOfDayIso,
  formatDuration,
  startOfDayIso,
  startOfWeekIso,
  todayInput,
} from '@/lib/format';

const DAILY_GOAL_SECONDS = 8 * 60 * 60;

export function RightRail() {
  const { workspace } = useSelectedWorkspace();
  const workspaceId = workspace?.id ?? '';
  const today = todayInput();
  const isManager = workspace ? workspace.role !== 'member' : false;

  const { data: todayReport } = useGetTimeReportQuery(
    { workspaceId, from: startOfDayIso(today), to: endOfDayIso(today), groupBy: 'user' },
    { skip: !workspace },
  );
  const { data: weekReport } = useGetTimeReportQuery(
    {
      workspaceId,
      from: startOfWeekIso(today),
      to: endOfDayIso(today),
      groupBy: isManager ? 'user' : 'project',
    },
    { skip: !workspace },
  );
  const { data: members } = useGetMembersQuery(workspaceId, { skip: !workspace });
  const { data: runningData } = useGetRunningQuery(workspaceId, {
    skip: !workspace || isManager,
    pollingInterval: 5000,
  });
  const { data: timesheets } = useListTimesheetsQuery(
    { workspaceId, weekStart: today },
    { skip: !workspace || !isManager },
  );

  if (!workspace) {
    return null;
  }

  const trackableMembers = (members ?? []).filter((member) => member.role === 'member');
  const trackableIds = new Set(trackableMembers.map((member) => member.userId));
  const todayGroups = (todayReport?.groups ?? []).filter(
    (group) => group.key !== null && trackableIds.has(group.key),
  );
  const todaySeconds = todayGroups.reduce((total, group) => total + group.seconds, 0);
  const todayEntries = todayGroups.reduce((total, group) => total + group.entryCount, 0);
  const activeMembers = todayGroups.length;
  const totalMembers = trackableMembers.length;
  const goalPercent = Math.min(100, Math.round((todaySeconds / DAILY_GOAL_SECONDS) * 100));
  const activePercent = totalMembers ? Math.round((activeMembers / totalMembers) * 100) : 0;
  const ringPercent = isManager ? activePercent : goalPercent;
  const running = runningData?.id ? runningData : null;
  const allWeekGroups = (weekReport?.groups ?? []).filter(
    (group) => group.key !== null && trackableIds.has(group.key),
  );
  const weekGroups = allWeekGroups.slice(0, 4);
  const weekSeconds = allWeekGroups.reduce((total, group) => total + group.seconds, 0);
  const weekMax = Math.max(...weekGroups.map((group) => group.seconds), 1);
  const memberById = new Map((members ?? []).map((member) => [member.userId, member]));
  const pendingApprovals = (timesheets ?? []).filter((sheet) => sheet.status === 'submitted');
  const memberName = (userId: string): string => memberById.get(userId)?.user.name ?? userId;

  const badgeLabel = isManager ? `${activeMembers} active` : running ? 'Tracking' : 'Idle';

  return (
    <aside className="hidden h-dvh w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l bg-card px-4 py-6 2xl:flex">
      <Card className="gap-4 py-4">
        <CardHeader className="flex flex-row items-center justify-between px-4">
          <CardTitle className="text-sm">Today</CardTitle>
          <Badge variant={isManager || running ? 'default' : 'secondary'}>{badgeLabel}</Badge>
        </CardHeader>
        <CardContent className="flex items-center gap-4 px-4">
          <div
            className="grid size-20 shrink-0 place-items-center rounded-full"
            style={{
              background: `conic-gradient(var(--primary) ${ringPercent}%, var(--muted) ${ringPercent}% 100%)`,
            }}
          >
            <div className="grid size-16 place-items-center rounded-full bg-card text-center">
              <span className="text-sm font-semibold tabular-nums">
                {isManager
                  ? totalMembers > 0
                    ? `${activeMembers}/${totalMembers}`
                    : '—'
                  : formatDuration(todaySeconds)}
              </span>
            </div>
          </div>
          <div className="space-y-1 text-sm">
            <p className="font-medium">
              {isManager ? `${formatDuration(todaySeconds)} tracked` : `${goalPercent}% of 8h goal`}
            </p>
            <p className="text-muted-foreground">
              {isManager
                ? totalMembers === 0
                  ? 'No members can track time yet'
                  : `${activeMembers} of ${totalMembers} members active`
                : `${todayEntries} ${todayEntries === 1 ? 'entry' : 'entries'}`}
            </p>
            {!isManager && running ? (
              <p className="text-xs text-muted-foreground">
                Running since{' '}
                {new Date(running.startedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="gap-4 py-4">
        <CardHeader className="px-4">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CalendarDays className="size-4 text-muted-foreground" />
            {isManager ? 'Team this week' : 'This week'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4">
          <p className="text-2xl font-semibold tabular-nums">{formatDuration(weekSeconds)}</p>
          {weekGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing tracked yet.</p>
          ) : (
            <ul className="space-y-2">
              {weekGroups.map((group) => {
                const member = group.key ? memberById.get(group.key) : undefined;
                const name = isManager ? (member?.user.name ?? group.label) : group.label;

                return (
                  <li key={group.key ?? group.label}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex min-w-0 items-center gap-1.5">
                        {isManager ? <UserAvatar name={name} size="sm" className="size-5" /> : null}
                        <span className="truncate">{name}</span>
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatDuration(group.seconds)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.round((group.seconds / weekMax) * 100)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {isManager ? (
        <Card className="gap-4 py-4">
          <CardHeader className="px-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ClipboardCheck className="size-4 text-muted-foreground" />
              Approvals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4">
            <p className="text-2xl font-semibold tabular-nums">{pendingApprovals.length}</p>
            <p className="text-xs text-muted-foreground">Submitted timesheets this week</p>
            {pendingApprovals.length > 0 ? (
              <ul className="space-y-2">
                {pendingApprovals.slice(0, 4).map((sheet) => (
                  <li
                    key={sheet.id ?? sheet.userId}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="truncate">{memberName(sheet.userId)}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatDuration(sheet.totalSeconds)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing waiting for review.</p>
            )}
            <Link
              className="inline-flex text-sm font-medium text-primary hover:underline"
              to="/timesheets"
            >
              Review timesheets
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="gap-4 py-4">
          <CardHeader className="px-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="size-4 text-muted-foreground" />
              Team
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4">
            {!members?.length ? (
              <p className="text-sm text-muted-foreground">No members yet.</p>
            ) : (
              members.slice(0, 6).map((member) => (
                <div key={member.userId} className="flex items-center gap-2">
                  <UserAvatar name={member.user.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{member.user.name}</p>
                    <p className="truncate text-xs capitalize text-muted-foreground">
                      {member.role}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </aside>
  );
}
