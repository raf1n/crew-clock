import type { ReportGroupBy } from '@crewclock/shared';
import { BarChart3, Clock, Layers, ListChecks } from 'lucide-react';

import { useGetTimeReportQuery } from '@/api/reportsApi';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { StatCard } from '@/components/shared/StatCard';
import { ReportGroupList } from './ReportGroupList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDuration, formatLabel } from '@/lib/format';

export function ReportSummary({
  workspaceId,
  from,
  to,
  groupBy,
}: {
  workspaceId: string;
  from: string;
  to: string;
  groupBy: ReportGroupBy;
}) {
  const { data: report } = useGetTimeReportQuery({ workspaceId, from, to, groupBy });

  if (!report) {
    return <LoadingState label="Building report…" />;
  }

  const entryCount = report.groups.reduce((total, group) => total + group.entryCount, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total time"
          value={formatDuration(report.totalSeconds)}
          icon={Clock}
          tone="blue"
        />
        <StatCard label="Entries" value={entryCount} icon={ListChecks} />
        <StatCard label="Groups" value={report.groups.length} icon={Layers} tone="amber" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Breakdown</CardTitle>
          <CardDescription>Grouped by {formatLabel(report.groupBy)}</CardDescription>
        </CardHeader>
        <CardContent>
          {report.groups.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No time recorded"
              description="Adjust the date range or track some work first."
            />
          ) : (
            <ReportGroupList groups={report.groups} totalSeconds={report.totalSeconds} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
