import { FolderKanban, Square } from 'lucide-react';
import { useState } from 'react';
import type { TimesheetStatus } from '@crewclock/shared';

import { useGetProjectsQuery } from '@/api/projectsApi';
import { useGetTasksQuery } from '@/api/tasksApi';
import {
  useGetRunningQuery,
  useStartTimerMutation,
  useStopTimerMutation,
} from '@/api/timeEntriesApi';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { WeekLockedNotice } from '@/components/shared/WeekLockedNotice';
import { TimerForm } from './TimerForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiErrorMessage } from '@/lib/api-error';
import { formatDateTime } from '@/lib/format';

export function TimerPanel({
  workspaceId,
  weekStatus,
  className,
}: {
  workspaceId: string;
  weekStatus?: TimesheetStatus | null;
  className?: string;
}) {
  const weekLocked = weekStatus === 'submitted' || weekStatus === 'approved';
  const [projectId, setProjectId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: projectsPage } = useGetProjectsQuery({ workspaceId });
  const { data: tasksPage } = useGetTasksQuery({ workspaceId, projectId }, { skip: !projectId });
  const { data: runningData } = useGetRunningQuery(workspaceId, { pollingInterval: 5000 });
  const [startTimer, { isLoading: starting }] = useStartTimerMutation();
  const [stopTimer, { isLoading: stopping }] = useStopTimerMutation();

  const projects = (projectsPage?.items ?? []).map((project) => ({
    id: project.id,
    name: project.name,
  }));
  const tasks = (tasksPage?.items ?? []).map((task) => ({ id: task.id, name: task.title }));
  const running = runningData?.id ? runningData : null;
  const runningProject = projects.find((project) => project.id === running?.projectId)?.name;

  const handleStart = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    if (!projectId) {
      setError('Choose a project first.');
      return;
    }
    try {
      await startTimer({
        workspaceId,
        body: {
          projectId,
          taskId: taskId || undefined,
          description: description || undefined,
        },
      }).unwrap();
      setDescription('');
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const handleStop = async (): Promise<void> => {
    if (!running) {
      return;
    }
    setError(null);
    try {
      await stopTimer({ workspaceId, entryId: running.id }).unwrap();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Timer</CardTitle>
          <CardDescription>
            {running ? 'A timer is currently running' : 'Start tracking against a project'}
          </CardDescription>
        </div>
        {running ? (
          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Live
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {running ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-muted/40 p-4">
            <div>
              <p className="font-medium">{runningProject ?? 'Project'}</p>
              <p className="text-sm text-muted-foreground">
                Running since {formatDateTime(running.startedAt)}
              </p>
              {running.description ? (
                <p className="mt-1 text-sm text-muted-foreground">{running.description}</p>
              ) : null}
            </div>
            <Button variant="destructive" onClick={handleStop} disabled={stopping}>
              <Square />
              {stopping ? 'Stopping…' : 'Stop timer'}
            </Button>
          </div>
        ) : weekLocked ? (
          <WeekLockedNotice status={weekStatus} />
        ) : projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="Create a project first"
            description="A project is required before starting the timer. Ask an owner or manager to create one."
          />
        ) : (
          <TimerForm
            projects={projects}
            tasks={tasks}
            projectId={projectId}
            taskId={taskId}
            description={description}
            isStarting={starting}
            onProjectChange={(value) => {
              setProjectId(value);
              setTaskId('');
            }}
            onTaskChange={setTaskId}
            onDescriptionChange={setDescription}
            onSubmit={handleStart}
          />
        )}
        {error ? <ErrorAlert message={error} /> : null}
      </CardContent>
    </Card>
  );
}
