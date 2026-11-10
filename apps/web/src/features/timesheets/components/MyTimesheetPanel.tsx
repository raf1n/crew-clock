import { CalendarClock } from 'lucide-react';
import { useState } from 'react';

import {
  useGetMyTimesheetQuery,
  useSubmitTimesheetMutation,
  useWithdrawTimesheetMutation,
} from '@/api/timesheetsApi';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { LoadingState } from '@/components/shared/LoadingState';
import { TimesheetStatusBadge } from '@/components/shared/StatusBadge';
import { TimesheetBreakdown } from './TimesheetBreakdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiErrorMessage } from '@/lib/api-error';
import { formatDuration } from '@/lib/format';

export function MyTimesheetPanel({
  workspaceId,
  weekStart,
}: {
  workspaceId: string;
  weekStart: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const { data: timesheet, isLoading } = useGetMyTimesheetQuery({ workspaceId, weekStart });
  const [submit, { isLoading: submitting }] = useSubmitTimesheetMutation();
  const [withdraw, { isLoading: withdrawing }] = useWithdrawTimesheetMutation();

  const handleSubmit = async (): Promise<void> => {
    setError(null);
    try {
      await submit({ workspaceId, weekStart }).unwrap();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const handleWithdraw = async (): Promise<void> => {
    if (!timesheet?.id) {
      return;
    }
    setError(null);
    try {
      await withdraw({ workspaceId, timesheetId: timesheet.id }).unwrap();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>My week</CardTitle>
          <CardDescription>
            {timesheet ? `${timesheet.periodStart} → ${timesheet.periodEnd}` : 'Weekly summary'}
          </CardDescription>
        </div>
        {timesheet ? (
          <div className="flex items-center gap-2">
            <TimesheetStatusBadge status={timesheet.status} />
            {timesheet.status === 'draft' ? (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting || timesheet.entryCount === 0}
              >
                {submitting ? 'Submitting…' : 'Submit week'}
              </Button>
            ) : null}
            {timesheet.status === 'submitted' ? (
              <Button size="sm" variant="outline" onClick={handleWithdraw} disabled={withdrawing}>
                {withdrawing ? 'Withdrawing…' : 'Withdraw'}
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-5">
        {error ? <ErrorAlert message={error} /> : null}
        {isLoading || !timesheet ? (
          <LoadingState />
        ) : timesheet.entryCount === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Nothing tracked this week"
            description="Add time entries to build your weekly timesheet."
          />
        ) : (
          <>
            <div className="flex items-end gap-3">
              <p className="text-3xl font-bold tabular-nums">
                {formatDuration(timesheet.totalSeconds)}
              </p>
              <p className="pb-1 text-sm text-muted-foreground">
                across {timesheet.entryCount} {timesheet.entryCount === 1 ? 'entry' : 'entries'}
              </p>
            </div>
            <TimesheetBreakdown timesheet={timesheet} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
