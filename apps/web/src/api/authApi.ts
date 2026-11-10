import { baseApi } from './baseApi';
import { clearCredentials, setCredentials } from '../features/auth/authSlice';
import { browserTimeZone } from '@/lib/format';
import type {
  AcceptInviteRegistrationInput,
  AuthResponse,
  LoginInput,
  RegisterInput,
} from '@crewclock/shared';

function withTimezone<T extends object>(body: T): T & { timezone: string } {
  return { ...body, timezone: browserTimeZone() };
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginInput>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body: withTimezone(body) }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials(data));
        } catch {
          // The caller surfaces the error.
        }
      },
    }),
    register: builder.mutation<AuthResponse, RegisterInput>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body: withTimezone(body) }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials(data));
        } catch {
          // The caller surfaces the error.
        }
      },
    }),
    acceptInviteRegistration: builder.mutation<AuthResponse, AcceptInviteRegistrationInput>({
      query: (body) => ({
        url: '/auth/accept-invite',
        method: 'POST',
        body: withTimezone(body),
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials(data));
          dispatch(baseApi.util.invalidateTags(['Workspace']));
        } catch {
          // The caller surfaces the error.
        }
      },
    }),
    refreshSession: builder.mutation<AuthResponse, void>({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
        body: { timezone: browserTimeZone() },
      }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials(data));
        } catch {
          // No valid refresh cookie: the session stays signed out.
        }
      },
    }),
    logout: builder.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST', body: {} }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
        } catch {
          // Clear the local session regardless of the server result.
        } finally {
          dispatch(clearCredentials());
          dispatch(baseApi.util.resetApiState());
        }
      },
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useAcceptInviteRegistrationMutation,
  useRefreshSessionMutation,
  useLogoutMutation,
} = authApi;
