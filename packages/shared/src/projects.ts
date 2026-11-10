import { z } from 'zod';

import { paginationSchema } from './pagination';

export const projectNameSchema = z.string().trim().min(1).max(120);
export const projectDescriptionSchema = z.string().trim().max(2000).nullable();

export const createProjectSchema = z.object({
  name: projectNameSchema,
  description: projectDescriptionSchema.optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z
  .object({
    name: projectNameSchema.optional(),
    description: projectDescriptionSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const listProjectsQuerySchema = paginationSchema;

export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}
