import type { MemberWithUser, Project, Task, TaskStatus } from '@crewclock/shared';
import { ListTodo, Plus } from 'lucide-react';
import { useState } from 'react';

import { useCreateTaskMutation, useGetTasksQuery, useUpdateTaskMutation } from '@/api/tasksApi';
import { useGetMembersQuery } from '@/api/workspacesApi';
import { TASK_STATUSES } from '@crewclock/shared';

import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorAlert } from '@/components/shared/ErrorAlert';
import { LoadingState } from '@/components/shared/LoadingState';
import { TaskStatusBadge } from '@/components/shared/StatusBadge';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { apiErrorMessage } from '@/lib/api-error';
import { formatDateTime, formatLabel } from '@/lib/format';
import { useAppSelector } from '@/hooks';

export function TasksPanel({
  workspaceId,
  project,
  canManage,
}: {
  workspaceId: string;
  project: Project | undefined;
  canManage: boolean;
}) {
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const currentUserId = useAppSelector((state) => state.auth.user?.id);

  const { data: tasksPage, isLoading } = useGetTasksQuery(
    { workspaceId, projectId: project?.id ?? '' },
    { skip: !project },
  );
  const { data: members } = useGetMembersQuery(workspaceId);
  const [createTask, { isLoading: creating }] = useCreateTaskMutation();
  const [updateTask] = useUpdateTaskMutation();

  const tasks = tasksPage?.items ?? [];

  const memberFor = (userId: string | null): MemberWithUser | undefined =>
    userId ? members?.find((member) => member.userId === userId) : undefined;

  const handleCreate = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!project) {
      return;
    }
    setError(null);
    try {
      await createTask({
        workspaceId,
        projectId: project.id,
        body: {
          title,
          status: 'todo',
          assigneeId: assigneeId || undefined,
        },
      }).unwrap();
      setTitle('');
      setAssigneeId('');
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  const handleStatus = async (task: Task, status: TaskStatus): Promise<void> => {
    if (!project) {
      return;
    }
    setError(null);
    try {
      await updateTask({
        workspaceId,
        projectId: project.id,
        taskId: task.id,
        body: { status },
      }).unwrap();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  if (!project) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={ListTodo}
            title="Select a project"
            description="Choose a project above to view and manage its tasks."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasks · {project.name}</CardTitle>
        <CardDescription>
          Assign work and keep status up to date. {tasks.length} total.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <ErrorAlert message={error} /> : null}

        {canManage ? (
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleCreate}>
            <Input
              className="flex-1"
              placeholder="Task title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
            <Select
              value={assigneeId || 'unassigned'}
              onValueChange={(value) => setAssigneeId(value === 'unassigned' ? '' : value)}
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {members?.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    {member.user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={creating}>
              <Plus />
              {creating ? 'Adding…' : 'Add task'}
            </Button>
          </form>
        ) : null}

        {isLoading ? (
          <LoadingState />
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={ListTodo}
            title="No tasks"
            description="Tasks created for this project will appear here."
          />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => {
                  const member = memberFor(task.assigneeId);
                  const isMine = task.assigneeId === currentUserId;
                  return (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserAvatar name={member?.user.name ?? '?'} size="sm" />
                          <span className="text-sm text-muted-foreground">
                            {isMine ? 'Me' : (member?.user.name ?? 'Unassigned')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {canManage || task.assigneeId === currentUserId ? (
                          <Select
                            value={task.status}
                            onValueChange={(value) => handleStatus(task, value as TaskStatus)}
                          >
                            <SelectTrigger size="sm" className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TASK_STATUSES.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {formatLabel(status)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <TaskStatusBadge status={task.status} />
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(task.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
