import type { CreateTaskInput, Page, Task, UpdateTaskInput } from '@crewclock/shared';

import { baseApi } from './baseApi';

interface ListTasksArgs {
  workspaceId: string;
  projectId: string;
  page?: number;
  limit?: number;
}

interface CreateTaskArgs {
  workspaceId: string;
  projectId: string;
  body: CreateTaskInput;
}

interface UpdateTaskArgs {
  workspaceId: string;
  projectId: string;
  taskId: string;
  body: UpdateTaskInput;
}

export const tasksApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTasks: builder.query<Page<Task>, ListTasksArgs>({
      query: ({ workspaceId, projectId, page = 1, limit = 100 }) =>
        `/workspaces/${workspaceId}/projects/${projectId}/tasks?page=${page}&limit=${limit}`,
      providesTags: (_result, _error, { projectId }) => [{ type: 'Task', id: projectId }],
    }),
    createTask: builder.mutation<Task, CreateTaskArgs>({
      query: ({ workspaceId, projectId, body }) => ({
        url: `/workspaces/${workspaceId}/projects/${projectId}/tasks`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Task', id: projectId }],
    }),
    updateTask: builder.mutation<Task, UpdateTaskArgs>({
      query: ({ workspaceId, projectId, taskId, body }) => ({
        url: `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [{ type: 'Task', id: projectId }],
    }),
  }),
});

export const { useGetTasksQuery, useCreateTaskMutation, useUpdateTaskMutation } = tasksApi;
