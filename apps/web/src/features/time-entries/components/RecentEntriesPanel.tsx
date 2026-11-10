import { Clock } from 'lucide-react';
import { useState } from 'react';

import { useGetProjectsQuery } from '@/api/projectsApi';
import { useDeleteTimeEntryMutation, useGetTimeEntriesQuery } from '@/api/timeEntriesApi';
import { useGetMembersQuery } from '@/api/workspacesApi';

import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { LoadingState } from '@/components/shared/LoadingState';
import { TimeEntriesTable } from './TimeEntriesTable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppSelector } from '@/hooks';
import { apiErrorMessage } from '@/lib/api-error';

export function RecentEntriesPanel({
  workspaceId,
  team = false,
}: {
  workspaceId: string;
  team?: boolean;
}) {
  const user = useAppSelector((state) => state.auth.user);
  const [error, setError] = useState<string | null>(null);

  const { data: projectsPage } = useGetProjectsQuery({ workspaceId });
  const { data: members } = useGetMembersQuery(workspaceId);
  const { data: entriesPage, isLoading } = useGetTimeEntriesQuery({
    workspaceId,
    page: 1,
    limit: 10,
  });
  const [deleteEntry] = useDeleteTimeEntryMutation();

  const entries = entriesPage?.items ?? [];
  const projectName = (id: string): string =>
    projectsPage?.items.find((project) => project.id === id)?.name ?? '—';
  const memberName = (userId: string): string =>
    members?.find((member) => member.userId === userId)?.user.name ?? '—';

  const handleDelete = async (entryId: string): Promise<void> => {
    setError(null);
    try {
      await deleteEntry({ workspaceId, entryId }).unwrap();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{team ? 'Team activity' : 'Recent entries'}</CardTitle>
        <CardDescription>
          {team ? 'Latest entries across the workspace.' : 'Your latest tracked work.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <ErrorAlert message={error} /> : null}
        {isLoading ? (
          <LoadingState />
        ) : entries.length === 0 ? (
          <EmptyState
            icon={Clock}
            title={team ? 'No team activity yet' : 'No entries yet'}
            description={
              team
                ? 'Time tracked by members will appear here.'
                : 'Start the timer or add a manual entry to see it here.'
            }
          />
        ) : (
          <div className="rounded-lg border">
            <TimeEntriesTable
              entries={entries}
              projectName={projectName}
              currentUserId={user?.id}
              memberName={team ? memberName : undefined}
              showActions={!team}
              onDelete={handleDelete}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
