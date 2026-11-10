import type { TimesheetSummary } from '@crewclock/shared';

import { baseApi } from './baseApi';

interface TimesheetArgs {
  workspaceId: string;
  weekStart?: string;
}

const invalidatesTimesheets = ['Timesheet', 'TimeEntry', 'Report'] as const;

function weekQuery(weekStart?: string): string {
  return weekStart ? `?weekStart=${encodeURIComponent(weekStart)}` : '';
}

export const timesheetsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyTimesheet: builder.query<TimesheetSummary, TimesheetArgs>({
      query: ({ workspaceId, weekStart }) =>
        `/workspaces/${workspaceId}/timesheets/me${weekQuery(weekStart)}`,
      providesTags: ['Timesheet'],
    }),
    listTimesheets: builder.query<TimesheetSummary[], TimesheetArgs>({
      query: ({ workspaceId, weekStart }) =>
        `/workspaces/${workspaceId}/timesheets${weekQuery(weekStart)}`,
      providesTags: ['Timesheet'],
    }),
    submitTimesheet: builder.mutation<TimesheetSummary, TimesheetArgs>({
      query: ({ workspaceId, weekStart }) => ({
        url: `/workspaces/${workspaceId}/timesheets/submit${weekQuery(weekStart)}`,
        method: 'POST',
      }),
      invalidatesTags: [...invalidatesTimesheets],
    }),
    approveTimesheet: builder.mutation<
      TimesheetSummary,
      { workspaceId: string; timesheetId: string }
    >({
      query: ({ workspaceId, timesheetId }) => ({
        url: `/workspaces/${workspaceId}/timesheets/${timesheetId}/approve`,
        method: 'POST',
      }),
      invalidatesTags: [...invalidatesTimesheets],
    }),
    withdrawTimesheet: builder.mutation<
      TimesheetSummary,
      { workspaceId: string; timesheetId: string }
    >({
      query: ({ workspaceId, timesheetId }) => ({
        url: `/workspaces/${workspaceId}/timesheets/${timesheetId}/withdraw`,
        method: 'POST',
      }),
      invalidatesTags: [...invalidatesTimesheets],
    }),
  }),
});

export const {
  useGetMyTimesheetQuery,
  useListTimesheetsQuery,
  useSubmitTimesheetMutation,
  useApproveTimesheetMutation,
  useWithdrawTimesheetMutation,
} = timesheetsApi;
