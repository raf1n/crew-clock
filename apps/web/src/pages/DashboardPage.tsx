import { Building2 } from 'lucide-react';

import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import { ManagerDashboard } from '@/features/time-entries/components/ManagerDashboard';
import { MemberDashboard } from '@/features/time-entries/components/MemberDashboard';
import { useSelectedWorkspace } from '@/hooks/useSelectedWorkspace';

export function DashboardPage() {
  const { workspace, isLoading } = useSelectedWorkspace();

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

  const isMember = workspace.role === 'member';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={
          isMember
            ? 'Track your work and review recent activity.'
            : 'Monitor team time, approvals, and recent activity.'
        }
      />
      {isMember ? (
        <MemberDashboard workspaceId={workspace.id} />
      ) : (
        <ManagerDashboard workspaceId={workspace.id} />
      )}
    </div>
  );
}
