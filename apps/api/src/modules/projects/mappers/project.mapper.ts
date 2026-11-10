import type { Project } from '@crewclock/shared';

import type { ProjectEntity } from '../entities/project.entity';

export function toProject(project: ProjectEntity): Project {
  return {
    id: project.id,
    workspaceId: project.workspaceId,
    name: project.name,
    description: project.description,
    createdBy: project.createdById,
    updatedBy: project.updatedById,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}
