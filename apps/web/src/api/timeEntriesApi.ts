import type { CreateTimeEntryInput, Page, StartTimerInput, TimeEntry } from '@crewclock/shared';

import { baseApi } from './baseApi';

interface ListTimeEntriesArgs {
  workspaceId: string;
  page?: number;
  limit?: number;
}

const invalidatesEntries = ['TimeEntry', 'Timesheet', 'Report'] as const;

export const timeEntriesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTimeEntries: builder.query<Page<TimeEntry>, ListTimeEntriesArgs>({
      query: ({ workspaceId, page = 1, limit = 20 }) =>
        `/workspaces/${workspaceId}/time-entries?page=${page}&limit=${limit}`,
      providesTags: ['TimeEntry'],
    }),
    getRunning: builder.query<TimeEntry | null, string>({
      query: (workspaceId) => `/workspaces/${workspaceId}/time-entries/running`,
      providesTags: ['TimeEntry'],
    }),
    startTimer: builder.mutation<TimeEntry, { workspaceId: string; body: StartTimerInput }>({
      query: ({ workspaceId, body }) => ({
        url: `/workspaces/${workspaceId}/time-entries/start`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [...invalidatesEntries],
    }),
    stopTimer: builder.mutation<TimeEntry, { workspaceId: string; entryId: string }>({
      query: ({ workspaceId, entryId }) => ({
        url: `/workspaces/${workspaceId}/time-entries/${entryId}/stop`,
        method: 'POST',
      }),
      invalidatesTags: [...invalidatesEntries],
    }),
    createTimeEntry: builder.mutation<
      TimeEntry,
      { workspaceId: string; body: CreateTimeEntryInput }
    >({
      query: ({ workspaceId, body }) => ({
        url: `/workspaces/${workspaceId}/time-entries`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [...invalidatesEntries],
    }),
    deleteTimeEntry: builder.mutation<void, { workspaceId: string; entryId: string }>({
      query: ({ workspaceId, entryId }) => ({
        url: `/workspaces/${workspaceId}/time-entries/${entryId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [...invalidatesEntries],
    }),
  }),
});

export const {
  useGetTimeEntriesQuery,
  useGetRunningQuery,
  useStartTimerMutation,
  useStopTimerMutation,
  useCreateTimeEntryMutation,
  useDeleteTimeEntryMutation,
} = timeEntriesApi;
