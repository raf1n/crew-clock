import type { DailyTimeReport, ReportGroupBy, TimeReport } from '@crewclock/shared';

import { baseApi } from './baseApi';

interface TimeReportArgs {
  workspaceId: string;
  from: string;
  to: string;
  groupBy: ReportGroupBy;
}

interface DailyReportArgs {
  workspaceId: string;
  from: string;
  to: string;
  userId?: string;
}

export const reportsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTimeReport: builder.query<TimeReport, TimeReportArgs>({
      query: ({ workspaceId, from, to, groupBy }) =>
        `/workspaces/${workspaceId}/reports/time?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&groupBy=${groupBy}`,
      providesTags: ['Report'],
    }),
    getDailyTimeReport: builder.query<DailyTimeReport, DailyReportArgs>({
      query: ({ workspaceId, from, to, userId }) => {
        const params = new URLSearchParams({
          from,
          to,
        });
        if (userId) {
          params.set('userId', userId);
        }
        return `/workspaces/${workspaceId}/reports/time/daily?${params.toString()}`;
      },
      providesTags: ['Report'],
    }),
  }),
});

export const { useGetTimeReportQuery, useGetDailyTimeReportQuery } = reportsApi;
