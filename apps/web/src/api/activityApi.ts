import type { ActivityReport } from '@crewclock/shared';

import { baseApi } from './baseApi';

interface ActivityReportArgs {
  workspaceId: string;
  from: string;
  to: string;
  userId?: string;
}

export const activityApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getActivityReport: builder.query<ActivityReport, ActivityReportArgs>({
      query: ({ workspaceId, from, to, userId }) => {
        const params = new URLSearchParams({ from, to });
        if (userId) {
          params.set('userId', userId);
        }
        return `/workspaces/${workspaceId}/activity?${params.toString()}`;
      },
      providesTags: ['Activity'],
    }),
  }),
});

export const { useGetActivityReportQuery } = activityApi;
