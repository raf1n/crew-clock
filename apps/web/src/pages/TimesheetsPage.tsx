import { roleAtLeast } from '@crewclock/shared';
import { Building2 } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MyTimesheetPanel } from '@/features/timesheets/components/MyTimesheetPanel';
import { TeamTimesheetsPanel } from '@/features/timesheets/components/TeamTimesheetsPanel';
import { useSelectedWorkspace } from '@/hooks/useSelectedWorkspace';
import { startOfWeekInput } from '@/lib/format';

export function TimesheetsPage() {
  const { workspace, isLoading } = useSelectedWorkspace();
  const [weekStart, setWeekStart] = useState(startOfWeekInput());

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

  const canManage = roleAtLeast(workspace.role, 'manager');
  const canTrack = workspace.role === 'member';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timesheets"
        description="Review, submit, and approve weekly time. Weeks run Monday–Sunday (UTC)."
        actions={
          <div className="flex items-center gap-2">
            <Label htmlFor="week-start" className="text-muted-foreground">
              Week of
            </Label>
            <Input
              id="week-start"
              type="date"
              className="w-40"
              value={weekStart}
              onChange={(event) => {
                if (event.target.value) {
                  setWeekStart(startOfWeekInput(event.target.value));
                }
              }}
            />
          </div>
        }
      />
      {canTrack ? <MyTimesheetPanel workspaceId={workspace.id} weekStart={weekStart} /> : null}
      {canManage ? <TeamTimesheetsPanel workspaceId={workspace.id} weekStart={weekStart} /> : null}
    </div>
  );
}
