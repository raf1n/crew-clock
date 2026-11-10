import type { ActivityAppGroup, WorkspaceMembership } from '@crewclock/shared';
import { roleAtLeast } from '@crewclock/shared';
import { Activity, Clock, Gauge, MonitorSmartphone } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useGetActivityReportQuery } from '@/api/activityApi';
import { useGetMembersQuery, useUpdateWorkspaceSettingsMutation } from '@/api/workspacesApi';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { LoadingState } from '@/components/shared/LoadingState';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/shared/FormField';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiErrorMessage } from '@/lib/api-error';
import { daysAgoInput, endOfDayIso, formatDuration, startOfDayIso, todayInput } from '@/lib/format';

export function ActivityPanel({ workspace }: { workspace: WorkspaceMembership }) {
  const isManager = roleAtLeast(workspace.role, 'manager');
  const [from, setFrom] = useState(daysAgoInput(7));
  const [to, setTo] = useState(todayInput());
  const [userId, setUserId] = useState('');
  const [retentionDays, setRetentionDays] = useState(String(workspace.activityRetentionDays));
  const [retentionError, setRetentionError] = useState<string | null>(null);
  const [retentionSaved, setRetentionSaved] = useState(false);

  const { data: members } = useGetMembersQuery(workspace.id, { skip: !isManager });
  const { data: report, isLoading } = useGetActivityReportQuery({
    workspaceId: workspace.id,
    from: startOfDayIso(from),
    to: endOfDayIso(to),
    userId: userId || undefined,
  });
  const [updateSettings, { isLoading: savingRetention }] = useUpdateWorkspaceSettingsMutation();

  useEffect(() => {
    setRetentionDays(String(workspace.activityRetentionDays));
  }, [workspace.activityRetentionDays]);

  const trackableMembers = (members ?? []).filter((member) => member.role === 'member');

  const handleSaveRetention = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setRetentionError(null);
    setRetentionSaved(false);
    try {
      await updateSettings({
        workspaceId: workspace.id,
        body: { activityRetentionDays: Number(retentionDays) },
      }).unwrap();
      setRetentionSaved(true);
    } catch (error) {
      setRetentionError(apiErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <Card className="gap-0 py-4">
        <div className="grid gap-3 px-4 sm:grid-cols-3">
          <FormField label="From">
            <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </FormField>
          <FormField label="To">
            <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </FormField>
          {isManager ? (
            <FormField label="Member">
              <Select
                value={userId || 'all'}
                onValueChange={(value) => setUserId(value === 'all' ? '' : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All members</SelectItem>
                  {trackableMembers.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {member.user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          ) : null}
        </div>
      </Card>

      {isLoading ? (
        <LoadingState />
      ) : !report ? null : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Active time"
              value={formatDuration(report.totalActiveSeconds)}
              hint="Input activity detected"
              icon={Activity}
              tone="green"
            />
            <StatCard
              label="Idle time"
              value={formatDuration(report.totalIdleSeconds)}
              hint="No input detected"
              icon={Clock}
              tone="amber"
            />
            <StatCard
              label="Activity"
              value={`${report.activityPercent}%`}
              hint="Active / tracked time"
              icon={Gauge}
              tone="blue"
            />
            <StatCard
              label="Samples"
              value={report.sampleCount}
              hint="1-minute intervals"
              icon={MonitorSmartphone}
            />
          </div>

          {isManager && !userId ? (
            <Card>
              <CardHeader>
                <CardTitle>Member activity</CardTitle>
                <CardDescription>Active time per member across all applications.</CardDescription>
              </CardHeader>
              <CardContent>
                {report.members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No members to show.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Active</TableHead>
                          <TableHead>Idle</TableHead>
                          <TableHead>Activity</TableHead>
                          <TableHead>Samples</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.members.map((member) => (
                          <TableRow key={member.userId}>
                            <TableCell className="font-medium">{member.label}</TableCell>
                            <TableCell className="tabular-nums">
                              {formatDuration(member.activeSeconds)}
                            </TableCell>
                            <TableCell className="tabular-nums text-muted-foreground">
                              {formatDuration(member.idleSeconds)}
                            </TableCell>
                            <TableCell className="tabular-nums">
                              {member.activityPercent}%
                            </TableCell>
                            <TableCell className="tabular-nums text-muted-foreground">
                              {member.sampleCount}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {isManager && !userId ? (
            <Card>
              <CardHeader>
                <CardTitle>App usage by member</CardTitle>
                <CardDescription>Applications used by each member.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {report.members.length === 0 ? (
                  <EmptyState
                    icon={Activity}
                    title="No activity recorded"
                    description="Activity samples appear after members start tracking with the desktop agent."
                  />
                ) : (
                  report.members.map((member) => (
                    <div key={member.userId} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold">{member.label}</h3>
                        <span className="text-xs text-muted-foreground">
                          {formatDuration(member.activeSeconds)} active · {member.activityPercent}%
                        </span>
                      </div>
                      {member.apps.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No app activity.</p>
                      ) : (
                        <AppUsageTable groups={member.apps} />
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>App usage</CardTitle>
                <CardDescription>Time and input activity by application.</CardDescription>
              </CardHeader>
              <CardContent>
                {report.groups.length === 0 ? (
                  <EmptyState
                    icon={Activity}
                    title="No activity recorded"
                    description="Activity samples appear after members start tracking with the desktop agent."
                  />
                ) : (
                  <AppUsageTable groups={report.groups} />
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {isManager ? (
        <Card>
          <CardHeader>
            <CardTitle>Activity retention</CardTitle>
            <CardDescription>
              Activity samples older than this are deleted automatically. Default: 180 days.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {retentionError ? <ErrorAlert message={retentionError} /> : null}
            {retentionSaved ? <p className="text-sm text-emerald-600">Retention updated.</p> : null}
            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={handleSaveRetention}
            >
              <FormField label="Keep activity for (days)">
                <Input
                  type="number"
                  min={1}
                  max={3650}
                  value={retentionDays}
                  onChange={(event) => {
                    setRetentionDays(event.target.value);
                    setRetentionSaved(false);
                  }}
                  className="w-40"
                  required
                />
              </FormField>
              <Button type="submit" disabled={savingRetention}>
                {savingRetention ? 'Saving…' : 'Save retention'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function AppUsageTable({ groups }: { groups: ActivityAppGroup[] }) {
  const maxActive = Math.max(...groups.map((group) => group.activeSeconds), 1);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-48">Application</TableHead>
            <TableHead>Active</TableHead>
            <TableHead>Idle</TableHead>
            <TableHead>Activity</TableHead>
            <TableHead>Keys</TableHead>
            <TableHead>Mouse</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => {
            const tracked = group.activeSeconds + group.idleSeconds;
            const percent = tracked > 0 ? Math.round((group.activeSeconds / tracked) * 100) : 0;
            const width = Math.round((group.activeSeconds / maxActive) * 100);

            return (
              <TableRow key={`${group.appId ?? group.appName}-${group.appName}`}>
                <TableCell>
                  <p className="font-medium">{group.appName}</p>
                  {group.appId ? (
                    <p className="truncate text-xs text-muted-foreground">{group.appId}</p>
                  ) : null}
                  <div className="mt-1.5 h-1.5 w-40 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatDuration(group.activeSeconds)}
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {formatDuration(group.idleSeconds)}
                </TableCell>
                <TableCell className="tabular-nums">{percent}%</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {group.keyboardEvents.toLocaleString()}
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {group.mouseEvents.toLocaleString()}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
