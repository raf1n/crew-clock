import type { Device } from '@crewclock/shared';

import { baseApi } from './baseApi';

export const devicesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDevices: builder.query<Device[], string>({
      query: (workspaceId) => `/workspaces/${workspaceId}/devices`,
      providesTags: ['Device'],
    }),
    revokeDevice: builder.mutation<void, { workspaceId: string; deviceId: string }>({
      query: ({ workspaceId, deviceId }) => ({
        url: `/workspaces/${workspaceId}/devices/${deviceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Device'],
    }),
  }),
});

export const { useGetDevicesQuery, useRevokeDeviceMutation } = devicesApi;
