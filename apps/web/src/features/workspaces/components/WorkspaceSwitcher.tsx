import { useEffect } from 'react';

import { useGetWorkspacesQuery } from '@/api/workspacesApi';
import { setSelectedWorkspace } from '@/features/workspaces/workspaceSlice';
import { useAppDispatch, useAppSelector } from '@/hooks';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function WorkspaceSwitcher({ compact = false }: { compact?: boolean }) {
  const dispatch = useAppDispatch();
  const selectedId = useAppSelector((state) => state.workspace.selectedWorkspaceId);
  const { data: workspaces } = useGetWorkspacesQuery();

  useEffect(() => {
    if (!workspaces?.length) {
      return;
    }
    const firstWorkspace = workspaces[0];
    if (!firstWorkspace) {
      return;
    }
    if (!selectedId || !workspaces.some((workspace) => workspace.id === selectedId)) {
      dispatch(setSelectedWorkspace(firstWorkspace.id));
    }
  }, [workspaces, selectedId, dispatch]);

  if (!workspaces?.length) {
    return null;
  }

  return (
    <div className={compact ? 'w-36' : 'space-y-1.5'}>
      {compact ? null : (
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Workspace
        </Label>
      )}
      <Select
        value={selectedId ?? workspaces[0]?.id}
        onValueChange={(value) => dispatch(setSelectedWorkspace(value))}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select workspace" />
        </SelectTrigger>
        <SelectContent>
          {workspaces.map((workspace) => (
            <SelectItem key={workspace.id} value={workspace.id}>
              {workspace.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
