import { roleAtLeast, type ReportGroupBy } from '@crewclock/shared';
import { Building2 } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import { ReportFilters } from '@/features/reports/components/ReportFilters';
import { MemberDailyReport } from '@/features/reports/components/MemberDailyReport';
import { ReportSummary } from '@/features/reports/components/ReportSummary';
import { useSelectedWorkspace } from '@/hooks/useSelectedWorkspace';
import { daysAgoInput, endOfDayIso, startOfDayIso, todayInput } from '@/lib/format';

export function ReportsPage() {
  const { workspace, isLoading } = useSelectedWorkspace();
  const [from, setFrom] = useState(daysAgoInput(7));
  const [to, setTo] = useState(todayInput());
  const [groupBy, setGroupBy] = useState<ReportGroupBy>('user');

  if (isLoading) {
    return <LoadingState />;
  }
  if (!workspace) {
    return (
      <EmptyState
        icon={Building2}
        title="No workspace"
        description="You are not a member of a workspace yet."
      />
    );
  }

  const fromIso = startOfDayIso(from);
  const toIso = endOfDayIso(to);
  const isManager = roleAtLeast(workspace.role, 'manager');
  const effectiveGroupBy = !isManager && groupBy === 'user' ? 'project' : groupBy;

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Understand where the week went, grouped your way." />
      <ReportFilters
        from={from}
        to={to}
        groupBy={effectiveGroupBy}
        isManager={isManager}
        onFromChange={setFrom}
        onToChange={setTo}
        onGroupByChange={setGroupBy}
      />
      <ReportSummary
        workspaceId={workspace.id}
        from={fromIso}
        to={toIso}
        groupBy={effectiveGroupBy}
      />
      <MemberDailyReport
        workspaceId={workspace.id}
        from={fromIso}
        to={toIso}
        isManager={isManager}
      />
    </div>
  );
}
