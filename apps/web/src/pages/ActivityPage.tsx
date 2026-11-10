import { Building2 } from 'lucide-react';

import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { PageHeader } from '@/components/shared/PageHeader';
import { ActivityPanel } from '@/features/activity/components/ActivityPanel';
import { useSelectedWorkspace } from '@/hooks/useSelectedWorkspace';

export function ActivityPage() {
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
        title="Activity"
        description="See app usage and input activity captured while tracking."
      />
      <ActivityPanel workspace={workspace} />
    </div>
  );
}
