import { CalendarDays } from 'lucide-react';

import { useGetDailyTimeReportQuery } from '@/api/reportsApi';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDuration } from '@/lib/format';

function formatDay(date: string): string {
  const [year = 1970, month = 1, day = 1] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
  });
}

export function MemberDailyReport({
  workspaceId,
  from,
  to,
  isManager,
}: {
  workspaceId: string;
  from: string;
  to: string;
  isManager: boolean;
}) {
  const { data: report } = useGetDailyTimeReportQuery({ workspaceId, from, to });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isManager ? 'Daily by member' : 'Your daily time'}</CardTitle>
        <CardDescription>
          {isManager ? 'Time per member per day.' : 'Your tracked time per day.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!report ? (
          <LoadingState />
        ) : report.members.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No time recorded"
            description={
              isManager
                ? 'Adjust the date range or track some work first.'
                : 'Track some work or adjust the date range.'
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  {isManager ? (
                    <TableHead className="sticky left-0 z-10 bg-card">Member</TableHead>
                  ) : null}
                  {report.dates.map((date) => (
                    <TableHead key={date} className="text-right whitespace-nowrap">
                      {formatDay(date)}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.members.map((member) => (
                  <TableRow key={member.userId}>
                    {isManager ? (
                      <TableCell className="sticky left-0 z-10 bg-card font-medium">
                        {member.label}
                      </TableCell>
                    ) : null}
                    {member.days.map((day) => (
                      <TableCell key={day.date} className="text-right tabular-nums">
                        {day.seconds > 0 ? formatDuration(day.seconds) : '—'}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatDuration(member.totalSeconds)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
