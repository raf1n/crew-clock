import { roleAtLeast } from '@crewclock/shared';
import { Building2, ShieldAlert } from 'lucide-react';

import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import { MembersPanel } from '@/features/workspaces/components/MembersPanel';
import { useSelectedWorkspace } from '@/hooks/useSelectedWorkspace';

export function MembersPage() {
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

  if (!roleAtLeast(workspace.role, 'manager')) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Managers only"
        description="Only owners and managers can manage workspace members."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description="Invite teammates and control who manages this workspace."
      />
      <MembersPanel workspaceId={workspace.id} actorRole={workspace.role} />
    </div>
  );
}
