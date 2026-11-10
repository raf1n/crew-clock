import type { CreateProjectInput, Page, Project } from '@crewclock/shared';

import { baseApi } from './baseApi';

interface ListProjectsArgs {
  workspaceId: string;
  page?: number;
  limit?: number;
}

export const projectsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProjects: builder.query<Page<Project>, ListProjectsArgs>({
      query: ({ workspaceId, page = 1, limit = 100 }) =>
        `/workspaces/${workspaceId}/projects?page=${page}&limit=${limit}`,
      providesTags: ['Project'],
    }),
    createProject: builder.mutation<Project, { workspaceId: string; body: CreateProjectInput }>({
      query: ({ workspaceId, body }) => ({
        url: `/workspaces/${workspaceId}/projects`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Project'],
    }),
    deleteProject: builder.mutation<void, { workspaceId: string; projectId: string }>({
      query: ({ workspaceId, projectId }) => ({
        url: `/workspaces/${workspaceId}/projects/${projectId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Project', 'Task', 'TimeEntry'],
    }),
  }),
});

export const { useGetProjectsQuery, useCreateProjectMutation, useDeleteProjectMutation } =
  projectsApi;
