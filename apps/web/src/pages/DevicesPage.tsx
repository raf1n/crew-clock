import { Building2 } from 'lucide-react';

import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import { DevicesPanel } from '@/features/devices/components/DevicesPanel';
import { useSelectedWorkspace } from '@/hooks/useSelectedWorkspace';

export function DevicesPage() {
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Devices"
        description="Computers registered to the desktop agent in this workspace."
      />
      <DevicesPanel workspaceId={workspace.id} actorRole={workspace.role} />
    </div>
  );
}
