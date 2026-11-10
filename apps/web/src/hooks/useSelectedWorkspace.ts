import type { WorkspaceMembership } from '@crewclock/shared';

import { useGetWorkspacesQuery } from '@/api/workspacesApi';
import { useAppSelector } from '@/hooks';

export function useSelectedWorkspace(): {
  workspace: WorkspaceMembership | undefined;
  isLoading: boolean;
} {
  const selectedId = useAppSelector((state) => state.workspace.selectedWorkspaceId);
  const { data, isLoading } = useGetWorkspacesQuery();
  const workspace = data?.find((item) => item.id === selectedId) ?? data?.[0];

  return { workspace, isLoading };
}
