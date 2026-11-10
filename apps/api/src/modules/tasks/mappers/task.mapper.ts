import type { Task } from '@crewclock/shared';

import type { TaskEntity } from '../entities/task.entity';

export function toTask(task: TaskEntity): Task {
  return {
    id: task.id,
    workspaceId: task.workspaceId,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status,
    assigneeId: task.assigneeId,
    createdBy: task.createdById,
    updatedBy: task.updatedById,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}
