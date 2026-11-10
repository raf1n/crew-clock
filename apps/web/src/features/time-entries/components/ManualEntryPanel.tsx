import { FolderKanban } from 'lucide-react';
import { useState } from 'react';

import type { TimesheetStatus } from '@crewclock/shared';

import { useGetProjectsQuery } from '@/api/projectsApi';
import { useGetTasksQuery } from '@/api/tasksApi';
import { useCreateTimeEntryMutation } from '@/api/timeEntriesApi';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { WeekLockedNotice } from '@/components/shared/WeekLockedNotice';
import { ManualEntryForm, type ManualEntryValues } from './ManualEntryForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiErrorMessage } from '@/lib/api-error';

const INITIAL_VALUES: ManualEntryValues = {
  projectId: '',
  taskId: '',
  description: '',
  startedAt: '',
  endedAt: '',
};

export function ManualEntryPanel({
  workspaceId,
  weekStatus,
  className,
}: {
  workspaceId: string;
  weekStatus?: TimesheetStatus | null;
  className?: string;
}) {
  const weekLocked = weekStatus === 'submitted' || weekStatus === 'approved';
  const [values, setValues] = useState<ManualEntryValues>(INITIAL_VALUES);
  const [error, setError] = useState<string | null>(null);

  const { data: projectsPage } = useGetProjectsQuery({ workspaceId });
  const { data: tasksPage } = useGetTasksQuery(
    { workspaceId, projectId: values.projectId },
    { skip: !values.projectId },
  );
  const [createEntry, { isLoading }] = useCreateTimeEntryMutation();

  const projects = (projectsPage?.items ?? []).map((project) => ({
    id: project.id,
    name: project.name,
  }));
  const tasks = (tasksPage?.items ?? []).map((task) => ({ id: task.id, name: task.title }));

  const handleChange = (field: keyof ManualEntryValues, value: string): void => {
    setValues((current) => ({
      ...current,
      [field]: value,
      ...(field === 'projectId' ? { taskId: '' } : {}),
    }));
  };

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    if (!values.projectId || !values.startedAt || !values.endedAt) {
      setError('Project, start, and end are required.');
      return;
    }
    try {
      await createEntry({
        workspaceId,
        body: {
          projectId: values.projectId,
          taskId: values.taskId || undefined,
          description: values.description || undefined,
          startedAt: new Date(values.startedAt).toISOString(),
          endedAt: new Date(values.endedAt).toISOString(),
        },
      }).unwrap();
      setValues((current) => ({
        ...current,
        description: '',
        startedAt: '',
        endedAt: '',
      }));
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Manual entry</CardTitle>
        <CardDescription>Add time that you forgot to track.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {weekLocked ? (
          <WeekLockedNotice status={weekStatus} />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="Create a project first"
            description="Manual entries need a project. Ask an owner or manager to create one."
          />
        ) : (
          <ManualEntryForm
            projects={projects}
            tasks={tasks}
            values={values}
            isSubmitting={isLoading}
            onChange={handleChange}
            onSubmit={handleSubmit}
          />
        )}
        {error ? <ErrorAlert message={error} /> : null}
      </CardContent>
    </Card>
  );
}
