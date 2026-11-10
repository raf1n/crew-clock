import { useGetMyTimesheetQuery } from '@/api/timesheetsApi';
import { WeekLockedNotice } from '@/components/shared/WeekLockedNotice';
import { DashboardStats } from './DashboardStats';
import { ManualEntryPanel } from './ManualEntryPanel';
import { RecentEntriesPanel } from './RecentEntriesPanel';
import { TimerPanel } from './TimerPanel';
import { todayInput } from '@/lib/format';

export function MemberDashboard({ workspaceId }: { workspaceId: string }) {
  const { data: timesheet } = useGetMyTimesheetQuery({
    workspaceId,
    weekStart: todayInput(),
  });
  const weekLocked = timesheet?.status === 'submitted' || timesheet?.status === 'approved';

  return (
    <>
      <DashboardStats workspaceId={workspaceId} />
      {weekLocked ? <WeekLockedNotice status={timesheet?.status} /> : null}
      <div className="grid gap-6 lg:grid-cols-5">
        <TimerPanel
          workspaceId={workspaceId}
          weekStatus={timesheet?.status}
          className="lg:col-span-3"
        />
        <ManualEntryPanel
          workspaceId={workspaceId}
          weekStatus={timesheet?.status}
          className="lg:col-span-2"
        />
      </div>
      <RecentEntriesPanel workspaceId={workspaceId} />
    </>
  );
}
