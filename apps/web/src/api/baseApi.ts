import { createApi, fetchBaseQuery, type BaseQueryFn } from '@reduxjs/toolkit/query/react';
import type { FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { AuthResponse } from '@crewclock/shared';

import { clearCredentials, setCredentials } from '../features/auth/authSlice';
import type { RootState } from '../app/store';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/v1',
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const AUTH_ROUTES = new Set(['/auth/login', '/auth/register', '/auth/refresh']);

let refreshPromise: Promise<AuthResponse | null> | null = null;

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const url = typeof args === 'string' ? args : args.url;
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401 && !AUTH_ROUTES.has(url)) {
    refreshPromise ??= (async () => {
      const refreshResult = await rawBaseQuery(
        { url: '/auth/refresh', method: 'POST', body: {} },
        api,
        extraOptions,
      );
      return refreshResult.data ? (refreshResult.data as AuthResponse) : null;
    })().finally(() => {
      refreshPromise = null;
    });

    const refreshed = await refreshPromise;

    if (refreshed) {
      api.dispatch(setCredentials(refreshed));
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      api.dispatch(clearCredentials());
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Workspace', 'Project', 'Task', 'TimeEntry', 'Timesheet', 'Report', 'Device'],
  endpoints: () => ({}),
});
