import { ChevronDown, Users } from 'lucide-react';
import { Fragment, useState } from 'react';

import { useApproveTimesheetMutation, useListTimesheetsQuery } from '@/api/timesheetsApi';
import { useGetMembersQuery } from '@/api/workspacesApi';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { TimesheetStatusBadge } from '@/components/shared/StatusBadge';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { TimesheetBreakdown } from './TimesheetBreakdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiErrorMessage } from '@/lib/api-error';
import { formatDuration } from '@/lib/format';

export function TeamTimesheetsPanel({
  workspaceId,
  weekStart,
}: {
  workspaceId: string;
  weekStart: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: timesheets } = useListTimesheetsQuery({ workspaceId, weekStart });
  const { data: members } = useGetMembersQuery(workspaceId);
  const [approve, { isLoading: approving }] = useApproveTimesheetMutation();

  const memberName = (userId: string): string =>
    members?.find((member) => member.userId === userId)?.user.name ?? userId;

  const handleApprove = async (timesheetId: string): Promise<void> => {
    setError(null);
    try {
      await approve({ workspaceId, timesheetId }).unwrap();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team timesheets</CardTitle>
        <CardDescription>Review and approve submitted weeks.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <ErrorAlert message={error} /> : null}
        {!timesheets || timesheets.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No submitted timesheets"
            description="Nothing has been submitted for this week yet."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="min-w-64">Week breakdown</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timesheets.map((timesheet) => {
                  const rowKey = timesheet.id ?? timesheet.userId;
                  const expanded = expandedId === rowKey;

                  return (
                    <Fragment key={rowKey}>
                      <TableRow>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserAvatar name={memberName(timesheet.userId)} size="sm" />
                            <span className="font-medium">{memberName(timesheet.userId)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatDuration(timesheet.totalSeconds)}
                        </TableCell>
                        <TableCell>
                          <TimesheetBreakdown timesheet={timesheet} compact mode="week" />
                        </TableCell>
                        <TableCell>
                          <TimesheetStatusBadge status={timesheet.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setExpandedId(expanded ? null : rowKey)}
                            >
                              Review
                              <ChevronDown
                                className={`size-4 transition-transform ${
                                  expanded ? 'rotate-180' : ''
                                }`}
                              />
                            </Button>
                            {timesheet.status === 'submitted' && timesheet.id ? (
                              <Button
                                size="sm"
                                disabled={approving}
                                onClick={() => handleApprove(timesheet.id ?? '')}
                              >
                                Approve
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                      {expanded ? (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={5} className="p-4">
                            <div className="grid gap-6 md:grid-cols-3">
                              <section className="space-y-3">
                                <h3 className="text-sm font-semibold">Week</h3>
                                <TimesheetBreakdown timesheet={timesheet} mode="week" />
                              </section>
                              <section className="space-y-3">
                                <h3 className="text-sm font-semibold">Projects</h3>
                                <TimesheetBreakdown timesheet={timesheet} mode="projects" />
                              </section>
                              <section className="space-y-3">
                                <h3 className="text-sm font-semibold">Tasks</h3>
                                <TimesheetBreakdown timesheet={timesheet} mode="tasks" />
                              </section>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
